#!/usr/bin/env node
// stamp: puts the Docent page styles and page script into a document, between markers, with the kit version.
// Usage: node stamp.cjs <document.html> [more.html ...]
const fs = require("node:fs");
const { VERSION, stampHtml } = require("./lib/kit.cjs");

function main(files) {
  if (!files.length) {
    console.error("usage: node stamp.cjs <document.html> [more.html ...]");
    return 2;
  }
  let failed = 0;
  for (const file of files) {
    try {
      const before = fs.readFileSync(file, "utf8");
      const { html, actions } = stampHtml(before);
      if (html !== before) fs.writeFileSync(file, html);
      console.log(`stamp ${file}: ${actions.join(", ")} (kit ${VERSION})`);
    } catch (error) {
      failed += 1;
      console.error(`stamp ${file}: ${error.message}`);
    }
  }
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
