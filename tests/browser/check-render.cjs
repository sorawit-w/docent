// Browser checks for the Docent sample page. They need playwright-core and axe-core:
//   DOCENT_NODE_MODULES=/path/to/node_modules node tests/browser/check-render.cjs
// The script prints one line for each check and exits with 1 when a check fails.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "..");
const modules = process.env.DOCENT_NODE_MODULES || path.join(root, "node_modules");
const { chromium } = require(path.join(modules, "playwright-core"));
const axePath = path.join(modules, "axe-core", "axe.min.js");
const { textWidth } = require(path.join(root, "skills", "docent", "scripts", "lib", "text.cjs"));
const html = fs.readFileSync(process.argv[2] || path.join(root, "skills", "docent", "assets", "specimen.html"), "utf8");
const out = process.env.DOCENT_SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });

const LIGHT = { text: "rgb(28, 31, 46)", bg: "rgb(251, 251, 254)", primary: "rgb(47, 63, 208)" };
const DARK = { text: "rgb(231, 233, 243)", bg: "rgb(18, 20, 31)", lamp: "rgb(242, 184, 36)", well: "rgb(11, 13, 21)" };
let failed = 0;
const ok = (name, pass, detail = "") => { if (!pass) failed += 1; console.log(`${pass ? "ok  " : "FAIL"} ${name}${pass || !detail ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };

(async () => {
  const browser = await chromium.launch();
  const open = async ({ width, height = 900, theme = "light", media = "screen", reducedMotion = "no-preference", content = html }) => {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.emulateMedia({ media, colorScheme: theme, reducedMotion });
    await page.setContent(content, { waitUntil: "load" });
    await page.waitForTimeout(400);
    return { page, context, errors };
  };

  // Accessibility at desktop and phone width, in light and dark.
  for (const [name, opts] of [["desktop-light", { width: 1280 }], ["desktop-dark", { width: 1280, theme: "dark" }], ["phone-light", { width: 390, height: 844 }], ["phone-dark", { width: 390, height: 844, theme: "dark" }]]) {
    const { page, context, errors } = await open(opts);
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, rules: { "target-size": { enabled: true } } }));
    ok(`${name}: 0 axe violations`, result.violations.length === 0, result.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target.join(" ")}`));
    ok(`${name}: no script errors`, errors.length === 0, errors);
    const unsure = result.incomplete.map((v) => `${v.id}(${v.nodes.length})`).join(", ");
    if (unsure) console.log(`note ${name}: axe could not decide: ${unsure}`);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    await context.close();
  }

  // Real size, real text widths, and the step-to-leg link.
  {
    const { page, context } = await open({ width: 1280 });
    const sizes = await page.evaluate(() => [...document.querySelectorAll("svg.dg")].filter((s) => s.getBoundingClientRect().width).map((s) => ({ id: s.id, shown: Math.round(s.getBoundingClientRect().width), real: s.viewBox.baseVal.width })));
    ok("three drawings, each at its real size (names 14px, notes 12px)", sizes.length === 3 && sizes.every((s) => s.shown === s.real), sizes);
    const texts = await page.evaluate(() => [...document.querySelectorAll("svg.dg text:not(.num)")].filter((t) => t.getBoundingClientRect().width).map((t) => ({ s: t.textContent, cls: t.getAttribute("class"), px: t.getComputedTextLength(), size: getComputedStyle(t).fontSize })));
    const font = { name: [14, 600], lane: [14, 600], sub: [12, 400], verb: [12, 400] };
    const wider = texts.filter((t) => t.px > textWidth(t.s, ...font[t.cls]) + 0.5).map((t) => `${t.s}: ${t.px.toFixed(1)} > ${textWidth(t.s, ...font[t.cls])}`);
    ok("no text in a drawing is wider than the renderer assumed", wider.length === 0, wider);
    ok("text sizes in the drawings are 14px and 12px", texts.every((t) => t.size === `${font[t.cls][0]}px`), [...new Set(texts.map((t) => `${t.cls}:${t.size}`))]);
    const icons = await page.evaluate(() => ({ perDrawing: [...document.querySelectorAll("svg.dg")].filter((s) => s.getBoundingClientRect().width).map((s) => s.querySelectorAll(".icon").length), leftovers: document.querySelectorAll("animateMotion, [filter], svg.dg image, svg.dg script").length }));
    ok("seven icons in each drawing, made of plain shapes", icons.perDrawing.join() === "7,7,7" && icons.leftovers === 0, icons);

    const current = () => page.evaluate(() => {
      const walk = document.querySelector(".walk"), leg = [...walk.querySelectorAll("svg.dg .leg.is-current")].find((g) => g.getBoundingClientRect().width), dot = leg && getComputedStyle(leg.querySelector(".pulse"));
      return { step: [...walk.querySelectorAll(".steps > li")].findIndex((li) => li.classList.contains("is-current")) + 1, legs: [...new Set([...walk.querySelectorAll("svg.dg .leg.is-current")].map((g) => g.dataset.leg))].join(), line: leg && getComputedStyle(leg.querySelector(".line")).stroke, dot: dot && `${dot.display} ${dot.animationName}`, others: document.querySelectorAll("svg.dg-auto .leg.is-current").length };
    });
    for (let i = 0; i < 4; i++) {
      await page.evaluate((n) => { const li = document.querySelectorAll(".steps > li")[n]; window.scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 4); }, i);
      await page.waitForTimeout(250);
      const state = await current();
      ok(`walkthrough step ${i + 1} lights leg ${i + 1}, and its dot travels that leg`, state.step === i + 1 && state.legs === String(i + 1) && state.line === LIGHT.primary && state.dot === `block dg-steps-${i + 1}` && state.others === 0, state);
    }
    await page.screenshot({ path: `${out}/walk-step4.png`, clip: { x: 0, y: 0, width: 1280, height: 900 } });
    const noJs = await page.evaluate(() => { document.documentElement.classList.remove("js", "ready"); return { lines: [...new Set([...document.querySelectorAll("svg.dg .line")].map((l) => getComputedStyle(l).stroke))], dots: [...new Set([...document.querySelectorAll("svg.dg .pulse")].map((p) => getComputedStyle(p).display))], steps: [...new Set([...document.querySelectorAll(".steps h3")].map((h) => getComputedStyle(h).color))] }; });
    ok("with scripts off: no colored leg, no dot, every step in the full text color", noJs.lines.join() === LIGHT.text && noJs.dots.join() === "none" && noJs.steps.join() === LIGHT.text, noJs);
    await context.close();
  }

  // Dark colors come from the page tokens; the dot is the lamp.
  {
    const { page, context } = await open({ width: 1280, theme: "dark" });
    const dark = await page.evaluate(() => ({ text: getComputedStyle(document.querySelector("svg.dg .name")).fill, line: getComputedStyle(document.querySelector("svg.dg-wide .line")).stroke, dot: getComputedStyle(document.querySelector("svg.dg-tall .leg.is-current .pulse")).fill, well: getComputedStyle(document.querySelector(".fig")).backgroundColor, ground: getComputedStyle(document.querySelector("svg.dg .ground")).fill, band: getComputedStyle(document.querySelector("svg.dg .band")).fill }));
    ok("dark theme: one drawing serves both themes, and the dot is lamp yellow", dark.text === DARK.text && dark.line === DARK.text && dark.dot === DARK.lamp && dark.well === DARK.well && dark.ground === DARK.well && dark.band === DARK.bg, dark);
    await context.close();
  }

  // Theme: the system decides, the switch wins, and print is light.
  {
    const { page, context } = await open({ width: 1280, theme: "dark" });
    const look = () => page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, attr: document.documentElement.dataset.theme || "", button: document.querySelector("button.theme").getAttribute("aria-label") }));
    const systemDark = await look();
    await page.click("button.theme");
    const switched = await look();
    await page.click("button.theme");
    const back = await look();
    await context.close();
    ok("the theme follows a dark system", systemDark.bg === DARK.bg && systemDark.attr === "" && systemDark.button === "Switch to the light theme", systemDark);
    ok("the switch wins over the system, both ways", switched.bg === LIGHT.bg && switched.attr === "light" && back.bg === DARK.bg && back.attr === "dark", { switched, back });
    const light = await open({ width: 1280, theme: "light" });
    const systemLight = await light.page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, attr: document.documentElement.dataset.theme || "" }));
    await light.context.close();
    ok("the theme follows a light system", systemLight.bg === LIGHT.bg && systemLight.attr === "", systemLight);
    const paper = await open({ width: 794, height: 1123, theme: "dark", media: "print" });
    const print = await paper.page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.body).color, topbar: getComputedStyle(document.querySelector(".topbar")).display, dots: [...new Set([...document.querySelectorAll("svg.dg .pulse")].map((p) => getComputedStyle(p).display))].join(), lines: [...new Set([...document.querySelectorAll("svg.dg .line")].map((l) => getComputedStyle(l).stroke))].join() }));
    await paper.page.screenshot({ path: `${out}/print.png`, fullPage: true });
    await paper.context.close();
    ok("print is light on a dark system, without the top bar, without dots or a colored leg", print.bg === "rgb(255, 255, 255)" && print.text === LIGHT.text && print.topbar === "none" && print.dots === "none" && print.lines === LIGHT.text, print);
  }

  // A diagram outside the walkthrough: it waits until it is in view, runs twice, and runs again on pointer.
  {
    const { page, context } = await open({ width: 1280 });
    const state = () => page.evaluate(() => { const svg = document.querySelector("svg.dg-plates"), dot = svg.querySelector(".pulse"), s = getComputedStyle(dot), run = dot.getAnimations()[0]; return { playing: svg.classList.contains("is-playing"), css: s.animationPlayState, runs: s.animationIterationCount, state: run ? run.playState : "none", shown: [...svg.querySelectorAll(".pulse")].filter((d) => getComputedStyle(d).display === "block").length }; });
    const before = await state();
    await page.evaluate(() => document.querySelector("svg.dg-plates").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    const inView = await state();
    await page.evaluate(() => document.querySelectorAll("svg.dg-plates .pulse").forEach((d) => d.getAnimations().forEach((a) => a.finish())));
    const finished = await state();
    await page.hover(".fig:has(svg.dg-plates)");
    await page.waitForTimeout(200);
    const again = await state();
    ok("outside a walkthrough the dot waits until the drawing is in view", before.css === "paused" && !before.playing && before.shown === 4, before);
    ok("then one dot runs the whole route, twice, and rests", inView.css === "running" && inView.runs === "2" && inView.state === "running" && finished.state === "finished", { inView, finished });
    ok("pointing at the drawing runs it again", again.state === "running", again);
    await context.close();
  }

  // Narrow screens: the page never scrolls sideways; a figure, a table or a code block scrolls inside itself.
  {
    const { page, context } = await open({ width: 320, height: 800 });
    const flow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, inner: [...document.querySelectorAll(".fig, .table-wrap, pre")].filter((e) => e.scrollWidth > e.clientWidth + 1).length }));
    ok("at 320px the page does not scroll sideways", flow.scrollWidth === flow.clientWidth, flow);
    const wells = await page.evaluate(() => [...document.querySelectorAll(".fig")].map((e) => ({ id: [...e.querySelectorAll("svg.dg")].find((s) => s.getBoundingClientRect().width).id, scrolls: e.scrollWidth > e.clientWidth + 1 })));
    ok("at 320px every drawing fits its well", wells.map((w) => `${w.id}:${w.scrolls}`).join() === "dg-path-phone:false,dg-steps-phone:false,dg-parts-phone:false", wells);
    await context.close();
  }

  // On a phone each route shows its single-track form, at real size, and it fits its well.
  {
    const { page, context } = await open({ width: 390, height: 844 });
    const phone = await page.evaluate(() => [...document.querySelectorAll("svg.dg")].filter((s) => s.getBoundingClientRect().width).map((s) => ({ id: s.id, cls: s.getAttribute("class"), shown: Math.round(s.getBoundingClientRect().width), real: s.viewBox.baseVal.width, fits: s.closest(".fig").scrollWidth <= s.closest(".fig").clientWidth + 1 })));
    ok("on a phone each route shows its single-track form, at real size, with no sideways scroll", phone.length === 3 && phone.every((d) => d.id.endsWith("-phone") && d.cls.includes("dg-track") && d.fits && d.shown === d.real), phone);
    const lit = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate((n) => { const li = document.querySelectorAll(".steps > li")[n]; window.scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 4); }, i);
      await page.waitForTimeout(250);
      lit.push(await page.evaluate(() => { const leg = document.querySelector("#dg-steps-phone .leg.is-current"), dot = getComputedStyle(leg.querySelector(".pulse")); return `${leg.dataset.leg}:${dot.display}:${dot.animationName}`; }));
    }
    ok("on a phone each walkthrough step lights its leg in the single-track form", lit.join() === [1, 2, 3, 4].map((n) => `${n}:block:dg-steps-phone-${n}`).join(), lit);
    await context.close();
  }

  // Reduced motion: the walkthrough dot rests on its leg; other drawings show no dot.
  {
    const { page, context } = await open({ width: 1280, reducedMotion: "reduce" });
    const still = await page.evaluate(() => { const s = getComputedStyle(document.querySelector("svg.dg-tall .leg.is-current .pulse")); return { display: s.display, animation: s.animationName, auto: [...new Set([...document.querySelectorAll("svg.dg-auto .pulse")].map((d) => getComputedStyle(d).display))].join() }; });
    ok("reduced motion: no moving dot", still.display === "block" && still.animation === "none" && still.auto === "none", still);
    await context.close();
  }

  // A drawing copied out of the page keeps its light colors, because it carries its own styles.
  {
    const svg = html.match(/<svg id="dg-path"[\s\S]*?<\/svg>/)[0];
    ok("the copied drawing is the main form only", !svg.includes("dg-path-phone\" "), "");
    const { page, context } = await open({ width: 1000, theme: "dark", content: `<!doctype html><html lang="en"><head><title>copy</title></head><body>${svg}</body></html>` });
    const alone = await page.evaluate(() => ({ name: getComputedStyle(document.querySelector(".name")).fill, band: getComputedStyle(document.querySelector(".band")).fill, line: getComputedStyle(document.querySelector(".line")).stroke, width: Math.round(document.querySelector("svg").getBoundingClientRect().width), dots: [...new Set([...document.querySelectorAll(".pulse")].map((d) => getComputedStyle(d).display))].join() }));
    ok("a drawing copied out of the page keeps its colors and its size", alone.name === LIGHT.text && alone.band === LIGHT.bg && alone.line === LIGHT.text && alone.width === 858 && alone.dots === "none", alone);
    await context.close();
  }

  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : "all browser checks passed");
  process.exitCode = failed ? 1 : 0;
})();
