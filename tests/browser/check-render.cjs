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
const { renderDocument } = require(path.join(root, "skills", "docent", "scripts", "lib", "diagram.cjs"));
const file = path.resolve(process.argv[2] || path.join(root, "skills", "docent", "assets", "specimen.html"));
const html = fs.readFileSync(file, "utf8");
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
    const cut = await paper.page.evaluate(() => [...document.querySelectorAll("svg.dg")].filter((s) => s.getBoundingClientRect().width).map((s) => ({ id: s.id, over: Math.round(s.getBoundingClientRect().right - s.closest(".fig").getBoundingClientRect().right) })));
    ok("on paper no drawing is cut off", cut.length === 3 && cut.every((d) => d.over <= 0), cut);
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

  // Widgets. The page is opened from its file here, so that it can remember.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`file://${file}`);
    const state = () => page.evaluate(() => {
      const shown = (el) => el.getBoundingClientRect().height > 0;
      return {
        cases: [...document.querySelectorAll("#wd-system .case")].map((c, i) => (shown(c) ? i + 1 : 0)).filter(Boolean).join(),
        names: [...document.querySelectorAll("#wd-system .case-t")].filter(shown).length,
        ticks: [...document.querySelectorAll("#wd-ready input")].map((b) => (b.checked ? 1 : 0)).join(""),
        count: document.querySelector("#wd-ready output").textContent,
        answer: document.querySelector("#wd-kind output").textContent,
        out: [...document.querySelectorAll("#wd-kind tbody tr")].map((r) => (r.classList.contains("is-out") ? 1 : 0)).join(""),
        table: document.querySelector("#wd-kind details").open,
        again: shown(document.querySelector("#wd-kind .wd-foot")),
      };
    });
    const fresh = await state();
    ok("widgets at the start: the first case shows, no tick, no answer, and the table of all cases is closed", fresh.cases === "1" && fresh.names === 0 && fresh.ticks === "0000" && fresh.count === "0 of 4 done" && fresh.answer === "" && fresh.out === "000" && !fresh.table && !fresh.again, fresh);
    await page.click('label[for="wd-system-3"]');
    const picked = await state();
    await page.focus("#wd-system-3");
    await page.keyboard.press("ArrowLeft");
    const byKey = await state();
    ok("chooser: a click shows the chosen case only, and the arrow keys change the choice", picked.cases === "3" && byKey.cases === "2", { picked: picked.cases, byKey: byKey.cases });
    await page.click('label[for="wd-ready-1"]');
    await page.focus("#wd-ready-3");
    await page.keyboard.press("Space");
    const ticked = await state();
    ok("checklist: a click or the space key ticks a line, and the count follows", ticked.ticks === "1010" && ticked.count === "2 of 4 done", ticked);
    await page.click('label[for="wd-kind-q1-2"]');
    const half = await state();
    await page.click('label[for="wd-kind-q2-1"]');
    const full = await state();
    await page.click('label[for="wd-kind-q1-1"]');
    const changed = await state();
    ok("decision helper: rows that do not fit go out, and the one that fits is the answer", half.answer === "" && half.out === "100" && half.again && full.out === "101" && full.answer === "A normal reportFile it with the steps that show the problem." && changed.out === "011" && changed.answer.startsWith("An urgent report"), { half, full, changed });
    await page.addScriptTag({ path: axePath });
    const used = await page.evaluate(async () => { document.querySelector("#wd-kind details").open = true; return (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target.join(" ")}`); });
    ok("widgets in use: 0 axe violations", used.length === 0, used);
    await page.locator("#report").screenshot({ path: `${out}/widgets-used.png` });
    await page.reload();
    const again = await state();
    ok("after the page is opened again: the choice and the ticks are remembered", again.cases === "2" && again.ticks === "1010" && again.count === "2 of 4 done" && again.answer === "", again);
    await page.click("#wd-ready button");
    await page.waitForTimeout(100);
    await page.reload();
    const cleared = await state();
    ok("checklist: the button clears the ticks, and they stay cleared", cleared.ticks === "0000" && cleared.count === "0 of 4 done", cleared);
    await page.click('label[for="wd-kind-q1-2"]');
    await page.click("#wd-kind button");
    await page.waitForTimeout(100);
    const reset = await state();
    ok("decision helper: Start again clears the answers", reset.out === "000" && reset.answer === "" && !reset.again, reset);
    ok("widgets: no script errors", errors.length === 0, errors);
    await context.close();
  }

  // Widgets in dark: the chosen option carries the lamp dot.
  {
    const { page, context } = await open({ width: 1280, theme: "dark" });
    const dots = await page.evaluate(() => ({ chosen: getComputedStyle(document.querySelector('label[for="wd-system-1"]'), "::before").backgroundColor, other: getComputedStyle(document.querySelector('label[for="wd-system-2"]'), "::before").backgroundColor }));
    ok("widgets in dark: the chosen option has the lamp dot, the others have a ring", dots.chosen === DARK.lamp && dots.other === "rgba(0, 0, 0, 0)", dots);
    await context.close();
  }

  // Widgets with scripts off: the chooser still works, the boxes can be ticked, and the decision helper is its table.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.click('label[for="wd-system-2"]');
    await page.click('label[for="wd-ready-2"]');
    const shown = (sel) => page.locator(sel).evaluateAll((els) => els.map((el, i) => (el.getBoundingClientRect().height > 0 ? i + 1 : 0)).filter(Boolean).join());
    const off = { cases: await shown("#wd-system .case"), ask: await shown("#wd-kind .decide-ask"), rows: await shown("#wd-kind tbody tr"), count: await shown("#wd-ready output"), button: await shown("#wd-ready button"), ticked: await page.locator("#wd-ready-2").isChecked() };
    ok("with scripts off: the chooser shows the chosen case, a box can be ticked, and the decision helper shows its table only", off.cases === "2" && off.ask === "" && off.rows === "1,2,3" && off.count === "" && off.button === "1" && off.ticked, off);
    await context.close();
  }

  // Widgets on paper: every case with its name, the boxes, and the full table.
  {
    const { page, context } = await open({ width: 794, height: 1123 });
    await page.click('label[for="wd-kind-q1-2"]');
    await page.click('label[for="wd-ready-1"]');
    await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });
    const paper = await page.evaluate(() => {
      const shown = (sel) => [...document.querySelectorAll(sel)].filter((el) => el.getBoundingClientRect().height > 0).length;
      return { cases: shown("#wd-system .case"), names: shown("#wd-system .case-t"), options: shown("#wd-system .opt"), ask: shown("#wd-kind .decide-ask"), rows: shown("#wd-kind tbody tr"), foot: shown(".wd-foot"), boxes: shown("#wd-ready li"), row: getComputedStyle(document.querySelector("#wd-kind tr.is-out")).color, line: getComputedStyle(document.querySelector('label[for="wd-ready-1"]')).color };
    });
    ok("on paper: every case prints under its name, the boxes print, and the full table prints in the text color", paper.cases === 3 && paper.names === 3 && paper.options === 0 && paper.ask === 0 && paper.rows === 3 && paper.foot === 0 && paper.boxes === 4 && paper.row === LIGHT.text && paper.line === LIGHT.text, paper);
    await page.screenshot({ path: `${out}/widgets-print.png`, fullPage: true });
    await context.close();
  }

  // On paper a table takes the width of the sheet. An A4 sheet with the page margins leaves 658px, less than a table needs on a screen.
  {
    const { page, context } = await open({ width: 658, height: 1123, media: "print" });
    const tables = await page.evaluate(() => { dispatchEvent(new Event("beforeprint")); return [...document.querySelectorAll(".table-wrap")].map((wrap) => ({ over: Math.round(wrap.querySelector("table").getBoundingClientRect().right - wrap.getBoundingClientRect().right), shown: wrap.getBoundingClientRect().height > 0 })); });
    ok("on paper no table is cut off", tables.length === 2 && tables.every((t) => t.shown && t.over <= 0), tables);
    // A browser prints no background unless the style asks for it. The status dots, the rail of the steps and the grounds carry meaning.
    const grounds = await page.evaluate(() => { const exact = (sel, pseudo) => { const style = getComputedStyle(document.querySelector(sel), pseudo); return (style.printColorAdjust || style.webkitPrintColorAdjust) === "exact"; }; return { dot: exact(".state", "::before"), rail: exact(".steps", "::before"), well: exact(".fig"), block: exact("pre"), code: exact("p code") }; });
    ok("on paper the status dots, the rail and the grounds of figures and code are printed", Object.values(grounds).every(Boolean), grounds);
    await context.close();
  }

  // Choosers with the same cases change together, and the one that the reader used stays in place.
  {
    const twin = '<!-- docent:widget\n{"id": "twin", "kind": "chooser", "label": "Your system", "cases": [{"name": "macOS", "body": ["Short."]}, {"name": "Windows", "body": ["A longer text.", {"list": ["One.", "Two.", "Three.", "Four."]}]}, {"name": "Linux", "body": ["Short."]}]}\n-->\n<!-- /docent:widget -->\n';
    const { page, context } = await open({ width: 1280, content: renderDocument(html.replace('<section id="report"', `${twin}<section id="report"`)).html });
    await page.evaluate(() => document.querySelector("#wd-system").scrollIntoView({ block: "center" }));
    const before = await page.evaluate(() => document.querySelector('label[for="wd-system-2"]').getBoundingClientRect().top);
    await page.click('label[for="wd-system-2"]');
    const both = await page.evaluate(() => ({ twin: document.querySelector("#wd-twin-2").checked, own: document.querySelector("#wd-system-2").checked, top: document.querySelector('label[for="wd-system-2"]').getBoundingClientRect().top }));
    ok("choosers with the same cases change together, and the one in use does not move", both.twin && both.own && Math.abs(both.top - before) < 1, { ...both, before });
    await context.close();
  }

  // A part with a state: the outline and the status dot take the status color of the theme; the name and the icon stay in the text color.
  {
    const data = fs.readFileSync(path.join(root, "tests", "fixtures", "pipeline.json"), "utf8");
    const figure = `<figure><div class="fig" role="region" aria-label="Figure 4, a change with its states" tabindex="0">\n<!-- docent:diagram\n${data}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 4</strong>A change with its states.</figcaption></figure>\n`;
    const content = renderDocument(html.replace('<section id="report"', `${figure}<section id="report"`)).html;
    const colors = (page) => page.evaluate(() => { const of = (sel, prop) => getComputedStyle(document.querySelector(`#dg-pipeline ${sel}`))[prop]; return { ok: of(".stop.is-ok", "stroke"), okDot: of(".flag.is-ok", "fill"), warn: of(".stop.is-warn", "stroke"), err: of(".stop.is-err", "stroke"), errDot: of(".flag.is-err", "fill"), plain: of(".stop:not([class*='is-'])", "stroke"), name: of(".name", "fill"), icon: of(".icon:not(.lane-icon)", "stroke") }; });
    const light = await open({ width: 1280, content });
    const inLight = await colors(light.page);
    await light.page.addScriptTag({ path: axePath });
    const axe = await light.page.evaluate(async () => (await window.axe.run(document.querySelector("#dg-pipeline").closest("figure"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
    await light.page.locator("#dg-pipeline").screenshot({ path: `${out}/states-light.png` });
    await light.context.close();
    const dark = await open({ width: 1280, theme: "dark", content });
    const inDark = await colors(dark.page);
    await dark.page.locator("#dg-pipeline").screenshot({ path: `${out}/states-dark.png` });
    await dark.context.close();
    const paper = await open({ width: 794, height: 1123, theme: "dark", media: "print", content });
    const onPaper = await colors(paper.page);
    await paper.context.close();
    ok("a part with a state: status colors in light, and the name and the icon keep the text color", inLight.ok === "rgb(26, 127, 55)" && inLight.okDot === inLight.ok && inLight.warn === "rgb(125, 78, 0)" && inLight.err === "rgb(207, 34, 46)" && inLight.errDot === inLight.err && inLight.plain === LIGHT.text && inLight.name === LIGHT.text && inLight.icon === LIGHT.text && axe.length === 0, { inLight, axe });
    ok("a part with a state: the dark status colors in dark, and the light ones on paper", inDark.ok === "rgb(63, 185, 80)" && inDark.warn === "rgb(210, 153, 34)" && inDark.err === "rgb(248, 81, 73)" && inDark.name === DARK.text && onPaper.ok === inLight.ok && onPaper.err === inLight.err, { inDark, onPaper });
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
