#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { initProject } from "./commands/init";
import { scanProject } from "./commands/scan";
import { positionProject } from "./commands/position";
import { routeProject } from "./commands/route";
import { packageProject } from "./commands/package";
import { checklistProject } from "./commands/checklist";
import { checkConsistency } from "./commands/check";
import { generateManifest } from "./commands/manifest";
import { runPipeline } from "./commands/run";
import { refineProject, refineFromReview } from "./commands/refine";
import { generateReview } from "./commands/review";

const program = new Command();

program
  .name("vlaunch")
  .description("Agentic CLI for launch preparation during vibe coding")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new vLaunch project")
  .action(() => {
    initProject();
  });

program
  .command("scan")
  .description("Scan and capture project context")
  .requiredOption("--url <url>", "Project URL")
  .requiredOption("--description <desc>", "Short project description")
  .requiredOption("--audience <audience>", "Target audience")
  .action(async (options) => {
    await scanProject({
      url: options.url,
      description: options.description,
      audience: options.audience,
    });
  });

program
  .command("position")
  .description("Generate positioning copy from scan context")
  .option("--ai", "Enhance output with AI")
  .action(async (options) => {
    const results = await positionProject({ ai: options.ai });
    generateManifest({ mode: options.ai ? "ai" : "deterministic", commandScope: "position", enhancementResults: results as any[] });
  });

program
  .command("route")
  .description("Generate a routing plan for launch distribution")
  .option("--ai", "Enhance output with AI")
  .action(async (options) => {
    const results = await routeProject({ ai: options.ai });
    generateManifest({ mode: options.ai ? "ai" : "deterministic", commandScope: "route", enhancementResults: results as any[] });
  });

program
  .command("package")
  .description("Generate channel-specific launch assets")
  .option("--ai", "Enhance output with AI")
  .action(async (options) => {
    const results = await packageProject({ ai: options.ai });
    generateManifest({ mode: options.ai ? "ai" : "deterministic", commandScope: "package", enhancementResults: results as any[] });
  });

program
  .command("checklist")
  .description("Generate a launch readiness checklist")
  .option("--ai", "Enhance output with AI")
  .action(async (options) => {
    const results = await checklistProject({ ai: options.ai });
    generateManifest({ mode: options.ai ? "ai" : "deterministic", commandScope: "checklist", enhancementResults: results as any[] });
  });

program
  .command("check")
  .description("Check consistency across generated launch assets")
  .action(() => {
    checkConsistency();
    generateManifest({ mode: "deterministic", commandScope: "check" });
  });

program
  .command("run")
  .description("Run the full launch pipeline")
  .requiredOption("--url <url>", "Project URL")
  .requiredOption("--description <desc>", "Short project description")
  .requiredOption("--audience <audience>", "Target audience")
  .option("--ai", "Enhance outputs with AI")
  .action(async (options) => {
    await runPipeline({
      url: options.url,
      description: options.description,
      audience: options.audience,
      ai: options.ai,
    });
  });

program
  .command("review")
  .description("Generate a refinement plan from consistency and readiness findings")
  .action(() => {
    generateReview();
  });

program
  .command("refine <asset>")
  .description("Refine a single asset with feedback (positioning, producthunt, medium, routing, affiliate)")
  .requiredOption("--feedback <feedback>", "Revision instruction")
  .action(async (asset, options) => {
    await refineProject(asset, options.feedback);
  });

program
  .command("refine-apply <index>")
  .description("Apply a specific revision from the refinement plan")
  .action(async (index) => {
    const revisionIndex = parseInt(index, 10);
    if (isNaN(revisionIndex)) {
      console.error("Revision index must be a number.");
      process.exit(1);
    }
    await refineFromReview(revisionIndex);
  });

program.parse();
