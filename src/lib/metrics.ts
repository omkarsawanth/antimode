// Antimode Telemetry & Call Metrics (Never logs keys)

export interface StageMetrics {
  llm: number;
  embedding: number;
}

let totalLLMCalls = 0;
let totalEmbeddingCalls = 0;
const stageMetrics: Record<string, StageMetrics> = {};

function formatStageKey(stage?: string | number): string {
  if (stage === undefined || stage === null) return "General";
  return typeof stage === "number" ? `Stage ${stage}` : String(stage);
}

export function recordLLMCall(
  stage?: string | number,
  latencyMs: number = 0,
  provider: string = "",
  model: string = "",
  maxTokens: number = 0
): void {
  totalLLMCalls++;
  const stageKey = formatStageKey(stage);
  if (!stageMetrics[stageKey]) {
    stageMetrics[stageKey] = { llm: 0, embedding: 0 };
  }
  stageMetrics[stageKey].llm++;

  console.log(
    `[METRICS][LLM] Call #${totalLLMCalls} | ${stageKey} | PROVIDER: ${provider} | MODEL: ${model} | MAX_TOKENS: ${maxTokens} | LATENCY: ${latencyMs}ms | STAGE TOTAL: ${stageMetrics[stageKey].llm} LLMs | RUN TOTAL: ${totalLLMCalls} LLMs, ${totalEmbeddingCalls} Embeddings`
  );
}

export function recordEmbeddingCall(
  stage?: string | number,
  textCount: number = 1,
  latencyMs: number = 0,
  provider: string = "openrouter",
  model: string = ""
): void {
  totalEmbeddingCalls++;
  const stageKey = formatStageKey(stage);
  if (!stageMetrics[stageKey]) {
    stageMetrics[stageKey] = { llm: 0, embedding: 0 };
  }
  stageMetrics[stageKey].embedding++;

  console.log(
    `[METRICS][EMBEDDING] Call #${totalEmbeddingCalls} | ${stageKey} | PROVIDER: ${provider} | MODEL: ${model} | TEXTS: ${textCount} | LATENCY: ${latencyMs}ms | STAGE TOTAL: ${stageMetrics[stageKey].embedding} Batches | RUN TOTAL: ${totalLLMCalls} LLMs, ${totalEmbeddingCalls} Embeddings`
  );
}

export function getMetricsSummary(): {
  totalLLMCalls: number;
  totalEmbeddingCalls: number;
  stages: Record<string, StageMetrics>;
} {
  return {
    totalLLMCalls,
    totalEmbeddingCalls,
    stages: { ...stageMetrics },
  };
}

export function resetMetrics(): void {
  totalLLMCalls = 0;
  totalEmbeddingCalls = 0;
  for (const k of Object.keys(stageMetrics)) {
    delete stageMetrics[k];
  }
}
