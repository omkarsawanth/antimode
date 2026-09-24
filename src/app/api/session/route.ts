import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession, saveSession } from "@/lib/session";
import { getFixtureForIdea } from "@/lib/fixtures";
import { CONFIG } from "@/lib/config";

function getSystemInfo() {
  const isMock = CONFIG.isMockMode;
  const provider = process.env.GEMINI_API_KEY ? "Gemini" : process.env.OPENAI_API_KEY ? "OpenAI" : "None";
  return {
    is_mock_mode: isMock,
    provider: isMock ? "Mock / Fixture" : provider,
    model: CONFIG.DEFAULT_LLM_MODEL,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, seed_id } = body;

    const session = createSession();
    if (idea) {
      session.brief = {
        idea,
        audience: { primary: "", context: "" },
        problem: "",
        value: "",
        constraints: [],
        open_questions: [],
        qa: [],
      };
      saveSession(session);
    } else if (seed_id) {
      const fixture = getFixtureForIdea(seed_id);
      session.brief = fixture.brief;
      saveSession(session);
    }

    return NextResponse.json({
      session,
      ...getSystemInfo(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session,
    ...getSystemInfo(),
  });
}
