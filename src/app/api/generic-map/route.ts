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

    const totalSamples = 30;
    const batchSize = 3;
    const allSamples: any[] = [];
    const totalBatches = Math.ceil(totalSamples / batchSize);

    // Run 30-sample generation in batches of 3 with short delays between batches
    for (let b = 0; b < totalBatches; b++) {
      if (b > 0) {
        // Short delay between batches to be gentler on rate limits
        await new Promise((r) => setTimeout(r, 600));
      }

      const prompt = renderPrompt("generic_baseline", {
        idea: session.brief.idea,
        problem: session.brief.problem,
        audience: session.brief.audience.primary,
        value: session.brief.value,
        count: batchSize,
      });

      const batchSamples = await callLLM({
        prompt: `${prompt}\n\n[Batch ${b + 1} of ${totalBatches}]`,
        schema: BaselineSamplesResponseSchema,
        temperature: 1.0,
        stage: 2,
        mockFallback: () => {
          const base = fixture.generic_map.samples;
          const sliceStart = (b * batchSize) % base.length;
          return base.slice(sliceStart, sliceStart + batchSize);
        },
      });

      allSamples.push(...batchSamples);
    }

    const samples = allSamples.slice(0, 30);

    // Embed all samples
    const sampleTexts = samples.map((s) => `${s.name} | ${s.tagline} | ${s.tone_words.join(", ")}`);
    const embeddings = await getEmbeddings(sampleTexts, 2);

    // Compute centroid in original embedding space (works dynamically for any dimension e.g. 2048)
    const dim = embeddings[0]?.length || 0;
    const centroid = dim > 0 ? new Array(dim).fill(0) : [];
    if (dim > 0 && embeddings.length > 0) {
      for (const emb of embeddings) {
        for (let d = 0; d < dim; d++) {
          centroid[d] += emb[d] / embeddings.length;
        }
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
    const status = err.status && typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: err.message, status }, { status });
  }
}
