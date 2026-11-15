// Read-only measurements of the sample page for the design review: block edges, line length, title, moving parts.
// It needs playwright-core. Point DOCENT_NODE_MODULES at a node_modules folder that has it.
const fs = require("node:fs");
const path = require("node:path");
const modules = process.env.DOCENT_NODE_MODULES || path.join(__dirname, "..", "node_modules");
const { chromium } = require(path.join(modules, "playwright-core"));
const page_file = path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html");

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.setContent(fs.readFileSync(page_file, "utf8"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }; };
    const p = document.querySelector("#short p");
    const probe = document.createElement("span"); probe.textContent = "0".repeat(100); probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap"; p.appendChild(probe);
    const chPx = probe.getBoundingClientRect().width / 100; probe.remove();
    const longest = Math.max(...[...document.querySelectorAll("main p")].map((el) => { const range = document.createRange(); range.selectNodeContents(el); const rects = [...range.getClientRects()]; const lines = new Set(rects.map((r) => Math.round(r.top))).size; return Math.round(el.textContent.trim().length / Math.max(lines, 1)); }));
    return {
      title: document.title,
      blocks: { shell: box("main"), textColumn: box("#short p"), marginNote: box("#short .note"), figWide: box(".fig-wide"), figTall: box(".walk .fig"), figPlates: box(".fig-plates"), table: box(".table-wrap"), code: box("pre"), status: box(".status") },
      measure: { paragraphPx: Math.round(p.getBoundingClientRect().width), chPx: +chPx.toFixed(2), averageCharsPerLineLongestParagraph: longest },
      moving: { loopingDots: [...document.querySelectorAll(".route .pulse")].filter((d) => getComputedStyle(d).display !== "none" && getComputedStyle(d).animationIterationCount === "infinite").length, figuresWithLoop: [...document.querySelectorAll("svg.route")].filter((s) => [...s.querySelectorAll(".pulse")].some((d) => getComputedStyle(d).display !== "none")).length, otherMovers: ["route-dot", "rail-dot"] },
      neutrals: Object.fromEntries(["--bg", "--panel", "--text", "--muted", "--line"].map((k) => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),
      headingFontStack: getComputedStyle(document.querySelector("h1")).fontFamily,
      svgStyledFromPage: [...document.querySelectorAll("svg.route")].every((s) => !s.querySelector("style") && !s.outerHTML.includes("currentColor")),
      figures: document.querySelectorAll("figure").length,
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
