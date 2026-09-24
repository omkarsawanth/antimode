import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { BriefSchema } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";

const InterviewResponseSchema = z.union([
  z.object({
    status: z.literal("asking"),
    question: z.string(),
  }),
  z.object({
    status: z.literal("completed"),
    brief: BriefSchema,
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, answer } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.brief) {
      return NextResponse.json({ error: "No brief initialized in session" }, { status: 400 });
    }

    // If answer provided, find the last question or pending turn
    if (answer) {
      const qaList = session.brief.qa || [];
      if (qaList.length > 0 && !qaList[qaList.length - 1].a) {
        qaList[qaList.length - 1].a = answer;
      } else {
        // Last answered turn
        qaList.push({ q: "Strategic clarification", a: answer });
      }
      session.brief.qa = qaList;
    }

    const qaHistory = (session.brief.qa || [])
      .map((item, idx) => `Turn ${idx + 1}:\nQ: ${item.q}\nA: ${item.a || "(awaiting answer)"}`)
      .join("\n\n");

    const turnCount = (session.brief.qa || []).filter((item) => !!item.a).length;
    const fixture = getFixtureForIdea(session.brief.idea);

    // If already has >= 3 turns, we can complete or ask up to 4
    const prompt = renderPrompt("interviewer", {
      idea: session.brief.idea,
      qa_history: qaHistory || "None yet. This is turn 1.",
      turn_count: turnCount,
    });

    const result = await callLLM({
      prompt,
      schema: InterviewResponseSchema,
      temperature: 0.4,
      mockFallback: () => {
        if (turnCount < 3) {
          const sampleQuestions = [
            "Who is the single uncompromising user archetype who desperately needs this on day one, and what specific workflow friction are they suffering from?",
            "What is the single most common category cliché or failure mode that competitors fall into which this brand must explicitly reject?",
            "What hard operational constraint or philosophical red line will this brand refuse to cross, even if it limits mass-market adoption?",
          ];
          return {
            status: "asking" as const,
            question: sampleQuestions[turnCount] || "What is the single highest-conviction proof of value you deliver?",
          };
        }
        return {
          status: "completed" as const,
          brief: {
            ...fixture.brief,
            idea: session.brief?.idea || fixture.brief.idea,
            qa: session.brief?.qa?.length ? session.brief.qa : fixture.brief.qa,
          },
        };
      },
    });

    if (result.status === "asking") {
      session.brief.qa.push({ q: result.question, a: "" });
      saveSession(session);
      return NextResponse.json({ status: "asking", question: result.question });
    } else {
      session.brief = result.brief;
      session.stage = Math.max(session.stage, 2);
      logStageHistory(session, {
        stage: 1,
        agent: "Strategic Interviewer",
        input_summary: `Raw idea: "${session.brief.idea.substring(0, 80)}..." with ${session.brief.qa.length} Q&A turns.`,
        output_summary: `Synthesized Brief: Audience: ${session.brief.audience.primary} | Core Problem: ${session.brief.problem.substring(0, 60)}...`,
      });
      saveSession(session);
      return NextResponse.json({ status: "completed", brief: session.brief });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
