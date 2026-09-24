import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { BaselineSampleSchema, GenericMap } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";
import { getEmbeddings, projectTo2D } from "@/lib/embeddings";

const BaselineSamplesResponseSchema = z.array(BaselineSampleSchema);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.brief) {
      return NextResponse.json({ error: "Session or Brief not found" }, { status: 404 });
    }

    const fixture = getFixtureForIdea(session.brief.idea);

    // Prompt for baseline concepts
    const prompt = renderPrompt("generic_baseline", {
      idea: session.brief.idea,
      problem: session.brief.problem,
      audience: session.brief.audience.primary,
      value: session.brief.value,
      count: 30,
    });

    const samples = await callLLM({
      prompt,
      schema: BaselineSamplesResponseSchema,
      temperature: 1.0,
      mockFallback: () => {
        // Return 30 samples by expanding fixture samples if needed
        const base = fixture.generic_map.samples;
        const expanded = [...base];
        const prefixes = ["Omni", "Hyper", "Neo", "Core", "Meta", "Smart", "Flex", "True", "Prime", "Apex"];
        const suffixes = ["Flow", "Sync", "Hub", "Lab", "Zone", "Base", "Net", "Sphere", "Pulse", "Box"];
        while (expanded.length < 30) {
          const i = expanded.length;
          const p = prefixes[i % prefixes.length];
          const s = suffixes[Math.floor(i / prefixes.length) % suffixes.length];
          expanded.push({
            name: `${p}${s}`,
            tagline: `The modern platform to empower your work`,
            tone_words: ["innovative", "seamless", "smart"],
            color_mood: "tech blue and clean white",
          });
        }
        return expanded.slice(0, 30);
      },
    });

    // Embed all samples
    const sampleTexts = samples.map((s) => `${s.name} | ${s.tagline} | ${s.tone_words.join(", ")}`);
    const embeddings = await getEmbeddings(sampleTexts);

    // Compute centroid in original embedding space
    const dim = embeddings[0]?.length || 64;
    const centroid = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let d = 0; d < dim; d++) {
        centroid[d] += emb[d] / embeddings.length;
      }
    }

    // 2D Projection
    const points2D = projectTo2D(embeddings);
    const embedding_points = points2D.map((p, idx) => ({
      id: idx + 1,
      x: p.x,
      y: p.y,
      cluster: 0,
      name: samples[idx]?.name,
      tagline: samples[idx]?.tagline,
    }));

    // Extract frequency patterns
    const nameStems = samples.map((s) => s.name);
    const taglinePatterns = samples.map((s) => s.tagline);
    const toneWordsList = samples.flatMap((s) => s.tone_words);
    const colorMoodsList = samples.map((s) => s.color_mood);

    const generic_map: GenericMap = {
      n_samples: samples.length,
      samples,
      embedding_points,
      centroid,
      common_names: Array.from(new Set(nameStems)).slice(0, 8),
      common_taglines_patterns: Array.from(new Set(taglinePatterns)).slice(0, 5),
      common_tone_words: Array.from(new Set(toneWordsList)).slice(0, 8),
      common_color_moods: Array.from(new Set(colorMoodsList)).slice(0, 4),
    };

    session.generic_map = generic_map;
    session.stage = Math.max(session.stage, 3);
    logStageHistory(session, {
      stage: 2,
      agent: "Generic Cluster Mapper",
      input_summary: `Synthesized Brief for "${session.brief.idea.substring(0, 40)}..."`,
      output_summary: `Mapped 30 baseline concepts. Detected clichés: [${generic_map.common_names.slice(0, 4).join(", ")}], common tropes: [${generic_map.common_tone_words.slice(0, 3).join(", ")}].`,
    });
    saveSession(session);

    return NextResponse.json({ generic_map });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
