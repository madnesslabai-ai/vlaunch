import * as path from "path";
import * as YAML from "yaml";
import { ProjectConfig, ScanContext } from "../types";
import { vlaunchDir, writeFile, readFile } from "./fs";

export function projectYamlPath(): string {
  return path.join(vlaunchDir(), "project.yaml");
}

export function contextJsonPath(): string {
  return path.join(vlaunchDir(), "context.json");
}

export function readProjectConfig(): ProjectConfig | null {
  const raw = readFile(projectYamlPath());
  if (!raw) return null;
  return YAML.parse(raw) as ProjectConfig;
}

export function writeProjectConfig(config: ProjectConfig): void {
  writeFile(projectYamlPath(), YAML.stringify(config));
}

export function readContext(): ScanContext | null {
  const raw = readFile(contextJsonPath());
  if (!raw) return null;
  return JSON.parse(raw) as ScanContext;
}

export function writeContext(context: ScanContext): void {
  writeFile(contextJsonPath(), JSON.stringify(context, null, 2));
}
