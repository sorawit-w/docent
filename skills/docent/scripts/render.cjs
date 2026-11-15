#!/usr/bin/env node
// render: draws Docent diagrams from data, as inline SVG.
// Usage: node render.cjs <document.html> [more.html ...]   draws every diagram block of a document in place
//        node render.cjs --data <diagram.json>             prints one drawing
const fs = require("node:fs");
const { renderDiagram, renderDocument } = require("./lib/diagram.cjs");

function main(args) {
  if (args[0] === "--data" && args[1]) {
    try {
      const { svg, form, warnings } = renderDiagram(JSON.parse(fs.readFileSync(args[1], "utf8")));
      warnings.forEach((w) => console.error(`render: warning: ${w}`));
      console.error(`render: drew ${args[1]} as ${form}`);
      console.log(svg);
      return 0;
    } catch (error) {
      console.error(`render ${args[1]}: ${error.message}`);
      return 1;
    }
  }
  if (!args.length || args[0].startsWith("--")) {
    console.error("usage: node render.cjs <document.html> [more.html ...]\n       node render.cjs --data <diagram.json>");
    return 2;
  }
  let failed = 0;
  for (const file of args) {
    const before = fs.readFileSync(file, "utf8");
    const { html, results } = renderDocument(before);
    if (!results.length) console.log(`render ${file}: no diagram blocks`);
    results.forEach((r, i) => {
      const name = `diagram ${i + 1}${r.id ? ` ("${r.id}")` : ""}`;
      r.warnings.forEach((w) => console.error(`render ${file}: ${name}: warning: ${w}`));
      if (r.error) { failed += 1; console.error(`render ${file}: ${name}: ${r.error}`); } else console.log(`render ${file}: ${name} drawn as ${r.form}`);
    });
    if (html !== before) fs.writeFileSync(file, html);
  }
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
