import { NextRequest, NextResponse } from "next/server";
import { getSession, logStageHistory, saveSession } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { GuardianResultSchema, GuardianResult } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, text } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing text to inspect" }, { status: 400 });
    }

    let spec = getFixtureForIdea("").spec;
    let session = session_id ? getSession(session_id) : null;
    if (session?.spec) {
      spec = session.spec;
    }

    // 1. Deterministic heuristic check for banned words
    const lowerText = text.toLowerCase();
    const directViolations: { rule: string; excerpt: string; explanation: string; suggested_fix: string }[] = [];

    for (const banned of spec.banned_words) {
      if (banned.length >= 3 && lowerText.includes(banned.toLowerCase())) {
        const idx = lowerText.indexOf(banned.toLowerCase());
        const start = Math.max(0, idx - 15);
        const end = Math.min(text.length, idx + banned.length + 15);
        const excerpt = text.substring(start, end).trim();

        directViolations.push({
          rule: `Banned word: "${banned}"`,
          excerpt: `"...${excerpt}..."`,
          explanation: `Uses explicitly banned term or marketing cliché "${banned}" forbidden in BrandSpec.`,
          suggested_fix: `Remove "${banned}" and express concrete mechanical fact directly without conversational filler.`,
        });
      }
    }

    // 2. Call Guardian Agent for voice/personality rules
    const prompt = renderPrompt("guardian", {
      banned_words: spec.banned_words.join(", "),
      required_traits: spec.required_traits.join(", "),
      voice_rules: spec.voice_rules.map((r, i) => `${i + 1}. ${r}`).join("\n"),
      text,
    });

    const llmResult = await callLLM({
      prompt,
      schema: GuardianResultSchema,
      temperature: 0.1,
      stage: 9,
      mockFallback: () => {
        // If text contains cliché words or marketing enthusiasm, return violation
        const isOffBrand =
          lowerText.includes("seamless") ||
          lowerText.includes("supercharge") ||
          lowerText.includes("empower") ||
          lowerText.includes("intuitive") ||
          lowerText.includes("delight") ||
          lowerText.includes("future of") ||
          lowerText.includes("easy") ||
          lowerText.includes("heroes") ||
          lowerText.includes("all-in-one") ||
          text.includes("!");

        if (isOffBrand || directViolations.length > 0) {
          const allV = [...directViolations];
          if (allV.length === 0) {
            allV.push({
              rule: "Voice Rule: Prohibit marketing hyperbole and conversational exclamation",
              excerpt: text.substring(0, Math.min(60, text.length)),
              explanation: "The submitted copy adopts an enthusiastic, promotional posture inconsistent with the brand spec.",
              suggested_fix: "Convert adjectives into declarative architectural statements.",
            });
          }
          return { pass: false, violations: allV };
        }

        return { pass: true, violations: [] };
      },
    });

    // Merge violations
    const allViolations = [...directViolations];
    for (const v of llmResult.violations) {
      if (!allViolations.some((existing) => existing.rule === v.rule && existing.excerpt === v.excerpt)) {
        allViolations.push(v);
      }
    }

    const finalResult: GuardianResult = {
      pass: allViolations.length === 0,
      violations: allViolations,
    };

    if (session) {
      logStageHistory(session, {
        stage: 9,
        agent: "Automated Brand Guardian",
        input_summary: `Inspected ${text.split(/\s+/).length} words of copy against BrandSpec.`,
        output_summary: finalResult.pass
          ? "PASSED: Zero brand violations detected."
          : `FAILED: Flagged ${allViolations.length} violation(s).`,
      });
      saveSession(session);
    }

    return NextResponse.json(finalResult);
  } catch (err: any) {
    const status = err.status && typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: err.message, status }, { status });
  }
}
