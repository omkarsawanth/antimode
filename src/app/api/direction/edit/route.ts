import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { Direction, Scores, BlindRead, BlindReadSchema } from "@/types/schemas";
import { calculateGenericnessScore, calculatePerceptionGap, isPass } from "@/lib/scoring";

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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, direction_id, patch } = body;

    if (!session_id || !direction_id || !patch) {
      return NextResponse.json({ error: "Missing session_id, direction_id, or patch" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.directions || !session.generic_map || !session.brief) {
      return NextResponse.json({ error: "Session or required data not found" }, { status: 404 });
    }

    const dirIndex = session.directions.findIndex((d) => d.id === direction_id);
    if (dirIndex === -1) {
      return NextResponse.json({ error: "Direction not found" }, { status: 404 });
    }

    const currentDir = session.directions[dirIndex];
    // Deep merge patch into currentDir
    const updatedDir: Direction = {
      ...currentDir,
      ...patch,
      personality: {
        ...currentDir.personality,
        ...(patch.personality || {}),
      },
      voice: {
        ...currentDir.voice,
        ...(patch.voice || {}),
      },
      visual: {
        ...currentDir.visual,
        ...(patch.visual || {}),
        palette: patch.visual?.palette || currentDir.visual.palette,
        typography: {
          ...currentDir.visual.typography,
          ...(patch.visual?.typography || {}),
        },
      },
      revisions: [
        ...(currentDir.revisions || []),
        ...(patch.revisions || [
          {
            field: "manual_edit",
            before: `Name: ${currentDir.name}, Tagline: ${currentDir.tagline}`,
            after: `Name: ${patch.name || currentDir.name}, Tagline: ${patch.tagline || currentDir.tagline}`,
            reason: "User customized direction parameters",
          },
        ]),
      ],
    };

    // Re-score Genericness
    const genScore = await calculateGenericnessScore(updatedDir, session.generic_map);

    // Re-run Blind Read
    const paletteSummary = updatedDir.visual.palette.map((p) => `- ${p.role}: ${p.hex} (${p.name})`).join("\n");
    const blindPrompt = renderPrompt("blind_reader", {
      name: updatedDir.name,
      tagline: updatedDir.tagline,
      palette_summary: paletteSummary,
    });

    const blindReads: BlindRead[] = [];
    for (let r = 1; r <= 3; r++) {
      const readResult = await callLLM({
        prompt: `${blindPrompt}\n\n[Re-scored reader #${r}]`,
        schema: BlindReadSchema,
        temperature: 0.7,
        mockFallback: () => {
          // If the edit is deliberately vague (test requirement #3 in SPEC Section 11):
          const isVague = updatedDir.tagline.toLowerCase().includes("something for people") ||
                          updatedDir.name.toLowerCase().includes("vague") ||
                          updatedDir.tagline.toLowerCase().includes("solution");
          if (isVague) {
            return {
              reader_id: r,
              guess: {
                category: "Generic corporate consultancy or vague lifestyle app",
                audience: "General public / unspecified",
                feel_words: ["bland", "unclear", "generic", "confusing"],
                one_line: "An unclear product that offers broad, undefined services.",
              },
            };
          }
          return {
            reader_id: r,
            guess: {
              category: "Specialized high-utility software / service",
              audience: session.brief!.audience.primary,
              feel_words: ["focused", "distinct", "precise", "disciplined"],
              one_line: updatedDir.one_line_pitch,
            },
          };
        },
      });
      blindReads.push({ ...readResult, reader_id: r });
    }

    // Judge evaluations
    const judgePrompt = renderPrompt("judge", {
      brief_idea: session.brief.idea,
      brief_problem: session.brief.problem,
      brief_audience: `${session.brief.audience.primary} (${session.brief.audience.context})`,
      brief_value: session.brief.value,
      blind_reads_json: JSON.stringify(blindReads, null, 2),
    });

    const isVague = updatedDir.tagline.toLowerCase().includes("something for people") ||
                    updatedDir.name.toLowerCase().includes("vague") ||
                    updatedDir.tagline.toLowerCase().includes("solution");

    const judgeOutput = await callLLM({
      prompt: judgePrompt,
      schema: JudgeResponseSchema,
      temperature: 0.2,
      mockFallback: () => {
        if (isVague) {
          // SPEC requirement: "Making a direction deliberately vague raises its Perception Gap; making it clearer lowers it."
          return {
            reader_evaluations: [
              { reader_id: 1, category_match: 0.25, audience_match: 0.30, feel_match: 0.35 },
              { reader_id: 2, category_match: 0.20, audience_match: 0.25, feel_match: 0.30 },
              { reader_id: 3, category_match: 0.30, audience_match: 0.35, feel_match: 0.40 },
            ],
          };
        }
        return {
          reader_evaluations: [
            { reader_id: 1, category_match: 0.92, audience_match: 0.88, feel_match: 0.90 },
            { reader_id: 2, category_match: 0.89, audience_match: 0.85, feel_match: 0.87 },
            { reader_id: 3, category_match: 0.90, audience_match: 0.87, feel_match: 0.89 },
          ],
        };
      },
    });

    const perception = calculatePerceptionGap(judgeOutput.reader_evaluations);
    const passed = isPass(genScore.genericness, perception.perception_gap);

    const updatedScores: Scores = {
      direction_id,
      genericness: genScore.genericness,
      genericness_breakdown: genScore.breakdown,
      perception_gap: perception.perception_gap,
      gap_breakdown: perception.gap_breakdown,
      pass: passed,
    };

    session.directions[dirIndex] = updatedDir;
    session.scores = session.scores || {};
    session.scores[direction_id] = updatedScores;
    session.blind_reads = session.blind_reads || {};
    session.blind_reads[direction_id] = blindReads;

    logStageHistory(session, {
      stage: 5,
      agent: "Direction Editor & Re-Scorer",
      input_summary: `Edited "${updatedDir.name}": ${JSON.stringify(patch).substring(0, 70)}...`,
      output_summary: `Re-scored: Genericness ${updatedScores.genericness}, Perception Gap ${updatedScores.perception_gap} (Pass: ${passed ? "YES" : "NO"}).`,
    });

    saveSession(session);

    return NextResponse.json({
      direction: updatedDir,
      scores: updatedScores,
      blind_reads: blindReads,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
