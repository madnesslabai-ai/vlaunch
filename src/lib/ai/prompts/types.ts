/**
 * Prompt contract interface.
 *
 * Each enhanced asset defines a contract that specifies:
 * - what the LLM should do (system prompt)
 * - what inputs it receives (user prompt built from context + phase-1 output)
 * - how to extract the final asset from the LLM response (parser)
 */

import { ScanContext } from "../../../types";

export interface PromptContract {
  /** Human-readable name for logging (e.g. "positioning", "producthunt") */
  readonly assetName: string;

  /** System prompt: role, constraints, output format */
  systemPrompt: string;

  /** Build the user prompt from scan context and the phase-1 deterministic output */
  buildUserPrompt(context: ScanContext, phase1Output: string): string;

  /**
   * Parse the raw LLM response into the final asset content.
   * Should return null if the response is unusable, so the orchestrator
   * can fall back to the phase-1 output.
   */
  parseResponse(raw: string): string | null;
}
