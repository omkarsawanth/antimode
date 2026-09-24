import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, logStageHistory } from "@/lib/session";
import { renderPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";
import { BrandSpec } from "@/types/schemas";
import { getFixtureForIdea } from "@/lib/fixtures";

const AttackResultSchema = z.object({
  round: z.number(),
  attack: z.string(),
  attack_vector: z.string().optional(),
  slipped_through: z.boolean(),
  new_rule: z.string().optional(),
  suggested_banned_words: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, direction_id, rounds = 3 } = body;

    if (!session_id || !direction_id) {
      return NextResponse.json({ error: "Missing session_id or direction_id" }, { status: 400 });
    }

    const session = getSession(session_id);
    if (!session || !session.directions || !session.brief) {
      return NextResponse.json({ error: "Session or Directions not found" }, { status: 404 });
    }

    const direction = session.directions.find((d) => d.id === direction_id);
    if (!direction) {
      return NextResponse.json({ error: "Direction not found" }, { status: 404 });
    }

    const fixture = getFixtureForIdea(session.brief.idea);

    // Initial base spec
    const spec: BrandSpec = {
      banned_words: [
        "seamless", "supercharge", "empowering", "modern", "effortless", "all-in-one",
        "intuitive", "smart", "future of", "elevate", "frictionless", "delightful",
        ...(direction.personality.avoid || []),
      ],
      required_traits: direction.personality.traits.map((t) => t.trait),
      voice_rules: [...direction.voice.rules],
      palette: direction.visual.palette.map((p) => ({ hex: p.hex })),
      contrast_min: 4.5,
      rounds: [],
    };

    // Run adversarial rounds
    for (let r = 1; r <= rounds; r++) {
      const prompt = renderPrompt("redteam_attacker", {
        name: direction.name,
        positioning: direction.positioning,
        voice_rules: spec.voice_rules.join("; "),
        banned_words: spec.banned_words.slice(0, 15).join(", "),
        required_traits: spec.required_traits.join(", "),
        round: r,
      });

      const attackResult = await callLLM({
        prompt,
        schema: AttackResultSchema,
        temperature: 0.8,
        mockFallback: () => {
          const fallbackRound = fixture.spec.rounds[r - 1] || {
            round: r,
            attack: `Experience the future of ${direction.name} with intuitive and seamless workflows!`,
            slipped_through: r < rounds,
            new_rule: `Strictly ban corporate conversational jargon like 'experience the future' and 'intuitive'.`,
          };
          return {
            round: r,
            attack: fallbackRound.attack,
            attack_vector: "Superficial tech hype and sycophantic warmth",
            slipped_through: fallbackRound.slipped_through,
            new_rule: fallbackRound.new_rule,
            suggested_banned_words: ["experience", "future of"],
          };
        },
      });

      spec.rounds.push({
        round: r,
        attack: attackResult.attack,
        slipped_through: attackResult.slipped_through,
        new_rule: attackResult.new_rule,
      });

      if (attackResult.new_rule) {
        spec.voice_rules.push(attackResult.new_rule);
      }
      if (attackResult.suggested_banned_words) {
        for (const word of attackResult.suggested_banned_words) {
          if (!spec.banned_words.includes(word.toLowerCase())) {
            spec.banned_words.push(word.toLowerCase());
          }
        }
      }
    }

    session.chosen_direction_id = direction_id;
    session.spec = spec;
    session.stage = Math.max(session.stage, 7);

    logStageHistory(session, {
      stage: 7,
      agent: "Adversarial Red-Team Engine",
      input_summary: `Executed ${rounds} adversarial attack rounds against "${direction.name}".`,
      output_summary: `BrandSpec hardened: ${spec.voice_rules.length} voice rules, ${spec.banned_words.length} banned words, ${spec.rounds.filter((r) => r.slipped_through).length} vulnerabilities patched.`,
    });

    saveSession(session);

    return NextResponse.json({ spec });
  } catch (err: any) {
    const status = err.status && typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: err.message, status }, { status });
  }
}
