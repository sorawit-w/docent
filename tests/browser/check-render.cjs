// Browser checks for the Docent sample page. The page is built first (render, then stamp), so the starting page can be given too.
// They need playwright-core and axe-core:
//   DOCENT_NODE_MODULES=/path/to/node_modules node tests/browser/check-render.cjs
// DOCENT_BROWSER_CHANNEL=chrome uses the Chrome that is installed, so Playwright needs no browser of its own.
// The script prints one line for each check and exits with 1 when a check fails.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "..");
const modules = process.env.DOCENT_NODE_MODULES || path.join(root, "node_modules");
const { chromium } = require(path.join(modules, "playwright-core"));
const axePath = path.join(modules, "axe-core", "axe.min.js");
const { textWidth } = require(path.join(root, "skills", "docent", "scripts", "lib", "text.cjs"));
const { renderDocument } = require(path.join(root, "skills", "docent", "scripts", "lib", "diagram.cjs"));
const { stampHtml } = require(path.join(root, "skills", "docent", "scripts", "lib", "kit.cjs"));
const file = path.resolve(process.argv[2] || path.join(root, "skills", "docent", "assets", "specimen.html"));
const html = stampHtml(renderDocument(fs.readFileSync(file, "utf8")).html).html;
const out = process.env.DOCENT_SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });

const LIGHT = { text: "rgb(28, 31, 46)", bg: "rgb(251, 251, 254)", primary: "rgb(47, 63, 208)" };
const DARK = { text: "rgb(231, 233, 243)", bg: "rgb(18, 20, 31)", lamp: "rgb(242, 184, 36)", well: "rgb(11, 13, 21)" };
let failed = 0;
const ok = (name, pass, detail = "") => { if (!pass) failed += 1; console.log(`${pass ? "ok  " : "FAIL"} ${name}${pass || !detail ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };

(async () => {
  const browser = await chromium.launch(process.env.DOCENT_BROWSER_CHANNEL ? { channel: process.env.DOCENT_BROWSER_CHANNEL } : {});
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

  // The two dots sit on what they mark, also on a screen that is wider than the page shell (1200px).
  for (const width of [1024, 1280, 1728, 2560]) {
    const { page, context } = await open({ width });
    const off = [];
    for (const where of ["at the top", "at step 3"]) {
      if (where === "at step 3") await page.evaluate(() => { const li = document.querySelectorAll(".walk .steps > li")[2]; scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.4); });
      await page.waitForTimeout(600);
      off.push(await page.evaluate(() => {
        const mid = (el, side, size) => el.getBoundingClientRect()[side] + el.getBoundingClientRect()[size] / 2;
        const link = document.querySelector(".route a[aria-current]"), dot = document.querySelector(".route-dot");
        const step = document.querySelector(".walk .steps > li.is-current"), rail = document.querySelector(".walk .rail-dot");
        const bullet = getComputedStyle(step, "::before");
        return {
          route: +(mid(dot, "left", "width") - mid(link, "left", "width")).toFixed(1),
          line: +(mid(dot, "top", "height") - document.querySelector(".topbar").getBoundingClientRect().bottom).toFixed(1),
          rail: +(mid(rail, "top", "height") - (step.getBoundingClientRect().top + parseFloat(bullet.top) + parseFloat(bullet.height) / 2)).toFixed(1),
        };
      }));
    }
    ok(`at ${width}px the top bar dot is under the current link and on the line, and the rail dot is on the current step`, off.every((o) => Math.abs(o.route) <= 1 && Math.abs(o.line + 0.5) <= 1 && Math.abs(o.rail) <= 1), off);
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
    ok("on paper no table is cut off", tables.length === 3 && tables.every((t) => t.shown && t.over <= 0), tables);
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

  // A plain list in the text flow has a kit style, and the lists of the kit's own blocks keep theirs.
  {
    const content = html.replace('<section id="report"', '<section id="lists" aria-labelledby="lists-h"><h2 id="lists-h">Lists</h2><ul id="points"><li>One.</li><li>Two.</li></ul><ol id="numbers"><li>One.</li><li>Two.</li></ol></section>\n<section id="report"');
    const { page, context } = await open({ width: 1280, content });
    const lists = await page.evaluate(() => { const of = (sel) => { const c = getComputedStyle(document.querySelector(sel)); return `${c.paddingLeft} ${c.maxWidth} ${c.marginTop} ${c.listStyleType}`; }; return { points: of("#points"), numbers: of("#numbers"), line: of("#points li + li"), steps: of(".steps"), step: of(".steps li + li"), facts: of(".facts"), ticks: of("#wd-ready ul"), tick: of("#wd-ready li + li") }; });
    ok("a plain list has the kit style, and the steps, the facts and the checklist keep theirs", lists.points === "24px 496px 0px disc" && lists.numbers === "24px 496px 0px decimal" && lists.line.startsWith("0px none 4px") && lists.steps === "0px none 0px none" && lists.step.startsWith("32px none 0px") && lists.facts === "0px none 0px none" && lists.ticks === "0px 496px 0px none" && lists.tick.startsWith("0px none 12px"), lists);
    await context.close();
  }

  // Space between blocks: a block that brings no space below it must not touch the text or the block heading that follows.
  {
    const pre = '<pre tabindex="0" role="region" aria-label="Code"><code>command --option</code></pre>';
    const table = '<div class="table-wrap" role="region" aria-label="Table" tabindex="0"><table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>one</td></tr></tbody></table></div>';
    const details = "<details><summary>A closed section</summary><p>Its text.</p></details>";
    const status = '<div class="status"><span class="state warn">Warning</span><p>A status note.</p></div>';
    const walk = '<div class="walk"><div class="rail"><p>Steps.</p></div></div>';
    const p = "<p>A paragraph.</p>", h3 = "<h3>A block heading</h3>", ol = "<ol><li>One.</li><li>Two.</li></ol>";
    const want = [[pre, p, 24], [pre, ol, 24], [pre, h3, 32], [table, p, 24], [table, h3, 32], [details, p, 24], [details, h3, 32], [status, p, 24], [walk, p, 24], [h3, p, 8], [p, h3, 32], [p, p, 16], ['<h2 id="gap-h">A section</h2>', h3, 16]];
    const content = html.replace('<section id="report"', `${want.map(([a, b], i) => `<section class="gap-test" aria-label="Gap ${i}">${a}${b}</section>`).join("")}\n<section id="report"`);
    const { page, context } = await open({ width: 1280, content });
    const gaps = await page.evaluate(() => [...document.querySelectorAll(".gap-test")].map((s) => Math.round(s.children[1].getBoundingClientRect().top - s.children[0].getBoundingClientRect().bottom)));
    const step = await page.evaluate(() => { const h = getComputedStyle(document.querySelector(".steps h3")); return `${h.marginTop} ${h.marginBottom}`; });
    ok("blocks in a section keep space between them, and a step heading of a walkthrough keeps none", gaps.join() === want.map((w) => w[2]).join() && step === "0px 0px", { gaps: gaps.join(), want: want.map((w) => w[2]).join(), step });
    await context.close();
  }

  // A numbered block heading, the line under a drawing that is wider than its well, and the copy button on code.
  {
    // A drawing that is not a route has a column form for phones; with one long part name the column is still wider than a 320px screen.
    const skip = fs.readFileSync(path.join(root, "tests", "fixtures", "skip.json"), "utf8").replace('"name": "Answer"', '"name": "Answer written by the whole team"');
    const extra = `<section id="extra" aria-labelledby="extra-h"><h2 id="extra-h">Extra</h2><h3 class="step">First</h3><p>Text.</p><pre tabindex="0" role="region" aria-label="A short command"><code>app start</code></pre><h3 class="step">Second</h3><pre tabindex="0" role="region" aria-label="A long command"><code>app get --all --from the-long-source-name --into the-long-folder-name --and-then verify --and-then report</code></pre><figure><div class="fig" role="region" aria-label="Figure 9, a request" tabindex="0">\n<!-- docent:diagram\n${skip}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 9</strong>A request.</figcaption></figure></section>\n`;
    const content = renderDocument(html.replace('<section id="report"', `${extra}<section id="report"`)).html;
    const look = (page) => page.evaluate(() => {
      const shown = (el) => el.getBoundingClientRect().height > 0, extra = document.querySelector("#extra");
      return {
        // The styles count the steps; the page script writes each number as text, so a screen reader reads it.
        numbers: [...extra.querySelectorAll("h3.step")].map((h) => `${h.textContent}|${getComputedStyle(h, "::before").content}`).join(),
        walk: [...document.querySelectorAll(".steps h3 .step-n")].map((n) => n.textContent.trim()).join(),
        hint: shown(extra.querySelector(".fig-more")), otherHints: [...document.querySelectorAll(".fig-more")].filter((n) => !extra.contains(n) && shown(n)).length,
        buttons: extra.querySelectorAll(".code > .copy").length, long: [...extra.querySelectorAll(".code")].map((c) => c.classList.contains("is-long")).join(),
        dashed: getComputedStyle(extra.querySelector(".leg.is-optional .line")).strokeDasharray,
      };
    });
    const wide = await open({ width: 1280, content });
    const onDesk = await look(wide.page);
    await wide.page.addScriptTag({ path: axePath });
    const axe = await wide.page.evaluate(async () => (await window.axe.run(document.querySelector("#extra"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((v) => `${v.id} ${v.nodes[0].target.join(" ")}`));
    await wide.context.close();
    const narrow = await open({ width: 320, height: 700, content });
    const onPhone = await look(narrow.page);
    await narrow.page.locator("#extra").screenshot({ path: `${out}/extra-phone.png` });
    await narrow.context.close();
    const paper = await open({ width: 794, height: 1123, media: "print", content });
    const onPaper = await paper.page.evaluate(() => [...document.querySelectorAll("#extra .copy, #extra .fig-more")].filter((el) => el.getBoundingClientRect().height > 0).length);
    await paper.context.close();
    ok("numbered block headings count up, an optional leg is dashed, and each code block has a copy button", onDesk.numbers === "1 First|none,2 Second|none" && onDesk.walk === "1,2,3,4" && onDesk.dashed === "5px, 7px" && onDesk.buttons === 2 && axe.length === 0, { onDesk, axe });
    ok("a drawing that is wider than its well gets a line under it on a phone, and no line when it fits", onPhone.hint && !onDesk.hint && onPhone.otherHints === 0 && onDesk.otherHints === 0, { phone: onPhone.hint, desk: onDesk.hint, others: [onPhone.otherHints, onDesk.otherHints] });
    // On a Standard page the code well ends at the right edge of the notes, so the long line reaches the button on a desktop too.
    ok("code that reaches the copy button starts below it, and short code keeps its place", onDesk.long === "false,true" && onPhone.long === "false,true", { desk: onDesk.long, phone: onPhone.long });
    ok("on paper the copy button and the line under a drawing do not print", onPaper === 0, onPaper);
  }

  // A long status label wraps; code in a table cell breaks; a closed section that holds a table takes the full width.
  {
    const cell = (s) => `<tr><th scope="row">${s}</th><td><code>/srv/example/service/settings/production.override.yaml</code></td><td><code>example-cli deploy --environment=production --wait --timeout=600</code></td></tr>`;
    const table = (id) => `<div class="table-wrap" id="${id}" role="region" aria-label="Table ${id}" tabindex="0"><table><thead><tr><th scope="col">Name</th><th scope="col">Path</th><th scope="col">Command</th></tr></thead><tbody>${cell("Config")}</tbody></table></div>`;
    const blocks = `<section id="fit" aria-labelledby="fit-h"><h2 id="fit-h">Fit</h2><div class="status"><span class="state info">The second review must end before the release can start</span><p>Text.</p></div>${table("t-flow")}<details id="t-closed"><summary>A closed section with a table</summary><p>Text.</p>${table("t-in")}</details></section>\n`;
    const content = html.replace('<section id="report"', `${blocks}<section id="report"`);
    const measure = (page) => page.evaluate(() => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      const box = (s) => document.querySelector(s).getBoundingClientRect();
      return { page: document.documentElement.scrollWidth, view: innerWidth, label: Math.round(box("#fit .state").right), main: Math.round(box("main").right), inner: Math.round(box("#t-in").width), flow: Math.round(box("#t-flow").width), wide: [...document.querySelectorAll("#fit table")].map((t) => Math.round(t.getBoundingClientRect().right)) };
    });
    const results = {};
    for (const [name, opts] of [["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["desk", { width: 1280 }], ["paper", { width: 658, height: 900, media: "print" }]]) {
      const view = await open({ ...opts, content });
      results[name] = await measure(view.page);
      await view.context.close();
    }
    const { phone, narrow, desk, paper } = results;
    ok("a long status label wraps, so the page does not scroll sideways at 390px or 320px", phone.page === phone.view && narrow.page === narrow.view && phone.label <= phone.main, { phone, narrow });
    // On a Standard page both end at the right edge of the notes: 764px.
    ok("a closed section that holds a table is as wide as a table outside it", desk.inner === desk.flow && desk.flow === 764, desk);
    ok("on paper a table with long code in its cells stays inside the page", paper.page === paper.view && paper.wide.every((r) => r <= paper.view), paper);
  }

  // The column form: a drawing that is not a route shows it on a phone and on paper, in place of Plates.
  {
    const branch = fs.readFileSync(path.join(root, "tests", "fixtures", "branch.json"), "utf8");
    const content = renderDocument(html.replace('<section id="report"', `<section id="col" aria-labelledby="col-h"><h2 id="col-h">Column</h2><figure><div class="fig" role="region" aria-label="Figure 8, a leave request" tabindex="0">\n<!-- docent:diagram\n${branch}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 8</strong>A leave request.</figcaption></figure></section>\n<section id="report"`)).html;
    const look = (page) => page.evaluate(() => { const shown = (id) => document.getElementById(id).getBoundingClientRect().width; return { main: shown("dg-leave"), column: shown("dg-leave-phone"), page: document.documentElement.scrollWidth, view: innerWidth }; });
    const results = {};
    for (const [name, opts] of [["desk", { width: 1280 }], ["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["paper", { width: 658, height: 1123, media: "print" }]]) {
      const view = await open({ ...opts, content });
      results[name] = await look(view.page);
      if (name === "phone") {
        await view.page.addScriptTag({ path: axePath });
        results.axe = await view.page.evaluate(async () => (await window.axe.run(document.querySelector("#col"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
        await view.page.locator("#col figure").screenshot({ path: `${out}/column-phone.png` });
      }
      await view.context.close();
    }
    const { desk, phone, narrow, paper } = results;
    ok("a drawing that is not a route shows Plates on a desktop and the column form on a phone, at 320px and on paper, with no sideways scroll", desk.main > 0 && !desk.column && !phone.main && phone.column === 264 && narrow.column === 264 && !paper.main && paper.column > 0 && [phone, narrow].every((r) => r.page === r.view) && results.axe.length === 0, results);
  }

  // A side leg beside walkthrough steps: the steps light legs 1 to 4, the side leg stays dashed and unlit, and a phone shows it as a go-to row.
  {
    const side = fs.readFileSync(path.join(root, "tests", "fixtures", "side.json"), "utf8").replace('"id": "side"', '"id": "steps"');
    const content = renderDocument(html.replace(/(<!-- docent:diagram\n)\{\n  "id": "steps"[\s\S]*?(\n-->)/, (all, open, close) => `${open}${side.trim()}${close}`)).html;
    const desk = await open({ width: 1280, content });
    const lit = [];
    for (let i = 0; i < 4; i++) {
      await desk.page.evaluate((n) => { const li = document.querySelectorAll(".steps > li")[n]; window.scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 4); }, i);
      await desk.page.waitForTimeout(200);
      lit.push(await desk.page.evaluate(() => [...document.querySelectorAll("#dg-steps .leg.is-current")].map((g) => g.dataset.leg).join()));
    }
    const spur = await desk.page.evaluate(() => { const line = document.querySelector("#dg-steps .side .line"); return { dash: getComputedStyle(line).strokeDasharray, stroke: getComputedStyle(line).stroke, current: document.querySelectorAll("#dg-steps .side.is-current, #dg-steps .side .is-current").length }; });
    await desk.context.close();
    const phone = await open({ width: 390, height: 844, content });
    const row = await phone.page.evaluate(() => ({ shown: document.getElementById("dg-steps-phone").getBoundingClientRect().width, row: [...document.querySelectorAll("#dg-steps-phone .jump text")].map((t) => t.textContent).join("|"), page: document.documentElement.scrollWidth, view: innerWidth }));
    await phone.context.close();
    ok("a side leg beside walkthrough steps: steps light legs 1 to 4, the side leg is dashed and never lit, and a phone shows it as a go-to row", lit.join(" ") === "1 2 3 4" && spur.dash === "5px, 7px" && spur.stroke === LIGHT.text && spur.current === 0 && row.shown > 0 && row.row === "if it is known|to Closed" && row.page === row.view, { lit, spur, row });
  }

  // A sequence diagram: the desktop form on a desktop and on paper, the script on a phone, and the steps in words.
  {
    const seq = fs.readFileSync(path.join(root, "tests", "fixtures", "sequence.json"), "utf8");
    const content = renderDocument(html.replace('<section id="report"', `<section id="seq" aria-labelledby="seq-h"><h2 id="seq-h">Sequence</h2><figure><div class="fig" role="region" aria-label="Figure 6, a page request" tabindex="0">\n<!-- docent:diagram\n${seq}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 6</strong>A page request.</figcaption></figure></section>\n<section id="report"`)).html;
    const look = (page) => page.evaluate(() => ({ main: document.getElementById("dg-page").getBoundingClientRect().width, script: document.getElementById("dg-page-phone").getBoundingClientRect().width, words: document.querySelector("#seq .dg-words").open, items: [...document.querySelectorAll("#seq .dg-words ol li")].filter((li) => li.getBoundingClientRect().height).length, page: document.documentElement.scrollWidth, view: innerWidth }));
    const results = {};
    for (const [name, opts] of [["desk", { width: 1280 }], ["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["paper", { width: 658, height: 1123, media: "print" }]]) {
      const view = await open({ ...opts, content });
      if (name === "paper") await view.page.evaluate(() => dispatchEvent(new Event("beforeprint")));
      results[name] = await look(view.page);
      if (name === "desk") {
        await view.page.addScriptTag({ path: axePath });
        results.axe = await view.page.evaluate(async () => (await window.axe.run(document.querySelector("#seq"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
        results.dots = await view.page.evaluate(() => document.querySelectorAll("#dg-page .pulse").length);
      }
      await view.context.close();
    }
    const { desk, phone, narrow, paper } = results;
    ok("a sequence diagram shows its desktop form on a desktop and on paper, the script on a phone, and its steps in words on paper (the key to the marks is not counted as a step)", desk.main > 600 && !desk.script && !desk.words && results.dots === 7 && !phone.main && phone.script === 264 && narrow.script === 264 && paper.main > 0 && !paper.script && paper.words && paper.items === 7 && [phone, narrow].every((r) => r.page === r.view) && results.axe.length === 0, results);
  }

  // A flowchart: two columns on a desktop, the column form on a phone and on paper, and the steps in words on paper.
  {
    const flow = fs.readFileSync(path.join(root, "tests", "fixtures", "flow.json"), "utf8");
    const content = renderDocument(html.replace('<section id="report"', `<section id="flow" aria-labelledby="flow-h"><h2 id="flow-h">Flow</h2><figure><div class="fig" role="region" aria-label="Figure 5, a job" tabindex="0">\n<!-- docent:diagram\n${flow}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 5</strong>A job.</figcaption></figure></section>\n<section id="report"`)).html;
    const look = (page) => page.evaluate(() => ({ main: document.getElementById("dg-job").getBoundingClientRect().width, column: document.getElementById("dg-job-phone").getBoundingClientRect().width, words: document.querySelector("#flow .dg-words").open, dots: document.querySelectorAll("#dg-job .pulse").length, page: document.documentElement.scrollWidth, view: innerWidth }));
    const results = {};
    for (const [name, opts] of [["desk", { width: 1280 }], ["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["paper", { width: 658, height: 1123, media: "print" }]]) {
      const view = await open({ ...opts, content });
      if (name === "paper") await view.page.evaluate(() => dispatchEvent(new Event("beforeprint")));
      results[name] = await look(view.page);
      if (name === "desk") {
        await view.page.addScriptTag({ path: axePath });
        results.axe = await view.page.evaluate(async () => (await window.axe.run(document.querySelector("#flow"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
      }
      await view.context.close();
    }
    const { desk, phone, narrow, paper } = results;
    ok("a flowchart shows two columns on a desktop, the column form on a phone and on paper, and its steps in words on paper", desk.main > 600 && !desk.column && desk.dots === 7 && !desk.words && !phone.main && phone.column === 264 && narrow.column === 264 && !paper.main && paper.column > 0 && paper.words && [phone, narrow].every((r) => r.page === r.view) && results.axe.length === 0, results);
  }

  // The UML graph kinds: the drawing on a desktop, the column on a phone (or the drawing itself, when it fits a phone),
  // and the words with the key on paper.
  for (const name of ["activity", "state", "interaction-overview", "timing", "usecase", "class", "object", "package", "profile", "component", "composite", "deployment", "communication"]) {
    const data = fs.readFileSync(path.join(root, "tests", "fixtures", `${name}.json`), "utf8");
    const did = `dg-${JSON.parse(data).id}`;
    const content = renderDocument(html.replace('<section id="report"', `<section id="uml" aria-labelledby="uml-h"><h2 id="uml-h">UML</h2><figure><div class="fig" role="region" aria-label="Figure 8, ${name}" tabindex="0">\n<!-- docent:diagram\n${data}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 8</strong>A UML ${name} diagram.</figcaption></figure></section>\n<section id="report"`)).html;
    const look = (page) => page.evaluate((id) => ({ main: document.getElementById(id).getBoundingClientRect().width, column: (document.getElementById(`${id}-phone`) || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width, words: document.querySelector("#uml .dg-words").open, key: [...document.querySelectorAll("#uml .dg-words ul li")].length, page: document.documentElement.scrollWidth, view: innerWidth }), did);
    const results = {};
    for (const [form, opts] of [["desk", { width: 1280 }], ["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["paper", { width: 658, height: 1123, media: "print" }], ["dark", { width: 1280, theme: "dark" }]]) {
      const view = await open({ ...opts, content });
      if (form === "paper") await view.page.evaluate(() => dispatchEvent(new Event("beforeprint")));
      results[form] = await look(view.page);
      if (form === "desk" || form === "dark") {
        await view.page.addScriptTag({ path: axePath });
        results[`${form}Axe`] = await view.page.evaluate(async () => (await window.axe.run(document.querySelector("#uml"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
      }
      await view.context.close();
    }
    const { desk, phone, narrow, paper } = results;
    ok(`a UML ${name} diagram shows its drawing on a desktop, its column on a phone, and its words with a key on paper, in both themes with no contrast problem`, desk.main > 0 && !desk.column && !desk.words && (desk.main <= 264 ? [phone, narrow].every((r) => r.main === desk.main && !r.column) : !phone.main && phone.column === 264 && narrow.column === 264) && paper.words && paper.key > 0 && [phone, narrow].every((r) => r.page === r.view) && results.deskAxe.length === 0 && results.darkAxe.length === 0, results);
  }

  // The scale charts (a range chart and two layouts to scale): the 640px form on a desktop and on paper (at its real size,
  // no shrink), the 264px form on a phone, the rows as a table in words, text no wider than the renderer assumed, and no
  // contrast problem in either theme.
  for (const [file, id, rows, what] of [["range", "line-lengths", 8, "a range chart"], ["layout-screen", "wide-layouts", 12, "a layout to scale with two tracks"], ["layout-a4", "a4-notes", 4, "a measured layout to scale"]]) {
    const data = fs.readFileSync(path.join(root, "tests", "fixtures", `${file}.json`), "utf8");
    const content = renderDocument(html.replace('<section id="report"', `<section id="rng" aria-labelledby="rng-h"><h2 id="rng-h">Range</h2><figure><div class="fig" role="region" aria-label="Figure 9, line lengths" tabindex="0">\n<!-- docent:diagram\n${data}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 9</strong>Line lengths.</figcaption></figure></section>\n<section id="report"`)).html;
    const look = (page) => page.evaluate((id) => {
      const shown = (id) => { const svg = document.getElementById(id); return { w: Math.round(svg.getBoundingClientRect().width), real: svg.viewBox.baseVal.width }; };
      const words = document.querySelector("#rng .dg-words"), table = words.querySelector("table");
      return { main: shown(`dg-${id}`), phone: shown(`dg-${id}-phone`), words: words.open, rows: [...table.querySelectorAll("tbody tr")].filter((r) => r.getBoundingClientRect().height).length, table: Math.round(table.getBoundingClientRect().width), well: Math.round(document.querySelector("#rng .fig").getBoundingClientRect().width), page: document.documentElement.scrollWidth, view: innerWidth };
    }, id);
    const results = {};
    for (const [form, opts] of [["desk", { width: 1280 }], ["phone", { width: 390, height: 844 }], ["narrow", { width: 320, height: 700 }], ["paper", { width: 658, height: 1123, media: "print" }], ["dark", { width: 1280, theme: "dark" }]]) {
      const view = await open({ ...opts, content });
      if (form === "paper") await view.page.evaluate(() => dispatchEvent(new Event("beforeprint")));
      results[form] = await look(view.page);
      if (form === "desk" || form === "dark") {
        await view.page.addScriptTag({ path: axePath });
        results[`${form}Axe`] = await view.page.evaluate(async () => (await window.axe.run(document.querySelector("#rng"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } })).violations.map((v) => v.id));
      }
      if (form === "desk" || form === "phone") {
        const texts = await view.page.evaluate(() => [...document.querySelectorAll("#rng svg.dg text")].filter((t) => t.getBoundingClientRect().width).map((t) => ({ s: t.textContent, cls: t.getAttribute("class"), px: t.getComputedTextLength() })));
        const font = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };
        const { valueWidth } = require(path.join(root, "skills", "docent", "scripts", "lib", "scale.cjs"));
        results[`${form}Wider`] = texts.filter((t) => t.px > (t.cls === "val" ? valueWidth(t.s) : textWidth(t.s, ...font[t.cls])) + 0.5).map((t) => `${t.s}: ${t.px.toFixed(1)}`);
      }
      await view.context.close();
    }
    const { desk, phone, narrow, paper } = results;
    const real = (f) => f.w === f.real;
    ok(`${what} shows its 640px form at real size on a desktop and on paper, its 264px form on a phone, its rows as a table in words, and its text fits the renderer's widths`, desk.main.w === 640 && real(desk.main) && !desk.phone.w && !desk.words && !phone.main.w && phone.phone.w === 264 && narrow.phone.w === 264 && paper.main.w === 640 && !paper.phone.w && paper.words && paper.rows === rows && [phone, narrow, paper].every((r) => r.table <= r.well - 16) && [phone, narrow].every((r) => r.page === r.view) && results.deskWider.length === 0 && results.phoneWider.length === 0 && results.deskAxe.length === 0 && results.darkAxe.length === 0, results);
  }

  // Two drawings in one figure: side by side when both fit, one below the other when they do not.
  {
    const block = (id, a, b) => `<!-- docent:diagram\n{"id": "${id}", "label": "${a} goes to ${b}.", "lanes": [{"id": "x", "name": "Team"}, {"id": "y", "name": "Service"}], "parts": [{"id": "p", "lane": "x", "name": "${a}"}, {"id": "q", "lane": "y", "name": "${b}"}], "legs": [{"from": "p", "to": "q", "verb": "send"}]}\n-->\n<!-- /docent:diagram -->\n`;
    const content = renderDocument(html.replace('<section id="report"', `<section id="two" aria-labelledby="two-h"><h2 id="two-h">Two</h2><figure><div class="fig" role="region" aria-label="Figure 7, two chains" tabindex="0">\n${block("left", "Order", "Invoice")}${block("right", "Refund", "Credit")}</div><figcaption><strong>Figure 7</strong>Two chains.</figcaption></figure></section>\n<section id="report"`)).html;
    const place = async (opts) => { const view = await open({ ...opts, content }); const r = await view.page.evaluate(() => { const [a, b] = ["dg-left", "dg-right"].map((id) => [id, `${id}-phone`].map((i) => document.getElementById(i)).filter(Boolean).map((el) => el.getBoundingClientRect()).find((r) => r.width)); return { sameRow: Math.round(a.top) === Math.round(b.top), page: document.documentElement.scrollWidth, view: innerWidth }; }); await view.context.close(); return r; };
    const [desk, phone] = [await place({ width: 1280 }), await place({ width: 390, height: 844 })];
    ok("two drawings in one figure stand side by side on a desktop and one below the other on a phone", desk.sameRow && !phone.sameRow && phone.page === phone.view, { desk, phone });
  }

  // The value picker: a choice changes every place, in the text and in code. With scripts off, and on paper, the table of all values is there.
  {
    const { page, context } = await open({ width: 1280 });
    const places = () => page.evaluate(() => ({ text: [...document.querySelectorAll("var[data-v]")].map((v) => v.textContent).join(), now: document.querySelector("#wd-channel .values-now strong").textContent, code: document.querySelector("#commands pre code").textContent.split("\n")[1], open: document.querySelector("#wd-channel details").open }));
    const first = await places();
    await page.click('label[for="wd-channel-2"]');
    const second = await places();
    ok("a value picker shows the first option's values, and a choice changes every place, also inside code", first.text === "bugs.example.test/stable,stable" && first.now === "Stable" && !first.open && second.text === "bugs.example.test/beta,beta" && second.now === "Beta" && second.code === "app --version --channel beta", { first, second });
    const still = await page.evaluate(() => { document.documentElement.classList.remove("js"); return { options: [...document.querySelectorAll("#wd-channel > .opt")].filter((o) => o.getBoundingClientRect().height > 0).length, rows: document.querySelectorAll("#wd-channel tbody tr").length }; });
    ok("with scripts off the options of a value picker are hidden, and its table holds every value", still.options === 0 && still.rows === 2, still);
    await context.close();
    const paper = await open({ width: 658, height: 1123, media: "print" });
    const printed = await paper.page.evaluate(() => { dispatchEvent(new Event("beforeprint")); const shown = (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0).length; return { options: shown("#wd-channel > .opt"), now: shown("#wd-channel .values-now"), rows: shown("#wd-channel tbody tr") }; });
    ok("on paper a value picker prints the line that names the choice and the table of all values, without the options", printed.options === 0 && printed.now === 1 && printed.rows === 2, printed);
    await paper.context.close();
  }

  // The card grid: at most four in a row, two on a phone, one on the narrowest screen; the page never scrolls sideways.
  {
    const rows = {};
    for (const width of [1280, 390, 320]) {
      const view = await open({ width, height: 900 });
      rows[width] = await view.page.evaluate(() => ({ tops: new Set([...document.querySelectorAll(".cards > li")].map((li) => Math.round(li.getBoundingClientRect().top))).size, page: document.documentElement.scrollWidth, view: innerWidth }));
      await view.context.close();
    }
    ok("a card grid of four shows 4 in a row at 1280px, 2 at 390px and 1 at 320px", rows[1280].tops === 1 && rows[390].tops === 2 && rows[320].tops === 4 && [1280, 390, 320].every((w) => rows[w].page === rows[w].view), rows);
  }

  // Host tokens: an accent, a dark accent and a font set before stamp hold in light, in dark and on paper. A drawing keeps the system font.
  {
    const host = html.replace("<head>", "<head>\n<style>:root { --host-accent: #0b6e4f; --host-accent-dark: #6fd3a8; --host-sans: Georgia, serif; }</style>");
    const look = async (opts) => { const view = await open({ ...opts, content: host }); const r = await view.page.evaluate(() => ({ link: getComputedStyle(document.querySelector("main a")).color, body: getComputedStyle(document.body).fontFamily.split(",")[0], drawing: getComputedStyle(document.querySelector("svg.dg")).fontFamily.split(",")[0] })); await view.context.close(); return r; };
    const [light, dark, paper] = [await look({ width: 1280 }), await look({ width: 1280, theme: "dark" }), await look({ width: 794, media: "print", theme: "dark" })];
    ok("host tokens set before stamp win in light, in dark and on paper, and a drawing keeps the system font", light.link === "rgb(11, 110, 79)" && dark.link === "rgb(111, 211, 168)" && paper.link === "rgb(11, 110, 79)" && light.body === "Georgia" && light.drawing === "system-ui", { light, dark, paper });
  }

  // A theme written on <html> is fixed: a dark system and a saved dark choice do not change it, and the switch is hidden.
  {
    // Opened from a file, so the page has storage: a saved choice of "dark" is stored first, then the page loads again.
    const file = path.join(require("node:os").tmpdir(), `docent-fixed-${process.pid}.html`);
    fs.writeFileSync(file, html.replace(/<html lang="en"/, '<html lang="en" data-theme="light"'));
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(`file://${file}`);
    await page.evaluate(() => localStorage.setItem("docent-theme", "dark"));
    await page.reload();
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ saved: localStorage.getItem("docent-theme"), bg: getComputedStyle(document.body).backgroundColor, theme: document.documentElement.dataset.theme, button: document.querySelector(".theme").getBoundingClientRect().width }));
    ok("data-theme=\"light\" on <html> keeps the page light on a dark system and after a saved dark choice, and hides the switch", r.saved === "dark" && r.bg === LIGHT.bg && r.theme === "light" && r.button === 0, r);
    await context.close();
    fs.unlinkSync(file);
  }

  // The copy button copies the code. The page is opened from its file, as a reader opens it.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    await page.goto(`file://${file}`);
    const code = await page.evaluate(() => document.querySelector(".code code").textContent);
    await page.click(".code .copy");
    const first = await page.evaluate(async () => ({ word: document.querySelector(".code .copy").textContent, clip: await navigator.clipboard.readText() }));
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
    await page.click(".code .copy");
    const second = await page.evaluate(() => document.querySelector(".code .copy").textContent);
    ok("the copy button puts the code on the clipboard, also in a browser with no clipboard object", code.length > 10 && first.word === "Copied" && first.clip === code && second === "Copied", { first: first.word, same: first.clip === code, second });
    // A code block in a chooser case is hidden at the start. It is measured when its case shows, so short code keeps its place.
    await page.click('label[for="wd-system-3"]');
    await page.waitForTimeout(150);
    const shownLater = await page.evaluate(() => { const block = [...document.querySelectorAll("#wd-system .code")].find((c) => c.getBoundingClientRect().height > 0); return { found: !!block, long: block && block.classList.contains("is-long"), top: block && getComputedStyle(block.querySelector("pre")).paddingTop }; });
    ok("short code in a chooser case that shows later keeps its place", shownLater.found && !shownLater.long && shownLater.top === "16px", shownLater);
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

  // Widths and profiles: one left edge, the text and its notes in the middle of a wide screen, and code and tables at the block width of the profile.
  {
    const build = (name, change = (h) => h) => stampHtml(renderDocument(change(fs.readFileSync(path.join(root, name), "utf8"))).html).html;
    const asTask = (h) => h.replace('data-profile="standard"', 'data-profile="task"');
    const pages = [["standard", build("skills/docent/assets/specimen.html")], ["task", build("skills/docent/assets/specimen.html", asTask)], ["reference", build("tests/fixtures/reference-page.html")]];
    for (const [name, content] of pages) for (const width of [1280, 1440, 1920, 2560]) {
      const { page, context } = await open({ width, content });
      const m = await page.evaluate(() => {
        const r = (el) => el.getBoundingClientRect(), vw = document.documentElement.clientWidth;
        const p = r(document.querySelector("main section .row > div > p")), note = r(document.querySelector("main section .row .note"));
        const blocks = [...document.querySelectorAll("main section > :is(.table-wrap, .code)")].map(r);
        return { vw, side: document.documentElement.scrollWidth > vw, left: Math.round(p.left), mid: Math.round((p.left + note.right) / 2 - vw / 2), noteRight: Math.round(note.right), blocks: blocks.length, lefts: [...new Set(blocks.map((b) => Math.round(b.left)))], rights: [...new Set(blocks.map((b) => Math.round(b.right)))] };
      });
      const end = name === "reference" ? Math.min(m.left + 1120, m.vw - 40) : m.noteRight;
      ok(`${name} at ${width}px: no sideways scroll, one left edge, ${width >= 1920 ? "the text and its notes in the middle, " : ""}code and tables end at ${name === "reference" ? "1120px" : "the right edge of the notes"}`, !m.side && m.blocks > 0 && m.lefts.every((x) => x === m.left) && (width < 1920 || Math.abs(m.mid) <= 2) && m.rights.every((x) => Math.abs(x - end) <= 1), m);
      await context.close();
    }

    // A page for the public: 18px text, and a text column that grows with it.
    const large = await open({ width: 1440, content: build("skills/docent/assets/specimen.html", (h) => h.replace('data-profile="standard"', 'data-profile="standard" data-text="large"')) });
    const big = await large.page.evaluate(() => ({ body: getComputedStyle(document.body).fontSize, text: Math.round(document.querySelector("main section .row > div > p").getBoundingClientRect().width), side: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
    ok("a page for the public: 18px text and a 558px text column, with no sideways scroll", big.body === "18px" && big.text === 558 && !big.side, big);
    await large.context.close();

    // Paper: an A4 page is 174mm wide inside its margins. The text is 11pt, each note sits beside its text, and nothing is wider than the paper.
    for (const [name, content] of [pages[0], pages[2]]) {
      const { page, context } = await open({ width: 658, height: 1123, media: "print", content });
      const sheet = await page.evaluate(() => {
        const r = (el) => el.getBoundingClientRect(), vw = document.documentElement.clientWidth;
        const rows = [...document.querySelectorAll("main .row")].filter((row) => row.querySelector(":scope > .note")).map((row) => [r(row.firstElementChild), r(row.querySelector(":scope > .note"))]);
        return { body: getComputedStyle(document.body).fontSize, beside: rows.length > 0 && rows.every(([text, note]) => note.left >= text.right), widest: Math.round(Math.max(...[...document.querySelectorAll("main *")].map((e) => r(e).right))), vw };
      });
      const pdf = await page.pdf({ format: "A4" });
      ok(`${name} on paper: 11pt text, each note beside its text, nothing wider than the paper, and a PDF`, sheet.body === "14.6667px" && sheet.beside && sheet.widest <= sheet.vw && pdf.length > 1000, sheet);
      await context.close();
    }
  }

  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : "all browser checks passed");
  process.exitCode = failed ? 1 : 0;
})();
