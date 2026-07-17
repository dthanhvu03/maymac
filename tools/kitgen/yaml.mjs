// Minimal zero-dependency YAML *subset* parser.
//
// SUPPORTED subset: nested maps (2-space indent), block lists (scalars & maps),
// inline empty [] and {}, quoted/unquoted scalars, booleans, numbers, comments.
// Sufficient for kit.config.yaml, profile.yaml, i18n strings, and md frontmatter.
//
// EXPLICITLY REJECTED (rather than silently mis-parsed — see finding F-10): tabs in
// indentation, anchors/aliases/tags (& * !), block scalars (| >), and non-empty flow
// collections ({a: b} / [a, b]). These throw a YamlError with a code, line and hint so
// a malformed config fails loudly instead of returning wrong data.

export class YamlError extends Error {
  constructor(code, line, message, hint) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "YamlError";
    this.code = code;
    this.line = line ?? null;
    this.hint = hint || "";
  }
}

// Index of the first ':' that separates a mapping key from its value, skipping any
// ':' inside quotes. Returns -1 if there is no top-level key separator.
function keyColon(s) {
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === ":" && (i + 1 === s.length || /\s/.test(s[i + 1]))) return i;
  }
  return -1;
}

// Reject constructs outside the supported subset, with line numbers, BEFORE parsing.
function preScan(text) {
  const raw = text.split(/\r?\n/);
  for (let i = 0; i < raw.length; i++) {
    const orig = raw[i];
    const line = i + 1;
    if (orig.trim() === "" || orig.trimStart().startsWith("#")) continue;

    const indent = orig.slice(0, orig.length - orig.trimStart().length);
    if (indent.includes("\t"))
      throw new YamlError("YAML_TAB_INDENT", line, "tab character used for indentation", "use spaces, not tabs");

    const content = stripComment(orig).trim();
    if (!content) continue;

    let value;
    if (content.startsWith("- ")) value = content.slice(2).trim();
    else { const ci = keyColon(content); value = ci !== -1 ? content.slice(ci + 1).trim() : content; }
    if (!value) continue;

    if (/^[&*!]/.test(value))
      throw new YamlError("YAML_UNSUPPORTED_ANCHOR", line, "anchors, aliases and tags (& * !) are not supported", "inline the value directly");
    if (/^[|>][+-]?\d*\s*$/.test(value))
      throw new YamlError("YAML_UNSUPPORTED_BLOCK_SCALAR", line, "block scalars (| and >) are not supported", "use a single-line quoted string");
    if ((value.startsWith("{") && value !== "{}") || (value.startsWith("[") && value !== "[]"))
      throw new YamlError("YAML_UNSUPPORTED_FLOW", line, "flow collections { } / [ ] are not supported (only empty {} / [])", "use block (indented) syntax");
  }
}

function stripComment(line) {
  // Remove a trailing "# ..." comment, but not a '#' inside a quoted scalar.
  // A comment '#' must be at line start or preceded by whitespace.
  if (line.trimStart().startsWith("#")) return "";
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function indentOf(l) { return l.length - l.trimStart().length; }

function scalar(v) {
  v = v.trim();
  if (v === "" ) return null;
  if (v === "[]") return [];
  if (v === "{}") return {};
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"'))
    return v.slice(1, -1).replace(/\\(["\\/])/g, "$1").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'"))
    return v.slice(1, -1).replace(/''/g, "'"); // YAML single-quote: '' -> '
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

function isKV(s) { return /^[^:\s"'][^:]*:(\s|$)/.test(s) || /^"[^"]+":(\s|$)/.test(s); }

function assignInline(map, content) {
  const ci = content.indexOf(":");
  const key = content.slice(0, ci).trim().replace(/^["']|["']$/g, "");
  const rest = content.slice(ci + 1).trim();
  map[key] = rest === "" ? null : scalar(rest);
}

function parseNode(lines, idx, indent) {
  if (idx >= lines.length) return [null, idx];
  const firstIndent = indentOf(lines[idx]);
  if (firstIndent < indent) return [null, idx];

  if (lines[idx].trim().startsWith("- ")) {
    const arr = [];
    while (idx < lines.length) {
      const l = lines[idx];
      if (indentOf(l) !== firstIndent || !l.trim().startsWith("- ")) break;
      const content = l.trim().slice(2);
      if (content === "") {
        const [v, ni] = parseNode(lines, idx + 1, firstIndent + 1);
        arr.push(v); idx = ni;
      } else if (isKV(content)) {
        const map = {}; assignInline(map, content); idx++;
        const [more, ni] = parseNode(lines, idx, firstIndent + 2);
        if (more && typeof more === "object" && !Array.isArray(more)) { Object.assign(map, more); idx = ni; }
        arr.push(map);
      } else { arr.push(scalar(content)); idx++; }
    }
    return [arr, idx];
  }

  const map = {};
  while (idx < lines.length) {
    const l = lines[idx];
    const ind = indentOf(l);
    if (ind < firstIndent) break;
    if (ind > firstIndent) { idx++; continue; }
    if (l.trim().startsWith("- ")) break;
    const t = l.trim();
    const ci = t.indexOf(":");
    if (ci === -1) { idx++; continue; }
    const key = t.slice(0, ci).trim().replace(/^["']|["']$/g, "");
    const rest = t.slice(ci + 1).trim();
    idx++;
    if (rest === "") {
      const [v, ni] = parseNode(lines, idx, firstIndent + 1);
      map[key] = v; idx = ni;
    } else {
      map[key] = scalar(rest);
    }
  }
  return [map, idx];
}

// Strip a leading UTF-8 BOM (U+FEFF). Real-world reproduction: Windows tools commonly
// write it by default (Notepad, PowerShell's `Out-File -Encoding utf8`, some editors'
// "UTF-8" save option) — without this, the BOM lands inside the first parsed key
// (e.g. "﻿version" instead of "version") or breaks parseFrontmatter's `^---` match
// entirely, silently discarding the whole frontmatter block (fm:{}, body:wholeFile).
function stripBOM(text) {
  return typeof text === "string" && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseYaml(text) {
  text = stripBOM(text);
  preScan(text);
  const lines = text.split(/\r?\n/).map(stripComment).filter((l) => l.trim() !== "");
  const [val] = parseNode(lines, 0, 0);
  return val || {};
}

export function parseFrontmatter(text) {
  text = stripBOM(text);
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  return { fm: parseYaml(m[1]), body: m[2] };
}
