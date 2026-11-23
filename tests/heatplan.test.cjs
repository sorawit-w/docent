// Heat plans: how much happens in each area of a page, as a plan whose boxes are filled with heat steps, with a legend and a table.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name = "product") => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `heatplan-${name}.json`), "utf8"));
const FONT = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400], hv: [12, 400], hn: [12, 400] };
const box = (n) => {
  const cls = n.cls.split(" ")[0], [size, weight] = FONT[cls];
  const w = ["val", "hv"].includes(cls) ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const rectOf = (svg) => {
  const m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
  return { x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4] };
};
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const part = (s, id) => s.parts.find((p) => p.id === id);
const classOf = (s, id) => part(s, id).svg.match(/class="([^"]+)"/)[1];
const texts = (s, id) => part(s, id).texts.map((t) => `${t.s}:${t.cls}`);
const words = (d) => renderDiagram(d).svg.split("<details")[1];
const bad = (change, reason, name = "product") => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), reason); };

test("both examples match their stored drawings", () => {
  for (const name of ["product", "help"]) {
    const { svg, form, warnings } = renderDiagram(fixture(name));
    assert.equal(form, "heatplan");
    assert.deepEqual(warnings, []);
    const file = path.join(__dirname, "expected", `heatplan-${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `heatplan-${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  }
});

test("each box is filled with the heat step of its value, and its texts take the text color, or the page color on steps 4 and 5", () => {
  const { scene, phone, note } = renderDiagram(fixture());
  assert.equal(note, "", "the product page keeps its grid, to scale, on a phone too");
  for (const s of [scene, phone]) {
    assert.deepEqual(["header", "gallery", "details", "cart", "reviews", "related", "footer"].map((id) => classOf(s, id)), ["box h3", "box h4", "box h2", "box h5", "box h3", "box h1", "box h1"], "5 steps of 200: 420 and 430 on step 3, 610 on 4, 870 on 5, 150 and 60 on 1");
    // The value stands under the name; a note on a step is not muted.
    assert.deepEqual(texts(s, "header").slice(-2), ["420:hv hs", "search and menu:hn hs"]);
    assert.ok(texts(s, "cart").every((t) => t.endsWith(" hi")), "on step 5 the name, the value and the note take the page color");
    assert.ok(texts(s, "details").every((t) => !t.endsWith(" hi")), "on step 2 they take the text color");
  }
  assert.deepEqual(texts(scene, "cart"), ["Add to cart:row hs hi", "870:hv hs hi", "price and size:hn hs hi"]);
});

test("a box with no data keeps the plan's look and says so under its name, and the legend has no no-data key", () => {
  const { scene, phone, svg } = renderDiagram(fixture());
  for (const s of [scene, phone]) {
    assert.equal(classOf(s, "chat"), "box");
    assert.deepEqual(part(s, "chat").texts.filter((t) => t.cls === "sub").map((t) => t.s)[0], "no data");
    assert.equal(s.notes.filter((n) => n.s === "no data").length, 0, "the box says it in words, so the legend needs no key");
  }
  assert.match(svg, /\.box\{fill:var\(--bg,#fbfbfe\);stroke:var\(--text,#1c1f2e\);stroke-width:1\.5\}[\s\S]*\.h1\{fill:var\(--heat-1,#c6e9ef\)\}/, "the step rules come after the box rule, so a step wins");
});

test("the legend stands above the plan, at the left edge of its boxes, with the edge numbers and the unit", () => {
  const { scene, phone } = renderDiagram(fixture());
  for (const s of [scene, phone]) {
    assert.deepEqual(s.notes.filter((n) => n.y === 38).map((n) => n.s), ["0", "200", "400", "600", "800", "1000"]);
    assert.equal(rectOf(part(s, "legend").svg).x0, 16, "the first swatch starts by the boxes (14px); its edge number 0 keeps it 12px inside");
    const head = s.notes.find((n) => n.s === "Widths in px"), lowest = Math.max(...s.notes.filter((n) => n.y === 38 || n.s === "clicks").map((n) => n.y));
    assert.ok(head.y - lowest >= 24, "the line on the widths stands clear of the legend");
  }
  assert.equal(scene.notes.find((n) => n.s === "clicks").y, 22, "the unit at the right of the swatches on a desktop");
  assert.equal(phone.notes.find((n) => n.s === "clicks").y, 56, "and on a second line on a phone, where 1000 makes the swatches wide");
});

test("the value is one more line in a box, so it counts in the box's height and width", () => {
  const plain = { ...fixture(), kind: "plan" };
  delete plain.scale;
  plain.boxes = plain.boxes.map(({ value, ...b }) => b);
  const heat = renderDiagram(fixture()).scene, flat = renderDiagram(plain).scene;
  const h = (s, id) => rectOf(part(s, id).svg).y1 - rectOf(part(s, id).svg).y0;
  assert.equal(h(heat, "header") - h(flat, "header"), 16, "a 12px line more under the name");
  // A value wider than its names widens its column: values of 11 characters need 90px for each column, more than a phone
  // has for three, so the product page stacks there.
  const d = fixture();
  d.scale = { from: 0, to: 1, step: 0.25, unit: "share" };
  d.boxes.forEach((b) => b.value != null && (b.value = Math.round(b.value) / 1000 + 0.0000012345));
  const wide = renderDiagram(d);
  assert.equal(renderDiagram(fixture()).phone.stack, undefined);
  assert.equal(wide.phone.stack, true);
  for (const p of wide.scene.parts.slice(1)) for (const t of p.texts.map(box)) assert.ok(t.x1 <= rectOf(p.svg).x1 - 8 + 0.01, `"${t.s}" stays inside its box`);
});

test("no text meets another text or a box it does not belong to, and every text stays inside its box and the drawing", () => {
  for (const name of ["product", "help"]) {
    const { scene, phone } = renderDiagram(fixture(name));
    for (const s of [scene, phone]) {
      const all = [...s.notes, ...s.parts.flatMap((p) => p.texts)].map(box);
      for (const t of all) assert.ok(t.x0 >= 12 - 0.01 && t.x1 <= s.w - 12 + 0.01, `"${t.s}" runs past the drawing (${name}, ${s.w}px)`);
      all.forEach((a, i) => all.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}" (${name}, ${s.w}px)`)));
      if (s.stack) continue;
      for (const p of s.parts.slice(1)) {
        const r = rectOf(p.svg);
        for (const t of p.texts.map(box)) assert.ok(t.x0 >= r.x0 + 8 - 0.01 && t.x1 <= r.x1 - 8 + 0.01 && t.y0 >= r.y0 + 8 - 0.01 && t.y1 <= r.y1 - 8 + 0.01, `"${t.s}" stays inside its box (${name}, ${s.w}px)`);
        for (const t of s.notes.map(box)) assert.ok(!meet(t, r), `"${t.s}" meets the box "${p.id}" (${name}, ${s.w}px)`);
      }
    }
  }
});

test("a heat plan whose grid does not fit a phone is stacked: each map shows every box in its step, and the band's box has a ring", () => {
  const { scene, phone, note, svg } = renderDiagram(fixture("help"));
  assert.equal(scene.stack, undefined);
  assert.equal(phone.stack, true);
  assert.equal(note, "not to scale; stacked on a phone");
  assert.deepEqual(phone.parts.slice(1).map((p) => p.id), ["search", "topics", "article", "related", "vote", "contact"]);
  for (const p of phone.parts.slice(1)) {
    const rects = p.svg.match(/<rect [^>]*\/>/g);
    assert.equal(rects.filter((r) => /class="m-box h\d/.test(r)).length, 6, `the map of "${p.id}" fills every box with its step`);
    assert.equal(rects.filter((r) => /m-at/.test(r)).length, 1);
    // The ring: a 2px outline in the text color, and a 1px line in the page color 1.5px inside it, so it shows on step 5 too.
    const at = rectOf(rects.find((r) => /m-at/.test(r))), inner = rectOf(rects.find((r) => /m-in/.test(r)));
    assert.deepEqual([inner.x0 - at.x0, at.x1 - inner.x1, inner.y0 - at.y0, at.y1 - inner.y1], [1.5, 1.5, 1.5, 1.5]);
    assert.ok(rects.indexOf(rects.find((r) => /m-in/.test(r))) === rects.length - 1, "the ring is drawn last, over its neighbours");
  }
  assert.match(part(phone, "search").svg, /class="m-box h5 m-at"/, "Search, on step 5, is the box with the ring in its own band");
  // The value sits on the band, not on a step, so it has no "hs" and takes the text color: with the reader's high contrast mode, the system text color.
  assert.deepEqual(texts(phone, "article"), ["Article:name", "90 clicks:hv", "links in the text:sub"], "the value with its unit, under the name");
  assert.match(svg, /\.hv\{font-size:12px;fill:var\(--text,#1c1f2e\);font-variant-numeric:tabular-nums\}/);
  // The ring works because its two lines contrast with each other, as the text and page colors do in every theme and in forced colors.
  assert.match(svg, /\.m-box\.m-at\{stroke:var\(--text,#1c1f2e\);stroke-width:2\}/);
  assert.match(svg, /\.m-in\{fill:none;stroke:var\(--bg,#fbfbfe\);stroke-width:1\}/);
  assert.doesNotMatch(svg, /\.m-on\{/, "the plan's filled map box is not used");
  // A box with no data in a stack says so, and its map box is hollow.
  const d = fixture("help");
  d.boxes[3].value = null;
  const stacked = renderDiagram(d).phone;
  assert.deepEqual(texts(stacked, "related"), ["Related articles:name", "no data:sub"]);
  assert.match(part(stacked, "search").svg, /class="m-box"\//);
});

test("the diagram in words is the plan's table with a Value column, and the lines on the steps, the highest, the lowest and no data", () => {
  const w = words(fixture());
  assert.match(w, /<div class="table-wrap is-text" role="region" aria-label="The boxes of the heat plan" tabindex="0"><table><thead><tr><th scope="col">Box<\/th><th scope="col">Value<\/th><th scope="col">Row<\/th><th scope="col">Column<\/th><th scope="col">Width<\/th><th scope="col">Note<\/th><\/tr>/);
  assert.match(w, /<tr><th scope="row">Add to cart<\/th><td>870<\/td><td>row 2<\/td><td>right<\/td><td>480<\/td><td>price and size<\/td><\/tr>/);
  assert.match(w, /<tr><th scope="row">Help chat<\/th><td>no data<\/td>/);
  assert.match(w, /<p>Widths are in px\. The rows are not drawn to scale\.<\/p>\n<ul><li>Each box is shaded by its number, in 5 steps of 200 clicks from 0 to 1000\. A number on the edge of two steps takes the higher step\.<\/li><li>The highest number is 870 \(Add to cart\)\. The lowest is 60 \(Footer\)\.<\/li><li>1 box has no data\.<\/li><\/ul>/);
  const two = fixture();
  two.boxes[2].value = 60;
  two.boxes[0].value = null;
  assert.match(words(two), /The lowest is 60, in 2 boxes\.<\/li><li>2 boxes have no data\.<\/li>/);
  assert.match(words(fixture("help")), /<p>The plan is not drawn to scale\. On a phone each box stands on its own, beside a small map of the plan\.<\/p>\n<ul>/);
  // A plain plan keeps its table as it was: no Value column and no wrapper.
  const plain = renderDiagram(JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "plan-docs.json"), "utf8"))).svg;
  assert.doesNotMatch(plain, /Value<\/th>/, "a plain plan has no Value column");
  assert.match(plain, /<div class="table-wrap is-text" role="region" aria-label="The boxes of the plan" tabindex="0"><table>/, "a plain plan's table scrolls in the same wrapper, so its words stay whole on a phone");
});

test("a value on an edge takes the higher step, and 3 steps take heat steps 1, 3 and 5", () => {
  const d = fixture("help");
  d.scale = { from: 0, to: 600, step: 200, unit: "clicks" };
  ["0", "200", "399.5", "400", "600", "1"].forEach((v, i) => (d.boxes[i].value = +v));
  const { scene } = renderDiagram(d);
  assert.deepEqual(["search", "topics", "article", "related", "vote", "contact"].map((id) => classOf(scene, id)), ["box h1", "box h3", "box h3", "box h5", "box h5", "box h1"]);
});

test("wrong heat plan data is refused with a plain reason", () => {
  bad((d) => (d.place = "walk"), /a heat plan sits in the text flow; "place" must be "flow"/);
  bad((d) => (d.form = "wide"), /a heat plan has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  bad((d) => (d.rows = []), /a heat plan has no "rows"; write each row as a string in "areas"/);
  bad((d) => (d.boxes = [d.boxes[0]]), /a heat plan has 2 to 8 boxes; this one has 1/);
  bad((d) => (d.areas = d.areas.map((r) => `${r} chat chat`)), /row 1 of "areas" has 5 cells; a heat plan has 1 to 4 columns/);
  bad((d) => delete d.scale, /"scale"/);
  bad((d) => (d.scale.marks = [{ at: 500, name: "Goal" }]), /the scale of a heat plan has no "marks"; say a value that matters in the label or the text/);
  bad((d) => (d.scale.step = 100), /the scale has 10 steps; a heat plan has 3 to 5, one for each heat step\. Use a larger "step"/);
  bad((d) => (d.scale.step = 500), /the scale has 2 steps; a heat plan has 3 to 5, one for each heat step\. Use a smaller "step"/);
  bad((d) => delete d.scale.unit, /the scale of a heat plan needs a "unit", such as "clicks"; the legend names it/);
  bad((d) => delete d.boxes[3].value, /the box "cart" needs a "value": a number on the scale, or null for no data/);
  bad((d) => (d.boxes[3].value = "870"), /the box "cart" has the value "870"; a value is a number, or null for no data/);
  bad((d) => (d.boxes[3].value = 1200), /the box "cart" has the value 1200; it must be on the scale, from 0 to 1000/);
  bad((d) => (d.boxes[3].value = -5), /the box "cart" has the value −5; it must be on the scale, from 0 to 1000/);
  bad((d) => d.boxes.forEach((b) => (b.value = null)), /every box has no data; a heat plan needs at least one number/);
  bad((d) => (d.scale = { from: 0, to: 1000000, step: 200000, unit: "visits" }), /the legend needs \d+px on a phone, and a phone has 240px; its widest number is "1000000"\. Write the values in a larger unit, such as thousands/);
  bad((d) => { d.boxes[1].name = "W".repeat(20); d.boxes[2].name = "M" + "m".repeat(19); d.areas = ["header header header header", "gallery details cart chat", "reviews reviews related related", "footer footer footer footer"]; d.columns = [360, 360, 360, 360]; }, /the heat plan does not fit a desktop and paper: its columns need \d+px, and the drawing has 616px/);
});

test("the fit warnings name a plan with a table, or a sentence, when a heat plan shows little", () => {
  const warn = (change, name = "product") => { const d = fixture(name); change(d); return renderDiagram(d).warnings; };
  assert.deepEqual(warn((d) => d.boxes.forEach((b) => b.value != null && (b.value = 100))), ["every number is in one step, so the shades show nothing; a plan, with the numbers in a table, says this more simply"]);
  assert.deepEqual(warn((d) => { d.scale = { from: 0, to: 2500, step: 500, unit: "clicks" }; d.boxes[1].value = 410; d.boxes[3].value = 2400; }), ['6 of 7 boxes are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text']);
  assert.deepEqual(warn((d) => [0, 1, 2, 4].forEach((i) => (d.boxes[i].value = null))), ["5 of 8 boxes have no data; a plan, with the numbers of the other boxes in a table, may say this better"]);
  assert.deepEqual(warn((d) => { d.areas = ["search topics"]; d.boxes = d.boxes.slice(0, 2); }, "help"), ["the heat plan has 2 boxes; a sentence says where they sit and how much each got"]);
});

test("a heat plan takes every color from the page tokens, and has no state, no dot and nothing dashed", () => {
  for (const name of ["product", "help"]) {
    const { svg } = renderDiagram(fixture(name));
    const bare = svg.replace(/var\(--[a-z0-9-]+,#[0-9a-f]{6}\)/g, "");
    assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(|opacity|gradient|filter/i);
    assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, "no color written on an element");
    assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray|--primary/);
  }
  const { svg } = renderDiagram(fixture());
  assert.match(svg, /#dg-product-clicks \.hs\{fill:var\(--heat-text,#1c1f2e\)\}\n#dg-product-clicks \.hs\.hi\{fill:var\(--heat-page,#fbfbfe\)\}/, "text on a step (a name, a value, a note) takes the kit's own text color, not the muted one, or its page color on steps 4 and 5");
});

test("render reports the form, and check accepts a heat plan that render drew and reports one changed by hand", () => {
  const block = (name) => `<figure><div class="fig" role="region" aria-label="Figure 1, clicks" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(name), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Clicks.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const { html, results } = renderDocument(specimen.replace("</main>", `${block("product")}${block("help").replace(/Figure 1/g, "Figure 2")}</main>`));
  assert.deepEqual(results.slice(-2).map((r) => r.form), ["heatplan", "heatplan; not to scale; stacked on a phone"]);
  assert.deepEqual(checkDocument(html).errors, []);
  assert.match(checkDocument(html.replace(">870</text>", ">880</text>")).errors.join("\n"), /\("product-clicks"\): the drawing does not match its data; run render/);
});
