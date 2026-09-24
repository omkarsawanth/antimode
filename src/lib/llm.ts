import crypto from "crypto";
import { ZodSchema } from "zod";
import { CONFIG, getGeminiApiKey } from "./config";

// Prompt-hash response cache
const llmCache = new Map<string, any>();

export class LLMError extends Error {
  public status: number;
  public provider: string;
  public model: string;

  constructor(
    message: string,
    status: number = 500,
    provider: string = "gemini",
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
}

function getCacheKey(prompt: string, model: string, temperature: number): string {
  const content = `${model}::${temperature}::${prompt}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function callLLM<T>(options: CallLLMOptions<T>): Promise<T> {
  const {
    prompt,
    schema,
    temperature = 0.7,
    timeoutMs = 45000,
    mockFallback,
    model = CONFIG.DEFAULT_LLM_MODEL,
  } = options;

  const startTime = Date.now();
  const apiKey = getGeminiApiKey();
  const provider = apiKey ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "none";

  // 1. If explicitly in mock mode, return fixture JSON
  if (CONFIG.isMockMode) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[LLM] MODE: MOCK | PROVIDER: fixture | MODEL: ${model} | LATENCY: ${elapsed}ms | CACHE: N/A`
    );
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

  // Helper for single invocation with exponential backoff on 429
  async function invokeProvider(currentPrompt: string): Promise<string> {
    const maxRetries = 3;

    if (apiKey) {
      // Direct Gemini API call with structured JSON response
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
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

          if (res.status === 429) {
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1500 + Math.random() * 500;
              console.warn(
                `[LLM] HTTP 429 Rate Limit. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`
              );
              await new Promise((r) => setTimeout(r, delay));
              continue;
            } else {
              const errText = await res.text();
              throw new LLMError(
                `Gemini API rate limit exceeded (HTTP 429): ${errText.substring(0, 300)}`,
                429,
                "gemini",
                model
              );
            }
          }

          if (!res.ok) {
            const errText = await res.text();
            throw new LLMError(
              `Gemini API error ${res.status}: ${errText.substring(0, 300)}`,
              res.status,
              "gemini",
              model
            );
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new LLMError("Empty candidate response from Gemini API", 502, "gemini", model);
          }
          return text;
        } catch (fetchErr: any) {
          if (fetchErr instanceof LLMError) throw fetchErr;
          if (attempt < maxRetries - 1 && fetchErr.name !== "AbortError") {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new LLMError(
            fetchErr.message || "Failed to communicate with Gemini API",
            500,
            "gemini",
            model
          );
        } finally {
          clearTimeout(timeout);
        }
      }

      throw new LLMError("Exhausted retries calling Gemini API", 500, "gemini", model);
    } else if (process.env.OPENAI_API_KEY) {
      // OpenAI fallback
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
            response_format: { type: "json_object" },
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
        "No LLM API key configured. Provide GEMINI_API_KEY or GOOGLE_API_KEY in .env.local",
        401,
        "none",
        model
      );
    }
  }

  // Clean JSON string
  function extractJson(raw: string): any {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    return JSON.parse(cleaned);
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
      console.log(
        `[LLM] MODE: LIVE | PROVIDER: ${provider} | MODEL: ${model} | LATENCY: ${elapsed}ms | CACHE: MISS`
      );
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
      console.log(
        `[LLM] MODE: LIVE (RETRY_SUCCESS) | PROVIDER: ${provider} | MODEL: ${model} | LATENCY: ${elapsed}ms | CACHE: MISS`
      );
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
