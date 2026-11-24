// The kit: the page styles and the page script that every Docent document carries, between markers.
const fs = require("node:fs");
const path = require("node:path");

const SKILL = path.join(__dirname, "..", "..");
const VERSION = fs.readFileSync(path.join(SKILL, "VERSION"), "utf8").trim();
const read = (name) => fs.readFileSync(path.join(SKILL, "assets", name), "utf8").trim();

const CSS_BLOCK = /\/\* docent:kit ([^ *]+) \*\/[\s\S]*?\/\* \/docent:kit \*\//g;
const JS_BLOCK = /\/\/ docent:kit ([^\s]+)\n[\s\S]*?\/\/ \/docent:kit/g;
// The host tokens that stamp writes from the repo file and the DESIGN.md it names, in their own <style>, inside :where(:root): its
// specificity is 0, so a --host-* value that the author writes anywhere in the page wins (docs/proposals/repo-config.md, section 6).
const HOST_BLOCK = /\/\* docent:host \*\/[\s\S]*?\/\* \/docent:host \*\//g;
const HOST_STYLE = /<style>\n\/\* docent:host \*\/[\s\S]*?\/\* \/docent:host \*\/\n<\/style>\n?/g;

const { paletteFor, paletteCss, presentCss } = require("./palettes.cjs");
/** The value of an attribute on <html>, or null. */
function htmlAttr(html, name) {
  const tag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return m ? m[1] ?? m[2] ?? m[3] : null;
}
/** The profile that <html> names, or null. */
const profileOf = (html) => htmlAttr(html, "data-profile");
/** True for a page about another product (data-brand="off"): it takes no brand field of the repo file, and keeps its rule changes. */
const brandOff = (html) => htmlAttr(html, "data-brand") === "off";
const isDeck = (html) => profileOf(html) === "deck";
/** The kit styles, with the one palette that the page names, if any (a name, or a palette worked out from a hue), and the deck part only in a deck. */
const cssBlock = (palette = null, deck = false) => `/* docent:kit ${VERSION} */\n${read("kit.css")}${palette ? `\n${paletteCss(palette)}` : ""}${deck ? `\n${read("deck.css")}${palette ? `\n${presentCss(palette)}` : ""}` : ""}\n/* /docent:kit */`;
const jsBlock = (deck = false) => `// docent:kit ${VERSION}\n${read("kit.js")}${deck ? `\n${read("deck.js")}` : ""}\n// /docent:kit`;

/** The kit blocks found in a document: [{ kind, version, text }]. */
function findKit(html) {
  const found = [];
  for (const m of html.matchAll(CSS_BLOCK)) found.push({ kind: "styles", version: m[1], text: m[0] });
  for (const m of html.matchAll(JS_BLOCK)) found.push({ kind: "script", version: m[1], text: m[0] });
  return found;
}

/** The host block for a list of [token, value]: one rule in :where(:root), between docent:host markers. */
const hostBlock = (tokens) => `/* docent:host */\n/* The host tokens from the repo file, .docent/config.json, written by stamp. A --host-* value in the page's own style wins. */\n:where(:root) { ${tokens.map(([name, value]) => `--${name}: ${value};`).join(" ")} }\n/* /docent:host */`;

/** The host block of a page, or null. */
const hostOf = (html) => (html.match(HOST_BLOCK) || [null])[0];

/** Puts the kit into a document. Replaces the blocks between the markers, or adds them when the document has none.
    With options.host (a list of [token, value], or null), it also writes the host block, or takes it out when there is none. */
function stampHtml(html, options = {}) {
  const actions = [];
  const put = (kind, pattern, block, wrap, before) => {
    const count = [...html.matchAll(pattern)].length;
    if (count > 1) throw new Error(`the document has ${count} ${kind.startsWith("host") ? kind : `kit ${kind}`} blocks; it must have one`);
    if (count === 1) {
      const old = html.match(pattern)[0];
      if (old === block) return actions.push(`${kind} already current`);
      html = html.replace(pattern, () => block);
      return actions.push(`${kind} replaced`);
    }
    const at = html.lastIndexOf(before);
    if (at < 0) throw new Error(`the document has no ${before} tag, so the kit ${kind} cannot be added`);
    html = html.slice(0, at) + wrap(block) + html.slice(at);
    actions.push(`${kind} added`);
  };
  const deck = isDeck(html);
  const palette = paletteFor(html);
  if (palette.error) throw new Error(palette.error);
  put("styles", CSS_BLOCK, cssBlock(palette.palette, deck), (b) => `<style>\n${b}\n</style>\n`, "</head>");
  put("script", JS_BLOCK, jsBlock(deck), (b) => `<script>\n${b}\n</script>\n`, "</body>");
  if ("host" in options) {
    if (options.host && options.host.length) put("host tokens", HOST_BLOCK, hostBlock(options.host), (b) => `<style>\n${b}\n</style>\n`, "</head>");
    else if (hostOf(html)) { html = html.replace(HOST_STYLE, "").replace(HOST_BLOCK, ""); actions.push("host tokens taken out"); }
  }
  return { html, actions };
}

module.exports = { VERSION, cssBlock, jsBlock, findKit, stampHtml, hostBlock, hostOf, htmlAttr, profileOf, brandOff, isDeck };
