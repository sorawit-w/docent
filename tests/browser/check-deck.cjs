// Browser checks for a Docent deck (docs/proposals/decks.md): the stack, present mode, the keys, the swipe, the address, the names a
// screen reader gets, the projection colors, and that each slide fits its frame as check estimated. The fixture deck is built first.
//   DOCENT_NODE_MODULES=/path/to/node_modules node tests/browser/check-deck.cjs [deck.html]
// DOCENT_BROWSER_CHANNEL=chrome uses the Chrome that is installed. DOCENT_BROWSER=webkit or firefox runs that engine, when Playwright has it.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "..");
const modules = process.env.DOCENT_NODE_MODULES || path.join(root, "node_modules");
const playwright = require(path.join(modules, "playwright-core"));
const axePath = path.join(modules, "axe-core", "axe.min.js");
const { renderDocument } = require(path.join(root, "skills", "docent", "scripts", "lib", "diagram.cjs"));
const { stampHtml } = require(path.join(root, "skills", "docent", "scripts", "lib", "kit.cjs"));
const { checkDeck, INNER, FRAME } = require(path.join(root, "skills", "docent", "scripts", "lib", "slide.cjs"));
const { textWidth } = require(path.join(root, "skills", "docent", "scripts", "lib", "text.cjs"));
const source = fs.readFileSync(path.resolve(process.argv[2] || path.join(root, "tests", "fixtures", "deck.html")), "utf8");
const build = (html) => stampHtml(renderDocument(html).html).html;
const html = build(source);
const estimate = checkDeck(html.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length))).slides;
const out = process.env.DOCENT_SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });
const engine = process.env.DOCENT_BROWSER || "chromium";

const LIGHT = { text: "rgb(28, 31, 46)", bg: "rgb(251, 251, 254)", line: "rgb(87, 93, 117)" };
let failed = 0;
const ok = (name, pass, detail = "") => { if (!pass) failed += 1; console.log(`${pass ? "ok  " : "FAIL"} ${name}${pass || !detail ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };

(async () => {
  const browser = await playwright[engine].launch(process.env.DOCENT_BROWSER_CHANNEL && engine === "chromium" ? { channel: process.env.DOCENT_BROWSER_CHANNEL } : {});
  const file = path.join(out, "deck-under-test.html");
  const open = async ({ width = 1920, height = 1080, theme = "light", contrast = "no-preference", js = true, content = html, touch = false }) => {
    fs.writeFileSync(file, content);
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, javaScriptEnabled: js, hasTouch: touch });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.emulateMedia({ colorScheme: theme, contrast });
    await page.goto(`file://${file}`);
    await page.waitForTimeout(300);
    return { page, context, errors };
  };
  const state = (page) => page.evaluate(() => {
    const current = document.querySelector(".slide.is-current");
    return {
      presenting: document.documentElement.classList.contains("presenting"),
      id: current && current.id, hash: location.hash, count: (document.querySelector(".deck-count") || {}).textContent,
      focus: document.activeElement === current, shown: [...document.querySelectorAll(".slide")].filter((s) => !s.hidden).length,
    };
  });

  // The stack: with scripts off there is no Present button, and each slide after the title shows its number before its heading.
  {
    const { page, context } = await open({ js: false, width: 1280, height: 900 });
    const stack = await page.evaluate(() => ({ button: document.querySelectorAll(".present").length, numbers: [...document.querySelectorAll(".slide > h1, .slide > h2")].map((h) => getComputedStyle(h, "::before").content) }));
    ok("scripts off: no Present button", stack.button === 0, stack);
    ok("scripts off: the title shows no number, every other slide its number from the styles", stack.numbers[0] === "none" && stack.numbers.slice(1).every((c) => c === "counter(slide)"), stack.numbers);
    await page.screenshot({ path: `${out}/deck-stack-nojs.png`, fullPage: true });
    await context.close();
  }
  {
    const { page, context, errors } = await open({ width: 1280, height: 900 });
    const stack = await page.evaluate(() => ({ button: document.querySelector(".topbar .present + .theme") !== null, numbers: [...document.querySelectorAll(".slide > h2")].map((h) => [h.querySelector(".slide-n")?.textContent, getComputedStyle(h, "::before").content]) }));
    ok("scripts on: the Present button stands before the theme switch", stack.button, stack);
    ok("scripts on: each number is written once, as text", stack.numbers.every(([text, before], i) => text === `${i + 2} ` && before === "none"), stack.numbers);
    ok("scripts on: no script errors", errors.length === 0, errors);
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
    ok("the stack: 0 axe violations", result.violations.length === 0, result.violations.map((v) => `${v.id}(${v.nodes.length})`));
    await context.close();
  }

  // Present mode: the frame, the keys, the address, the focus and the names.
  {
    const { page, context, errors } = await open({});
    const historyBefore = await page.evaluate(() => history.length);
    await page.click(".present");
    await page.waitForTimeout(200);
    let s = await state(page);
    ok("Present shows the first slide, alone, with its number and the address", s.presenting && s.id === "s1" && s.shown === 1 && s.count === "1 / 9" && s.hash === "#s1", s);
    ok("the focus is on the slide", s.focus, s);
    const frame = await page.evaluate(() => { const r = document.querySelector("main").getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), scale: getComputedStyle(document.documentElement).getPropertyValue("--deck-scale") }; });
    ok("the 1280 × 720 frame fills a 1920 × 1080 screen at 1.5 times", frame.w === 1920 && frame.h === 1080 && frame.x === 0 && frame.y === 0 && Number(frame.scale) === 1.5, frame);
    const names = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((sl) => [sl.getAttribute("role"), sl.getAttribute("aria-roledescription"), sl.getAttribute("aria-label"), sl.hasAttribute("aria-labelledby")].join("|")));
    ok('each slide is a group named "n of 9", with the role description "slide", and no other name', names.every((n, i) => n === `group|slide|${i + 1} of 9|false`), names);
    const hidden = await page.evaluate(() => ({ count: document.querySelector(".deck-count").getAttribute("aria-hidden"), labels: [...document.querySelectorAll(".deck-nav button")].map((b) => b.getAttribute("aria-label")), size: [...document.querySelectorAll(".deck-nav button")].map((b) => Math.round(b.getBoundingClientRect().width / 1.5)) }));
    ok("the visible number is hidden from a screen reader; the buttons are named Previous slide and Next slide, 44px on the frame", hidden.count === "true" && hidden.labels.join() === "Previous slide,Next slide" && hidden.size.join() === "44,44", hidden);
    const steps = [["ArrowRight", "s2"], ["ArrowDown", "s3"], ["PageDown", "s4"], ["Space", "s5"], ["Shift+Space", "s4"], ["PageUp", "s3"], ["ArrowUp", "s2"], ["ArrowLeft", "s1"], ["ArrowLeft", "s1"], ["End", "s9"], ["ArrowRight", "s9"], ["Home", "s1"]];
    for (const [key, want] of steps) {
      await page.keyboard.press(key);
      s = await state(page);
      ok(`${key} shows ${want}, with the address and the focus on it`, s.id === want && s.hash === `#${want}` && s.focus && s.shown === 1, s);
    }
    await page.click(".deck-next");
    s = await state(page);
    ok("the Next button shows the next slide", s.id === "s2", s);
    await page.click(".deck-prev");
    s = await state(page);
    const disabled = await page.evaluate(() => document.querySelector(".deck-prev").disabled);
    ok("the Previous button shows the previous slide, and is off on the first", s.id === "s1" && disabled, { s, disabled });
    ok("the address is replaced, not added to the history, so Back leaves the deck", (await page.evaluate(() => history.length)) === historyBefore);
    // Space on a link presses the link and does not move the slide.
    await page.focus(".slide.is-current a");
    await page.evaluate(() => document.querySelector(".slide.is-current a").addEventListener("click", (e) => e.preventDefault()));
    await page.keyboard.press("Space");
    s = await state(page);
    ok("Space on a link does not move the slide", s.id === "s1", s);
    // Sizes on the frame: the heading at the h1 size, points at the h2 size, small text at body-lg; the reading text size does not apply.
    await page.keyboard.press("End");
    const sizes = [];
    for (let i = 0; i < 9; i++) {
      sizes.push(await page.evaluate(() => { const sl = document.querySelector(".slide.is-current"), px = (el) => el && getComputedStyle(el).fontSize; return { id: sl.id, h: px(sl.querySelector("h1, h2")), body: px(sl.querySelector(":scope > ul:not(.cards) li, :scope > p, blockquote")), small: px(sl.querySelector("figcaption, .cards p:not(.big), td, pre, .facts")) }; }));
      await page.keyboard.press("ArrowLeft");
    }
    const wrong = sizes.filter((x) => x.h !== "52px" || (x.body && x.body !== "30px") || (x.small && x.small !== "21px"));
    ok("on every slide: the heading 52px, points and paragraphs 30px, small text 21px, on the frame", wrong.length === 0, wrong);
    ok("present mode: no script errors", errors.length === 0, errors);
    await context.close();
  }

  // Each slide fits its frame, and check's estimate is not lower than the real height. The serif heading is narrower than the estimate.
  {
    const { page, context } = await open({ width: 1280, height: 720 });
    await page.click(".present");
    const real = [];
    for (let i = 0; i < estimate.length; i++) {
      real.push(await page.evaluate(() => {
        const sl = document.querySelector(".slide.is-current"), top = sl.getBoundingClientRect().top + 64;
        const kids = [...sl.children].filter((k) => getComputedStyle(k).display !== "none" && !k.matches("details.notes"));
        const h = sl.querySelector(":scope > h1, :scope > h2"), range = document.createRange();
        range.selectNodeContents(h);
        const lineWidths = [...range.getClientRects()].map((r) => r.width);
        return { id: sl.id, height: Math.round(Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) - top), text: h.textContent, widest: Math.round(Math.max(...lineWidths)) };
      }));
      await page.keyboard.press("ArrowRight");
    }
    const over = real.filter((r) => r.height > INNER.height);
    ok(`every slide fits inside the frame's ${INNER.width} × ${INNER.height}`, over.length === 0, over);
    const under = real.map((r, i) => ({ ...r, estimate: estimate[i].height })).filter((r) => r.height > r.estimate + 2);
    ok("check's height estimate is within 2px of the real height or above it, on every slide", under.length === 0, under);
    const serif = real.map((r) => ({ ...r, estimated: Math.round(textWidth(r.text.replace(/^\d+ /, ""), 52, 600)) })).filter((r) => r.widest > Math.min(r.estimated, INNER.width) + 1);
    ok("every heading in the serif is no wider than the sans-serif estimate at weight 600", serif.length === 0, serif);
    await context.close();
  }

  // A figure on a slide: the drawing at 1.5 times, or less down to 1.25 times, the desktop form on every screen, and no words.
  for (const [width, height] of [[1920, 1080], [844, 390]]) {
    const { page, context } = await open({ width, height });
    await page.click(".present");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const fig = await page.evaluate(() => {
      const sl = document.querySelector(".slide.is-current"), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--deck-scale"));
      const shown = [...sl.querySelectorAll(".fig > svg")].filter((v) => getComputedStyle(v).display !== "none");
      const svg = shown[0], r = svg.getBoundingClientRect(), name = svg.querySelector("text.row, text.name");
      return { id: sl.id, forms: shown.map((v) => v.id), scale: Math.round((r.width / k / svg.viewBox.baseVal.width) * 1000) / 1000, words: getComputedStyle(sl.querySelector(".dg-words")).display, name: Math.round((name.getBoundingClientRect().height / k) * 10) / 10, bottom: Math.round((sl.querySelector("figure").getBoundingClientRect().bottom - sl.getBoundingClientRect().top) / k) };
    });
    ok(`${width}px screen: the figure slide shows the desktop form only, at 1.25 to 1.5 times, inside the frame, with no words`, fig.id === "s3" && fig.forms.join() === "dg-reports-by-area" && fig.scale >= 1.25 && fig.scale <= 1.5 && fig.words === "none" && fig.bottom <= 656, fig);
    const written = await page.evaluate(() => { const v = document.getElementById("dg-reports-by-area"); return Math.round((parseFloat(getComputedStyle(v).getPropertyValue("--fw")) / v.viewBox.baseVal.width) * 1000) / 1000; });
    ok(`${width}px screen: the drawing stands at the scale render wrote (${written})`, Math.abs(written - fig.scale) < 0.01, { written, shown: fig.scale });
    await page.keyboard.press("Escape");
    const after = await page.evaluate(() => { const v = document.getElementById("dg-reports-by-area"); return { width: Math.round(v.getBoundingClientRect().width), words: getComputedStyle(document.querySelector(".dg-words")).display }; });
    ok(`${width}px screen: back in the stack, the drawing keeps its real size and its words`, (width < 737 || after.width === 640) && after.words !== "none", after);
    await context.close();
  }
  // A chart whose own id is "phone" shows in present mode: the desktop form is the one render wrote the slide size on.
  {
    const { page, context } = await open({ content: build(source.replace('"id": "reports-by-area"', '"id": "phone"')) });
    await page.click(".present");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const shown = await page.evaluate(() => [...document.querySelectorAll(".slide.is-current .fig > svg")].filter((v) => getComputedStyle(v).display !== "none").map((v) => v.id));
    ok('a chart with the id "phone" shows its desktop form, and only that', shown.join() === "dg-phone", shown);
    await context.close();
  }
  // A hand-drawn figure: the deck script measures the room and sets its size, from 1.25 to 1.5 times; back in the stack it has its real size.
  {
    const hand = fs.readFileSync(path.join(root, "tests", "fixtures", "hand-fishbone.html"), "utf8").match(/<figure>[\s\S]*<\/figure>/)[0];
    const content = build(source.replace(/(<section class="slide" id="s3"[^>]*>)[\s\S]*?(<\/section>)/, `$1\n<h2>Why a report cannot be repeated</h2>\n${hand}\n$2`));
    const { page, context } = await open({ content });
    await page.click(".present");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const fig = await page.evaluate(() => { const sl = document.querySelector(".slide.is-current"), v = sl.querySelector("svg[data-drawn]"), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--deck-scale")); return { scale: Math.round((v.getBoundingClientRect().width / k / 640) * 1000) / 1000, bottom: Math.round((sl.querySelector("figure").getBoundingClientRect().bottom - sl.getBoundingClientRect().top) / k), words: getComputedStyle(sl.querySelector(".dg-words")).display }; });
    ok("a hand-drawn figure on a slide stands at 1.25 to 1.5 times, inside the frame, with no words", fig.scale >= 1.25 && fig.scale <= 1.5 && fig.bottom <= 656 && fig.words === "none", fig);
    await page.keyboard.press("Escape");
    const real = await page.evaluate(() => Math.round(document.querySelector("svg[data-drawn]").getBoundingClientRect().width));
    ok("back in the stack, the hand-drawn figure has its real size", real === 640, real);
    await context.close();
  }

  // Always light, with the more-contrast tokens, in every theme; and a palette keeps its own light colors with the darker present accent.
  {
    const colors = async (opts, label) => {
      const { page, context } = await open(opts);
      if (opts.switchDark) await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
      await page.click(".present");
      await page.keyboard.press("Home");
      const c = await page.evaluate(() => { const cs = getComputedStyle(document.body), main = getComputedStyle(document.querySelector("main")); return { bg: cs.backgroundColor, text: main.color, muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(), line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim(), scheme: getComputedStyle(document.documentElement).colorScheme }; });
      await page.screenshot({ path: `${out}/deck-present-${label}.png` });
      await context.close();
      return c;
    };
    for (const [label, opts] of [["light", {}], ["dark-system", { theme: "dark" }], ["dark-switch", { switchDark: true }], ["dark-more-contrast", { theme: "dark", contrast: "more" }]]) {
      const c = await colors(opts, label);
      ok(`present mode is light in ${label}: page, text, muted text in the text color, lines in the muted color`, c.bg === LIGHT.bg && c.text === LIGHT.text && c.muted === "#1c1f2e" && c.line === "#575d75" && c.scheme === "light", c);
    }
    const harbor = await colors({ theme: "dark", content: build(source.replace('<html lang="en" data-profile="deck">', '<html lang="en" data-profile="deck" data-palette="harbor">')) }, "harbor");
    const accent = await (async () => { const { page, context } = await open({ theme: "dark", content: build(source.replace('<html lang="en" data-profile="deck">', '<html lang="en" data-profile="deck" data-palette="harbor">')) }); await page.click(".present"); const a = await page.evaluate(() => getComputedStyle(document.querySelector(".slide.is-current a")).color); await context.close(); return a; })();
    ok("a Harbor deck in present mode: its light page, its text for muted text, and the present accent #025c87 (7:1)", harbor.bg === "rgb(246, 252, 254)" && harbor.muted === "#152225" && accent === "rgb(2, 92, 135)", { harbor, accent });
  }

  // A status word takes the text color in present mode, and only its dot the status color.
  {
    const content = build(source.replace("<p>A report form that asks for the steps gets them in most reports.</p>", '<p><span class="state err">Not fixed</span></p>'));
    const { page, context } = await open({ content });
    await page.click(".present");
    await page.evaluate(() => { const n = [...document.querySelectorAll(".slide")].findIndex((s) => s.querySelector(".state")); for (let i = 0; i < n; i++) document.querySelector(".deck-next").click(); });
    const c = await page.evaluate(() => { const st = document.querySelector(".slide.is-current .state"); return { word: getComputedStyle(st).color, dot: getComputedStyle(st, "::before").backgroundColor }; });
    ok("a status word in present mode: the word in the text color, the dot in the status color", c.word === LIGHT.text && c.dot === "rgb(207, 34, 46)", c);
    await context.close();
  }

  // Escape returns to the stack at the same slide, with the names of the stack and the focus on the Present button.
  {
    const { page, context } = await open({});
    await page.click(".present");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => { const s4 = document.getElementById("s4"), r = s4.getBoundingClientRect(); return { presenting: document.documentElement.classList.contains("presenting"), shown: [...document.querySelectorAll(".slide")].filter((s) => !s.hidden).length, top: Math.round(r.top), names: s4.getAttribute("aria-labelledby") + "|" + s4.getAttribute("role") + "|" + s4.getAttribute("aria-label") + "|" + s4.getAttribute("tabindex"), focus: document.activeElement.className, hash: location.hash }; });
    ok("Escape returns to the stack at slide 4, as it was, with the focus on the Present button", !back.presenting && back.shown === 9 && back.top >= 0 && back.top < 200 && back.names === "s4-h|null|null|null" && back.focus === "present" && back.hash === "#s4", back);
    // Present again starts at the slide in view, which is slide 4.
    // The focus is on the Present button, so Enter presents again. (A click from the test tool would scroll the page first.)
    await page.keyboard.press("Enter");
    const again = await state(page);
    ok("Present again starts at the slide in view", again.id === "s4", again);
    // Leaving the full screen with the browser's own key leaves present mode too.
    const full = await page.evaluate(async () => { const was = Boolean(document.fullscreenElement); if (was) { await document.exitFullscreen(); await new Promise((r) => setTimeout(r, 200)); } return { was, presenting: document.documentElement.classList.contains("presenting") }; });
    if (full.was) ok("leaving the full screen leaves present mode", !full.presenting, full);
    else console.log("note: this browser did not grant the full screen here; the slide filled the window");
    await context.close();
  }

  // A swipe to the left shows the next slide, to the right the previous one; a tap does nothing.
  {
    const { page, context } = await open({ width: 844, height: 390, touch: true });
    await page.click(".present");
    const swipe = (from, to) => page.evaluate(([a, b]) => {
      const main = document.querySelector("main"), t = (x) => new Touch({ identifier: 1, target: main, clientX: x, clientY: 200 });
      main.dispatchEvent(new TouchEvent("touchstart", { touches: [t(a)], changedTouches: [t(a)], bubbles: true }));
      main.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t(b)], bubbles: true }));
    }, [from, to]);
    await swipe(600, 300);
    let s = await state(page);
    ok("a swipe to the left shows the next slide", s.id === "s2", s);
    await swipe(300, 600);
    s = await state(page);
    ok("a swipe to the right shows the previous slide", s.id === "s1", s);
    await swipe(400, 404);
    s = await state(page);
    ok("a tap does not move the slide", s.id === "s1", s);
    const frame = await page.evaluate(() => { const r = document.querySelector("main").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    ok("on a phone held sideways the frame keeps 16:9 inside the screen", frame[0] <= 844 && frame[1] <= 390 && Math.abs(frame[0] / frame[1] - 16 / 9) < 0.01, frame);
    await context.close();
  }

  // Present starts at the slide the reader is at: one whose heading has scrolled away but whose body shows, or the last one at the end.
  // A link to another slide shows that slide in present mode.
  {
    const content = build(source.replace("<p>A report form that asks for the steps gets them in most reports.</p>", '<p>See <a href="#s9">the questions</a> at the end.</p>'));
    const { page, context } = await open({ width: 1280, height: 900, content });
    await page.evaluate(() => { const fig = document.querySelector("#s3 figure"); scrollTo(0, fig.getBoundingClientRect().top + scrollY - 120); });
    await page.evaluate(() => document.querySelector(".present").click());
    let s = await state(page);
    ok("Present starts at the slide whose body shows, though its heading has scrolled away", s.id === "s3", s);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 240 }); // a short window: at the end only the footer shows under the top bar
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => document.querySelector(".present").click());
    s = await state(page);
    ok("Present starts at the last slide when the reader is past it, at the footer", s.id === "s9", s);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.keyboard.press("Home");
    await page.evaluate(() => { const n = [...document.querySelectorAll(".slide")].findIndex((x) => x.querySelector('a[href="#s9"]')); for (let i = 0; i < n; i++) document.querySelector(".deck-next").click(); });
    await page.click('.slide.is-current a[href="#s9"]');
    s = await state(page);
    ok("a link to another slide shows that slide, with the address and the focus on it", s.id === "s9" && s.hash === "#s9" && s.focus && s.shown === 1, s);
    await context.close();
  }

  // Paper: one slide to a landscape page, the frame scaled to the sheet, the number at the lower right, and a figure's words on the page
  // after its slide. A4 and Letter, each with the page margin of 18mm. The browser makes the PDF, so beforeprint runs as in print.
  for (const [format, w, h] of [["A4", 297, 210], ["Letter", 279.4, 215.9]]) {
    const { page, context } = await open({ width: Math.round(((w - 36) / 25.4) * 96), height: Math.round(((h - 36) / 25.4) * 96) });
    const pdf = (await page.pdf({ format, preferCSSPageSize: true })).toString("latin1");
    const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, box = (pdf.match(/\/MediaBox\s*\[([^\]]*)\]/) || [, ""])[1].trim().split(/\s+/).map(Number);
    ok(`${format}: 10 landscape pages, one for each of the 9 slides and one for the words of slide 3`, pages === 10 && box[2] > box[3], { pages, box });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
    const paper = await page.evaluate(() => {
      const width = document.querySelector("main").clientWidth;
      return {
        width,
        slides: [...document.querySelectorAll(".slide")].map((sl) => { const r = sl.getBoundingClientRect(), kids = [...sl.children].filter((k) => getComputedStyle(k).display !== "none"); return { w: Math.round(r.width), h: Math.round(r.height), n: getComputedStyle(sl, "::after").content, over: Math.round(Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) - (r.bottom - (64 * r.width) / 1280)), heading: parseFloat(getComputedStyle(sl.querySelector("h1, h2")).fontSize) }; }),
        words: [...document.querySelectorAll(".slide-words")].map((x) => [x.previousElementSibling.id, x.querySelector("h2").textContent, x.querySelectorAll(".dg-words").length, getComputedStyle(x).breakBefore]),
        hidden: [".topbar", ".deck-nav", ".present", "footer"].map((q) => document.querySelector(q) && document.querySelector(q).getClientRects().length),
      };
    });
    const wrong = paper.slides.filter((x, i) => Math.abs(x.w - paper.width) > 1 || Math.abs(x.h - (paper.width * 720) / 1280) > 1 || x.n !== `"${i + 1} / 9"` || x.over > 1 || Math.abs(x.heading - (52 * paper.width) / 1280) > 0.5);
    ok(`${format}: each slide is the frame scaled to the sheet (${paper.width}px wide), its content inside, its number "n / 9" at the lower right`, wrong.length === 0, wrong);
    ok(`${format}: slide 3's words print on the page after it, under "Slide 3 in words"`, JSON.stringify(paper.words) === JSON.stringify([["s3", "Slide 3 in words", 1, "page"]]), paper.words);
    ok(`${format}: the top bar, the footer, the Present button and the slide buttons do not print`, paper.hidden.every((n) => !n), paper.hidden);
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    const back = await page.evaluate(() => ({ printing: document.documentElement.classList.contains("printing"), words: document.querySelectorAll(".slide .fig .dg-words").length, pages: document.querySelectorAll(".slide-words").length }));
    ok(`${format}: after printing, the words are back under their drawing`, !back.printing && back.words === 1 && back.pages === 0, back);
    await context.close();
  }
  // With scripts off, the deck prints as the stack: portrait pages, no slide form.
  {
    const { page, context } = await open({ js: false });
    const pdf = (await page.pdf({ format: "A4", preferCSSPageSize: true })).toString("latin1");
    const box = (pdf.match(/\/MediaBox\s*\[([^\]]*)\]/) || [, ""])[1].trim().split(/\s+/).map(Number);
    ok("scripts off: the deck prints as the stack, on the reader's own page", box[2] < box[3], box);
    await context.close();
  }

  // Inline code takes the slide's text size; a page saved while presenting reopens as the full stack; printing while presenting prints
  // every slide.
  {
    const content = build(source.replace("<p>A report form that asks for the steps gets them in most reports.</p>", "<p>Run <code>report check</code> before you file a report.</p>"));
    const { page, context } = await open({ content });
    await page.click(".present");
    await page.evaluate(() => { const n = [...document.querySelectorAll(".slide")].findIndex((s) => s.querySelector("p > code")); for (let i = 0; i < n; i++) document.querySelector(".deck-next").click(); });
    const code = await page.evaluate(() => [getComputedStyle(document.querySelector(".slide.is-current p > code")).fontSize, getComputedStyle(document.querySelector(".slide.is-current p")).fontSize]);
    ok("present mode: inline code takes the size of the text around it", code[0] === code[1] && code[1] === "30px", code);
    await page.emulateMedia({ media: "print" });
    const printed = await page.evaluate(() => [...document.querySelectorAll(".slide")].filter((s) => getComputedStyle(s).display !== "none").length);
    ok("printed while presenting, every slide prints", printed === 9, printed);
    await page.emulateMedia({ media: "screen" });
    const saved = await page.evaluate(() => document.documentElement.outerHTML);
    await context.close();
    const again = await open({ content: `<!doctype html>${saved}` });
    const stack = await again.page.evaluate(() => [...document.querySelectorAll(".slide")].map((s) => [s.hidden, s.getAttribute("role"), s.getAttribute("aria-label"), s.getAttribute("aria-labelledby"), s.querySelectorAll(".slide-n").length].join("|")));
    ok("a page saved while presenting reopens as the full stack, with the names of the stack and each number once", stack.every((x, i) => x === `false|||s${i + 1}-h|${i ? 1 : 0}`), stack);
    await again.context.close();
  }

  // axe in present mode, light.
  {
    const { page, context } = await open({});
    await page.click(".present");
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
    ok("present mode: 0 axe violations", result.violations.length === 0, result.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].target.join(" ")}`));
    await context.close();
  }

  await browser.close();
  fs.rmSync(file, { force: true });
  console.log(failed ? `${failed} deck browser check(s) failed (${engine})` : `all deck browser checks passed (${engine})`);
  process.exitCode = failed ? 1 : 0;
})();
