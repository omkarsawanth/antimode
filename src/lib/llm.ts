import crypto from "crypto";
import { ZodSchema } from "zod";
import { CONFIG, getGeminiApiKey, getOpenRouterApiKey, getGroqApiKey, getHfToken, getCerebrasApiKey } from "./config";
import { recordLLMCall } from "./metrics";
import { isQuotaExhausted } from "./embeddings";

// Prompt-hash response cache with LRU eviction (max 200 items)
const MAX_CACHE_ENTRIES = 200;
const llmCache = new Map<string, any>();

function getCachedResponse(key: string): any {
  if (!llmCache.has(key)) return undefined;
  const value = llmCache.get(key);
  llmCache.delete(key);
  llmCache.set(key, value);
  return value;
}

function setCachedResponse(key: string, value: any): void {
  if (llmCache.has(key)) {
    llmCache.delete(key);
  } else if (llmCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = llmCache.keys().next().value;
    if (oldestKey) llmCache.delete(oldestKey);
  }
  llmCache.set(key, value);
}

// Global Budget and Rate Limit Tracking
const providerTokensUsed = new Map<string, number>();
const providerLastReset = new Map<string, string>();
const providerLastCallTime = new Map<string, number>();
export const providerCooldowns = new Map<string, number>();

export function getBudgetStatus(provider: string = "default") {
  const now = new Date();
  const currentDate = now.toLocaleDateString();
  const lastReset = providerLastReset.get(provider) || "";
  
  if (currentDate !== lastReset) {
    providerTokensUsed.set(provider, 0);
    providerLastReset.set(provider, currentDate);
  }
  
  const resetsAt = new Date(now);
  resetsAt.setHours(24, 0, 0, 0);
  const used = providerTokensUsed.get(provider) || 0;
  return {
    used,
    limit: CONFIG.DAILY_TOKEN_BUDGET,
    remaining: Math.max(0, CONFIG.DAILY_TOKEN_BUDGET - used),
    resetsAt: resetsAt.toISOString(),
  };
}

export function checkBudget(estimatedTokens: number, provider: string, model: string) {
  const status = getBudgetStatus(provider);
  if (status.used + estimatedTokens > status.limit) {
    throw new LLMError(
      `Daily token budget exhausted (${status.used} / ${status.limit} used), resets at ${status.resetsAt}`,
      429,
      provider,
      model
    );
  }
}

export function recordUsage(
  prompt_tokens?: number,
  completion_tokens?: number,
  estimated_max?: number,
  provider: string = "default"
) {
  const used = (prompt_tokens || 0) + (completion_tokens || 0);
  if (used === 0) {
    const est = estimated_max || 0;
    if (est > 0) {
      getBudgetStatus(provider);
      const curr = providerTokensUsed.get(provider) || 0;
      providerTokensUsed.set(provider, curr + est);
    }
    return;
  }
  
  getBudgetStatus(provider); 
  const curr = providerTokensUsed.get(provider) || 0;
  providerTokensUsed.set(provider, curr + used);
}

export async function enforceRateLimit(provider: string = "default") {
  const now = Date.now();
  const lastCallTime = providerLastCallTime.get(provider) || 0;
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < CONFIG.LLM_MIN_CALL_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, CONFIG.LLM_MIN_CALL_INTERVAL_MS - timeSinceLastCall));
  }
  providerLastCallTime.set(provider, Date.now());
}

export class LLMError extends Error {
  public status: number;
  public provider: string;
  public model: string;

  constructor(
    message: string,
    status: number = 500,
    provider: string = "openrouter",
    model: string = "unknown"
  ) {
    super(message);
    this.name = "LLMError";
    this.status = status;
    this.provider = provider;
    this.model = model;
  }
}

export interface CallLLMOptions<T> {
  prompt: string;
  schema: ZodSchema<T>;
  temperature?: number;
  timeoutMs?: number;
  mockFallback: () => T;
  model?: string;
  stage?: number | string;
  maxTokens?: number;
}

export function resolveMaxTokens(stage?: string | number, customMaxTokens?: number): number {
  if (process.env.LLM_MAX_TOKENS) {
    const parsed = parseInt(process.env.LLM_MAX_TOKENS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (customMaxTokens && customMaxTokens > 0) {
    return customMaxTokens;
  }

  let stageNum: number | undefined;
  if (typeof stage === "number") {
    stageNum = stage;
  } else if (typeof stage === "string") {
    const match = stage.match(/\d+/);
    if (match) stageNum = parseInt(match[0], 10);
  }

  switch (stageNum) {
    case 1: // Interview turns
      return 1500;
    case 2: // Generating baseline samples
      return 3000;
    case 3: // Diverge directions & critic
      return 3000;
    case 4: // Scoring & blind reads
      return 1500;
    case 5: // Direction edit / rescoring
      return 2500;
    case 6: // Trademark collision
      return 2000;
    case 7: // Red-team attack
      return 2000;
    case 8: // Launch kit deliver
      return 3000;
    case 9: // Brand guardian audit
      return 1500;
    default:
      return 2000;
  }
}

export function resolveLLMModel(provider: string, customModel?: string): string {
  if (customModel) return customModel;

  if (provider === "openrouter") {
    const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL;
    if (!model) {
      if (CONFIG.isMockMode) return "mock-openrouter-model";
      throw new LLMError(
        "LLM_MODEL environment variable is unset. When LLM_PROVIDER=openrouter, you must set LLM_MODEL in .env.local (e.g. LLM_MODEL=nex-agi/nex-n2.5-mini:free or google/gemini-2.0-flash-001). Never falling back to Gemini default model.",
        400,
        "openrouter",
        "unset"
      );
    }
    if (model.startsWith("gemini-")) {
      if (CONFIG.isMockMode) return "mock-openrouter-model";
      throw new LLMError(
        `Invalid LLM_MODEL for OpenRouter: "${model}". "${model}" is a Gemini direct model name without an OpenRouter provider prefix. Please set LLM_MODEL in .env.local to a valid OpenRouter model ID (e.g. LLM_MODEL=nex-agi/nex-n2.5-mini:free or google/gemini-2.0-flash-001). Never falling back to Gemini default model.`,
        400,
        "openrouter",
        model
      );
    }
    return model;
  }

  if (provider === "groq") {
    return process.env.LLM_MODEL || "qwen/qwen3.8-27b";
  }

  if (provider === "gemini") {
    return process.env.LLM_MODEL || "gemini-3.5-flash";
  }

  if (provider === "openai") {
    return process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  if (provider === "huggingface") {
    const model = process.env.LLM_MODEL;
    if (!model) {
      if (CONFIG.isMockMode) return "mock-hf-model";
      throw new LLMError(
        "LLM_MODEL environment variable is unset. When LLM_PROVIDER=huggingface, you must set LLM_MODEL in .env.local. Never falling back silently.",
        400,
        "huggingface",
        "unset"
      );
    }
    if (model.startsWith("gemini-") || model.startsWith("llama-3.3-70b-versatile")) {
      if (CONFIG.isMockMode) return "mock-hf-model";
      throw new LLMError(
        `Invalid LLM_MODEL for Hugging Face: "${model}". For Hugging Face, set LLM_MODEL in .env.local to a valid Hugging Face model ID. Never falling back silently.`,
        400,
        "huggingface",
        model
      );
    }
    return model;
  }

  return process.env.LLM_MODEL || "gemini-3.5-flash";
}

function getCacheKey(prompt: string, model: string, temperature: number, maxTokens: number): string {
  const content = `${model}::${temperature}::${maxTokens}::${prompt}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

function cleanJsonCandidate(str: string): string {
  // Strip trailing commas before closing brackets or braces
  return str.replace(/,\s*([\]}])/g, "$1").trim();
}

// Clean JSON string - handles markdown blocks, preambles, and raw JSON
export function extractJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // 1. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // 2. Try cleaned candidate (trailing commas removed)
    try {
      return JSON.parse(cleanJsonCandidate(cleaned));
    } catch {
      // 3. If model added conversational pre-amble/post-amble, locate first { or [ to matching } or ]
      const firstBrace = cleaned.indexOf("{");
      const firstBracket = cleaned.indexOf("[");

      let startIndex = -1;
      let isObject = false;

      if (firstBrace !== -1 && firstBracket !== -1) {
        if (firstBrace < firstBracket) {
          startIndex = firstBrace;
          isObject = true;
        } else {
          startIndex = firstBracket;
          isObject = false;
        }
      } else if (firstBrace !== -1) {
        startIndex = firstBrace;
        isObject = true;
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
        isObject = false;
      }

      if (startIndex !== -1) {
        const endIndex = isObject ? cleaned.lastIndexOf("}") : cleaned.lastIndexOf("]");
        if (endIndex > startIndex) {
          const candidate = cleaned.substring(startIndex, endIndex + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            try {
              return JSON.parse(cleanJsonCandidate(candidate));
            } catch {
              // fall through to error
            }
          }
        }
      }

      throw new Error(`Failed to extract valid JSON from model response: "${raw.substring(0, 200)}..."`);
    }
  }
}


async function callCerebrasApi(prompt: string, model: string, apiKey: string, maxTries: number = 4) {
  const endpoint = "https://api.cerebras.ai/v1/chat/completions";
  const timeoutMs = 45000;
  let lastStatus = 500;
  
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.status === 429 || res.status === 402) {
        lastStatus = 429;
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new LLMError("Cerebras rate limit", 429, "cerebras", model);
      }

      if (res.status >= 500 && res.status <= 504) {
        lastStatus = res.status;
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(`Cerebras API error ${res.status}`, res.status, "cerebras", model);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new LLMError(`Cerebras API error ${res.status}: ${errText}`, res.status, "cerebras", model);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new LLMError("Empty message response", 502, "cerebras", model);
      
      recordUsage(data.usage?.prompt_tokens, data.usage?.completion_tokens, 0, "cerebras");
      return text;
    } catch (err: any) {
      if (err instanceof LLMError) throw err;
      if (err.name === "AbortError") {
        throw new LLMError(`Timeout after ${timeoutMs}ms`, 504, "cerebras", model);
      }
      if (attempt < maxTries - 1) {
        const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new LLMError(err.message || "Failed Cerebras", lastStatus, "cerebras", model);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new LLMError("Exhausted retries", lastStatus, "cerebras", model);
}

export async function callLLM<T>(options: CallLLMOptions<T>): Promise<T> {
  const {
    prompt,
    schema,
    temperature = 0.7,
    timeoutMs = 50000,
    mockFallback,
    model: customModel,
    stage,
    maxTokens: customMaxTokens,
  } = options;

  const startTime = Date.now();
  let provider = CONFIG.LLM_PROVIDER;
  let model = resolveLLMModel(provider, customModel);
  const maxTokens = resolveMaxTokens(stage, customMaxTokens);
  const stageKey = typeof stage === "number" ? `Stage ${stage}` : stage || "General";

  // Log model ID and max_tokens on every call
  console.log(
    `[LLM] CALL START | STAGE: ${stageKey} | PROVIDER: ${provider} | MODEL: ${model} | MAX_TOKENS: ${maxTokens}`
  );

  // 1. If explicitly in mock mode, return fixture JSON
  if (CONFIG.isMockMode) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[LLM] MODE: MOCK | STAGE: ${stageKey} | PROVIDER: fixture | MODEL: ${model} | MAX_TOKENS: ${maxTokens} | LATENCY: ${elapsed}ms`
    );
    recordLLMCall(stage, elapsed, "fixture", model, maxTokens);
    return mockFallback();
  }

  // 2. Check hash cache with LRU refresh
  const cacheKey = getCacheKey(prompt, model, temperature, maxTokens);
  const cached = getCachedResponse(cacheKey);
  if (cached !== undefined) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[LLM] MODE: LIVE | PROVIDER: ${provider} | MODEL: ${model} | MAX_TOKENS: ${maxTokens} | LATENCY: ${elapsed}ms | CACHE: HIT`
    );
    recordLLMCall(stage, elapsed, provider, model, maxTokens);
    return cached as T;
  }

  const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

  // OpenRouter Chat Completions Call
  async function callOpenRouterApi(
    currentPrompt: string,
    targetModel: string,
    apiKey: string,
    maxTries: number = 4
  ): Promise<string> {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    let lastStatus = 500;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(
          `[LLM][OpenRouter] Requesting model: "${targetModel}" | max_tokens: ${maxTokens} | attempt: ${attempt + 1}/${maxTries}`
        );
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://antimode.dev",
            "X-Title": "Antimode Brand Engine",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: currentPrompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        // Check for quota exhaustion first - DO NOT RETRY
        if (res.status === 429 || res.status === 402) {
          const errText = await res.text();
          if (isQuotaExhausted(res.status, errText)) {
            console.warn(`[LLM] OpenRouter quota exhausted (HTTP ${res.status}). Skipping retries.`);
            throw new LLMError(
              `OpenRouter quota exhausted (HTTP ${res.status}): ${errText}`,
              res.status,
              "openrouter",
              targetModel
            );
          }

          // Transient 429 rate limit
          lastStatus = 429;
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP 429 Rate Limit from OpenRouter (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `OpenRouter API rate limit exceeded (HTTP 429): ${errText}`,
            429,
            "openrouter",
            targetModel
          );
        }

        // 5xx retryable status
        if (res.status >= 500 && res.status <= 504) {
          lastStatus = res.status;
          const errText = await res.text();
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP ${res.status} error from OpenRouter (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `OpenRouter API error (HTTP ${res.status}): ${errText}`,
            res.status,
            "openrouter",
            targetModel
          );
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new LLMError(
            `OpenRouter API error ${res.status}: ${errText}`,
            res.status,
            "openrouter",
            targetModel
          );
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          throw new LLMError("Empty message response from OpenRouter API", 502, "openrouter", targetModel);
        }
        return text;
      } catch (fetchErr: any) {
        if (fetchErr instanceof LLMError) throw fetchErr;
        if (fetchErr.name === "AbortError") {
          throw new LLMError(
            `OpenRouter request timed out after ${timeoutMs}ms`,
            504,
            "openrouter",
            targetModel
          );
        }
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[LLM] Fetch error on OpenRouter model ${targetModel}: ${fetchErr.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          fetchErr.message || "Failed to communicate with OpenRouter API",
          lastStatus || 500,
          "openrouter",
          targetModel
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new LLMError(
      `Exhausted retries calling OpenRouter API (${targetModel})`,
      lastStatus,
      "openrouter",
      targetModel
    );
  }

  // Groq API invocation with backoff
  async function callGroqApi(
    currentPrompt: string,
    targetModel: string,
    apiKey: string,
    maxTries: number = 4
  ): Promise<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    let lastStatus = 500;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(
          `[LLM][Groq] Requesting model: "${targetModel}" | max_tokens: ${maxTokens} | attempt: ${attempt + 1}/${maxTries}`
        );
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: currentPrompt }],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
        });

        // Check for quota exhaustion first - DO NOT RETRY
        if (res.status === 429 || res.status === 402) {
          const errText = await res.text();
          if (isQuotaExhausted(res.status, errText)) {
            console.warn(`[LLM] Groq quota exhausted (HTTP ${res.status}). Skipping retries.`);
            throw new LLMError(
              `Groq quota exhausted (HTTP ${res.status}): ${errText}`,
              res.status,
              "groq",
              targetModel
            );
          }

          // Transient 429 rate limit
          lastStatus = 429;
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP 429 Rate Limit from Groq (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Groq API rate limit exceeded (HTTP 429): ${errText}`,
            429,
            "groq",
            targetModel
          );
        }

        // 5xx retryable status
        if (res.status >= 500 && res.status <= 504) {
          lastStatus = res.status;
          const errText = await res.text();
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP ${res.status} error from Groq (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Groq API error (HTTP ${res.status}): ${errText}`,
            res.status,
            "groq",
            targetModel
          );
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new LLMError(
            `Groq API error ${res.status}: ${errText}`,
            res.status,
            "groq",
            targetModel
          );
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          throw new LLMError("Empty message response from Groq API", 502, "groq", targetModel);
        }
        return text;
      } catch (fetchErr: any) {
        if (fetchErr instanceof LLMError) throw fetchErr;
        if (fetchErr.name === "AbortError") {
          throw new LLMError(
            `Groq request timed out after ${timeoutMs}ms`,
            504,
            "groq",
            targetModel
          );
        }
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[LLM] Fetch error on Groq model ${targetModel}: ${fetchErr.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          fetchErr.message || "Failed to communicate with Groq API",
          lastStatus || 500,
          "groq",
          targetModel
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new LLMError(
      `Exhausted retries calling Groq API (${targetModel})`,
      lastStatus,
      "groq",
      targetModel
    );
  }

  // Gemini API invocation with backoff
  async function callGeminiApi(
    currentPrompt: string,
    targetModel: string,
    key: string,
    maxTries: number = 4
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
    let lastStatus = 500;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(
          `[LLM][Gemini] Requesting model: "${targetModel}" | max_tokens: ${maxTokens} | attempt: ${attempt + 1}/${maxTries}`
        );
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json",
            },
          }),
        });

        if (res.status === 429 || res.status === 402) {
          const errText = await res.text();
          if (isQuotaExhausted(res.status, errText)) {
            console.warn(`[LLM] Gemini quota exhausted (HTTP ${res.status}). Skipping retries.`);
            throw new LLMError(
              `Gemini quota exhausted (HTTP ${res.status}): ${errText}`,
              res.status,
              "gemini",
              targetModel
            );
          }

          lastStatus = 429;
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP 429 Rate Limit on model ${targetModel}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Gemini API error (HTTP 429) on model ${targetModel}: ${errText}`,
            429,
            "gemini",
            targetModel
          );
        }

        if (RETRYABLE_STATUS_CODES.includes(res.status)) {
          lastStatus = res.status;
          const errText = await res.text();
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP ${res.status} error on model ${targetModel}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Gemini API error (HTTP ${res.status}) on model ${targetModel}: ${errText}`,
            res.status,
            "gemini",
            targetModel
          );
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new LLMError(
            `Gemini API error ${res.status}: ${errText}`,
            res.status,
            "gemini",
            targetModel
          );
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new LLMError("Empty candidate response from Gemini API", 502, "gemini", targetModel);
        }
        return text;
      } catch (fetchErr: any) {
        if (fetchErr instanceof LLMError) throw fetchErr;
        if (fetchErr.name === "AbortError") {
          throw new LLMError(
            `Gemini request timed out after ${timeoutMs}ms`,
            504,
            "gemini",
            targetModel
          );
        }
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[LLM] Network/fetch error on model ${targetModel}: ${fetchErr.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          fetchErr.message || "Failed to communicate with Gemini API",
          lastStatus || 500,
          "gemini",
          targetModel
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new LLMError(
      `Exhausted retries calling Gemini API (${targetModel})`,
      lastStatus,
      "gemini",
      targetModel
    );
  }

  // Hugging Face API invocation with backoff
  async function callHuggingFaceApi(
    currentPrompt: string,
    targetModel: string,
    apiKey: string,
    maxTries: number = 4
  ): Promise<string> {
    const url = "https://router.huggingface.co/v1/chat/completions";
    let lastStatus = 500;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(
          `[LLM][HuggingFace] Requesting model: "${targetModel}" | max_tokens: ${maxTokens} | attempt: ${attempt + 1}/${maxTries}`
        );
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: currentPrompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        // Check for quota exhaustion first - DO NOT RETRY
        if (res.status === 429 || res.status === 402 || res.status === 403) {
          const errText = await res.text();
          if (isQuotaExhausted(res.status, errText)) {
            console.warn(`[LLM] Hugging Face quota exhausted (HTTP ${res.status}). Skipping retries.`);
            throw new LLMError(
              `Hugging Face quota exhausted (HTTP ${res.status}): ${errText}`,
              res.status,
              "huggingface",
              targetModel
            );
          }

          // Transient 429 rate limit
          lastStatus = 429;
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP 429 Rate Limit from Hugging Face (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Hugging Face API rate limit exceeded (HTTP 429): ${errText}`,
            429,
            "huggingface",
            targetModel
          );
        }

        // 5xx retryable status
        if (res.status >= 500 && res.status <= 504) {
          lastStatus = res.status;
          const errText = await res.text();
          if (attempt < maxTries - 1) {
            const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(
              `[LLM] HTTP ${res.status} error from Hugging Face (${targetModel}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            `Hugging Face API error (HTTP ${res.status}): ${errText}`,
            res.status,
            "huggingface",
            targetModel
          );
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new LLMError(
            `Hugging Face API error ${res.status}: ${errText}`,
            res.status,
            "huggingface",
            targetModel
          );
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          throw new LLMError("Empty message response from Hugging Face API", 502, "huggingface", targetModel);
        }
        return text;
      } catch (fetchErr: any) {
        if (fetchErr instanceof LLMError) throw fetchErr;
        if (fetchErr.name === "AbortError") {
          throw new LLMError(
            `Hugging Face request timed out after ${timeoutMs}ms`,
            504,
            "huggingface",
            targetModel
          );
        }
        if (attempt < maxTries - 1) {
          const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
          console.warn(
            `[LLM] Fetch error on Hugging Face model ${targetModel}: ${fetchErr.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxTries - 1})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new LLMError(
          fetchErr.message || "Failed to communicate with Hugging Face API",
          lastStatus || 500,
          "huggingface",
          targetModel
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new LLMError(
      `Exhausted retries calling Hugging Face API (${targetModel})`,
      lastStatus,
      "huggingface",
      targetModel
    );
  }

  // Helper for single invocation with model fallback
  async function invokeProvider(currentPrompt: string, selectedProvider: string, targetModel: string): Promise<string> {
    // Proactive daily token budget & rate limiting (unless mock mode)
    if (!CONFIG.isMockMode) {
      checkBudget(maxTokens, selectedProvider, targetModel);
      await enforceRateLimit(selectedProvider);
    }

    if (selectedProvider === "groq") {
      const groqKey = getGroqApiKey();
      if (!groqKey) {
        throw new LLMError("No Groq API key", 401, "groq", targetModel);
      }
      return await callGroqApi(currentPrompt, targetModel, groqKey, 1); // 1 try, failover to next provider!
    } else if (selectedProvider === "cerebras") {
      const cerebrasKey = getCerebrasApiKey();
      if (!cerebrasKey) throw new LLMError("No Cerebras API key", 401, "cerebras", targetModel);
      return await callCerebrasApi(currentPrompt, targetModel, cerebrasKey, 1);
    } else if (selectedProvider === "huggingface") {
      const hfToken = getHfToken();
      if (!hfToken) throw new LLMError("No HF token", 401, "huggingface", targetModel);
      return await callHuggingFaceApi(currentPrompt, targetModel, hfToken, 1);
    } else if (selectedProvider === "openrouter") {
      const openRouterKey = getOpenRouterApiKey();
      if (!openRouterKey) throw new LLMError("No OR key", 401, "openrouter", targetModel);
      return await callOpenRouterApi(currentPrompt, targetModel, openRouterKey, 1);
    } else if (selectedProvider === "gemini") {
      const geminiKey = getGeminiApiKey();
      if (!geminiKey) throw new LLMError("No Gemini key", 401, "gemini", targetModel);
      return await callGeminiApi(currentPrompt, targetModel, geminiKey, 1);
    } else if (selectedProvider === "openai") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: controller.signal,
          body: JSON.stringify({ model: targetModel, temperature, max_tokens: maxTokens, messages: [{ role: "user", content: currentPrompt }] }),
        });
        if (!res.ok) {
           if (res.status === 429 || res.status === 402) {
             const retryAfter = res.headers.get("retry-after") || "60";
             throw new LLMError("Rate limited", 429, "openai", targetModel);
           }
           throw new LLMError("OpenAI error", res.status, "openai", targetModel);
        }
        const data = await res.json();
        recordUsage(data.usage?.prompt_tokens, data.usage?.completion_tokens, maxTokens, "openai");
        return data.choices?.[0]?.message?.content || "";
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new LLMError("Unknown provider", 400, selectedProvider, targetModel);
  }

  // Execution with provider failover chain and 1 retry on schema validation failure
  let lastErr: any;
  const chain = CONFIG.LLM_PROVIDER_CHAIN;

  for (const selectedProvider of chain) {
    const cooldownUntil = providerCooldowns.get(selectedProvider) || 0;
    if (Date.now() < cooldownUntil) {
      console.log(`[LLM] Provider ${selectedProvider} is cooling down, skipping...`);
      continue;
    }
    
    provider = selectedProvider;
    model = customModel ? resolveLLMModel(selectedProvider, customModel) : CONFIG.getProviderModel(selectedProvider);
    
    try {
      const rawOutput = await invokeProvider(prompt, provider, model);
      let parsed: any;
      let validationErrorMsg = "";

      try {
        parsed = extractJson(rawOutput);
        const valResult = schema.safeParse(parsed);
        if (valResult.success) {
          setCachedResponse(cacheKey, valResult.data);
          const elapsed = Date.now() - startTime;
          recordLLMCall(stage, elapsed, provider, model, maxTokens);
          (global as any).lastActiveProvider = provider;
          (global as any).lastActiveModel = model;
          return valResult.data;
        }
        validationErrorMsg = JSON.stringify(valResult.error.format(), null, 2);
      } catch (parseErr) {
        validationErrorMsg = `JSON Parsing Error: ${String(parseErr)}. Please ensure your output is COMPLETE and strictly formatted as JSON.`;
      }

      console.warn(`[LLM] Output schema validation or parsing failed on ${provider}. Retrying once with error feedback...`);
      const retryPrompt = `${prompt}\n\nCRITICAL: Your previous response failed validation with error:\n${validationErrorMsg}\nPlease re-generate your response and ensure it strictly conforms to the requested JSON schema and is fully complete.`;

      const retryOutput = await invokeProvider(retryPrompt, provider, model);
      let retryParsed: any;
      try {
        retryParsed = extractJson(retryOutput);
      } catch (retryParseErr) {
        throw new LLMError(
          `Model response failed JSON parsing after retry: ${String(retryParseErr)}`,
          502,
          provider,
          model
        );
      }
      
      const retryValResult = schema.safeParse(retryParsed);

      if (retryValResult.success) {
        setCachedResponse(cacheKey, retryValResult.data);
        const elapsed = Date.now() - startTime;
        recordLLMCall(stage, elapsed, provider, model, maxTokens);
        (global as any).lastActiveProvider = provider;
        (global as any).lastActiveModel = model;
        return retryValResult.data;
      }

      throw new LLMError(
        `Model response failed schema validation after retry: ${JSON.stringify(retryValResult.error.format())}`,
        502,
        provider,
        model
      );
    } catch (err: any) {
      lastErr = err;
      const elapsed = Date.now() - startTime;
      console.error(
        `[LLM] CALL FAILED | STAGE: ${stageKey} | PROVIDER: ${provider} | MODEL: ${model} | MAX_TOKENS: ${maxTokens} | ERROR: ${err?.message} | LATENCY: ${elapsed}ms`
      );

      // Check for rate-limit / quota / budget exhaust
      if (
        err.status === 429 || 
        err.status === 402 || 
        err.status === 403 || 
        err.status === 401 ||
        (err.message && err.message.includes("budget exhausted"))
      ) {
        let resetTime = Date.now() + 60000;
        if (err.message && err.message.includes("budget exhausted")) {
           const resetsAtStr = err.message.split("resets at ")[1];
           if (resetsAtStr) {
              const resetDate = new Date(resetsAtStr);
              if (!isNaN(resetDate.getTime())) resetTime = resetDate.getTime();
           }
        }
        providerCooldowns.set(provider, resetTime);
        console.log(`[LLM] Provider ${provider} exhausted, falling back to next...`);
        continue; // Immediately try next provider in chain
      }
      
      if (CONFIG.isMockMode) {
         console.warn(`[LLM] MODE: MOCK_FALLBACK (Mock Mode is active) | LATENCY: ${elapsed}ms`);
         (global as any).lastActiveProvider = "mock";
         (global as any).lastActiveModel = "mock";
         return mockFallback();
      }
      
      throw err; // For non-429s, throw immediately and fail stage
    }
  }

  if (CONFIG.isMockMode) {
      (global as any).lastActiveProvider = "mock";
      (global as any).lastActiveModel = "mock";
      return mockFallback();
  }
  
  if (lastErr && !(lastErr.status === 429 || lastErr.status === 402 || lastErr.status === 403 || lastErr.status === 401 || (lastErr.message && lastErr.message.includes("budget exhausted")))) {
    if (lastErr instanceof LLMError) throw lastErr;
    throw new LLMError(lastErr.message || "LLM call failed", lastErr.status || 500, "all", "all");
  }
  
  throw new LLMError("all configured providers are rate-limited, next available at midnight", 429, "all", "all");
}

