// The repo file, .docent/config.json: where the brand comes from, host-token values that win over the host's DESIGN.md, the brand
// interview's answers, and the author's rule changes (docs/proposals/repo-config.md). The scripts read it when they run and write
// what it says into a page; a page never reads it. The nearest file above the page's folder wins, up to the root of the repo.
const fs = require("node:fs");
const path = require("node:path");
const { RULES, GUARANTEE } = require("./rules.cjs");

const NAME = path.join(".docent", "config.json");
const VERSION = 1;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLORS = ["host-accent", "host-accent-dark", "host-ink", "host-dot-dark"];
const FONTS = ["host-serif", "host-sans", "host-mono"];
const FIELDS = ["version", "design", "tokens", "palette", "logo", "tagline", "credit", "profile", "rules"];
const CREDITS = ["link", "text", "none"];
const TAGLINE = 90;
const LOGO = /\.(svg|png|webp)$/i;

/** The first folder at or above dir that holds .git, or null. */
function repoRoot(dir) {
  for (let at = path.resolve(dir); ; at = path.dirname(at)) {
    if (fs.existsSync(path.join(at, ".git"))) return at;
    if (path.dirname(at) === at) return null;
  }
}

/** The nearest .docent/config.json at or above dir, stopping at the root of the repo (the first folder with .git) or of the disk. */
function findConfig(dir) {
  for (let at = path.resolve(dir); ; at = path.dirname(at)) {
    const file = path.join(at, NAME);
    if (fs.existsSync(file)) return file;
    if (fs.existsSync(path.join(at, ".git")) || path.dirname(at) === at) return null;
  }
}

const shown = (s) => JSON.stringify(s);
const isPlain = (v) => v != null && typeof v === "object" && !Array.isArray(v);

/**
 * Reads and tests a repo file. Returns { file, base, data, errors }: base is the folder that holds .docent/, from which every path is
 * read; data is the file's fields when it has no error, else null; errors are sentences that start with the field they are about.
 */
function readConfig(file, { palettes = [], profiles = [] } = {}) {
  const abs = path.resolve(file);
  const base = path.basename(path.dirname(abs)) === ".docent" ? path.dirname(path.dirname(abs)) : path.dirname(abs);
  const repo = repoRoot(base) || base;
  const errors = [], at = (field, text) => errors.push(`${field}: ${text}`);
  let data;
  try { data = JSON.parse(fs.readFileSync(abs, "utf8")); } catch (problem) { return { file: abs, base, data: null, errors: [problem.code === "ENOENT" ? "there is no file here" : `it is not valid JSON: ${problem.message}`] }; }
  if (!isPlain(data)) return { file: abs, base, data: null, errors: ["it holds no JSON object; it starts with { and holds the fields"] };

  for (const key of Object.keys(data)) if (!FIELDS.includes(key)) at(shown(key), `no field has this name; the fields are ${FIELDS.map(shown).join(", ")}`);
  if (!("version" in data)) at('"version"', `missing; write "version": ${VERSION}, so that a later Docent can read the file`);
  else if (data.version !== VERSION) at('"version"', `is ${shown(data.version)}; this Docent reads version ${VERSION}`);

  /** A path inside the repo, read from the folder that holds .docent/; a web address, an absolute path and one that leaves the repo are refused. */
  const where = (field, value, test) => {
    if (typeof value !== "string" || !value.trim()) return at(field, `is ${shown(value)}; it is a path to a file, such as "docs/DESIGN.md"`);
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(value)) return at(field, `${shown(value)} is a web address; a path names a file inside the repo, because the scripts use no network`);
    if (path.isAbsolute(value)) return at(field, `${shown(value)} is an absolute path; write it from the folder that holds .docent/, so it works on every machine`);
    const full = path.resolve(base, value), inside = (p, root) => p === root || p.startsWith(root + path.sep);
    if (!inside(full, repo)) return at(field, `${shown(value)} leaves the repo; a path stays inside it`);
    if (!fs.existsSync(full)) return at(field, `there is no file at ${shown(value)}, read from the folder that holds .docent/`);
    if (!inside(fs.realpathSync(full), fs.realpathSync(repo))) return at(field, `${shown(value)} is a link to a file outside the repo; a path stays inside it`);
    if (test && !test.re.test(value)) return at(field, `${shown(value)} is not ${test.what}`);
    return full;
  };

  if ("design" in data && data.design !== null) where('"design"', data.design);
  if ("tokens" in data) {
    if (!isPlain(data.tokens)) at('"tokens"', 'is not an object; each key is a host token, such as "host-ink", and each value is { "value": "…", "reason": "…" }');
    else for (const [name, entry] of Object.entries(data.tokens)) {
      const field = `"tokens".${shown(name)}`;
      if (![...COLORS, ...FONTS].includes(name)) { at(field, `no host token has this name; the host tokens are ${[...COLORS, ...FONTS].map(shown).join(", ")}${/^--/.test(name) ? ", written without their dashes" : ""}`); continue; }
      if (!isPlain(entry)) { at(field, 'is not { "value": "…", "reason": "…" }'); continue; }
      if (typeof entry.reason !== "string" || !entry.reason.trim()) at(field, 'no "reason"; write why the team chose this value');
      for (const key of Object.keys(entry)) if (!["value", "reason"].includes(key)) at(`${field}.${shown(key)}`, 'no field has this name; a token holds "value" and "reason"');
      if (COLORS.includes(name) && !(typeof entry.value === "string" && HEX.test(entry.value))) at(`${field}."value"`, `is ${shown(entry.value)}; a host color is a hex color, such as "#3b2a5c"`);
      if (FONTS.includes(name) && !(typeof entry.value === "string" && entry.value.trim() && !/[;{}<>\\]|\/\*|\*\/|url\s*\(|@import/i.test(entry.value))) at(`${field}."value"`, `is ${shown(entry.value)}; a font token is a list of font names, such as "Inter, system-ui, sans-serif"`);
    }
  }
  if ("palette" in data && data.palette !== null && !palettes.includes(data.palette)) at('"palette"', `is ${shown(data.palette)}; the palettes are ${palettes.map(shown).join(", ")}, or null for Docent's own colors`);
  if ("logo" in data && data.logo !== null) {
    const logo = { re: LOGO, what: "an SVG, PNG or WebP file" };
    if (isPlain(data.logo)) {
      for (const key of Object.keys(data.logo)) if (!["light", "dark"].includes(key)) at(`"logo".${shown(key)}`, 'no field has this name; a logo has "light" and "dark"');
      if (!("light" in data.logo) && !("dark" in data.logo)) at('"logo"', 'names no file; write one path, or { "light": "…", "dark": "…" }');
      for (const key of ["light", "dark"]) if (key in data.logo) where(`"logo".${shown(key)}`, data.logo[key], logo);
    } else where('"logo"', data.logo, logo);
  }
  if ("tagline" in data && data.tagline !== null) {
    if (typeof data.tagline !== "string" || !data.tagline.trim()) at('"tagline"', "is not a line of text");
    else if (/[<>]/.test(data.tagline)) at('"tagline"', "holds markup; it is one line of plain text");
    else if (data.tagline.length > TAGLINE) at('"tagline"', `has ${data.tagline.length} characters; it is one line of at most ${TAGLINE}`);
  }
  if ("credit" in data && !CREDITS.includes(data.credit)) at('"credit"', `is ${shown(data.credit)}; it is ${CREDITS.map(shown).join(", ")}`);
  if ("profile" in data && data.profile !== null && !profiles.includes(data.profile)) at('"profile"', `is ${shown(data.profile)}; a profile is ${profiles.map(shown).join(", ")}`);
  if ("rules" in data && !isPlain(data.rules)) at('"rules"', 'is not an object; each key is a rule ID, and each value is { "off": true, "reason": "…" }');
  else if ("rules" in data) for (const [id, entry] of Object.entries(data.rules)) {
    const field = `"rules".${shown(id)}`, rule = RULES.get(id);
    if (!rule) { at(field, "no rule has this ID; node check.cjs --rules lists them"); continue; }
    if (rule.group === GUARANTEE) { at(field, 'a guarantee, which the repo file cannot change; it is a promise to the reader of every page (see "Rule changes" in DESIGN.md)'); continue; }
    if (!isPlain(entry)) { at(field, 'is not { "off": true, "reason": "…" }'); continue; }
    for (const key of Object.keys(entry)) if (!["off", "reason"].includes(key)) at(`${field}.${shown(key)}`, 'no field has this name; a rule change holds "off": true and "reason", and a rule is on or off');
    if (entry.off !== true) at(field, `"off" is ${shown(entry.off)}; a rule change is "off": true, and a rule that stays on has no entry`);
    if (typeof entry.reason !== "string" || !entry.reason.trim()) at(field, 'no "reason"; write why the team changes this rule');
  }
  return { file: abs, base, data: errors.length ? null : data, errors, lines: errors.length ? {} : linesOf(fs.readFileSync(abs, "utf8"), data) };
}

/** The line of the file where each rule change stands, so a note can name it: { id: line }. */
function linesOf(text, data) {
  const out = {}, rows = text.split(/\r?\n/), start = rows.findIndex((r) => /"rules"\s*:/.test(r));
  for (const id of Object.keys((data && data.rules) || {})) {
    const at = rows.findIndex((r, i) => i >= Math.max(start, 0) && r.includes(JSON.stringify(id)));
    if (at >= 0) out[id] = at + 1;
  }
  return out;
}

module.exports = { NAME, VERSION, COLORS, FONTS, FIELDS, repoRoot, findConfig, readConfig };
