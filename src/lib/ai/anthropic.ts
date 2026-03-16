/**
 * Anthropic / Claude provider.
 *
 * Handles only the HTTP call to the Messages API.
 * No prompt-building or response-parsing logic belongs here.
 */

import { AIProvider, GenerateOptions } from "./provider";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 2048;
const API_URL = "https://api.anthropic.com/v1/messages";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 503, 529]);

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODEL;
  }

  async generate(system: string, user: string, options?: GenerateOptions): Promise<string> {
    const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? 0.7;

    const body = {
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      temperature,
    };

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * backoff * 0.5;
        await sleep(backoff + jitter);
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data?.content?.[0]?.text;
        if (!content) {
          throw new Error("Anthropic API returned empty content");
        }
        return content;
      }

      const errorBody = await response.text();

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
        // Check for Retry-After header
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000;
          if (!isNaN(retryMs) && retryMs > 0) {
            await sleep(retryMs);
          }
        }
        lastError = new Error(`Anthropic API error (${response.status}): ${errorBody}`);
        continue;
      }

      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
    }

    throw lastError || new Error("Anthropic API request failed after retries");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
