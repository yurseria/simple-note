#!/usr/bin/env node
/**
 * root package.json의 version을 나머지 4곳에 동기화
 * auto의 afterVersion hook에서 호출됨
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

function updateJson(filepath) {
  const content = JSON.parse(readFileSync(filepath, "utf8"));
  content.version = version;
  writeFileSync(filepath, JSON.stringify(content, null, 2) + "\n");
}

function updateToml(filepath) {
  let content = readFileSync(filepath, "utf8");
  content = content.replace(/^(version\s*=\s*")[\d.]+(".*)/m, `$1${version}$2`);
  writeFileSync(filepath, content);
}

updateJson(resolve(root, "packages/electron/package.json"));
updateJson(resolve(root, "packages/tauri/package.json"));
updateJson(resolve(root, "packages/tauri/src-tauri/tauri.conf.json"));
updateToml(resolve(root, "packages/tauri/src-tauri/Cargo.toml"));

console.log(`Synced version ${version} to all packages`);
