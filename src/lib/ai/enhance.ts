/**
 * Enhancement orchestrator.
 *
 * Reads a phase-1 asset from disk, runs it through a prompt contract
 * via an AI provider, and writes the enhanced version back — but only
 * if the enhancement succeeds cleanly. On any failure, the phase-1
 * file remains untouched.
 */

import * as path from "path";
import { readFile, writeFile, assetsDir } from "../fs";
import { readContext } from "../config";
import { AIProvider } from "./provider";
import { PromptContract } from "./prompts/types";
import { ScanContext } from "../../types";

export interface EnhanceResult {
  asset: string;
  status: "enhanced" | "skipped" | "failed";
  reason?: string;
}

/**
 * Enhance a single asset file using the given prompt contract.
 */
export async function enhanceAsset(
  provider: AIProvider,
  contract: PromptContract,
  context: ScanContext,
  filename: string,
): Promise<EnhanceResult> {
  const asset = contract.assetName;
  const filePath = path.join(assetsDir(), filename);

  // 1. Read phase-1 output
  const phase1Output = readFile(filePath);
  if (!phase1Output) {
    return { asset, status: "failed", reason: `Phase-1 file not found: ${filename}` };
  }

  console.log(`[ai] Enhancing ${asset}...`);

  // 2. Build prompt
  const system = contract.systemPrompt;
  const user = contract.buildUserPrompt(context, phase1Output);

  // 3. Call provider
  let raw: string;
  try {
    raw = await provider.generate(system, user);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[ai] ${asset}: provider error — ${message}`);
    return { asset, status: "failed", reason: message };
  }

  // 4. Parse response
  const enhanced = contract.parseResponse(raw);
  if (!enhanced) {
    console.warn(`[ai] ${asset}: response did not pass validation, keeping phase-1 output`);
    return { asset, status: "skipped", reason: "Response failed validation" };
  }

  // 5. Write enhanced output (only on success)
  writeFile(filePath, enhanced);
  console.log(`[ai] ${asset}: enhanced successfully`);

  return { asset, status: "enhanced" };
}

/**
 * Enhance multiple assets in sequence.
 * Returns results for each asset attempted.
 */
export async function enhanceAssets(
  provider: AIProvider,
  contracts: Array<{ contract: PromptContract; filename: string }>,
): Promise<EnhanceResult[]> {
  const context = readContext();
  if (!context) {
    return contracts.map(c => ({
      asset: c.contract.assetName,
      status: "failed" as const,
      reason: "No scan context found",
    }));
  }

  const results: EnhanceResult[] = [];
  for (const { contract, filename } of contracts) {
    const result = await enhanceAsset(provider, contract, context, filename);
    results.push(result);
  }

  return results;
}

/**
 * Print a summary of enhancement results.
 */
export function printEnhanceSummary(results: EnhanceResult[]): void {
  console.log("\n--- AI Enhancement Summary ---");
  for (const r of results) {
    const icon = r.status === "enhanced" ? "✓" : r.status === "skipped" ? "–" : "✗";
    const detail = r.reason ? ` (${r.reason})` : "";
    console.log(`${icon} ${r.asset}: ${r.status}${detail}`);
  }
}
