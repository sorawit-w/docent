// Blocks: a diagram or a widget is data in an HTML comment, followed by what a script made from it.
// <!-- docent:KIND
// { ...json... }
// -->
// ...what render made...
// <!-- /docent:KIND -->
class DataError extends Error {}
const fail = (msg) => { throw new DataError(msg); };

function words(value, what, most, required = true) {
  if (value == null || value === "") return required ? fail(`${what} is missing`) : "";
  if (typeof value !== "string") fail(`${what} must be text`);
  const s = value.trim().replace(/\s+/g, " ");
  if (!s) return required ? fail(`${what} is empty`) : "";
  if (s.length > most) fail(`${what} is ${s.length} characters long; the most is ${most}: "${s}"`);
  return s;
}

const id = (value, what) => (typeof value === "string" && /^[a-z][a-z0-9-]{0,39}$/.test(value) ? value : fail(`${what} must be a short id: small letters, digits and "-", starting with a letter`));

const marker = (kind) => new RegExp(`<!-- docent:${kind}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*-->[\\s\\S]*?<!-- \\/docent:${kind} -->`, "g");

/** Finds every block of one kind in a document: [{ json, start, end, text }]. */
const findBlocks = (html, kind) => [...html.matchAll(marker(kind))].map((m) => ({ json: m[1], text: m[0], start: m.index, end: m.index + m[0].length }));

const block = (kind, json, out) => `<!-- docent:${kind}\n${json}\n-->\n${out}\n<!-- /docent:${kind} -->`;

/**
 * Makes every block of one kind again, in place. make(data, found) returns { id, out, ...more } or throws; found says where the block stands.
 * A block that fails stays as it was. Returns { html, results: [{ id, error, warnings, ...more }] }.
 */
function replaceBlocks(html, kind, make) {
  const results = [], seen = new Set();
  let out = "", at = 0;
  for (const found of findBlocks(html, kind)) {
    let result = { id: null, form: null, warnings: [], error: null }, text = found.text;
    try {
      let data;
      try { data = JSON.parse(found.json); } catch (error) { fail(`the data is not valid JSON: ${error.message}`); }
      result.id = data?.id ?? null;
      const { out: made, ...more } = make(data, found);
      if (seen.has(more.id)) fail(`two ${kind}s have the id "${more.id}"`);
      seen.add(more.id);
      result = { ...result, ...more };
      text = block(kind, found.json, made);
    } catch (error) {
      result.error = error.message;
    }
    out += html.slice(at, found.start) + text;
    at = found.end;
    results.push(result);
  }
  return { html: out + html.slice(at), results };
}

module.exports = { DataError, fail, words, id, findBlocks, block, replaceBlocks };
