import crypto from "crypto";
import { ZodSchema } from "zod";
import { CONFIG, getGeminiApiKey, getOpenRouterApiKey } from "./config";
import { recordLLMCall } from "./metrics";
import { isQuotaExhausted } from "./embeddings";

// Prompt-hash response cache
const llmCache = new Map<string, any>();

export class LLMError extends Error {
  public status: number;
  public provider: string;
  public model: string;

  constructor(
    message: string,
    status: number = 500,
    provider: string = "openrouter",
    model: string = CONFIG.DEFAULT_LLM_MODEL
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
}

function getCacheKey(prompt: string, model: string, temperature: number): string {
  const content = `${model}::${temperature}::${prompt}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Clean JSON string - handles markdown blocks, preambles, and raw JSON
export function extractJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // If model added conversational pre-amble/post-amble, locate first { or [ to matching } or ]
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
        return JSON.parse(candidate);
      }
    }

    throw new Error(`Failed to extract valid JSON from model response: "${raw.substring(0, 200)}..."`);
  }
}

export async function callLLM<T>(options: CallLLMOptions<T>): Promise<T> {
  const {
    prompt,
    schema,
    temperature = 0.7,
    timeoutMs = 50000,
    mockFallback,
    model = CONFIG.DEFAULT_LLM_MODEL,
    stage,
  } = options;

  const startTime = Date.now();
  const provider = CONFIG.LLM_PROVIDER;

  // 1. If explicitly in mock mode, return fixture JSON
  if (CONFIG.isMockMode) {
    const elapsed = Date.now() - startTime;
    recordLLMCall(stage, elapsed, "fixture", model);
    return mockFallback();
  }

  // 2. Check hash cache
  const cacheKey = getCacheKey(prompt, model, temperature);
  if (llmCache.has(cacheKey)) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[LLM] MODE: LIVE | PROVIDER: ${provider} | MODEL: ${model} | LATENCY: ${elapsed}ms | CACHE: HIT`
    );
    return llmCache.get(cacheKey) as T;
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
            // Do NOT include response_format: { type: "json_object" } to support all open models
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
        if (attempt < maxTries - 1 && fetchErr.name !== "AbortError") {
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
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }] }],
            generationConfig: {
              temperature,
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
        if (attempt < maxTries - 1 && fetchErr.name !== "AbortError") {
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

  // Helper for single invocation with model fallback
  async function invokeProvider(currentPrompt: string): Promise<string> {
    const selectedProvider = CONFIG.LLM_PROVIDER;

    if (selectedProvider === "openrouter") {
      const openRouterKey = getOpenRouterApiKey();
      if (!openRouterKey) {
        throw new LLMError(
          "No OpenRouter API key configured. Provide OPENROUTER_API_KEY in .env.local",
          401,
          "openrouter",
          model
        );
      }

      try {
        return await callOpenRouterApi(currentPrompt, model, openRouterKey, 4);
      } catch (err: any) {
        const fallbackModel = CONFIG.FALLBACK_LLM_MODEL;
        // If primary model returns 503 after retries and LLM_FALLBACK_MODEL is configured
        if (err instanceof LLMError && err.status === 503 && fallbackModel && fallbackModel !== model) {
          console.warn(
            `[LLM] Primary model ${model} returned HTTP 503 after retries. Switching to fallback model: ${fallbackModel}`
          );
          return await callOpenRouterApi(currentPrompt, fallbackModel, openRouterKey, 1);
        }
        throw err;
      }
    } else if (selectedProvider === "gemini") {
      const geminiKey = getGeminiApiKey();
      if (!geminiKey) {
        throw new LLMError(
          "No Gemini API key configured. Provide GEMINI_API_KEY or GOOGLE_API_KEY in .env.local",
          401,
          "gemini",
          model
        );
      }

      try {
        return await callGeminiApi(currentPrompt, model, geminiKey, 4);
      } catch (err: any) {
        const fallbackModel = CONFIG.FALLBACK_LLM_MODEL;
        if (err instanceof LLMError && err.status === 503 && fallbackModel && fallbackModel !== model) {
          console.warn(
            `[LLM] Primary model ${model} returned HTTP 503 after retries. Switching to fallback model: ${fallbackModel}`
          );
          return await callGeminiApi(currentPrompt, fallbackModel, geminiKey, 1);
        }
        throw err;
      }
    } else if (selectedProvider === "openai") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature,
            messages: [{ role: "user", content: currentPrompt }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new LLMError(
            `OpenAI API error ${res.status}: ${errText.substring(0, 300)}`,
            res.status,
            "openai",
            process.env.OPENAI_MODEL || "gpt-4o-mini"
          );
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } finally {
        clearTimeout(timeout);
      }
    } else {
      throw new LLMError(
        "No LLM API key configured. Provide OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env.local",
        401,
        "none",
        model
      );
    }
  }

  // Execution with 1 retry on schema validation failure
  try {
    const rawOutput = await invokeProvider(prompt);
    let parsed: any;
    try {
      parsed = extractJson(rawOutput);
    } catch (parseErr) {
      throw new LLMError(
        `Failed to parse JSON from model output: ${String(parseErr)}`,
        502,
        provider,
        model
      );
    }

    const valResult = schema.safeParse(parsed);
    if (valResult.success) {
      llmCache.set(cacheKey, valResult.data);
      const elapsed = Date.now() - startTime;
      recordLLMCall(stage, elapsed, provider, model);
      return valResult.data;
    }

    // Validation failed - retry ONCE with error message appended
    console.warn("[LLM] Output schema validation failed. Retrying once with error feedback...");
    const retryPrompt = `${prompt}

CRITICAL: Your previous response failed schema validation with error:
${JSON.stringify(valResult.error.format(), null, 2)}
Please re-generate your response and ensure it strictly conforms to the requested JSON schema.`;

    const retryOutput = await invokeProvider(retryPrompt);
    const retryParsed = extractJson(retryOutput);
    const retryValResult = schema.safeParse(retryParsed);

    if (retryValResult.success) {
      llmCache.set(cacheKey, retryValResult.data);
      const elapsed = Date.now() - startTime;
      recordLLMCall(stage, elapsed, provider, model);
      return retryValResult.data;
    }

    // Schema validation failed after retry:
    throw new LLMError(
      `Model response failed schema validation after retry: ${JSON.stringify(retryValResult.error.format())}`,
      502,
      provider,
      model
    );
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(
      `[LLM] CALL FAILED | PROVIDER: ${provider} | MODEL: ${model} | ERROR: ${err?.message} | LATENCY: ${elapsed}ms`
    );

    // In LIVE mode, NEVER fall back to fixtures! Throw typed error!
    if (!CONFIG.isMockMode) {
      if (err instanceof LLMError) throw err;
      throw new LLMError(err.message || "LLM call failed", err.status || 500, provider, model);
    }

    // Only in MOCK mode can we return mockFallback
    console.warn(`[LLM] MODE: MOCK_FALLBACK (Mock Mode is active) | LATENCY: ${elapsed}ms`);
    return mockFallback();
  }
}
