#!/usr/bin/env node
// PreToolUse(Write|Edit) consistency guard.
// Detects the most common source of AI-introduced inconsistency: adding a SECOND library
// for a job the project already solved (a 2nd state lib, 2nd styling system, 2nd HTTP client…).
// vibe/standard -> allow with a strong warning; strict -> deny until the user decides.
// Fails OPEN on any error so it never blocks legitimate work due to a bug.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectDir, loadConfig } from "./_lib.mjs";

// category -> libraries that all solve the same job (pick ONE per project).
const CATEGORIES = {
  "state management": ["redux", "@reduxjs/toolkit", "zustand", "jotai", "recoil", "mobx", "valtio"],
  "styling": ["tailwindcss", "styled-components", "@emotion/react", "sass", "@stitches/react", "@vanilla-extract/css"],
  "http client": ["axios", "got", "ky", "superagent", "node-fetch"],
  "orm / db": ["prisma", "typeorm", "sequelize", "drizzle-orm", "mongoose", "knex"],
  "react router": ["react-router-dom", "@tanstack/react-router", "wouter"],
  "data fetching": ["swr", "@tanstack/react-query"],
  "test runner": ["jest", "vitest", "mocha", "ava"],
  "python lint/format": ["ruff", "black", "flake8", "isort", "pylint"],
};

// Precompute constants once (module scope), not per invocation.
const ALL = new Set(Object.values(CATEGORIES).flat());
const CAT_OF = new Map();
for (const [cat, libs] of Object.entries(CATEGORIES)) for (const lib of libs) CAT_OF.set(lib, cat);
const QUOTED_RE = [...ALL].map((lib) => ({
  lib,
  re: new RegExp(`["']${lib.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
}));
const IMPORT_RE = /(?:from|require\(|import\()\s*['"]([^'"]+)['"]/g;

function installedDeps() {
  try {
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
    return new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
  } catch { return new Set(); }
}

function candidatesFromText(text) {
  const found = new Set();
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(text))) {
    const spec = m[1];
    const base = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    if (ALL.has(base)) found.add(base);
  }
  for (const { lib, re } of QUOTED_RE) if (re.test(text)) found.add(lib);
  return found;
}

function conflicts(candidates, installed) {
  const out = [];
  for (const c of candidates) {
    const cat = CAT_OF.get(c);
    if (!cat) continue;
    const others = CATEGORIES[cat].filter((l) => l !== c && installed.has(l));
    if (others.length && !installed.has(c)) {
      out.push(`${cat}: project already uses "${others.join(", ")}", but this change adds "${c}"`);
    }
  }
  return out;
}

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", async () => {
  let decision = "allow";
  let reason =
    "Consistency check: reuse existing patterns/names/libs; don't introduce a second way to do " +
    "something that exists. Record any new decision in .kit/decisions.md.";
  try {
    const input = JSON.parse(raw || "{}");
    const ti = input.tool_input || {};
    const text = ti.content || ti.new_string || "";
    const found = conflicts(candidatesFromText(text), installedDeps());
    if (found.length) {
      const strict = (await loadConfig()).mode === "strict";
      const msg =
        "Possible inconsistency — you are adding a SECOND tool for a job that already has one:\n" +
        found.map((f) => "  • " + f).join("\n") +
        "\nReuse the existing one, or STOP and confirm with the user (in plain language) before adding a parallel dependency.";
      if (strict) { decision = "deny"; reason = msg; }
      else { reason = msg; }
    }
  } catch { /* fail open */ }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
});
