import fs from "fs";
import path from "path";
import { Direction, GenericMap, Scores, BlindRead, Brief } from "@/types/schemas";
import { cosineSimilarity, getEmbedding } from "./embeddings";
import { CONFIG } from "./config";

interface ClichesData {
  name_stems: string[];
  tagline_patterns: string[];
  tone_words: string[];
  color_moods: string[];
}

let cachedCliches: ClichesData | null = null;

export function getCliches(): ClichesData {
  if (cachedCliches) return cachedCliches;
  try {
    const filePath = path.join(process.cwd(), "data", "cliches.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      cachedCliches = JSON.parse(data);
      return cachedCliches!;
    }
  } catch (err) {
    console.warn("Failed to load cliches.json, using defaults:", err);
  }

  return {
    name_stems: ["ly", "ify", "io", "ai", "hub", "flow", "pulse", "sync", "zen", "aura", "nexus", "nova", "prime", "vault", "mind"],
    tagline_patterns: ["the future of", "supercharge your", "empowering", "made simple", "all-in-one", "reimagining"],
    tone_words: ["innovative", "seamless", "empowering", "robust", "holistic", "dynamic", "cutting-edge"],
    color_moods: ["tech blue and clean white", "corporate navy"],
  };
}

export async function calculateGenericnessScore(
  direction: Direction,
  genericMap: GenericMap
): Promise<{
  genericness: number;
  breakdown: { embedding_sim: number; cliche_hits: string[]; cliche_rate: number };
}> {
  const cliches = getCliches();

  // 1. Text representation for embedding
  // Candidates tone words can be extracted from personality traits
  const candidateToneWords = direction.personality.traits.map((t) => t.trait);
  const candidateText = `${direction.name} | ${direction.tagline} | ${candidateToneWords.join(", ")}`;
  const candidateEmbedding = await getEmbedding(candidateText);

  // Embed baseline samples
  const baselineEmbeddings = await Promise.all(
    genericMap.samples.map(async (sample) => {
      const sampleText = `${sample.name} | ${sample.tagline} | ${sample.tone_words.join(", ")}`;
      return getEmbedding(sampleText);
    })
  );

  // 2. Compute cosine similarity to all baseline samples
  const similarities = baselineEmbeddings.map((bEmbed) => cosineSimilarity(candidateEmbedding, bEmbed));
  // Sort descending
  similarities.sort((a, b) => b - a);

  // Top 5 nearest baseline samples
  const topK = Math.min(5, similarities.length);
  const nearestSims = similarities.slice(0, topK);
  const meanSim = nearestSims.reduce((sum, s) => sum + s, 0) / (topK || 1);
  // Scale cosine similarity (-1 to 1 or 0 to 1) to 0 to 100
  // For semantic embeddings, similarity is typically between 0.3 and 0.95
  const rawSimScaled = Math.max(0, Math.min(100, Math.round(meanSim * 1000) / 10));
  const embedding_sim = Math.round(rawSimScaled * 10) / 10;

  // 3. Cliche hits and rate
  const cliche_hits: string[] = [];
  let totalChecks = 0;

  // Check name stems
  const nameLower = direction.name.toLowerCase();
  const allStems = Array.from(new Set([...cliches.name_stems, ...genericMap.common_names.map((n) => n.toLowerCase())]));
  totalChecks += 2;
  for (const stem of allStems) {
    if (stem.length >= 3 && nameLower.includes(stem)) {
      cliche_hits.push(`Name stem: "${stem}"`);
      break;
    }
  }

  // Check tagline patterns
  const taglineLower = direction.tagline.toLowerCase();
  const allPatterns = Array.from(new Set([...cliches.tagline_patterns, ...genericMap.common_taglines_patterns.map((p) => p.toLowerCase())]));
  totalChecks += 3;
  for (const pattern of allPatterns) {
    if (taglineLower.includes(pattern)) {
      cliche_hits.push(`Tagline pattern: "${pattern}"`);
    }
  }

  // Check tone words
  const allToneWords = Array.from(new Set([...cliches.tone_words, ...genericMap.common_tone_words.map((w) => w.toLowerCase())]));
  for (const trait of direction.personality.traits) {
    totalChecks += 1;
    const tLower = trait.trait.toLowerCase();
    if (allToneWords.some((w) => tLower.includes(w) || w.includes(tLower))) {
      cliche_hits.push(`Tone word: "${trait.trait}"`);
    }
  }

  const fractionHits = totalChecks > 0 ? cliche_hits.length / totalChecks : 0;
  const cliche_rate = Math.round(Math.min(100, fractionHits * 100) * 10) / 10;

  // 4. Formula: genericness = 0.7 * embedding_sim + 0.3 * cliche_rate
  const genericness = Math.round((0.7 * embedding_sim + 0.3 * cliche_rate) * 10) / 10;

  return {
    genericness,
    breakdown: {
      embedding_sim,
      cliche_hits,
      cliche_rate,
    },
  };
}

export function calculatePerceptionGap(
  readerEvaluations: { category_match: number; audience_match: number; feel_match: number }[]
): {
  perception_gap: number;
  gap_breakdown: { category_match: number; audience_match: number; feel_match: number };
} {
  const n = readerEvaluations.length;
  if (n === 0) {
    return {
      perception_gap: 0.25,
      gap_breakdown: { category_match: 0.8, audience_match: 0.8, feel_match: 0.8 },
    };
  }

  let sumCat = 0;
  let sumAud = 0;
  let sumFeel = 0;

  for (const r of readerEvaluations) {
    sumCat += r.category_match;
    sumAud += r.audience_match;
    sumFeel += r.feel_match;
  }

  const category_match = Math.round((sumCat / n) * 100) / 100;
  const audience_match = Math.round((sumAud / n) * 100) / 100;
  const feel_match = Math.round((sumFeel / n) * 100) / 100;

  const meanScore = (category_match + audience_match + feel_match) / 3;
  // perception_gap = 1 - mean(all scores across the 3 readers)
  const perception_gap = Math.round(Math.max(0, Math.min(1, 1 - meanScore)) * 100) / 100;

  return {
    perception_gap,
    gap_breakdown: {
      category_match,
      audience_match,
      feel_match,
    },
  };
}

export function isPass(genericness: number, perceptionGap: number): boolean {
  return (
    genericness <= CONFIG.GENERICNESS_MAX_THRESHOLD &&
    perceptionGap <= CONFIG.PERCEPTION_GAP_MAX_THRESHOLD
  );
}
