export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
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
  get LLM_PROVIDER(): string {
    const fromEnv = process.env.LLM_PROVIDER?.toLowerCase();
    if (fromEnv) return fromEnv;
    if (getOpenRouterApiKey()) return "openrouter";
    if (getGeminiApiKey()) return "gemini";
    if (process.env.OPENAI_API_KEY) return "openai";
    return "none";
  },
  get DEFAULT_LLM_MODEL(): string {
    const provider = this.LLM_PROVIDER;
    if (provider === "openrouter") {
      const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL;
      if (!model) {
        if (this.isMockMode) return "mock-openrouter-model";
        throw new Error(
          "LLM_MODEL environment variable is unset. When LLM_PROVIDER=openrouter, LLM_MODEL must be explicitly set in .env.local (e.g. LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free). Never falling back to Gemini default model."
        );
      }
      if (model === "gemini-3.6-flash" || model === "gemini-2.5-flash") {
        if (this.isMockMode) return "mock-openrouter-model";
        throw new Error(
          `Invalid LLM_MODEL for OpenRouter: "${model}" is the Gemini default model name. Please configure a valid OpenRouter model ID in .env.local (e.g. LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free or google/gemini-2.0-flash-001). Never falling back to Gemini default model.`
        );
      }
      return model;
    }
    if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
    return "gemini-3.6-flash";
  },
  get FALLBACK_LLM_MODEL(): string | undefined {
    return process.env.LLM_FALLBACK_MODEL || undefined;
  },
  get DEFAULT_EMBEDDING_MODEL(): string {
    return process.env.EMBEDDING_MODEL || "nvidia/nemotron-3-embed-1b:free";
  },

  // Mock mode check
  get isMockMode(): boolean {
    if (process.env.MOCK_MODE === "true") return true;
    if (process.env.MOCK_MODE === "false") return false;
    // If no API key configured, automatically default to mock mode so app runs out of the box
    return !getGeminiApiKey() && !getOpenRouterApiKey() && !process.env.OPENAI_API_KEY;
  },
};
