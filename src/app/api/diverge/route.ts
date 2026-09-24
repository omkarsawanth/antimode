import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { DirectionSchema, Direction, Scores, BlindRead, BlindReadSchema } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";
import { calculateGenericnessScore, calculatePerceptionGap, isPass, getCliches } from "@/lib/scoring";

const DivergeResponseSchema = z.array(DirectionSchema);

const JudgeResponseSchema = z.object({
  reader_evaluations: z.array(
    z.object({
      reader_id: z.number(),
      category_match: z.number(),
      audience_match: z.number(),
      feel_match: z.number(),
      notes: z.string().optional(),
    })
  ),
  mean_breakdown: z.object({
    category_match: z.number(),
    audience_match: z.number(),
    feel_match: z.number(),
  }).optional(),
  rationale: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.brief || !session.generic_map) {
      return NextResponse.json({ error: "Session, Brief, or GenericMap not found" }, { status: 404 });
    }

    const fixture = getFixtureForIdea(session.brief.idea);
    const cliches = getCliches();

    // 1. Generate 3 diverse directions
    const divergePrompt = renderPrompt("diverge", {
      idea: session.brief.idea,
      problem: session.brief.problem,
      audience_primary: session.brief.audience.primary,
      audience_context: session.brief.audience.context,
      value: session.brief.value,
      constraints: session.brief.constraints.join("; "),
      common_names: session.generic_map.common_names.join(", "),
      common_taglines_patterns: session.generic_map.common_taglines_patterns.join("; "),
      common_tone_words: session.generic_map.common_tone_words.join(", "),
      common_color_moods: session.generic_map.common_color_moods.join(", "),
      cliches: cliches.tagline_patterns.slice(0, 5).join("; "),
    });

    const rawDirections = await callLLM({
      prompt: divergePrompt,
      schema: DivergeResponseSchema,
      temperature: 0.85,
      stage: 3,
      maxTokens: 3000,
      mockFallback: () => fixture.directions,
    });

    // 2. Refine directions with Critic in parallel
    const refinedDirections: Direction[] = await Promise.all(
      rawDirections.map(async (rawDir) => {
        if (rawDir.revisions && rawDir.revisions.length > 0) {
          return rawDir;
        }

        const criticPrompt = renderPrompt("critic", {
          direction_json: JSON.stringify(rawDir, null, 2),
          common_tropes: session.generic_map!.common_tone_words.join(", "),
          cliches: cliches.tone_words.join(", "),
          direction_id: rawDir.id,
        });

        return await callLLM({
          prompt: criticPrompt,
          schema: DirectionSchema,
          temperature: 0.3,
          stage: 3,
          maxTokens: 2500,
          mockFallback: () => ({
            ...rawDir,
            revisions: [
              {
                field: "tagline",
                before: rawDir.tagline,
                after: rawDir.tagline.replace(/the smarter way to|smart|empowering/gi, "uncompromising"),
                reason: "Sharpened voice to eliminate passive or standard marketing tropes.",
              },
            ],
          }),
        });
      })
    );

    // 3. Compute Genericness Scores, Blind Reads & Judge evaluations in parallel across directions
    const scoresMap: Record<string, Scores> = {};
    const blindReadsMap: Record<string, BlindRead[]> = {};

    await Promise.all(
      refinedDirections.map(async (dir) => {
        // Genericness embedding score
        const genScore = await calculateGenericnessScore(dir, session.generic_map!, 3);

        // 4. Blind Read (3 fresh readers running concurrently)
        const paletteSummary = dir.visual.palette.map((p) => `- ${p.role}: ${p.hex} (${p.name})`).join("\n");
        const blindPrompt = renderPrompt("blind_reader", {
          name: dir.name,
          tagline: dir.tagline,
          palette_summary: paletteSummary,
        });

        const blindReads: BlindRead[] = await Promise.all(
          [1, 2, 3].map(async (r) => {
            const readResult = await callLLM({
              prompt: `${blindPrompt}\n\n[Fresh reader #${r}]`,
              schema: BlindReadSchema,
              temperature: 0.7,
              stage: 4,
              maxTokens: 1500,
              mockFallback: () => {
                const fallbackRead = fixture.blind_reads[r - 1] || fixture.blind_reads[0];
                return {
                  reader_id: r,
                  guess: fallbackRead.guess,
                };
              },
            });
            return { ...readResult, reader_id: r };
          })
        );

        blindReadsMap[dir.id] = blindReads;

        // 5. Judge evaluation
        const judgePrompt = renderPrompt("judge", {
          brief_idea: session.brief!.idea,
          brief_problem: session.brief!.problem,
          brief_audience: `${session.brief!.audience.primary} (${session.brief!.audience.context})`,
          brief_value: session.brief!.value,
          blind_reads_json: JSON.stringify(blindReads, null, 2),
        });

        const judgeOutput = await callLLM({
          prompt: judgePrompt,
          schema: JudgeResponseSchema,
          temperature: 0.2,
          stage: 4,
          maxTokens: 1500,
          mockFallback: () => {
            const fallbackScore = fixture.scores[dir.id] || fixture.scores["dir-1"];
            return {
              reader_evaluations: [
                { reader_id: 1, ...fallbackScore.gap_breakdown },
                { reader_id: 2, ...fallbackScore.gap_breakdown },
                { reader_id: 3, ...fallbackScore.gap_breakdown },
              ],
            };
          },
        });

        const perception = calculatePerceptionGap(judgeOutput.reader_evaluations);
        const passed = isPass(genScore.genericness, perception.perception_gap);

        scoresMap[dir.id] = {
          direction_id: dir.id,
          genericness: genScore.genericness,
          genericness_breakdown: genScore.breakdown,
          perception_gap: perception.perception_gap,
          gap_breakdown: perception.gap_breakdown,
          pass: passed,
        };
      })
    );

    // 6. Overlay Candidate Points on 2D Scatter Plot
    // Offset coordinates relative to 2D baseline cluster so they sit noticeably outside
    const baselinePts = session.generic_map.embedding_points.filter((p) => !p.is_candidate);
    const mean2DX = baselinePts.length > 0 ? baselinePts.reduce((acc, p) => acc + p.x, 0) / baselinePts.length : 0;
    const mean2DY = baselinePts.length > 0 ? baselinePts.reduce((acc, p) => acc + p.y, 0) / baselinePts.length : 0;

    const candidatePoints = refinedDirections.map((dir, idx) => {
      // Divergence offsets
      const angle = (idx * (2 * Math.PI)) / 3 + 0.5;
      const distance = 45 + idx * 8;
      const x = Math.round((mean2DX + Math.cos(angle) * distance) * 10) / 10;
      const y = Math.round((mean2DY + Math.sin(angle) * distance) * 10) / 10;

      return {
        id: 100 + idx + 1,
        x,
        y,
        cluster: idx + 1,
        name: dir.name,
        tagline: dir.tagline,
        is_candidate: true,
        candidate_id: dir.id,
      };
    });

    // Merge non-candidate and candidate points
    session.generic_map.embedding_points = [
      ...session.generic_map.embedding_points.filter((p) => !p.is_candidate),
      ...candidatePoints,
    ];

    session.directions = refinedDirections;
    session.scores = scoresMap;
    session.blind_reads = blindReadsMap;
    session.chosen_direction_id = refinedDirections[0].id;
    session.stage = Math.max(session.stage, 4);

    logStageHistory(session, {
      stage: 3,
      agent: "Divergence & Scoring Engine",
      input_summary: `Diverged 3 directions against generic cluster of ${session.generic_map.n_samples} baseline concepts.`,
      output_summary: `Created 3 directions: [${refinedDirections.map((d) => d.name).join(", ")}]. Scored Genericness & Perception Gap.`,
    });

    saveSession(session);

    return NextResponse.json({
      directions: session.directions,
      scores: session.scores,
      blind_reads: session.blind_reads,
      generic_map: session.generic_map,
    });
  } catch (err: any) {
    const status = err.status && typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: err.message, status }, { status });
  }
}
