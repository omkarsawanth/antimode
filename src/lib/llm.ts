import crypto from "crypto";
import { ZodSchema } from "zod";
import { CONFIG } from "./config";

// Prompt-hash response cache
const llmCache = new Map<string, any>();

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
    timeoutMs = 30000,
    mockFallback,
    model = CONFIG.DEFAULT_LLM_MODEL,
  } = options;

  // 1. If in mock mode, immediately return fixture JSON
  if (CONFIG.isMockMode) {
    return mockFallback();
  }

  // 2. Check hash cache
  const cacheKey = getCacheKey(prompt, model, temperature);
  if (llmCache.has(cacheKey)) {
    return llmCache.get(cacheKey) as T;
  }

  // Helper for single invocation
  async function invokeProvider(currentPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (process.env.GEMINI_API_KEY) {
        // Direct Gemini API call with structured JSON response
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
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

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini API error ${res.status}: ${errText.substring(0, 300)}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty candidate response from Gemini API");
        return text;
      } else if (process.env.OPENAI_API_KEY) {
        // OpenAI fallback
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
          throw new Error(`OpenAI API error ${res.status}: ${errText.substring(0, 300)}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } else {
        throw new Error("No LLM API key configured");
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Clean JSON string (strip markdown ```json ... ``` blocks if any)
  function extractJson(raw: string): any {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    return JSON.parse(cleaned);
  }

  // Execution with 1 retry on validation failure
  try {
    const rawOutput = await invokeProvider(prompt);
    let parsed: any;
    try {
      parsed = extractJson(rawOutput);
    } catch (parseErr) {
      throw new Error(`JSON parse error: ${String(parseErr)}`);
    }

    const valResult = schema.safeParse(parsed);
    if (valResult.success) {
      llmCache.set(cacheKey, valResult.data);
      return valResult.data;
    }

    // Validation failed - retry ONCE with error message appended
    console.warn("LLM output schema validation failed. Retrying once with error feedback...");
    const retryPrompt = `${prompt}

CRITICAL: Your previous response failed schema validation with error:
${JSON.stringify(valResult.error.format(), null, 2)}
Please re-generate your response and ensure it strictly conforms to the requested JSON schema.`;

    const retryOutput = await invokeProvider(retryPrompt);
    const retryParsed = extractJson(retryOutput);
    const retryValResult = schema.safeParse(retryParsed);

    if (retryValResult.success) {
      llmCache.set(cacheKey, retryValResult.data);
      return retryValResult.data;
    }

    console.warn("LLM output retry failed schema validation. Falling back to fixture.");
    return mockFallback();
  } catch (err) {
    console.warn("LLM call failed (or timed out). Falling back to mock fixture:", String(err).slice(0, 150));
    return mockFallback();
  }
}
