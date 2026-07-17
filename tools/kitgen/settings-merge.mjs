// Merge the kit's .claude/settings.json into a user's existing one, so installing
// into a project that already has settings KEEPS the user's hooks / permissions /
// MCP / env instead of replacing them — the kit only ensures ITS hooks and deny
// rules are also present. Pure and idempotent: merging an already-merged file with
// the kit again yields the same bytes (so re-builds and the drift check stay clean).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SETTINGS_REL = ".claude/settings.json";

const sameEntry = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Preserve every user key; union the kit's permissions.deny and hooks entries in.
export function mergeClaudeSettings(user, kit) {
  const out = { ...user };

  // permissions.deny — keep the user's allow/ask and their own deny list, then add
  // any kit deny entry not already present (string union, user entries first).
  if (Array.isArray(kit.permissions?.deny)) {
    const userPerms = user.permissions || {};
    const deny = Array.isArray(userPerms.deny) ? [...userPerms.deny] : [];
    for (const d of kit.permissions.deny) if (!deny.includes(d)) deny.push(d);
    out.permissions = { ...userPerms, deny };
  }

  // hooks — per event, append the kit's entries that aren't already there (deep
  // equality, so a second build doesn't duplicate a hook it added the first time).
  if (kit.hooks && typeof kit.hooks === "object") {
    const outHooks = { ...(user.hooks || {}) };
    for (const [event, kitEntries] of Object.entries(kit.hooks)) {
      const cur = Array.isArray(outHooks[event]) ? [...outHooks[event]] : [];
      for (const ke of kitEntries) if (!cur.some((ue) => sameEntry(ue, ke))) cur.push(ke);
      outHooks[event] = cur;
    }
    out.hooks = outHooks;
  }

  if (kit.$schema && !out.$schema) out.$schema = kit.$schema;
  // A merged file is user-owned; replace the kit's "DO NOT EDIT" banner with a note
  // that explains the shape (a fixed string → still deterministic/idempotent).
  out._generated = "MERGED by smkit — your settings are preserved; kit hooks/deny were added. Re-run `smkit build` to re-assert them.";
  return out;
}

// If the project already has a settings.json, replace the freshly generated one in
// `outputs` with the merge of (existing ⨄ kit). Called by build, check, and doctor
// so all three agree on the final bytes. Returns true if a merge was applied.
export function reconcileSettings(outputs, { projectDir, outDir }) {
  if (!outputs || !outputs.has(SETTINGS_REL)) return false;
  const abs = join(projectDir, outDir, SETTINGS_REL);
  if (!existsSync(abs)) return false;
  const kitContent = outputs.get(SETTINGS_REL);
  const raw = readFileSync(abs, "utf8");
  // On-disk file is already exactly the kit's own output (a normal install with no
  // user customization) — nothing to merge, and merging would needlessly rewrite it.
  if (raw === kitContent) return false;
  let user;
  try { user = JSON.parse(raw); }
  catch { return false; } // unparseable existing file → leave it to the backup path
  if (!user || typeof user !== "object") return false;
  outputs.set(SETTINGS_REL, JSON.stringify(mergeClaudeSettings(user, JSON.parse(kitContent)), null, 2) + "\n");
  return true;
}
