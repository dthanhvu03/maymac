#!/usr/bin/env node
// SessionStart hook. Injects the Constitution + Decision Log into context so the
// agent is bound by prior decisions WITHOUT relying on it to remember to read them.
import { readFileSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { projectDir } from "./_lib.mjs";

// Reset the pre-build critique gate each session: the first code write of a new session
// must go through a fresh critique (trụ cột #2). Best-effort — never throw at startup.
try { rmSync(join(projectDir, ".kit", "state", "gate.json"), { force: true }); } catch { /* best-effort */ }

function read(p, max) {
  try {
    const t = readFileSync(join(projectDir, p), "utf8");
    return max && t.length > max ? t.slice(0, max) + "\n…(truncated)" : t;
  } catch { return null; }
}

const parts = [];
const constitution = read(".kit/constitution.md", 4000);
if (constitution) parts.push("=== PROJECT CONSTITUTION (obey this) ===\n" + constitution);
const decisions = read(".kit/decisions.md", 8000);
if (decisions) parts.push("=== DECISION LOG (stay consistent with this) ===\n" + decisions);

// Team option: one file per decision under .kit/decisions/ (ADR-per-file) avoids the
// merge conflicts a shared append-only decisions.md causes. Inject the most recent ones
// (bounded, so context stays lean). Absent dir → nothing to do.
try {
  const files = readdirSync(join(projectDir, ".kit", "decisions")).filter((f) => f.endsWith(".md")).sort();
  const recent = files.slice(-30); // ADR files sort chronologically (NNNN-slug.md)
  const adrs = recent.map((f) => read(join(".kit", "decisions", f), 1500)).filter(Boolean);
  if (adrs.length) {
    const more = files.length > recent.length ? `\n…(${files.length - recent.length} older records not shown)` : "";
    parts.push("=== DECISION RECORDS (.kit/decisions/) ===\n" + adrs.join("\n\n") + more);
  }
} catch { /* no per-file decisions dir → fine */ }

const additionalContext = parts.length
  ? parts.join("\n\n")
  : "No Constitution/Decision Log yet. If starting real work, create .kit/constitution.md from the template and record decisions in .kit/decisions.md.";

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
}));
process.exit(0);
