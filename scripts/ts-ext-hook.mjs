import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

export async function resolve(specifier, context, nextResolve) {
  const rel = specifier.startsWith(".") || specifier.startsWith("/");
  if (!rel) return nextResolve(specifier, context);
  if (path.extname(specifier)) return nextResolve(specifier, context);
  const from = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
  const abs = path.resolve(from, specifier);
  for (const ext of EXTS) {
    if (fs.existsSync(abs + ext)) return nextResolve(pathToFileURL(abs + ext).href, context);
  }
  const idx = path.join(abs, "index");
  for (const ext of EXTS) {
    if (fs.existsSync(idx + ext)) return nextResolve(pathToFileURL(idx + ext).href, context);
  }
  return nextResolve(specifier, context);
}
