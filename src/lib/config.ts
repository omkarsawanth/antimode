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
  DEFAULT_LLM_MODEL: process.env.LLM_MODEL || "gemini-2.5-flash",
  DEFAULT_EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "text-embedding-004",

  // Mock mode check
  get isMockMode(): boolean {
    if (process.env.MOCK_MODE === "true") return true;
    if (process.env.MOCK_MODE === "false") return false;
    // If no API key configured, automatically default to mock mode so app runs out of the box
    return !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY;
  }
};
