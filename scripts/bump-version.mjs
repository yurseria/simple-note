#!/usr/bin/env node
/**
 * Conventional commit 기반 버전 범프 + 4곳 동기화 + 태그 생성
 *
 * Usage: node scripts/bump-version.mjs [major|minor|patch]
 *   인자 없으면 conventional commit에서 자동 판단
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── bump 타입 결정 ─────────────────────────────────────────
let bump = process.argv[2]; // major | minor | patch

if (!bump) {
  let lastTag;
  try {
    lastTag = execSync("git describe --tags --abbrev=0", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    lastTag = null;
  }

  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const log = execSync(`git log ${range} --pretty=format:"%s"`, { cwd: root, encoding: "utf8" }).trim();

  if (!log) {
    console.log("No new commits. Skipping.");
    process.exit(0);
  }

  const lines = log.split("\n").map((l) => l.replace(/^"|"$/g, ""));
  bump = "patch";
  for (const msg of lines) {
    if (/^.+!:/.test(msg) || /BREAKING[ -]CHANGE/i.test(msg)) { bump = "major"; break; }
    if (/^feat(\(.+\))?:/.test(msg)) bump = "minor";
  }
}

// ── 버전 계산 ──────────────────────────────────────────────
const rootPkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const [major, minor, patch] = rootPkg.version.split(".").map(Number);

let next;
if (bump === "major") next = `${major + 1}.0.0`;
else if (bump === "minor") next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

console.log(`${rootPkg.version} → ${next} (${bump})`);

// ── 4곳 업데이트 ───────────────────────────────────────────
function updateJson(filepath, key) {
  const content = JSON.parse(readFileSync(filepath, "utf8"));
  content[key] = next;
  writeFileSync(filepath, JSON.stringify(content, null, 2) + "\n");
}

function updateToml(filepath) {
  let content = readFileSync(filepath, "utf8");
  content = content.replace(/^(version\s*=\s*")[\d.]+(".*)/m, `$1${next}$2`);
  writeFileSync(filepath, content);
}

updateJson(resolve(root, "package.json"), "version");
updateJson(resolve(root, "packages/electron/package.json"), "version");
updateJson(resolve(root, "packages/tauri/package.json"), "version");
updateJson(resolve(root, "packages/tauri/src-tauri/tauri.conf.json"), "version");
updateToml(resolve(root, "packages/tauri/src-tauri/Cargo.toml"));

// ── changelog 생성 ─────────────────────────────────────────
let lastTag2;
try {
  lastTag2 = execSync("git describe --tags --abbrev=0", { cwd: root, encoding: "utf8" }).trim();
} catch {
  lastTag2 = null;
}
const range2 = lastTag2 ? `${lastTag2}..HEAD` : "HEAD";
const log2 = execSync(`git log ${range2} --pretty=format:"%s"`, { cwd: root, encoding: "utf8" }).trim();
const lines = log2 ? log2.split("\n").map((l) => l.replace(/^"|"$/g, "")) : [];

const categories = { feat: [], fix: [], refactor: [], perf: [], ci: [], docs: [], chore: [], other: [] };
for (const msg of lines) {
  const match = msg.match(/^(\w+)(?:\(.+?\))?!?:\s*(.+)/);
  if (match) {
    const [, type, desc] = match;
    (categories[type] ?? categories.other).push(desc);
  } else {
    categories.other.push(msg);
  }
}

const labels = { feat: "Features", fix: "Bug Fixes", refactor: "Refactoring", perf: "Performance", ci: "CI", docs: "Documentation", chore: "Chores", other: "Other" };
let changelog = "";
for (const [key, items] of Object.entries(categories)) {
  if (!items.length) continue;
  changelog += `### ${labels[key]}\n`;
  for (const item of items) changelog += `- ${item}\n`;
  changelog += "\n";
}

// ── commit + tag ───────────────────────────────────────────
execSync("git add -A", { cwd: root });
execSync(`git commit -m "chore(release): v${next}"`, { cwd: root });
execSync(`git tag -a "v${next}" -m "v${next}"`, { cwd: root });

console.log(`\nTagged v${next}. Run:\n  git push origin release --tags\n`);

// ── GitHub Actions output ──────────────────────────────────
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${next}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=v${next}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `changelog<<CHANGELOG_EOF\n${changelog}CHANGELOG_EOF\n`);
}
