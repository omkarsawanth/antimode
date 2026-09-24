import { CONFIG, getGeminiApiKey } from "./config";
import { LLMError } from "./llm";
import crypto from "crypto";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// Fallback deterministic pseudo-semantic embedding vector (64 dimensions) - ONLY for MOCK_MODE=true
export function getLocalEmbedding(text: string, dim: number = 64): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  const vec = new Array(dim).fill(0);

  // Bag of words + n-grams hash feature mapping
  for (const word of words) {
    const hash = crypto.createHash("md5").update(word).digest();
    for (let i = 0; i < dim; i++) {
      const byte = hash[i % hash.length];
      const sign = (byte & 1) === 1 ? 1 : -1;
      vec[i] += sign * (byte / 255);
    }

    // Bi-grams
    for (let c = 0; c < word.length - 1; c++) {
      const bigram = word.substring(c, c + 2);
      const bHash = crypto.createHash("md5").update(bigram).digest();
      const idx = (bHash[0] + bHash[1]) % dim;
      vec[idx] += 0.5;
    }
  }

  // Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

// Generate embedding for text
export async function getEmbedding(text: string): Promise<number[]> {
  // Only return local fake/hash vector when explicitly in MOCK_MODE
  if (CONFIG.isMockMode) {
    return getLocalEmbedding(text);
  }

  const apiKey = getGeminiApiKey();
  const model = CONFIG.DEFAULT_EMBEDDING_MODEL;

  if (!apiKey) {
    throw new LLMError(
      "No API key configured for embeddings. Provide GEMINI_API_KEY or GOOGLE_API_KEY.",
      401,
      "gemini",
      model
    );
  }

  const maxRetries = 3;
  let res: Response | null = null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      });

      if (res.status === 429) {
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1500 + Math.random() * 500;
          console.warn(
            `[EMBEDDING] HTTP 429 Rate Limit. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError("Gemini embedding rate limit exceeded (HTTP 429)", 429, "gemini", model);
      }
      break;
    } catch (err: any) {
      if (err instanceof LLMError) throw err;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new LLMError(
        err.message || "Failed to communicate with Gemini Embedding API",
        500,
        "gemini",
        model
      );
    }
  }

  if (!res || !res.ok) {
    const errText = res ? await res.text() : "No response";
    throw new LLMError(
      `Gemini embedding API error ${res?.status || 500}: ${errText.substring(0, 300)}`,
      res?.status || 500,
      "gemini",
      model
    );
  }

  const data = await res.json();
  if (!data.embedding?.values) {
    throw new LLMError("Invalid embedding response values from Gemini API", 502, "gemini", model);
  }

  return data.embedding.values as number[];
}

// Batch embed multiple texts
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => getEmbedding(t)));
}

// Dimensionality reduction: Classical Multidimensional Scaling (MDS) / PCA to 2D
export function projectTo2D(vectors: number[][]): { x: number; y: number }[] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];

  // Center the data
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < dim; d++) {
      mean[d] += vectors[i][d] / n;
    }
  }

  const centered = vectors.map((v) => v.map((val, d) => val - mean[d]));

  // Power iteration for top 2 principal components
  function powerIteration(data: number[][], numIterations: number = 30): number[] {
    let p = new Array(dim).fill(0).map(() => Math.random() - 0.5);
    let norm = Math.sqrt(p.reduce((acc, val) => acc + val * val, 0));
    p = p.map((val) => val / (norm || 1));

    for (let iter = 0; iter < numIterations; iter++) {
      const Xp = data.map((row) => row.reduce((sum, val, idx) => sum + val * p[idx], 0));
      const nextP = new Array(dim).fill(0);
      for (let j = 0; j < dim; j++) {
        for (let i = 0; i < n; i++) {
          nextP[j] += data[i][j] * Xp[i];
        }
      }

      norm = Math.sqrt(nextP.reduce((acc, val) => acc + val * val, 0));
      if (norm === 0) break;
      p = nextP.map((val) => val / norm);
    }
    return p;
  }

  // First component
  const pc1 = powerIteration(centered);

  // Deflate matrix
  const deflated = centered.map((row) => {
    const proj = row.reduce((sum, val, idx) => sum + val * pc1[idx], 0);
    return row.map((val, idx) => val - proj * pc1[idx]);
  });

  // Second component
  const pc2 = powerIteration(deflated);

  // Project points
  const points = centered.map((row) => {
    const x = row.reduce((sum, val, idx) => sum + val * pc1[idx], 0) * 100;
    const y = row.reduce((sum, val, idx) => sum + val * pc2[idx], 0) * 100;
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  });

  return points;
}
