export function getGeminiApiKey(): string | undefined {
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  // If one starts with standard Google AI Studio prefix 'AIzaSy', prefer it
  if (geminiKey && geminiKey.startsWith("AIzaSy")) return geminiKey;
  if (googleKey && googleKey.startsWith("AIzaSy")) return googleKey;
  return geminiKey || googleKey;
}

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
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
    // If GROQ_API_KEY is configured and no other provider is forced
    if (getGroqApiKey()) return "groq";
    // If LLM_MODEL is explicitly an OpenRouter model name (contains /)
    const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL;
    if (model && model.includes("/") && getOpenRouterApiKey()) {
      return "openrouter";
    }
    // As per user spec: OpenRouter is selected when LLM_PROVIDER=openrouter.
    // If LLM_PROVIDER is unset, prefer Gemini if Gemini/Google API key is configured.
    if (getGeminiApiKey()) return "gemini";
    if (getOpenRouterApiKey()) return "openrouter";
    if (process.env.OPENAI_API_KEY) return "openai";
    return "none";
  },
  get DEFAULT_LLM_MODEL(): string {
    const provider = this.LLM_PROVIDER;
    if (provider === "groq") {
      return process.env.LLM_MODEL || "llama-3.3-70b-versatile";
    }
    if (provider === "openrouter") {
      const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL;
      if (!model) {
        if (this.isMockMode) return "mock-openrouter-model";
        throw new Error(
          "LLM_MODEL environment variable is unset. When LLM_PROVIDER=openrouter, LLM_MODEL must be explicitly set in .env.local (e.g. LLM_MODEL=nex-agi/nex-n2.5-mini:free or google/gemini-2.0-flash-001). Never falling back to Gemini default model."
        );
      }
      if (model.startsWith("gemini-")) {
        if (this.isMockMode) return "mock-openrouter-model";
        throw new Error(
          `Invalid LLM_MODEL for OpenRouter: "${model}" is a Gemini direct model name without an OpenRouter provider prefix. For OpenRouter, set LLM_MODEL in .env.local to a valid OpenRouter model ID (e.g. LLM_MODEL=nex-agi/nex-n2.5-mini:free or google/gemini-2.0-flash-001). Never falling back to Gemini default model.`
        );
      }
      return model;
    }
    if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
    return "gemini-3.5-flash";
  },
  get FALLBACK_LLM_MODEL(): string | undefined {
    if (process.env.LLM_FALLBACK_MODEL) return process.env.LLM_FALLBACK_MODEL;
    if (this.LLM_PROVIDER === "groq") return "llama-3.1-8b-instant";
    if (this.LLM_PROVIDER === "gemini") return "gemini-3.5-flash-lite";
    return undefined;
  },
  get DEFAULT_EMBEDDING_MODEL(): string {
    return process.env.EMBEDDING_MODEL || "nvidia/nemotron-3-embed-1b:free";
  },

  // Mock mode check
  get isMockMode(): boolean {
    if (process.env.MOCK_MODE === "true") return true;
    if (process.env.MOCK_MODE === "false") return false;
    // If no API key configured, automatically default to mock mode so app runs out of the box
    return !getGeminiApiKey() && !getOpenRouterApiKey() && !getGroqApiKey() && !process.env.OPENAI_API_KEY;
  },
};
