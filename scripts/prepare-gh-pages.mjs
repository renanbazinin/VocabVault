import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");
const indexPath = resolve(distDir, "index.html");
const notFoundPath = resolve(distDir, "404.html");
const noJekyllPath = resolve(distDir, ".nojekyll");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

if (existsSync(indexPath)) {
  copyFileSync(indexPath, notFoundPath);
}

writeFileSync(noJekyllPath, "");
