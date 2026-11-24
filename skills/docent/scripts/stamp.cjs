#!/usr/bin/env node
// stamp: puts the Docent page styles and page script into a document, between markers, with the kit version.
// Usage: node stamp.cjs [--config <path> | --no-config] <document.html> [more.html ...]
// With a repo file (the nearest .docent/config.json above the page), it also writes the host tokens between docent:host markers:
// the ones brand works out from the DESIGN.md that the file names, with the file's own tokens over them. A page with
// data-brand="off" gets none, and a page with no repo file loses an old host block (docs/proposals/repo-config.md, sections 7 and 8).
require("./lib/node.cjs").warnOldNode(); // first, so that an old Node is named before anything else can fail
const fs = require("node:fs");
const path = require("node:path");
const { VERSION, stampHtml, brandOff } = require("./lib/kit.cjs");
const { findConfig, readConfig } = require("./lib/config.cjs");
const { hostTokens } = require("./brand.cjs");
const { NAMES: PALETTES } = require("./lib/palettes.cjs");
const { PROFILES } = require("./lib/profile.cjs");

const USAGE = "usage: node stamp.cjs [--config <path> | --no-config] <document.html> [more.html ...]";

function main(args) {
  const files = [...args], noConfig = files.includes("--no-config") && files.splice(files.indexOf("--no-config"), 1);
  const at = files.indexOf("--config"), given = at >= 0 ? files.splice(at, 2)[1] : null;
  if (!files.length || files.some((f) => f.startsWith("--")) || (at >= 0 && !given) || (noConfig && at >= 0)) {
    console.error(USAGE);
    return 2;
  }
  let failed = 0;
  const hosts = new Map(); // the host tokens of each repo file, worked out once
  const hostFor = (file) => {
    const found = noConfig ? null : given ? path.resolve(given) : findConfig(path.dirname(path.resolve(file)));
    if (!found) return { tokens: null };
    if (!hosts.has(found)) {
      const config = readConfig(found, { palettes: PALETTES, profiles: PROFILES });
      config.label = path.relative(process.cwd(), config.file) || config.file;
      hosts.set(found, config.errors.length ? { error: `${config.label} is refused, so stamp leaves the host tokens as they are: ${config.errors.join("; ")}` } : hostTokens(config));
    }
    return hosts.get(found);
  };
  for (const file of files) {
    try {
      const before = fs.readFileSync(file, "utf8");
      const host = brandOff(before) ? { tokens: null } : hostFor(file);
      const { html, actions } = stampHtml(before, host.error ? {} : { host: host.tokens });
      if (html !== before) fs.writeFileSync(file, html);
      console.log(`stamp ${file}: ${actions.join(", ")} (kit ${VERSION})`);
      if (host.error) { failed += 1; console.error(`stamp ${file}: ${host.error}`); }
    } catch (error) {
      failed += 1;
      console.error(`stamp ${file}: ${error.message}`);
    }
  }
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
