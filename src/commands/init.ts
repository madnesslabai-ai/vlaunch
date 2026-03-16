import { ensureDir, vlaunchDir, assetsDir, fileExists } from "../lib/fs";
import { writeProjectConfig, writeContext, projectYamlPath, contextJsonPath } from "../lib/config";
import { ProjectConfig, ScanContext } from "../types";

export function initProject(): void {
  ensureDir(vlaunchDir());
  ensureDir(assetsDir());

  if (!fileExists(projectYamlPath())) {
    const config: ProjectConfig = {
      name: "",
      version: "0.1.0",
      createdAt: new Date().toISOString(),
    };
    writeProjectConfig(config);
    console.log("Created .vlaunch/project.yaml");
  } else {
    console.log(".vlaunch/project.yaml already exists, skipping");
  }

  if (!fileExists(contextJsonPath())) {
    const context: ScanContext = {
      url: "",
      description: "",
      targetAudience: "",
      scannedAt: "",
    };
    writeContext(context);
    console.log("Created .vlaunch/context.json");
  } else {
    console.log(".vlaunch/context.json already exists, skipping");
  }

  console.log("vLaunch initialized.");
}
