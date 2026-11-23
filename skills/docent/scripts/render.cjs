#!/usr/bin/env node
// render: draws Docent diagrams as inline SVG and builds Docent widgets as markup, both from data.
// Usage: node render.cjs <document.html> [more.html ...]   makes every diagram block and widget block of a document in place
//        node render.cjs --data <data.json>                prints one drawing or one widget
require("./lib/node.cjs").warnOldNode(); // first, so that an old Node is named before anything else can fail
const fs = require("node:fs");
const { renderDiagram, renderDocument } = require("./lib/diagram.cjs");
const { renderWidget, KINDS } = require("./lib/widget.cjs");

function main(args) {
  if (args[0] === "--data" && args[1]) {
    try {
      const data = JSON.parse(fs.readFileSync(args[1], "utf8"));
      // Diagrams have a "kind" too (sequence, flow, ...), so only a widget kind goes to the widget builder.
      if (data && KINDS.includes(data.kind)) {
        const { html, kind } = renderWidget(data);
        console.error(`render: built ${args[1]} as ${kind}`);
        console.log(html);
        return 0;
      }
      const { svg, form, note, warnings } = renderDiagram(data);
      warnings.forEach((w) => console.error(`render: warning: ${w}`));
      console.error(`render: drew ${args[1]} as ${form}${note ? `; ${note}` : ""}`);
      console.log(svg);
      return 0;
    } catch (error) {
      console.error(`render ${args[1]}: ${error.message}`);
      return 1;
    }
  }
  if (!args.length || args[0].startsWith("--")) {
    console.error("usage: node render.cjs <document.html> [more.html ...]\n       node render.cjs --data <data.json>");
    return 2;
  }
  let failed = 0;
  for (const file of args) {
    const before = fs.readFileSync(file, "utf8");
    const { html, results, widgets, places } = renderDocument(before);
    if (!results.length && !widgets.length) console.log(`render ${file}: no diagram blocks and no widget blocks`);
    for (const [list, what, made] of [[results, "diagram", "drawn"], [widgets, "widget", "built"]]) {
      list.forEach((r, i) => {
        const name = `${what} ${i + 1}${r.id ? ` ("${r.id}")` : ""}`;
        r.warnings.forEach((w) => console.error(`render ${file}: ${name}: warning: ${w}`));
        if (r.error) { failed += 1; console.error(`render ${file}: ${name}: ${r.error}`); } else console.log(`render ${file}: ${name} ${made} as ${r.form}`);
      });
    }
    for (const key of places.clash) { failed += 1; console.error(`render ${file}: two value pickers have the key "${key}"; each key belongs to one value picker`); }
    for (const key of places.unknown) { failed += 1; console.error(`render ${file}: a place <var data-v="${key}"> names a value that no value picker has; add "${key}" to the values of a value picker, or fix the key`); }
    if (places.count) console.log(`render ${file}: ${places.count} place${places.count === 1 ? "" : "s"} filled with a value`);
    if (html !== before) fs.writeFileSync(file, html);
  }
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
