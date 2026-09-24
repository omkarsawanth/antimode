import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { CollisionSchema, Collision } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";

const CollisionArraySchema = z.array(CollisionSchema);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, names } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.brief) {
      return NextResponse.json({ error: "Session or Brief not found" }, { status: 404 });
    }

    const fixture = getFixtureForIdea(session.brief.idea);

    // If names not explicitly passed, collect names from current directions
    const candidateNames = names || (session.directions ? session.directions.map((d) => d.name) : ["KILN"]);

    const prompt = renderPrompt("collision", {
      category: session.brief.idea,
      value: session.brief.value,
      names_list: candidateNames.join(", "),
    });

    const collisions = await callLLM({
      prompt,
      schema: CollisionArraySchema,
      temperature: 0.3,
      mockFallback: () => {
        return fixture.collisions.filter((c) => candidateNames.includes(c.name)) || fixture.collisions;
      },
    });

    session.collisions = session.collisions || {};
    for (const c of collisions) {
      session.collisions[c.name] = [c];
    }
    session.stage = Math.max(session.stage, 6);

    logStageHistory(session, {
      stage: 6,
      agent: "Trademark Collision Sentinel",
      input_summary: `Audited candidate names: [${candidateNames.join(", ")}]`,
      output_summary: `Analyzed collision risk: ${collisions.map((c) => `${c.name} (${c.risk})`).join(", ")}`,
    });

    saveSession(session);

    return NextResponse.json({ collisions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
