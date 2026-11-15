// The kit: the page styles and the page script that every Docent document carries, between markers.
const fs = require("node:fs");
const path = require("node:path");

const SKILL = path.join(__dirname, "..", "..");
const VERSION = fs.readFileSync(path.join(SKILL, "VERSION"), "utf8").trim();
const read = (name) => fs.readFileSync(path.join(SKILL, "assets", name), "utf8").trim();

const CSS_BLOCK = /\/\* docent:kit ([^ *]+) \*\/[\s\S]*?\/\* \/docent:kit \*\//g;
const JS_BLOCK = /\/\/ docent:kit ([^\s]+)\n[\s\S]*?\/\/ \/docent:kit/g;

const cssBlock = () => `/* docent:kit ${VERSION} */\n${read("kit.css")}\n/* /docent:kit */`;
const jsBlock = () => `// docent:kit ${VERSION}\n${read("kit.js")}\n// /docent:kit`;

/** The kit blocks found in a document: [{ kind, version, text }]. */
function findKit(html) {
  const found = [];
  for (const m of html.matchAll(CSS_BLOCK)) found.push({ kind: "styles", version: m[1], text: m[0] });
  for (const m of html.matchAll(JS_BLOCK)) found.push({ kind: "script", version: m[1], text: m[0] });
  return found;
}

/** Puts the kit into a document. Replaces the blocks between the markers, or adds them when the document has none. */
function stampHtml(html) {
  const actions = [];
  const put = (kind, pattern, block, wrap, before) => {
    const count = [...html.matchAll(pattern)].length;
    if (count > 1) throw new Error(`the document has ${count} kit ${kind} blocks; it must have one`);
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
  put("styles", CSS_BLOCK, cssBlock(), (b) => `<style>\n${b}\n</style>\n`, "</head>");
  put("script", JS_BLOCK, jsBlock(), (b) => `<script>\n${b}\n</script>\n`, "</body>");
  return { html, actions };
}

module.exports = { VERSION, cssBlock, jsBlock, findKit, stampHtml };
