const test = require("node:test");
const assert = require("node:assert/strict");
const { VERSION, stampHtml, findKit } = require("../skills/docent/scripts/lib/kit.cjs");

const bare = "<!doctype html>\n<html lang=\"en\">\n<head>\n<title>T — H</title>\n</head>\n<body>\n<main></main>\n</body>\n</html>\n";

test("stamp adds the kit to a document that has none", () => {
  const { html, actions } = stampHtml(bare);
  assert.deepEqual(actions, ["styles added", "script added"]);
  const kit = findKit(html);
  assert.deepEqual(kit.map((k) => [k.kind, k.version]), [["styles", VERSION], ["script", VERSION]]);
  assert.ok(html.indexOf("docent:kit") < html.indexOf("</head>"), "the styles sit in the head");
  assert.ok(html.lastIndexOf("// /docent:kit") < html.indexOf("</body>"), "the script sits at the end of the body");
});

test("stamp is the same when it runs twice", () => {
  const once = stampHtml(bare).html;
  const twice = stampHtml(once);
  assert.equal(twice.html, once);
  assert.deepEqual(twice.actions, ["styles already current", "script already current"]);
});

test("stamp replaces an old or edited kit and keeps the author's own styles", () => {
  const old = stampHtml(bare).html
    .replace(`docent:kit ${VERSION} */`, "docent:kit 0.0.1 */\nbody { color: red; }")
    .replace("</head>", "<style>.mine { margin: 0; }</style>\n</head>");
  const { html, actions } = stampHtml(old);
  assert.deepEqual(actions, ["styles replaced", "script already current"]);
  assert.ok(!html.includes("color: red"));
  assert.ok(html.includes(".mine { margin: 0; }"));
});

test("stamp refuses a document with two kit blocks", () => {
  const once = stampHtml(bare).html;
  const block = findKit(once)[0].text;
  assert.throws(() => stampHtml(once.replace("</head>", `<style>${block}</style></head>`)), /2 kit styles blocks/);
});
