// Funnels: the steps of one flow, with how many reached each step and how many left between two steps. Each step is a row
// with a bar from 0, on one scale that ends at the first step's count, so every bar starts at the same left edge. The part
// that a step lost follows its bar as a soft gray block, up to the length of the bar above, with the drop written over it.
// It is never a funnel shape: a narrowing shape makes a drop look larger than it is. A drop is not a status, so a funnel
// has no color, and no drop is marked as the largest. The author writes the counts; every drop and share is computed here.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrapName, NO_SPACES, WIDE, PHONE } = require("./range.cjs");
const { valueWidth, num } = require("./scale.cjs");

const MOST = { steps: 8, name: 28, unit: 20, word: 200, count: 999999999 };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** A count as written: a comma every three digits, and every digit. */
const comma = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * part ÷ whole as a whole percent, a half rounded up, in whole-number arithmetic so no rounding error moves a half. A share
 * above 0 that would round to 0%, or below 100 that would round to 100%, keeps one decimal, so a small share stays honest.
 */
function share(part, whole) {
  if (part === 0) return "0%";
  if (part === whole) return "100%";
  const whole100 = Math.floor((part * 200 + whole) / (2 * whole));
  if (whole100 > 0 && whole100 < 100) return `${whole100}%`;
  if (whole100 === 0 && part * 1000 < whole) return "under 0.1%";
  if (whole100 === 100 && part * 1000 > whole * 999) return "over 99.9%";
  return `${Math.floor((part * 2000 + whole) / (2 * whole)) / 10}%`;
}

/** Checks funnel data and returns the model, with every drop and share computed from the counts. */
function readFunnel(data) {
  if (data.place != null && data.place !== "flow") fail(`a funnel sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a funnel has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  if (data.scale != null) fail(`a funnel has no "scale"; its bars always run from 0 to the count of the first step`);
  if (data.rows != null) fail(`a funnel has no "rows"; write each step in "steps", with its "count"`);
  if (data.groups != null) fail(`a funnel has no "groups"; to compare two groups, write one funnel for each`);
  if (!Array.isArray(data.steps)) fail(`"steps" must be a list of 2 to ${MOST.steps} steps, in the order people take them`);
  if (data.steps.length < 2 || data.steps.length > MOST.steps) fail(`a funnel has 2 to ${MOST.steps} steps; this one has ${data.steps.length}`);
  if (data.unit == null || data.unit === "") fail(`a funnel needs a "unit": what each count counts, such as "people" or "sessions"`);
  const unit = words(data.unit, `the unit of the funnel`, MOST.unit);
  const steps = [];
  data.steps.forEach((st, i) => {
    if (!st || typeof st !== "object" || Array.isArray(st)) fail(`step ${i + 1} must be an object with a "name" and a "count"`);
    const name = words(st.name, `the name of step ${i + 1}`, MOST.name);
    // A word of a script written with spaces stays whole on its line, so it must fit the name column.
    for (const word of name.split(" ")) {
      const w = textWidth(word, 14);
      if (w > MOST.word && !NO_SPACES.test(word)) fail(`the name of step ${i + 1} has the word "${word}", ${Math.ceil(w)}px wide at 14px; a word in a step name fits in ${MOST.word}px. Shorten it, or split it with a space`);
    }
    const what = `step ${i + 1} ("${name}")`;
    if (st.state != null) fail(`${what} has a "state"; a funnel has none. The drop is written in numbers, and green, amber and red mean status only`);
    if (st.note != null) fail(`${what} has a "note"; a funnel step has none. Write a remark about a step in the text beside the figure`);
    if (st.count == null) fail(`${what} has no "count"; give it the number who reached this step`);
    const c = st.count;
    if (typeof c !== "number" || !Number.isInteger(c) || c < 0) fail(`${what} has "count": ${JSON.stringify(c)}; a count is a whole number from 0 to ${comma(MOST.count)}`);
    if (c > MOST.count) fail(`${what} has ${comma(c)}; a count is at most ${comma(MOST.count)}. Count in thousands, and say so in "unit", such as "thousand visits"`);
    const before = steps[i - 1];
    if (!before && c === 0) fail(`${what} has 0; a funnel starts with at least 1, because every share is a share of the first step`);
    if (before && before.count === 0) fail(`${what} comes after a step with 0; end the funnel at the first step with 0`);
    if (before && c > before.count) fail(`${what} has ${comma(c)}, and step ${i} ("${before.name}") has ${comma(before.count)}; no step has more than the step before. When people can start at a later step, they skip a step, and a funnel cannot show that: use a table`);
    const first = steps.length ? steps[0].count : c;
    const drop = before ? before.count - c : null;
    steps.push({ name, count: c, written: comma(c), ofFirst: share(c, first), drop, dropShare: before ? share(drop, before.count) : null, dropText: before ? `${drop ? "−" : ""}${comma(drop)} (${share(drop, before.count)})` : null });
  });
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "funnel", unit, steps };
}

/** The drawing: 640px wide with the names, counts and shares in columns at the left, or 264px wide with each name above its bar. */
function drawFunnel(model, phone = false) {
  const { steps } = model;
  const W = phone ? PHONE : WIDE;
  const s = { form: "funnel", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [], clamped: false };
  const name = (str, room) => wrapName(str, room, { size: 14, weight: 400, every: false });
  const countW = Math.max(...steps.map((st) => valueWidth(st.written)));
  const shareW = Math.max(...steps.map((st) => valueWidth(st.ofFirst)));

  // One line above the bars says what they count and the base of each share: the share beside a count is of the first step,
  // and the share in a drop is of the step before. It wraps at its spaces.
  // Two sentences, each on lines of its own. A no-break space keeps "from 0" together.
  const head = [`${cap(model.unit)} at each step, bars from\u00a00.`, "Beside each count, its share of the first step; in each drop, its share of the step before."].flatMap((t) => wrapName(t, W - 40, { size: 12, weight: 400, every: false }));
  head.forEach((line, i) => s.notes.push({ x: 20, y: 24 + i * 16, s: line, cls: "sub", anchor: "start" }));
  const top = 24 + (head.length - 1) * 16 + 12;

  let x0, x1, countX, shareX, room;
  if (phone) {
    [x0, x1] = [20, W - 20];
    shareX = x1;
    countX = shareX - shareW - 8;
    room = x1 - x0 - Math.ceil(countW + 8 + shareW) - 12; // the room for a name beside its numbers
  } else {
    const nameW = Math.max(...steps.map((st) => Math.max(...name(st.name, MOST.word).map((l) => textWidth(l, 14)))));
    countX = 20 + nameW + 16 + countW;
    shareX = countX + 12 + shareW;
    [x0, x1] = [Math.ceil(shareX + 16), W - 20];
  }
  const per = (x1 - x0) / steps[0].count;
  // A count above 0 is never drawn narrower than 2px, so it shows; its numbers give the exact count. A count of 0 has no bar.
  const ends = steps.map((st) => {
    if (!st.count) return x0;
    if (st.count * per < 2) s.clamped = true;
    return x0 + Math.max(2, st.count * per);
  });

  let y = top + 8;
  steps.forEach((st, i) => {
    // Each step after the first has a 16px gap above it, which holds its drop and nothing else.
    if (i) {
      y += 16;
      const w = valueWidth(st.dropText);
      // On a phone the drop stands a little nearer the name below it, so it reads as part of that step.
      s.notes.push({ x: Math.min(ends[i], W - 12 - w), y: y - (phone ? 2 : 4), s: st.dropText, cls: "val", anchor: "start" });
    }
    let cy;
    if (phone) {
      // The name stands on its own line, with its numbers at the right of its first line. When the name needs more than two
      // lines there, or a word is wider than the room, the numbers go on their own line under it, and the name takes the width.
      let lines = name(st.name, room), numbersY;
      if (lines.length > 2 || lines.some((l) => textWidth(l, 14) > room)) {
        lines = name(st.name, x1 - x0);
        numbersY = y + 16 + lines.length * 18;
      } else numbersY = y + 16;
      lines.forEach((line, k) => s.notes.push({ x: 20, y: y + 16 + k * 18, s: line, cls: "row", anchor: "start" }));
      s.notes.push({ x: countX, y: numbersY, s: st.written, cls: "val", anchor: "end" }, { x: shareX, y: numbersY, s: st.ofFirst, cls: "val", anchor: "end" });
      y = Math.max(numbersY, y + 16 + (lines.length - 1) * 18) + 2; // under the last line of text
      cy = y + 14;
      y += 24;
    } else {
      // The bar stands on the line of the name's first line; a name that wraps makes its row taller.
      const lines = name(st.name, MOST.word);
      cy = y + 16;
      lines.forEach((line, k) => s.notes.push({ x: 20, y: cy + 5 + k * 18, s: line, cls: "row", anchor: "start" }));
      s.notes.push({ x: countX, y: cy + 4, s: st.written, cls: "val", anchor: "end" }, { x: shareX, y: cy + 4, s: st.ofFirst, cls: "val", anchor: "end" });
      y += 32 + (lines.length - 1) * 18;
    }
    // The lost part: from the end of this bar to the end of the bar above. One narrower than 2px is not drawn; its number still is.
    // It starts 4px under the kept bar, which is drawn over it, so the two join without a gap and the bar keeps its whole outline.
    const from = Math.max(x0, ends[i] - 4);
    let svg = i && ends[i - 1] - ends[i] >= 2 ? `<rect x="${num(from)}" y="${num(cy - 8)}" width="${num(ends[i - 1] - from)}" height="16" rx="4" class="f-lost"/>` : "";
    if (st.count) svg += `<rect x="${num(x0)}" y="${num(cy - 8)}" width="${num(ends[i] - x0)}" height="16" rx="4" class="r-bar"/>`;
    s.parts.push({ id: st.name, svg, texts: [] });
  });
  s.bands.push({ x: 8, y: top, w: W - 16, h: y + 8 - top });
  s.h = y + 16;
  return s;
}

/** Each pair of steps in a list, as words: between "A" and "B", and between "C" and "D". */
const pairs = (model, at) => at.map((i) => `"${esc(model.steps[i - 1].name)}" and "${esc(model.steps[i].name)}"`).join(", and between ");

/** The steps in words: a table with both shares, and lines that name where the most people, and the largest share, left. */
function wordsOf(model, scene, phone) {
  const { steps } = model;
  const head = `<tr><th scope="col">Step</th><th scope="col">${esc(cap(model.unit))}</th><th scope="col">Share of the first step</th><th scope="col">Left since the step before</th><th scope="col">Share of the step before</th></tr>`;
  const body = steps.map((st, i) => `<tr><th scope="row">${esc(st.name)}</th><td>${st.written}</td><td>${st.ofFirst}</td>${i ? `<td>${comma(st.drop)}</td><td>${st.dropShare}</td>` : '<td colspan="2">first step</td>'}</tr>`).join("");
  const first = steps[0], last = steps[steps.length - 1];
  const lines = [`Of ${first.written} ${esc(model.unit)} at the first step, ${last.written} reached the last step: ${last.ofFirst}.`];
  const later = steps.map((st, i) => i).slice(1);
  const most = Math.max(...later.map((i) => steps[i].drop));
  if (!most) lines.push("No one left between two steps.");
  else {
    // The largest share is compared exactly, as drop ÷ count before, by cross-products. They reach about 10^18, past the safe
    // range of a number, so they are BigInts.
    const larger = (i, j) => { const d = BigInt(steps[i].drop) * BigInt(steps[j - 1].count) - BigInt(steps[j].drop) * BigInt(steps[i - 1].count); return d > 0n ? 1 : d < 0n ? -1 : 0; };
    const byCount = later.filter((i) => steps[i].drop === most);
    const top = later.reduce((best, i) => (larger(i, best) > 0 ? i : best), later[0]);
    const byShare = later.filter((i) => larger(i, top) === 0);
    if (byCount.join() === byShare.join()) lines.push(`The most ${esc(model.unit)}, and the largest share, left between ${pairs(model, byCount)}: ${comma(most)}, ${steps[byCount[0]].dropShare} of the step before.`);
    else lines.push(`The most ${esc(model.unit)} left between ${pairs(model, byCount)}: ${comma(most)}.`, `The largest share left between ${pairs(model, byShare)}: ${steps[byShare[0]].dropShare} of the step before.`);
  }
  lines.push(scene && (scene.clamped || (phone && phone.clamped)) ? "The bars are to scale, from 0, except that a bar narrower than 2px is drawn 2px wide, so it shows." : "The bars are to scale, from 0.");
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readFunnel, drawFunnel, wordsOf, share, comma, MOST };
