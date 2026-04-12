#!/usr/bin/env node
/**
 * 모든 패키지의 version을 동기화
 * auto의 afterVersion hook에서 호출됨
 *
 * git-tag 플러그인은 package.json version을 bump하지 않으므로,
 * 환경변수 ARG_0 (새 버전)을 사용하거나 root package.json에서 읽음
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// auto exec 플러그인이 ARG_0으로 새 버전을 전달
// git-tag 플러그인은 package.json을 bump하지 않으므로,
// ARG_0이 없으면 최신 git tag에서 버전을 가져옴
const version = process.env.ARG_0
  || execSync("git describe --tags --abbrev=0", { cwd: root, encoding: "utf8" }).trim().replace(/^v/, "");

if (!version || version === "0.0.0") {
  console.error("No version found");
  process.exit(1);
}

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

const targets = [
  resolve(root, "package.json"),
  resolve(root, "packages/electron/package.json"),
  resolve(root, "packages/tauri/package.json"),
  resolve(root, "packages/tauri/src-tauri/tauri.conf.json"),
  resolve(root, "packages/tauri/src-tauri/Cargo.toml"),
];

for (const t of targets) {
  if (t.endsWith(".toml")) updateToml(t);
  else updateJson(t);
}

// auto의 커밋에 포함되도록 변경된 파일을 stage
execSync(`git add ${targets.join(" ")}`, { cwd: root, stdio: "inherit" });

console.log(`Synced version ${version} to all packages`);
