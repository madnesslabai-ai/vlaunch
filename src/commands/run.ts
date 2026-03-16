import { initProject } from "./init";
import { scanProject } from "./scan";
import { positionProject } from "./position";
import { routeProject } from "./route";
import { packageProject } from "./package";
import { checklistProject } from "./checklist";
import { checkConsistency } from "./check";
import { generateManifest } from "./manifest";

interface RunOptions {
  url: string;
  description: string;
  audience: string;
  ai?: boolean;
}

export async function runPipeline(options: RunOptions): Promise<void> {
  const ai = options.ai || false;
  const label = ai ? "Running full vLaunch pipeline (with AI enhancement)..." : "Running full vLaunch pipeline...";
  console.log(label + "\n");

  console.log("[1/8] init");
  initProject();

  console.log("\n[2/8] scan");
  await scanProject(options);

  console.log("\n[3/8] position");
  const posResults = await positionProject({ ai });

  console.log("\n[4/8] route");
  const routeResults = await routeProject({ ai });

  console.log("\n[5/8] package");
  const pkgResults = await packageProject({ ai });

  console.log("\n[6/8] checklist");
  const checklistResults = await checklistProject({ ai });

  console.log("\n[7/8] check");
  checkConsistency();

  const allResults = [...posResults, ...routeResults, ...pkgResults, ...checklistResults];

  console.log("\n[8/8] manifest");
  generateManifest({
    mode: ai ? "ai" : "deterministic",
    commandScope: "run",
    enhancementResults: allResults as any[],
  });

  console.log("\n--- Pipeline complete ---");
  console.log("All assets saved to .vlaunch/assets/");
}
