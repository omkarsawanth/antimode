export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export const CONFIG = {
  // Thresholds as per SPEC section 6
  GENERICNESS_MAX_THRESHOLD: 55, // genericness <= 55
  PERCEPTION_GAP_MAX_THRESHOLD: 0.4, // perception_gap <= 0.4

  // Scoring weights
  GENERICNESS_EMBEDDING_WEIGHT: 0.7,
  GENERICNESS_CLICHE_WEIGHT: 0.3,

  // Baseline sample target
  BASELINE_SAMPLE_COUNT: 30,

  // LLM Config
  get DEFAULT_LLM_MODEL(): string {
    return process.env.LLM_MODEL || "gemini-3.6-flash";
  },
  get FALLBACK_LLM_MODEL(): string | undefined {
    return process.env.LLM_FALLBACK_MODEL || undefined;
  },
  get DEFAULT_EMBEDDING_MODEL(): string {
    return process.env.EMBEDDING_MODEL || "gemini-embedding-2";
  },

  // Mock mode check
  get isMockMode(): boolean {
    if (process.env.MOCK_MODE === "true") return true;
    if (process.env.MOCK_MODE === "false") return false;
    // If no API key configured, automatically default to mock mode so app runs out of the box
    return !getGeminiApiKey() && !process.env.OPENAI_API_KEY;
  },
};
