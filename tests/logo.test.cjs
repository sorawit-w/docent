// The host's logo: the check refuses anything that can run code, load a file or depend on a font, and keeps the logo in its slot.
const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const { svgLogo, rasterLogo, checkLogos, slotSize, MOST } = require("../skills/docent/scripts/lib/logo.cjs");

const svg = (inner, attrs = 'width="24" height="24" aria-hidden="true"') => `<svg class="logo" viewBox="0 0 24 24" ${attrs}>${inner}</svg>`;
const why = (inner) => svgLogo(svg(inner)).error || "";
const bar = (logo, name = "Example project") => `<header class="topbar"><div class="shell"><span class="host">${logo}${name}</span></div></header>`;

// A PNG of any size: the signature and an IHDR chunk are enough for the check, which reads only the size.
const png = (w, h) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]); };
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.alloc(h))), chunk("IEND", Buffer.alloc(0))]);
};
const webp = (chunk, w, h) => {
  const b = Buffer.alloc(40); b.write("RIFF", 0); b.write("WEBP", 8); b.write(chunk, 12);
  if (chunk === "VP8 ") { b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28); }
  if (chunk === "VP8L") { const W = w - 1, H = h - 1; b[20] = 0x2f; b[21] = W & 0xff; b[22] = ((W >> 8) & 0x3f) | ((H & 0x3) << 6); b[23] = (H >> 2) & 0xff; b[24] = (H >> 10) & 0x0f; }
  if (chunk === "VP8X") { b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3); }
  return b;
};
const img = (bytes, kind = "png", attrs = 'width="96" height="24" alt=""') => `<img class="logo" src="data:image/${kind};base64,${bytes.toString("base64")}" ${attrs}>`;

test("a logo made of plain shapes passes: one color, a gradient, a clip path, and a use that points inside the logo", () => {
  assert.equal(svgLogo(svg('<path d="M2 2h20v20H2z" fill="currentColor"/>')).error, undefined);
  const shaded = svg('<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0a5f8a"/><stop offset="1" stop-color="#0d3550"/></linearGradient><clipPath id="c"><circle cx="12" cy="12" r="10"/></clipPath><path id="p" d="M2 2h8v8H2z"/></defs><g clip-path="url(#c)"><rect width="24" height="24" fill="url(#g)"/><use href="#p" fill="#ffffff"/></g><title>Example project</title>');
  const result = svgLogo(shaded);
  assert.equal(result.error, undefined);
  assert.deepEqual([...result.colors].sort(), ["#0a5f8a", "#0d3550", "#ffffff"], "the colors that show: the gradient's stops and the fill of the use; the clip shape is not drawn");
});

test("the logo check refuses every element that can run code, load a file, move, or depend on a font", () => {
  const refused = {
    "<script>alert(1)</script>": /<script> is not allowed in a logo: a script runs code/,
    "<style>path{fill:red}</style>": /<style> is not allowed.*a style element/,
    '<foreignObject width="10" height="10"><div>x</div></foreignObject>': /<foreignObject> is not allowed.*any HTML/,
    '<image href="logo.png" width="24" height="24"/>': /<image> is not allowed.*loads a file/,
    '<a href="https://example.com"><path d="M0 0h1"/></a>': /<a> is not allowed.*a link/,
    '<filter id="f"><feGaussianBlur stdDeviation="2"/></filter>': /<filter> is not allowed.*not flat/,
    '<pattern id="p" width="2" height="2"/>': /<pattern> is not allowed/,
    '<mask id="m"/>': /<mask> is not allowed/,
    '<path d="M0 0h1"><animate attributeName="d" dur="1s"/></path>': /<animate> is not allowed.*does not move/,
    '<set attributeName="fill" to="red"/>': /<set> is not allowed/,
    '<text x="0" y="12">Logo</text>': /<text> is not allowed.*turn the letters into paths/,
    '<g><tspan>x</tspan></g>': /<tspan> is not allowed/,
    '<svg viewBox="0 0 1 1"/>': /<svg> is not allowed.*one svg/,
    '<symbol id="s"/>': /<symbol> is not allowed in a logo/,
    "Logo": /holds text \("Logo"\) outside a title/,
    "<![CDATA[x]]>": /markup that check cannot read|holds text/,
  };
  for (const [inner, pattern] of Object.entries(refused)) assert.match(why(inner), pattern, inner);
});

test("the logo check refuses every attribute that can run code or load a file, and each url() or href that points outside the logo", () => {
  const refused = {
    '<path d="M0 0h1" onload="alert(1)"/>': /event attribute "onload", which runs code/,
    '<path d="M0 0h1" ONCLICK="alert(1)"/>': /event attribute "ONCLICK"/,
    '<path d="M0 0h1" style="fill:red"/>': /a style attribute/,
    '<path d="M0 0h1" fill=red/>': /no quotes around its value/,
    '<path d="M0 0h1" hidden/>': /"hidden" has no value/,
    '<path id="p" d="M0 0h1"/><use href="https://example.com/a.svg#p"/>': /<use> points at "https:\/\/example.com\/a.svg#p"/,
    '<use href="javascript:alert(1)"/>': /<use> points at "javascript:alert\(1\)"/,
    '<use xlink:href="data:image/svg+xml,x"/>': /<use> points at "data:image\/svg\+xml,x"/,
    '<use href="#missing"/>': /points at "#missing", which is not inside the logo/,
    '<path d="M0 0h1" href="#p"/>': /<path> has href="#p"; a logo links to nothing/,
    '<path d="M0 0h1" fill="url(https://example.com/a.svg#g)"/>': /a url\(\) in a logo points at an id inside the same logo/,
    '<g clip-path="url(data:image/svg+xml,x)"/>': /a url\(\) in a logo points at an id/,
    '<path d="M0 0h1" fill="red"/>': /fill="red"; write a color as a hex value/,
    '<path d="M0 0h1" fill="rgb(1,2,3)"/>': /write a color as a hex value/,
    '<path d="M0 0h1" data-x="1"/>': /the attribute "data-x", which a logo does not take/,
    '<path d="M0 0h1" transform="expression(alert(1)):x"/>': /holds characters that a shape does not need/,
    '<path id="a b" d="M0 0h1"/>': /the id "a b" holds characters/,
    '<path id="a" d="M0 0h1"/><path id="a" d="M0 0h1"/>': /the id "a" is used twice/,
  };
  for (const [inner, pattern] of Object.entries(refused)) assert.match(why(inner), pattern, inner);
  assert.match(svgLogo('<svg class="logo" viewBox="0 0 24 24" width="24" height="24" xmlns="http://evil.example/">x</svg>').error, /xmlns="http:\/\/evil.example\/"/);
  assert.match(svgLogo('<svg class="logo" width="24" height="24"><path d="M0 0h1"/></svg>').error, /no viewBox/);
});

test("a logo has at most 24,000 characters", () => {
  const path = `<path d="M0 0${"h1".repeat(MOST / 2)}"/>`;
  assert.match(why(path), /characters; a logo has at most 24000/);
});

test("a raster logo is a PNG or WebP data URI with enough pixels; JPEG, GIF, an SVG data URI, a file and an event attribute are refused", () => {
  assert.equal(rasterLogo(img(png(288, 72))).error, undefined, "a 4:1 PNG at three times its size");
  assert.deepEqual(rasterLogo(img(webp("VP8 ", 288, 72), "webp")).natural, { width: 288, height: 72 });
  assert.deepEqual(rasterLogo(img(webp("VP8L", 300, 75), "webp")).natural, { width: 300, height: 75 });
  assert.deepEqual(rasterLogo(img(webp("VP8X", 400, 100), "webp")).natural, { width: 400, height: 100 });
  assert.match(rasterLogo(img(Buffer.from("x"), "jpeg")).error, /JPEG.*no transparent parts/);
  assert.match(rasterLogo(img(Buffer.from("GIF89a"), "gif")).error, /image\/gif; a raster logo is a PNG or WebP/);
  assert.match(rasterLogo('<img class="logo" src="data:image/svg+xml;base64,PHN2Zz4=" width="24" height="24" alt="">').error, /an SVG inside a data URI/);
  assert.match(rasterLogo('<img class="logo" src="brand/logo.png" width="96" height="24" alt="">').error, /not a data URI/);
  assert.match(rasterLogo(img(png(288, 72), "png", 'width="96" height="24" alt="" onerror="alert(1)"')).error, /event attribute "onerror"/);
  assert.match(rasterLogo(img(Buffer.from("<svg onload=alert(1)>"), "png")).error, /its data is not a PNG image/, "the bytes must be the kind of image the data URI names");
  assert.match(rasterLogo(img(png(288, 72), "png", 'width="96" height="24"')).error, /no alt/);
  assert.match(rasterLogo(`<img class="logo" src="data:image/png;base64,${"A".repeat(MOST)}" width="96" height="24" alt="">`).error, /at most 24000/);
  const blurry = checkLogos(bar(img(png(192, 48))));
  assert.match(blurry.errors.join("\n"), /192 × 48 pixels; it shows 24px high, so it needs at least 72 pixels of height/);
});

test("the slot: 24px high and at most 160px wide; a wide logo keeps its shape and gets lower, and check warns below 16px", () => {
  assert.deepEqual([1, 4, 8, 10, 12].map((r) => slotSize(r)), [{ width: 24, height: 24 }, { width: 96, height: 24 }, { width: 160, height: 20 }, { width: 160, height: 16 }, { width: 160, height: 13.3 }]);
  const logo = (box, w, h) => `<svg class="logo" viewBox="${box}" width="${w}" height="${h}" aria-hidden="true"><path d="M0 0h1" fill="currentColor"/></svg>`;
  assert.deepEqual(checkLogos(bar(logo("0 0 96 24", 96, 24))).errors, []);
  assert.match(checkLogos(bar(logo("0 0 96 24", 120, 30))).errors.join(), /needs width="96" height="24"/);
  assert.match(checkLogos(bar(logo("0 0 200 20", 200, 20))).errors.join(), /needs width="160" height="16"/);
  const thin = checkLogos(bar(logo("0 0 120 10", 160, 13.3)));
  assert.deepEqual(thin.errors, []);
  assert.match(thin.warnings.join(), /13.3px high.*below 16px a wordmark is hard to read/);
});

test("light and dark: one color passes, a logo for both themes needs 3:1 on each page, and a logo for one theme takes data-for", () => {
  const logo = (inner, extra = "") => bar(svg(inner, `width="24" height="24" aria-hidden="true"${extra}`));
  assert.deepEqual(checkLogos(logo('<path d="M0 0h1" fill="currentColor"/>')).errors, [], "currentColor takes the heading color in light and the text color in dark");
  assert.deepEqual(checkLogos(logo('<path d="M0 0h1" fill="#1b2260"/><path d="M0 0h1" fill="#f2b824"/>')).errors, [], "one color reads on the light page, another on the dark page");
  assert.match(checkLogos(logo('<path d="M0 0h1"/>')).errors.join(), /no color with 3:1 on the dark page.*data-for="light" so dark mode shows it on a tile/, "a shape with no fill is black");
  assert.match(checkLogos(logo('<path d="M0 0h1" fill="#ffffff"/>')).errors.join(), /no color with 3:1 on the light page.*data-for="dark"/);
  assert.deepEqual(checkLogos(logo('<path d="M0 0h1" fill="#0d3550"/>', ' data-for="light"')).errors, [], "a light logo alone: dark mode shows it on a tile");
  assert.deepEqual(checkLogos(bar(svg('<path d="M0 0h1" fill="#0d3550"/>', 'width="24" height="24" aria-hidden="true" data-for="light"') + svg('<path d="M0 0h1" fill="#72c2ee"/>', 'width="24" height="24" aria-hidden="true" data-for="dark"'))).errors, [], "a version for each theme");
  assert.match(checkLogos(logo('<path d="M0 0h1" fill="#72c2ee"/>', ' data-for="light"')).errors.join(), /the light logo has no color with 3:1 on the light page/);
  assert.match(checkLogos(bar(svg('<path d="M0 0h1" fill="currentColor"/>') + svg('<path d="M0 0h1" fill="currentColor"/>'))).errors.join(), /2 logos; it has one, or one with data-for="light" and one with data-for="dark"/);
  assert.match(checkLogos(logo('<path d="M0 0h1" fill="currentColor"/>', ' data-for="dusk"')).errors.join(), /data-for="dusk"/);
});

test("a symbol stands before the name and is hidden from a screen reader; a wordmark stands alone and carries the name", () => {
  const word = svg('<path d="M0 0h1" fill="currentColor"/>', 'width="24" height="24" role="img" aria-label="Example project"');
  const result = checkLogos(bar(word, ""));
  assert.deepEqual(result.errors, []);
  assert.equal(result.name, "Example project", "check reads the host's name from the wordmark's label");
  assert.match(checkLogos(bar(svg('<path d="M0 0h1" fill="currentColor"/>', 'width="24" height="24"'))).errors.join(), /read the name twice; write aria-hidden="true"/);
  assert.match(checkLogos(bar(svg('<path d="M0 0h1" fill="currentColor"/>', 'width="24" height="24" aria-label="Example project"'), "")).errors.join(), /stands alone.*role="img" aria-label="Host name"/);
  assert.equal(checkLogos(bar(img(png(288, 72), "png", 'width="96" height="24" alt="Example project"'), "")).name, "Example project", "a raster wordmark carries the name in its alt");
  assert.equal(checkLogos(bar("")).name, "Example project", "with no logo, the name is the text of the host");
});

test("a logo stands in the top bar only", () => {
  const page = `${bar("")}<footer>${svg('<path d="M0 0h1" fill="currentColor"/>')}</footer>`;
  assert.match(checkLogos(page).errors.join(), /a logo stands outside the top bar/);
});

test("a <use> takes the colors of the shapes it points at, which inherit up to that element and then from the <use>", () => {
  const dark = (inner) => checkLogos(bar(svg(inner, 'width="24" height="24" aria-hidden="true" data-for="dark"'))).errors;
  assert.deepEqual(dark('<defs><path id="p" d="M0 0h1" fill="#ffffff"/></defs><use href="#p"/>'), [], "a white path drawn through a use is white, not black");
  assert.deepEqual(dark('<defs><g id="g" fill="#ffffff"><path d="M0 0h1"/></g></defs><use href="#g"/>'), [], "a shape inherits from the group that the use points at");
  assert.deepEqual(dark('<defs><path id="p" d="M0 0h1"/></defs><use href="#p" fill="#ffffff"/>'), [], "a shape with no fill of its own takes the fill of the use");
  assert.match(dark('<defs><path id="p" d="M0 0h1" fill="#000000"/></defs><use href="#p" fill="#ffffff"/>').join(), /no color with 3:1 on the dark page/, "the shape's own fill wins over the use's");
  assert.deepEqual([...svgLogo(svg('<g id="a" fill="currentColor"><path d="M0 0h1"/><use href="#a"/></g>')).colors], ["currentColor"], "a use that points at its own group draws nothing more, and check does not loop");
});

test("a url() may stand in fill, stroke and clip-path only, so a gradient cannot point at itself through a stop", () => {
  assert.match(why('<defs><linearGradient id="g"><stop offset="0" stop-color="url(#g)"/></linearGradient></defs><path d="M0 0h1" fill="url(#g)"/>'), /<stop> has stop-color="url\(#g\)"; only fill, stroke and clip-path may hold a url\(\)/);
  assert.match(why('<path id="p" d="M0 0h1" transform="url(#p)"/>'), /only fill, stroke and clip-path may hold a url\(\)/);
});

test("a gradient stop with no color is black, and uses inside uses are read once each, so check stays fast", () => {
  const black = svgLogo(svg('<defs><linearGradient id="g"><stop offset="0"/><stop offset="1"/></linearGradient></defs><rect width="24" height="24" fill="url(#g)"/>'));
  assert.deepEqual([...black.colors], ["#000000"]);
  assert.deepEqual(checkLogos(bar(svg('<defs><linearGradient id="g"><stop offset="0"/><stop offset="1"/></linearGradient></defs><rect width="24" height="24" fill="url(#g)"/>', 'width="24" height="24" aria-hidden="true" data-for="light"'))).errors, [], "a black gradient logo reads on the light page");
  // Each group holds two uses of the one before it: read naively, the work doubles at each of 40 levels.
  let defs = '<g id="g0"><path d="M0 0h1" fill="#0d3550"/></g>';
  for (let i = 1; i <= 40; i++) defs += `<g id="g${i}"><use href="#g${i - 1}"/><use href="#g${i - 1}" fill="#72c2ee"/></g>`;
  const started = Date.now();
  const deep = svgLogo(svg(`<defs>${defs}</defs><use href="#g40"/>`));
  assert.ok(Date.now() - started < 500, `read in ${Date.now() - started}ms`);
  assert.deepEqual([...deep.colors], ["#0d3550"], "the path has its own fill, so the use's fill does not reach it");
});
