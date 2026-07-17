#!/usr/bin/env node
// SessionStart hook. Injects the Constitution + Decision Log into context so the
// agent is bound by prior decisions WITHOUT relying on it to remember to read them.
import { readFileSync, rmSync } from "node:fs";
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

const additionalContext = parts.length
  ? parts.join("\n\n")
  : "No Constitution/Decision Log yet. If starting real work, create .kit/constitution.md from the template and record decisions in .kit/decisions.md.";

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
}));
process.exit(0);
