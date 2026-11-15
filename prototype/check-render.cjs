// Render checks for the Docent sample page with the Route drawings (repository Playwright library + axe-core).
// It needs playwright-core and axe-core. Point DOCENT_NODE_MODULES at a node_modules folder that has both.
const fs = require("node:fs");
const path = require("node:path");
const modules = process.env.DOCENT_NODE_MODULES || path.join(__dirname, "..", "node_modules");
const { chromium } = require(path.join(modules, "playwright-core"));
const axePath = path.join(modules, "axe-core", "axe.min.js");
const html = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
const out = process.env.DOCENT_SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const open = async ({ width, height = 900, theme = "light", media = "screen", reducedMotion = "no-preference" }) => {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.emulateMedia({ media, colorScheme: theme, reducedMotion });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(400);
    return { page, context, errors };
  };
  const axe = async (page) => {
    await page.addScriptTag({ path: axePath });
    const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, rules: { "target-size": { enabled: true } } }));
    return { violations: r.violations.map((v) => `${v.id}(${v.impact},${v.nodes.length}) ${v.nodes[0].target.join(" ")}`), incomplete: r.incomplete.map((v) => `${v.id}(${v.nodes.length})`) };
  };
  const report = {};

  for (const [name, opts] of [["desktop-light", { width: 1280 }], ["desktop-dark", { width: 1280, theme: "dark" }], ["phone-light", { width: 390, height: 844 }], ["phone-dark", { width: 390, height: 844, theme: "dark" }]]) {
    const { page, context, errors } = await open(opts);
    report[name] = { axe: await axe(page), errors };
    await page.screenshot({ path: `${out}/route-${name}.png`, fullPage: true });
    await context.close();
  }

  // Sizes, colors and the step-to-leg link at 1280.
  {
    const { page, context } = await open({ width: 1280 });
    report.auto = await page.evaluate(() => Object.fromEntries(["wide", "plates"].map((name) => { const ps = [...document.querySelectorAll(`.route-${name} .pulse`)].map((p) => getComputedStyle(p)); return [name, { dots: ps.length, shown: ps.filter((s) => s.display === "block").length, names: ps.map((s) => s.animationName).join(","), seconds: ps[0].animationDuration }]; })));
    report.icons = await page.evaluate(() => ({ total: document.querySelectorAll(".route .icon").length, perDrawing: [...document.querySelectorAll("svg.route")].map((s) => s.querySelectorAll(".icon").length), stroke: getComputedStyle(document.querySelector(".route .icon")).stroke, onEnd: getComputedStyle(document.querySelector(".route .icon.on-end")).stroke }));
    report.sizes = await page.evaluate(() => {
      const measure = (sel) => { const s = document.querySelector(sel); const r = s.getBoundingClientRect(); const k = r.width / s.viewBox.baseVal.width; return { shown: `${Math.round(r.width)}x${Math.round(r.height)}`, scale: +k.toFixed(2), namePx: +(14 * k).toFixed(1), notePx: +(12 * k).toFixed(1) }; };
      return { tall: measure(".route-tall"), wide: measure(".route-wide"), svgCount: document.querySelectorAll("svg.route").length, leftovers: document.querySelectorAll("animateMotion, .cardsh, [filter]").length };
    });
    const current = () => page.evaluate(() => ({ step: [...document.querySelectorAll(".steps li")].findIndex((li) => li.classList.contains("is-current")) + 1, legs: [...document.querySelectorAll(".route-tall .leg.is-current")].map((g) => g.dataset.leg), line: getComputedStyle(document.querySelector(".route-tall .leg.is-current .line")).stroke, pulse: (() => { const p = document.querySelector(".route-tall .leg.is-current .pulse"); const s = getComputedStyle(p); return `${s.display} ${s.animationName} ${s.fill}`; })(), wideCurrent: document.querySelectorAll(".route-wide .leg.is-current").length }));
    const states = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate((n) => { const li = document.querySelectorAll(".steps li")[n]; window.scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 4); }, i);
      await page.waitForTimeout(250);
      states.push(await current());
    }
    report.scroll = states;
    await page.screenshot({ path: `${out}/route-walk-step4.png`, clip: { x: 0, y: 0, width: 1280, height: 900 } });
    report.noJs = await page.evaluate(() => { document.documentElement.classList.remove("js", "ready"); return { lineColors: [...new Set([...document.querySelectorAll(".route-tall .leg .line")].map((l) => getComputedStyle(l).stroke))], pulses: [...new Set([...document.querySelectorAll(".route .pulse")].map((p) => getComputedStyle(p).display))] }; });
    await context.close();
  }
  // Dark colors.
  {
    const { page, context } = await open({ width: 1280, theme: "dark" });
    report.dark = await page.evaluate(() => ({ text: getComputedStyle(document.querySelector(".route .name")).fill, line: getComputedStyle(document.querySelector(".route-wide .line")).stroke, pulse: getComputedStyle(document.querySelector(".route-tall .leg.is-current .pulse")).fill, well: getComputedStyle(document.querySelector(".fig")).backgroundColor }));
    await context.close();
  }
  // Theme: the system decides, the switch wins, and print is light.
  {
    const { page, context } = await open({ width: 1280, theme: "dark" });
    const look = () => page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, attr: document.documentElement.dataset.theme || "(none)", button: document.querySelector("button.theme").getAttribute("aria-label") }));
    const systemDark = await look();
    await page.click("button.theme");
    const afterSwitch = await look();
    await page.click("button.theme");
    const switchedBack = await look();
    await context.close();
    const light = await open({ width: 1280, theme: "light" });
    const systemLight = await light.page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, attr: document.documentElement.dataset.theme || "(none)" }));
    await light.context.close();
    const paper = await open({ width: 794, height: 1123, theme: "dark", media: "print" });
    const printWhileDark = await paper.page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.body).color }));
    await paper.context.close();
    report.theme = { systemDark, afterSwitch, switchedBack, systemLight, printWhileDark };
  }
  // A diagram outside the walkthrough: paused until in view, two runs, replay on pointer.
  {
    const { page, context } = await open({ width: 1280 });
    const state = () => page.evaluate(() => { const svg = document.querySelector(".route-plates"); const dot = svg.querySelector(".pulse"); const s = getComputedStyle(dot); const run = dot.getAnimations()[0]; return { inView: svg.classList.contains("is-playing"), playState: s.animationPlayState, runs: s.animationIterationCount, state: run ? run.playState : "none" }; });
    const before = await state();
    await page.evaluate(() => document.querySelector(".route-plates").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    const inView = await state();
    await page.evaluate(() => document.querySelectorAll(".route-plates .pulse").forEach((d) => d.getAnimations().forEach((a) => a.finish())));
    const finished = await state();
    await page.hover(".fig-plates");
    await page.waitForTimeout(200);
    const afterPointer = await state();
    report.autoRun = { before, inView, finished, afterPointer };
    await context.close();
  }
  // Reflow at 320, print, reduced motion.
  {
    const { page, context } = await open({ width: 320, height: 800 });
    report.reflow320 = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerScrollers: [...document.querySelectorAll(".fig, .table-wrap, pre")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName.toLowerCase()) }));
    await context.close();
  }
  {
    const { page, context } = await open({ width: 794, height: 1123, media: "print" });
    report.print = await page.evaluate(() => ({ topbar: getComputedStyle(document.querySelector(".topbar")).display, pulses: [...new Set([...document.querySelectorAll(".route .pulse")].map((p) => getComputedStyle(p).display))], lineColors: [...new Set([...document.querySelectorAll(".route .line")].map((l) => getComputedStyle(l).stroke))] }));
    await page.screenshot({ path: `${out}/route-print.png`, fullPage: true });
    await context.close();
  }
  {
    const { page, context } = await open({ width: 1280, reducedMotion: "reduce" });
    report.reducedMotion = await page.evaluate(() => { const p = document.querySelector(".route-tall .leg.is-current .pulse"); const s = getComputedStyle(p); return { display: s.display, animationName: s.animationName, transform: s.transform, autoDots: [...new Set([...document.querySelectorAll(".route-auto .pulse")].map((d) => getComputedStyle(d).display))] }; });
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})();
