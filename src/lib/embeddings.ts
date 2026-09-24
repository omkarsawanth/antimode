import { CONFIG, getOpenRouterApiKey } from "./config";
import { LLMError } from "./llm";
import { recordEmbeddingCall } from "./metrics";
import crypto from "crypto";

export function isQuotaExhausted(status: number, errorText: string): boolean {
  if (status === 402) return true;
  if (status === 429) {
    const lower = errorText.toLowerCase();
    return (
      lower.includes("quota") ||
      lower.includes("credit") ||
      lower.includes("balance") ||
      lower.includes("insufficient") ||
      lower.includes("payment") ||
      lower.includes("billing") ||
      (lower.includes("exhausted") && !lower.includes("rate limit"))
    );
  }
  return false;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// Fallback deterministic pseudo-semantic embedding vector (arbitrary dimensions) - ONLY for MOCK_MODE=true
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

// Generate embeddings for multiple texts in ONE batched request via OpenRouter Nemotron
export async function getEmbeddings(texts: string[], stage?: string | number): Promise<number[][]> {
  if (texts.length === 0) return [];

  // In MOCK_MODE, return local hash vectors
  if (CONFIG.isMockMode) {
    return texts.map((t) => getLocalEmbedding(t));
  }

  const apiKey = getOpenRouterApiKey();
  const model = CONFIG.DEFAULT_EMBEDDING_MODEL;

  // In LIVE mode, NEVER fall back to hash vectors! Throw typed LLMError
  if (!apiKey) {
    throw new LLMError(
      "No OpenRouter API key configured. Provide OPENROUTER_API_KEY in .env.local",
      401,
      "openrouter",
      model
    );
  }

  const maxRetries = 4;
  let lastStatus = 500;
  const startTime = Date.now();
  const endpoint = "https://openrouter.ai/api/v1/embeddings";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: texts,
        }),
      });

      // Check for quota exhaustion first - DO NOT retry if quota is exhausted
      if (res.status === 429 || res.status === 402) {
        const errText = await res.text();
        if (isQuotaExhausted(res.status, errText)) {
          console.warn(`[EMBEDDING] OpenRouter quota exhausted (HTTP ${res.status}). Skipping retries.`);
          throw new LLMError(
            `OpenRouter quota exhausted (HTTP ${res.status}): ${errText}`,
            res.status,
            "openrouter",
            model
          );
        }

        // Transient 429 rate limit
        lastStatus = 429;
        if (attempt < maxRetries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[EMBEDDING] HTTP 429 Rate Limit from OpenRouter (${model}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          `OpenRouter embedding rate limit exceeded (HTTP 429): ${errText}`,
          429,
          "openrouter",
          model
        );
      }

      // Check for 5xx retryable status codes
      if (res.status >= 500 && res.status <= 504) {
        lastStatus = res.status;
        const errText = await res.text();
        if (attempt < maxRetries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[EMBEDDING] HTTP ${res.status} error from OpenRouter (${model}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          `OpenRouter embedding error (HTTP ${res.status}): ${errText}`,
          res.status,
          "openrouter",
          model
        );
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new LLMError(
          `OpenRouter embedding API error ${res.status}: ${errText}`,
          res.status,
          "openrouter",
          model
        );
      }

      const data = await res.json();
      if (!data.data || !Array.isArray(data.data)) {
        throw new LLMError(
          "Invalid response format from OpenRouter embeddings API",
          502,
          "openrouter",
          model
        );
      }

      // Sort by index to maintain input order
      const sorted = [...data.data].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
      const embeddings: number[][] = sorted.map((item: any) => item.embedding as number[]);

      if (embeddings.length !== texts.length) {
        throw new LLMError(
          `OpenRouter returned ${embeddings.length} embeddings for ${texts.length} inputs`,
          502,
          "openrouter",
          model
        );
      }

      const elapsed = Date.now() - startTime;
      recordEmbeddingCall(stage, texts.length, elapsed, "openrouter", model);

      return embeddings;
    } catch (err: any) {
      if (err instanceof LLMError) throw err;
      if (attempt < maxRetries - 1) {
        const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(
          `[EMBEDDING] Network/Fetch error: ${err.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries - 1})...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new LLMError(
        err.message || "Failed to communicate with OpenRouter Embeddings API",
        lastStatus || 500,
        "openrouter",
        model
      );
    }
  }

  throw new LLMError(
    `Exhausted retries calling OpenRouter Embeddings API (${model})`,
    lastStatus,
    "openrouter",
    model
  );
}

// Generate embedding for single text
export async function getEmbedding(text: string, stage?: string | number): Promise<number[]> {
  const [emb] = await getEmbeddings([text], stage);
  return emb;
}

// Dimensionality reduction: Classical Multidimensional Scaling (MDS) / PCA to 2D
// Works dynamically for any vector dimension (64, 768, 1536, 2048, etc.)
export function projectTo2D(vectors: number[][]): { x: number; y: number }[] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];

  const dim = vectors[0]?.length || 0;
  if (dim === 0) return vectors.map(() => ({ x: 0, y: 0 }));

  // Center the data
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
