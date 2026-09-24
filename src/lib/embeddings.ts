import { CONFIG } from "./config";
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

// Fallback deterministic pseudo-semantic embedding vector (64 dimensions)
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
  if (!CONFIG.isMockMode && process.env.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text }] },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.embedding?.values) {
          return data.embedding.values as number[];
        }
      }
    } catch (err) {
      console.warn("Gemini embedding API failed, using fallback embedding:", err);
    }
  }

  return getLocalEmbedding(text);
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
    // Normalize initial vector
    let norm = Math.sqrt(p.reduce((acc, val) => acc + val * val, 0));
    p = p.map((val) => val / (norm || 1));

    for (let iter = 0; iter < numIterations; iter++) {
      // Multiply: C * p = (1/n) * X^T * (X * p)
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
