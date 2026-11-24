#!/usr/bin/env node
// brand: reads a host project's DESIGN.md and prints the host tokens for a Docent page. It writes nothing.
// Usage: node brand.cjs [DESIGN.md] [--config <path> | --no-config]
// With no DESIGN.md, it reads the one that the repo file names: the nearest .docent/config.json at or above the current folder.
// The file's "tokens" win over the values worked out from DESIGN.md (docs/proposals/repo-config.md, section 2).
// It reads the front matter only, and of that only "colors" and "typography". Six host tokens come out, and nothing else:
// a host's page, text and status colors would break dark mode, print and the contrast that Docent tests (see DESIGN.md, Host tokens).
require("./lib/node.cjs").warnOldNode(); // first, so that an old Node is named before anything else can fail
const fs = require("node:fs");
const path = require("node:path");
const { PAGE, contrast, lab, atLightness, darkAccent, nearestStatus } = require("./lib/color.cjs");
const { findConfig, readConfig, COLORS, FONTS } = require("./lib/config.cjs");
const { NAMES: PALETTES, PALETTES: NAMED, closest } = require("./lib/palettes.cjs");
const { PROFILES } = require("./lib/profile.cjs");

const INK_L = 16.6; // the CIELAB lightness of Docent's own heading color (#1b2260)
const STACK = {
  serif: 'Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Code", Consolas, Menlo, monospace',
};
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
// A generic family always matches, so a brand's generic name would hide Docent's fonts after it; Docent's stack ends with its own.
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong"]);

/** The value of a YAML line without its comment and quotes. */
function scalar(raw) {
  // Many hand-written files write a color with no quotes, such as "primary: #2f3fd0". Strict YAML reads that as a comment; brand reads the color.
  const bare = raw.match(/^\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})(\s+#.*)?\s*$/);
  if (bare) return bare[1];
  let out = "", quote = null;
  for (const ch of raw) {
    if (quote) { if (ch === quote) quote = null; out += ch; continue; }
    if (ch === "#" && (!out || /\s$/.test(out))) break;
    if (ch === '"' || ch === "'") quote = ch;
    out += ch;
  }
  out = out.trim();
  if (/^\[.*\]$/.test(out)) return out.slice(1, -1).trim(); // a flow list, such as [Inter, sans-serif]
  return /^(["']).*\1$/.test(out) && !/^(["']).*\1\s*,/.test(out) ? out.slice(1, -1) : out;
}

/** The front matter of a DESIGN.md as nested objects: top-level keys, and their keys by indent. Only plain "key: value" lines. */
function frontMatter(text) {
  const m = text.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/);
  if (!m) return null;
  const root = {}, stack = [{ indent: -1, node: root }];
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line) || /^\s*-/.test(line)) continue;
    const kv = line.match(/^(\s*)("[^"]+"|'[^']+'|[^:#]+?)\s*:(.*)$/);
    if (!kv) continue;
    const indent = kv[1].length, key = kv[2].replace(/^["']|["']$/g, "").trim(), value = scalar(kv[3]);
    while (stack.length > 1 && stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1).node;
    if (value === "") { parent[key] = {}; stack.push({ indent, node: parent[key] }); } else parent[key] = value;
  }
  return root;
}

/** A font stack with the brand's own fonts first and Docent's after them, each name once. */
function stack(family, own) {
  const names = (s) => s.split(",").map((n) => n.trim()).filter(Boolean);
  const key = (n) => n.replace(/^["']|["']$/g, "").toLowerCase();
  const quote = (n) => (/^["']/.test(n) || /^[\w-]+$/.test(n) ? n : `"${n}"`);
  const seen = new Set(), out = [];
  const safe = (n) => !/[;{}<>\\]|\/\*|\*\/|url\s*\(/i.test(n); // a name that could end the value, the rule or the style element is left out
  for (const n of [...names(family).filter((n) => !GENERIC.has(key(n)) && safe(n)).map(quote), ...names(own)]) if (!seen.has(key(n))) { seen.add(key(n)); out.push(n); }
  return out.join(", ");
}

/** The same hue, the lightness lowered until 4.6:1 on the page and the well. */
function mend(hex) {
  const { L, C, h } = lab(hex);
  for (let l = L; l >= 0; l -= 0.1) { const c = atLightness(l, C, h); if (c && contrast(c, PAGE.light) >= 4.6 && contrast(c, PAGE.well) >= 4.6) return c; }
  return "#000000";
}
const low = (hex, grounds) => Math.min(...grounds.map((g) => contrast(hex, g)));
const fmt = (n) => `${n.toFixed(2)}:1`;

/** Works out the host tokens from the text of a DESIGN.md. Returns { tokens: [[name, value, note]], unused: [keys], notes: [lines], page } or
    { error }. page is the host's page color, when DESIGN.md has one, with the tested light pages from the closest. */
function brand(text) {
  const data = frontMatter(text);
  if (!data) return { error: "the file has no front matter (a block between two --- lines at the top), so it holds no colors or fonts that brand can read" };
  const colors = typeof data.colors === "object" ? data.colors : {}, type = typeof data.typography === "object" ? data.typography : {};
  const tokens = [], notes = [];
  const color = (key) => (HEX.test(colors[key] || "") ? colors[key].toLowerCase() : null);
  for (const key of ["primary", "secondary", "dark-primary", "primary-dark"]) if (colors[key] && !color(key)) notes.push(`colors.${key} is "${colors[key]}"; brand reads hex colors only, such as #2f3fd0`);

  const given = color("primary");
  let accent = null;
  if (given) {
    const worst = low(given, [PAGE.light, PAGE.well]);
    accent = worst >= 4.5 ? given : mend(given);
    tokens.push(["host-accent", accent, accent === given ? `colors.primary, ${fmt(worst)} on the well` : `colors.primary ${given} is ${fmt(worst)} on the well, below 4.5:1; the same hue made darker, ${fmt(low(accent, [PAGE.light, PAGE.well]))}`]);
  } else notes.push("the file has no colors.primary in hex, so the page keeps Docent's own accent, and brand works out no dark accent or heading color");

  if (accent) {
    const key = color("dark-primary") ? "dark-primary" : color("primary-dark") ? "primary-dark" : null;
    const own = key && color(key), worst = own && low(own, [PAGE.dark, PAGE.darkWell]);
    if (own && worst >= 4.5) tokens.push(["host-accent-dark", own, `colors.${key}, ${fmt(worst)} on the dark well`]);
    else {
      const dark = darkAccent(given); // from the brand's own color: dark mode can show a light color that the light page cannot
      tokens.push(["host-accent-dark", dark, `${own ? `colors.${key} ${own} is ${fmt(worst)} on the dark well, below 4.5:1, so` : "the file has no dark accent, so"} ${dark === given ? `colors.primary itself, ${fmt(contrast(dark, PAGE.dark))} on the dark page` : `worked out: the same hue at ${fmt(contrast(dark, PAGE.dark))} on the dark page`}`]);
    }
    const second = color("secondary");
    if (second && contrast(second, PAGE.light) >= 4.5 && lab(second).L <= 35) tokens.push(["host-ink", second, `colors.secondary, ${fmt(contrast(second, PAGE.light))} on the page`]);
    else {
      const { C, h } = lab(given), ink = atLightness(INK_L, C, h);
      tokens.push(["host-ink", ink, `worked out: the accent's hue at the lightness of Docent's heading color, ${fmt(contrast(ink, PAGE.light))} on the page${second ? `; colors.secondary ${second} is ${contrast(second, PAGE.light) < 4.5 ? `${fmt(contrast(second, PAGE.light))} on the page` : `too light for a heading (L* ${lab(second).L.toFixed(0)})`}` : ""}`]);
    }
  }

  for (const [name, value] of tokens) {
    const theme = { "host-accent": "light", "host-accent-dark": "dark" }[name];
    const near = theme && nearestStatus(value, theme);
    if (near && near.distance < 25) notes.push(`--${name} ${value} is close to the ${theme === "dark" ? "dark " : ""}status color "${near.name}" (${near.distance.toFixed(1)}), so its links and dots may read as a status; check will warn. Tell the user, and offer a palette or another color`);
  }

  const font = (o) => (o && typeof o === "object" && typeof o.fontFamily === "string" ? o.fontFamily : null);
  const body = font(type["body-md"]) ? "body-md" : Object.keys(type).find((k) => /^body-/.test(k) && font(type[k]));
  for (const [token, key, own] of [["host-serif", "h1", STACK.serif], ["host-sans", body, STACK.sans], ["host-mono", "code", STACK.mono]]) {
    const family = key && font(type[key]);
    if (family) tokens.push([token, stack(family, own), `typography.${key}, with Docent's fonts after it for a reader who does not have the font`]);
  }
  if (tokens.some(([t]) => /serif|sans|mono/.test(t))) notes.push("the page loads no font: a brand font shows only where the reader has it installed, and Docent's fonts show everywhere else");

  const used = new Set(["primary", "secondary", "dark-primary", "primary-dark"].filter((k) => colors[k]));
  const unused = [...Object.keys(colors).filter((k) => !used.has(k)).map((k) => `colors.${k}`), ...Object.keys(data).filter((k) => !["colors", "typography", "version", "name", "description"].includes(k))];
  const pageKey = ["surface", "neutral"].find((k) => color(k)); // a page color, which Docent does not take: it offers the closest palette
  const page = pageKey ? { key: `colors.${pageKey}`, color: color(pageKey), closest: closest(color(pageKey)) } : null;
  return { tokens, unused, notes, page };
}

// The pages each host color is read on, and the contrast it needs, as check tests it (HOST in check.cjs), on Docent's own pages.
const NEEDS = { "host-accent": [[PAGE.light, PAGE.well], 4.5], "host-accent-dark": [[PAGE.dark, PAGE.darkWell], 4.5], "host-ink": [[PAGE.light, PAGE.well], 4.5], "host-dot-dark": [[PAGE.dark, PAGE.darkWell], 3] };
const ORDER = [...COLORS, ...FONTS];

/** The result of brand with the repo file's tokens over it: each one wins, and names the file and its reason. A color that fails is kept,
    because it is the team's choice, and a note says that check will refuse it. */
function withFile(result, tokens, label) {
  const out = { ...result, tokens: [...result.tokens], notes: [...result.notes] };
  for (const name of ORDER.filter((n) => tokens && Object.hasOwn(tokens, n))) {
    const { value, reason } = tokens[name];
    let note = `from ${label}: ${reason}`;
    if (NEEDS[name]) {
      const [grounds, need] = NEEDS[name], worst = low(value, grounds);
      note = `from ${label}, ${fmt(worst)} on the ${name === "host-accent-dark" || name === "host-dot-dark" ? "dark " : ""}well: ${reason}`;
      if (worst < need) out.notes.push(`--${name} ${value} from ${label} has ${fmt(worst)} on Docent's ${name === "host-accent-dark" || name === "host-dot-dark" ? "dark " : ""}well, below ${need}:1; check will refuse it. Change the value in ${label}`);
    }
    const at = out.tokens.findIndex(([n]) => n === name), entry = [name, NEEDS[name] ? value.toLowerCase() : value, note];
    if (at >= 0) out.tokens[at] = entry;
    else out.tokens.splice(out.tokens.filter(([n]) => ORDER.indexOf(n) < ORDER.indexOf(name)).length, 0, entry);
  }
  return out;
}

/** The line about a host's page color: one plain reason, and the closest tested palette as a choice, picked by distance. */
function pageNote(page) {
  const [first, ...rest] = page.closest, name = (p) => (p.name === "docent" ? "Docent's own page" : NAMED[p.name].name);
  return `${page.key} ${page.color} is a page color. Docent keeps its own page color, because some text would become hard to read in dark mode and on paper. The closest tested page is ${name(first)} (${first.page}), a distance of ${first.distance.toFixed(1)}; then ${rest.map((p) => `${name(p)} ${p.distance.toFixed(1)}`).join(", ")}. Offer it to the user as a choice; never swap it in without asking`;
}

/** A note made safe for a CSS comment inside <style>: it cannot end the comment, and it cannot end the style element. */
const comment = (note) => note.replace(/\*\//g, "* /").replace(/</g, "&lt;");

/** The style block to copy into a page, with a comment for each value. */
function print(result) {
  if (!result.tokens.length) return "";
  const width = Math.max(...result.tokens.filter(([n]) => !/serif|sans|mono/.test(n)).map(([n, v]) => n.length + v.length), 0);
  const lines = result.tokens.map(([name, value, note]) => `  --${name}: ${value};${" ".repeat(Math.max(1, width - name.length - value.length + 1))}/* ${comment(note)} */`);
  return `<style>\n:root {\n${lines.join("\n")}\n}\n</style>`;
}

const USAGE = "usage: node brand.cjs [DESIGN.md] [--config <path> | --no-config]\n       with no DESIGN.md, brand reads the one that .docent/config.json names";

function main(args) {
  const rest = [...args], flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest.splice(i, 1).length : 0; };
  const noConfig = flag("--no-config"), at = rest.indexOf("--config"), given = at >= 0 ? rest.splice(at, 2)[1] : null;
  if ((at >= 0 && !given) || (noConfig && at >= 0) || rest.length > 1 || rest.some((a) => a.startsWith("--"))) { console.error(USAGE); return 2; }
  const file = noConfig ? null : given || findConfig(process.cwd());
  let config = null;
  if (file) {
    config = readConfig(file, { palettes: PALETTES, profiles: PROFILES });
    const label = path.relative(process.cwd(), config.file) || config.file;
    if (config.errors.length) { for (const e of config.errors) console.error(`brand: error: ${label}, ${e}`); return 1; }
    config.label = label;
  }
  const design = rest[0] || (config && config.data.design ? path.resolve(config.base, config.data.design) : null);
  if (!design && !config) { console.error(USAGE); return 2; }
  let result = { tokens: [], unused: [], notes: [], page: null };
  if (design) {
    let text;
    try { text = fs.readFileSync(design, "utf8"); } catch (error) { console.error(`brand ${design}: ${error.message}`); return 1; }
    result = brand(text);
    if (result.error) { console.error(`brand ${design}: ${result.error}`); return 1; }
  } else result.notes.push(`${config.label} names no DESIGN.md ("design" is ${config.data.design === null ? "null" : "missing"}), so only its own tokens are used`);
  if (config) result = withFile(result, config.data.tokens, config.label);
  const style = print(result);
  if (style) console.log(style);
  for (const note of result.notes) console.log(`brand: ${note}`);
  if (result.page) console.log(`brand: ${pageNote(result.page)}`);
  if (result.unused.length) console.log(`brand: not used, so dark mode, print and the tested contrast stay as they are: ${result.unused.join(", ")}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { brand, frontMatter, stack, mend, print, withFile, pageNote, main };
