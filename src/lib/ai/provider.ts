/**
 * AI provider abstraction.
 *
 * Providers handle only the API call. They do not build prompts
 * or parse responses — that logic lives in prompt contracts.
 */

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  readonly name: string;
  generate(system: string, user: string, options?: GenerateOptions): Promise<string>;
}

export function createProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Export it to your environment or run without --ai."
    );
  }

  // Lazy import to avoid loading the module when --ai is not used
  const { AnthropicProvider } = require("./anthropic");
  return new AnthropicProvider(apiKey);
}
