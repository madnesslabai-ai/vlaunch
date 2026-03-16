import * as fs from "fs";
import * as path from "path";

const VLAUNCH_DIR = ".vlaunch";
const ASSETS_DIR = path.join(VLAUNCH_DIR, "assets");

export function vlaunchDir(): string {
  return path.resolve(process.cwd(), VLAUNCH_DIR);
}

export function assetsDir(): string {
  return path.resolve(process.cwd(), ASSETS_DIR);
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, "utf-8");
}

export function readFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/** Returns file modification time in ms since epoch, or null if file doesn't exist. */
export function fileMtime(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}
