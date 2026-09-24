import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { BrandKit, BrandKitLaunchSchema } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, direction_id } = body;

    if (!session_id || !direction_id) {
      return NextResponse.json({ error: "Missing session_id or direction_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.brief || !session.directions || !session.scores) {
      return NextResponse.json({ error: "Session or required data not found" }, { status: 404 });
    }

    const direction = session.directions.find((d) => d.id === direction_id);
    if (!direction) {
      return NextResponse.json({ error: "Direction not found" }, { status: 404 });
    }

    const scores = session.scores[direction_id];
    if (!scores) {
      return NextResponse.json({ error: "Scores for direction not found" }, { status: 404 });
    }

    const fixture = getFixtureForIdea(session.brief.idea);
    const spec = session.spec || fixture.spec;

    const launchPrompt = renderPrompt("launch", {
      name: direction.name,
      tagline: direction.tagline,
      positioning: direction.positioning,
      value: session.brief.value,
      voice_rules: spec.voice_rules.join("; "),
      banned_words: spec.banned_words.slice(0, 15).join(", "),
      audience: `${session.brief.audience.primary} (${session.brief.audience.context})`,
    });

    const launchData = await callLLM({
      prompt: launchPrompt,
      schema: BrandKitLaunchSchema,
      temperature: 0.7,
      stage: 8,
      mockFallback: () => {
        return fixture.brand_kit.launch;
      },
    });

    const brandKit: BrandKit = {
      summary: session.brief,
      direction,
      scores,
      spec,
      launch: launchData,
    };

    session.brand_kit = brandKit;
    session.stage = Math.max(session.stage, 8);

    logStageHistory(session, {
      stage: 8,
      agent: "Brand Engine Synthesizer & Deliverer",
      input_summary: `Synthesized Brief, "${direction.name}" Direction, and hardened BrandSpec.`,
      output_summary: `Generated BrandKit with landing headline, subhead, one-line pitch, and 3 launch posts.`,
    });

    saveSession(session);

    return NextResponse.json({ brand_kit: brandKit });
  } catch (err: any) {
    const status = err.status && typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: err.message, status }, { status });
  }
}
