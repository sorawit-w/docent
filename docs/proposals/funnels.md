# Proposal: the funnel — how many people reach each step, and where they leave

Status: **proposed**. Its questions are settled in "Decisions" near the end, each with its reason, for the user to review. No code is written. It follows the approved proposals [`scale-charts.md`](scale-charts.md) and [`two-dimensional-layouts.md`](two-dimensional-layouts.md), and it reuses their numeric scale.

## The answer first

Build one new kind, `"kind": "funnel"`. A funnel shows the steps of one flow, such as the sign-up of a public app, with how many people reach each step, and how many leave between two steps. The author writes only the steps and their counts. The renderer computes every percentage and every drop, so the numbers always agree with each other.

The drawing is **not a funnel shape**. Each step is a row with a bar that starts at 0, on one scale for all rows, so the bars share a left edge and their lengths can be compared. The part that a step lost is drawn as a light outline after its bar, up to the length of the bar above. The drop is written over that outline as a number and a share: `−4,120 (50%)`. The drawing uses the page tokens only. Nothing is red, because a drop is not a status.

The phone form is the same rows, 264px wide. Each step name stands on its own line with its numbers at the right, and its bar runs under it across the full width. Within the limits, a funnel is never refused for its width, on a phone or on a desktop: the numbers move to their own line when a name needs the room.

| # | Pull request | Size |
|---|---|---|
| 1 | The funnel kind: data, both forms, the table in words, the fit warnings, the docs | Medium |
| 2 | One funnel on the sample page, about bug reports, so the kind is tested in a document | Small |

## The obvious answers that would be wrong

**A funnel shape: a stack of trapezoids that gets narrower.** Most people think of this picture when they hear the word "funnel", and most chart tools draw it. It misleads in three ways. First, the reader compares areas, and an area grows with the square of the width, so a drop looks larger than it is. Second, the slope between two steps makes the loss look as if it happened slowly inside a step, when it happened between steps. Third, the shapes are centred, so no two edges align, and the eye cannot compare two lengths that do not start at the same place.

**A Sankey diagram: bands that split off to show where people went.** It claims to know where each person went next. Funnel data does not know that: it knows only how many people reached each step. A Sankey diagram also needs curves, a width for each band, and usually a color for each path. Docent has no rules for any of these.

**A third answer, almost right: write the funnel as a range chart, with each row from 0 to its count.** It would draw bars today, with no new code. But a range chart has no order, so nothing says that the rows are steps. It computes no drop and no percentage, so the author would write them by hand, and they could be wrong. And the range chart's own docs say "for amounts compared by size from zero, use a table". Section 2 compares this answer with the others.

---

## 1. The reader's question

**The question:** *Where do people drop out of this flow, and how many?* For example: of everyone who opened the sign-up page in May, how many finished? Which step lost the most people, and which step lost the largest share of the people who reached it?

**Use it when** one flow has 3 to 8 steps, every person takes them in the same order, and the author has a count for each step.

**Do not use it** in these cases:

| The reader needs | Use |
|---|---|
| Two steps only ("4,120 of 12,480 people confirmed the email") | A sentence |
| Paths that split, steps that people can skip, or people who go back | A flowchart (`"kind": "flow"`), with the counts in the notes, or a table |
| The same funnel for two groups, such as phone and desktop | Two funnels, or a table; see decision 5 |
| A count over time, such as sign-ups each week | A table |
| Who does what in the flow | A workflow (no `"kind"`) |

## 2. The kind

Three ways were weighed:

| | A new kind, `"funnel"` | Counts added to a flowchart or a workflow | A range chart with rows from 0 |
|---|---|---|---|
| What the reader sees | Bars on one scale, and each drop as a number | Numbers in the notes of plates. No lengths, so no picture of the loss | Bars on one scale, and no drops |
| Drops and percentages | Computed by the renderer, so they always agree | Written by hand in each note, so they can disagree | Written by hand, if at all |
| What `check` can test | Counts that never go up, a first count above 0 | Nothing about the counts | Nothing about the counts |
| The order of the steps | The order of the data, top to bottom | The order of the legs | Rows have no order |
| Cost | A small new file. It reuses the scale, the bar and the two forms of the range chart | A scale inside a layout of lanes and arrows breaks the spacing rules of both | No code, but a misuse of a kind that says it is not for this |

**Decision: a new kind.** The reader asks about amounts, and only a scale can show amounts. A flowchart answers "which path", not "how many", and its plates have no lengths. A range chart has the right bars and the wrong rules. A new kind costs little, because the funnel is a scale chart: it joins the range chart, the layout to scale and the plan in `renderScaleChart`, with the same two forms and the same table in words.

The name `"funnel"` is the word that report writers already use for this data. The risk is that the name makes an author expect the funnel shape. `DESIGN.md` and `diagrams.md` say plainly that the drawing is bars (section 8). See decision 1.

---

## 3. The data

The worked example: the sign-up of a public app, in one month.

```json
{
  "id": "signup-may",
  "kind": "funnel",
  "label": "Of 12,480 people who opened the sign-up page in May, 1,860 finished the sign-up: 15%. The largest number left before the form: 4,240. The largest share left at the email check: half of the people who filled in the form did not confirm their email.",
  "unit": "people",
  "steps": [
    {"name": "Open the sign-up page", "count": 12480},
    {"name": "Fill in the form", "count": 8240},
    {"name": "Confirm the email", "count": 4120},
    {"name": "Choose a plan", "count": 2900},
    {"name": "Finish the sign-up", "count": 1860}
  ]
}
```

| Field | Needed | What it is |
|---|---|---|
| `steps` | yes | 2 to 8 steps, in the order people take them, top to bottom. Each has a `name` (at most 28 characters, as a row of a range chart) and a `count`. |
| `count` | yes, in each step | How many reached this step: a whole number from 0 to 999,999,999. The first count is at least 1. No count is more than the count before it. |
| `unit` | yes | What each count counts, as a plural noun of at most 20 characters, such as `people`, `sessions`, `orders` or `bug reports`. It starts the line above the bars and heads a column of the table in words. |

`id` and `label` are needed, as for every kind. The `label` should say the result in words: how many started, how many finished, and where the most were lost. A funnel has no `scale`: its scale always runs from 0 to the first count. It has no ticks and no named marks, because every bar carries its own number.

A step has no `note`. A remark about a step, such as "the form was new in May", goes in the text beside the figure. This keeps the phone form simple. It can be added later if real reports need it.

### What the author writes, and what the renderer computes

The author writes the counts. The renderer computes three numbers for each step after the first, and one for the whole funnel:

| Number | How | In the example, step 3 ("Confirm the email") |
|---|---|---|
| The drop | the count before, minus this count | 8,240 − 4,120 = 4,120 |
| The share of the step before that left | the drop ÷ the count before | 4,120 ÷ 8,240 = 50% |
| The share of the first step that is still here | this count ÷ the first count | 4,120 ÷ 12,480 = 33% |
| Overall, for the whole funnel | the last count ÷ the first count | 1,860 ÷ 12,480 = 15% |

**Two shares, two bases.** The share beside each bar is a share of the first step: it says how much of the start is left. The share in each drop is a share of the step before: it says how badly this one step loses people. Report readers need both. The first base alone hides a bad late step: in 1,000 → 500 → 100 → 50, the last drop is only 5% of the start, but it loses half of the people who reached it. The line above the bars names both bases once (section 4). See decision 3.

**Rounding.** Every share is rounded to a whole percent, and a half rounds up. Three exceptions keep a small share honest:

- A share above 0 that would round to 0% is written with one decimal, such as `0.4%`. Below 0.1%, it is written `under 0.1%`.
- A share below 100 that would round to 100% is written with one decimal, such as `99.6%`. Above 99.9%, it is written `over 99.9%`.
- A share that is exactly 0 or 100 is written `0%` or `100%`.

The drawing and the table in words use the same written values, so `check` can compare them. The bars use the exact counts, never the rounded ones.

**Counts as written.** A count is written with a comma every three digits from 1,000 up: `1,860`, `12,480`, `999,999,999`. Every digit stays; a funnel never writes `12.5k`. A drop has a minus sign, not a hyphen: `−4,120`. See decision 7.

### When a count goes up, or the data does not add up

In a funnel, each person who reaches a step has passed every step before it. So **no count can be more than the count before it.** When one is, the data is not a funnel. People started at a later step, or the counts come from different weeks, or the author counted events and not people. The renderer cannot tell which. So `render` refuses the funnel and says which step went up. It does not draw a drop with a plus sign, because that would claim something the data cannot support. See decision 4.

Two equal counts are allowed. The drop is written `0 (0%)`, and the row has no lost part.

A count of 0 is allowed: everyone has left. Steps after a 0 are refused, because every share of the step before would divide by 0.

### The limits

- 2 to 8 steps. Two steps get a fit warning (section 7).
- A step name has at most 28 characters, and no word in it is wider than 200px at 14px (about 27 small letters). The unit has at most 20 characters.
- Counts are whole numbers from 0 to 999,999,999. The first is at least 1. No count is more than the count before it.
- One flow, one path. No branches, no skipped steps, no loops (section 9 says why).

### The error messages

Each message names the field and says what to change. Text limits use the message that every kind uses already (`the name of step 3 is 31 characters long; the most is 28: "..."`).

- `"steps" must be a list of 2 to 8 steps, in the order people take them`
- `a funnel has 2 to 8 steps; this one has 9`
- `the name of step 2 has the word "Anmeldebestätigungsformular", 204px wide at 14px; a word in a step name fits in 200px. Shorten it, or split it with a space or a hyphen`
- `step 2 ("Fill in the form") has no "count"; give it the number who reached this step`
- `step 3 ("Confirm the email") has "count": 4120.5; a count is a whole number from 0 to 999,999,999`
- `step 1 ("Open the sign-up page") has 1,200,000,000; a count is at most 999,999,999. Count in thousands, and say so in "unit", such as "thousand visits"`
- `step 1 ("Open the sign-up page") has 0; a funnel starts with at least 1, because every share is a share of the first step`
- `step 3 ("Confirm the email") has 8,600, and step 2 ("Fill in the form") has 8,240; no step has more than the step before. When people can start at a later step, they skip a step, and a funnel cannot show that: use a table`
- `step 5 ("Finish the sign-up") comes after a step with 0; end the funnel at the first step with 0`
- `a funnel needs a "unit": what each count counts, such as "people" or "sessions"`
- `step 3 ("Confirm the email") has a "state"; a funnel has none. The drop is written in numbers, and green, amber and red mean status only`
- `a funnel has no "scale"; its bars always run from 0 to the count of the first step`
- `a funnel has no "rows"; write each step in "steps", with its "count"`
- `a funnel has no "groups"; to compare two groups, write one funnel for each`
- `a funnel has no "form"; the renderer draws it 640px wide, and 264px wide on a phone`
- `a funnel sits in the text flow; "place" must be "flow"`

The `state` message is there because an author who wants the large drop in red will try it. The message says why not.

---

## 4. The drawing

### Rules that both forms keep

- **The three layers.** The well is the ground. All steps share one band in the page color. The bars sit on it.
- **One scale, from 0.** Every bar starts at the same left edge, which is 0. The scale ends at the first count, so the first bar fills the room. A bar's length is its exact count times the pixels per unit.
- **The kept bar** is the bar of a range chart: the page color inside, a text-color outline of 1.5px, corners of 4px, 16px high. A count above 0 is never drawn narrower than 2px, so it shows; its numbers give the exact count. A count of 0 has no bar. See decision 2.
- **The lost part** is drawn on the same row, from the end of the kept bar to the end of the bar above it: the same shape, with no fill and a 1px outline in the outline color. So the kept bar and the lost part together are as long as the bar above, and the reader sees what each step kept and what it lost. A lost part narrower than 2px is not drawn; its number still is.
- **The drop** is written in the 16px gap above its row, in 12px muted text with tabular figures: `−4,120 (50%)`. It starts at the left end of the lost part, so it stands over the part it describes. When it would pass the right edge of the drawing (12px in), it moves left until it fits. The gap holds nothing else, so the drop never meets another label, and the renderer never has to refuse a funnel for a label with no room.
- **The counts and the shares of the first step** stand in two columns of 12px muted text with tabular figures, each right-aligned, so their digits align. The first step shows `100%`, so the reader sees the base of that column.
- **One line above the bars**, in 12px muted text, says what they count and how to read the shares: `People at each step, bars from 0. Each drop is a share of the step before.` The unit starts the line, with its first letter made a capital.
- **Text at real size.** A step name is 14px, weight 400, as a row of a range chart, because 8 bold names are heavy.
- **No ticks.** Every bar carries its count, so ticks would repeat the numbers. With no grid lines, nothing can be mistaken for the outline of a lost part.
- **No color, no state, no dot, nothing dashed, no icons.** A drop is not a status, so it is never red or amber. A funnel has an order, but nothing moves: the order is top to bottom, and the reader reads it there. Docent's dot means "where you are now", and a funnel has no "now".
- **No mark for the largest drop.** The step that loses the most people and the step that loses the largest share are often not the same step. In the example they are steps 2 and 3. A bold or marked drop would pick one meaning without saying so. The table in words names both (section 5). See decision 6.

### Desktop and paper (640px)

Each step is one row of 32px: the name at the left, then the two columns of numbers, then the bar. Each step after the first has its 16px drop gap above its row.

The sizing rule:

1. The name column starts at x = 20. Its width is the widest name at 14px, up to 200px. A wider name wraps at its spaces onto a second line, and its row grows by 18px. A name written without spaces, as in Thai or Chinese, breaks between characters. A name of 28 Chinese characters is 392px, so it takes 2 lines.
2. The count column ends 16px after the name column, plus the widest count. The share column ends 12px after that, plus the widest share.
3. The bars start 16px after the share column, at x0, and end at x1 = 620. The first count fills x0 to x1.

The narrowest bar room comes from the widest names and counts the limits allow: a name column of 200px, the count `999,999,999` (79px) and the share `100%` (37px). Then x0 = 20 + 200 + 16 + 79 + 12 + 37 + 16 = 380, rounded up to 381, and the bars have 239px. The widest drop text, `−999,999,999 (100%)`, is 141px, so it always fits. **So no data within the limits is refused on a desktop for its width.**

**The worked example.** The widest name, "Open the sign-up page", is 153px. The widest count, `12,480`, is 43.6px. The widest share, `100%`, is 36.8px.

- x0 = 20 + 153 + 16 + 43.6 + 12 + 36.8 + 16 = 297.4, rounded up to 298.
- The bars have 620 − 298 = 322px for 12,480 people: 0.0258px per person.

| Step | Count | Share of first | Kept bar | Lost part | Drop text, at x |
|---|---|---|---|---|---|
| Open the sign-up page | 12,480 | 100% | 322.0px | — | — |
| Fill in the form | 8,240 | 66% | 212.6px | 109.4px | `−4,240 (34%)`, 511 |
| Confirm the email | 4,120 | 33% | 106.3px | 106.3px | `−4,120 (50%)`, 404 |
| Choose a plan | 2,900 | 23% | 74.8px | 31.5px | `−1,220 (30%)`, 373 |
| Finish the sign-up | 1,860 | 15% | 48.0px | 26.8px | `−1,040 (36%)`, 346 |

The first drop text is 90px wide. At x = 510.6 it would end at 600.6, inside the edge (628), so it stands at 511. The line above the bars is 422px, so it fits on one line. The drawing is about 280px tall: 40px for the line above and the band's top, 32px for the first row, 48px for each of the other four, and 16px below.

The two large lost parts, 109px and 106px, are easy to see. The drop text tells the reader that the second is the worse step: it lost 50% of the people who reached it, not 34%.

### The phone (264px)

A funnel is one column of rows, so it keeps its picture on a phone. Only the place of the numbers changes, because a 240px row cannot hold a name column, two number columns and a bar side by side.

- The step name stands on its own line at x = 20, at 14px. The count and the share stand at the right of the name's first line, right-aligned in their two columns, ending at x = 244.
- The name wraps at its spaces in the room left of the numbers, with 12px between. When it needs more than 2 lines there, the numbers go on their own line under the name, still right-aligned. A name written without spaces, as in Thai or Chinese, breaks between characters, as on a plan.
- The bar runs under the name, from x0 = 20 to x1 = 244: 224px for the first count. Each bar strip is 24px.
- The drop stands in its 16px gap above the step's name, at the left end of the lost part, as on a desktop.
- The line above the bars wraps onto 2 lines.

**The worked example.** The numbers take 43.6 + 8 + 36.8 = 88.4px, rounded up to 89. So a name has 224 − 89 − 12 = 123px beside them. "Open the sign-up page" (153px) wraps onto 2 lines; the other names fit on 1. The bars have 224px for 12,480 people: 0.0179px per person.

| Step | Name lines | Kept bar | Lost part | Drop text, at x |
|---|---|---|---|---|
| Open the sign-up page | 2 | 224.0px | — | — |
| Fill in the form | 1 | 147.9px | 76.1px | `−4,240 (34%)`, 162 |
| Confirm the email | 1 | 73.9px | 73.9px | `−4,120 (50%)`, 94 |
| Choose a plan | 1 | 52.1px | 21.9px | `−1,220 (30%)`, 72 |
| Finish the sign-up | 1 | 33.4px | 18.7px | `−1,040 (36%)`, 53 |

The first drop text would start at 167.9 and end at 257.9, past the edge (252), so it moves left to 162. The drawing is about 364px tall.

**The worst case.** With the count `999,999,999`, the numbers take 79 + 8 + 37 = 124px, and a name has 88px beside them. A long name may then need more than 2 lines there, so its numbers go to their own line, and the name gets the full 224px. The row grows by 18px. A name of 28 Chinese characters takes 2 lines in 224px. Nothing within the limits is refused.

**The smallest bars.** A funnel from 12,480 to 62 people (0.5%) gives a last bar of 1.1px on a phone. It is drawn 2px wide, so it shows, and `62` and `0.5%` stand beside the name. The bar is about 1px too long. This is the one place where the drawing is not exactly to scale, and the numbers next to it are exact.

---

## 5. Paper, dark mode, and the diagram in words

**Paper.** The 640px form prints at its real size, as a range chart does: an A4 figure well holds about 641.6px. Eight steps come to about 424px tall, below the kit's cap of 220mm (about 831px). The phone form never prints.

**Dark mode.** The funnel uses the classes of the range chart (`row` for a step name, `val` for counts, shares and drops, `sub` for the line above, `r-bar` for a kept bar) and one new class, `f-lost`, for the lost part: no fill, and a 1px stroke in the outline token. It adds no color. `svg.cjs` writes the styles for each scale chart by its form, so the funnel joins that list. The outline token has low contrast on the page: 1.40:1 in light mode and 1.43:1 in dark mode. That is accepted here, as it is for grid lines: the lost part only repeats what its number says in text, and the text meets AA.

**The diagram in words** is a table in the closed section under the drawing:

| Step | People | Share of the first step | Left since the step before | Share of the step before |
|---|---|---|---|---|
| Open the sign-up page | 12,480 | 100% | first step | |
| Fill in the form | 8,240 | 66% | 4,240 | 34% |
| Confirm the email | 4,120 | 33% | 4,120 | 50% |
| Choose a plan | 2,900 | 23% | 1,220 | 30% |
| Finish the sign-up | 1,860 | 15% | 1,040 | 36% |

The second column is headed by the unit, with its first letter made a capital. In the first row, "first step" spans the last two cells. Under the table, three lines, computed from the counts:

- "Of 12,480 people at the first step, 1,860 reached the last step: 15%."
- "The most people left between "Open the sign-up page" and "Fill in the form": 4,240."
- "The largest share left between "Fill in the form" and "Confirm the email": 50% of the step before."

When the two are the same pair of steps, they become one line: "The most people, and the largest share, left between "A" and "B": 4,240, 34% of the step before." When two drops are equal, the line names each pair, in order. When no step loses anyone, the last two lines become "No one left between two steps." A last line says "The bars are to scale, from 0."

---

## 6. What it reuses, and what is new

| From | What the funnel reuses |
|---|---|
| `scale.cjs` | `makeScale` for `x(count)`, with a scale from 0 to the first count and no step, so it makes no ticks. `valueWidth` and `num` for the numbers. `readScale` is not used: the author writes no scale. |
| `range.cjs` | `wrapName` for the step names on a phone and for the line above. It already takes the size, the weight and the break rule. The kept bar is the range chart's bar (`r-bar`). |
| `blocks.cjs` | `fail`, `words` and `id`, for every check of the data |
| `svg.cjs` | The styles for `row`, `val`, `sub` and `r-bar`. The funnel joins the list of forms that get them, and adds `f-lost`. |
| `diagram.cjs` | `renderScaleChart`: the two forms, the swap between them, and the table in words. The funnel joins it as a fourth kind, with no change to the function. |
| `fit.cjs` | The fit warnings, as three more lines |

**New,** in `scripts/lib/funnel.cjs`:

- Reading the data: the steps, the counts and their order, the unit, and the refused fields.
- The two formats: a count with commas, and a share rounded by the rules in section 3.
- The two forms, with the sizing rule in section 4.
- The table in words, and its three lines.

The formats live in `funnel.cjs`, because no other kind uses them. They move to `scale.cjs` only when a second kind needs them.

---

## 7. What `render`, `check` and the fit warnings do

**`render`** reads the data, draws both forms, and writes the table in words. It refuses a funnel with any of the errors in section 3. Within the limits, no funnel is refused for its width. It reports the form, as for the other kinds: `render doc.html: diagram 3 ("signup-may") drawn as funnel`.

**`check`** tests what it tests for every kind:

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- The data passes every rule in section 3.

**Fit warnings,** as in `fit.cjs`. They never change the drawing:

- `the funnel has 2 steps; a sentence says this more simply`
- `no step loses anyone; a sentence says this more simply`
- `the last step keeps 96% of the first, so the bars look almost the same; a table shows small drops better`. It shows when the last count is at least 95% of the first, and some step loses someone. At 95%, the whole loss is at most 11px on a phone, too little to see.

---

## 8. Changes to `SKILL.md`, `DESIGN.md` and `diagrams.md`

**`SKILL.md`, the table of the reader's questions.** One new row, after the row of the range chart:

| The reader asks | Write |
|---|---|
| How many people reach each step of a flow, and where do they leave? | A funnel (`"kind": "funnel"`), for 3 to 8 steps that everyone takes in one order; a sentence for 2 |

**`DESIGN.md`, in Layout, after "Plans."** One new paragraph:

> **Funnels.** A funnel shows how many people reach each step of one flow, and how many leave between two steps. Each step is a row with a bar that starts at 0, on one scale that ends at the first step's count, so every bar starts at the same left edge and the lengths can be compared. A funnel is never drawn as a funnel shape or as bands that split: a narrowing shape makes a drop look larger than it is. A kept bar is the bar of a range chart. The part that a step lost follows it on the same row, up to the length of the bar above, as a 1px outline in the outline color with no fill. The drop is written above that part in numbers: the count, and its share of the step before. The counts and their shares of the first step stand in two columns of tabular figures beside the names. A drop is not a status, so a funnel has no color, no state and no dot, and the renderer marks no drop as the largest. One line above the bars says what they count and how to read the shares. It keeps the range chart's two forms, 640px and 264px, and its steps are also written as a table under the drawing.

No other part of `DESIGN.md` changes. The rule "green, amber and red mean status only" already forbids a red drop, and the funnel adds no token.

**`diagrams.md`.** A new section "Funnels", after "Plans", with the worked example, the field table, and the rules in sections 3, 4 and 7. One sentence in "Range charts" changes, because it is no longer true:

- Now: "For amounts compared by size from zero, use a table; Docent has no bar chart."
- New: "For amounts compared by size from zero, use a table. Docent has one bar chart, the funnel, for the steps of one flow."

Under "What the renderer says", the three fit warnings join the list.

---

## 9. Phases, and what is out of scope

1. **The funnel kind.** `scripts/lib/funnel.cjs`; the dispatch in `diagram.cjs`; the styles in `svg.cjs`; the fit warnings; the docs in section 8. Tests: the worked example as a fixture, with its expected SVG in both forms; one test for each error message; and tests for equal counts, a count of 0 at the end, a bar narrower than 2px, a drop text that must move left, a name that pushes its numbers to their own line on a phone, a name without spaces, each rounding exception (`0.4%`, `under 0.1%`, `99.6%`), the three lines under the table when the two largest drops fall on the same pair and when they do not, and `check` on a drawing that was edited by hand. Medium.
2. **One funnel on the sample page.** The sample page is about reporting a bug. A funnel of bug reports tests the kind in a real document, with real neighbours: reported, then reproduced, then fixed, then released. The sample content stays generic. Small.

**Out of scope, and why:**

- **Branches**, where people take one of two paths. Funnel data has one count per step, so a branch needs two counts and a picture of the split. That is a Sankey diagram, which "The obvious answers that would be wrong" rejects. Write one funnel for each path, or a flowchart with the counts in its notes.
- **Skipped steps**, where some people reach step 3 without step 2. Then a count can go up, and "the drop" has no meaning. `render` refuses it, and the message says to use a table.
- **Loops**, where people go back a step. Then a count counts visits, not people, and the shares mean nothing.
- **Two groups in one funnel**, such as phone and desktop. See decision 5.
- **A note on a step, a goal line, or a target share.** Write them in the text beside the figure.
- **Counts over time, money, averages and decimals.** A funnel counts whole things.
- **The funnel shape, a Sankey diagram, colors, a state, the dot, and icons.**
- **Heat maps** (a separate proposal, written at the same time), **route maps** and **3D.**

---

## Measured

The widths above come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs`, and `valueWidth` in `scripts/lib/scale.cjs` for tabular figures), at 14px for names and 12px for numbers. The script is in the session scratchpad and is not part of the kit. Its output:

```text
== numbers
  Open the sign-up page   12480  share 100.00% -> 100%
  Fill in the form         8240  share  66.03% -> 66%    drop 4240 = 33.97% of 12480 -> "−4,240 (34%)"
  Confirm the email        4120  share  33.01% -> 33%    drop 4120 = 50.00% of 8240 -> "−4,120 (50%)"
  Choose a plan            2900  share  23.24% -> 23%    drop 1220 = 29.61% of 4120 -> "−1,220 (30%)"
  Finish the sign-up       1860  share  14.90% -> 15%    drop 1040 = 35.86% of 2900 -> "−1,040 (36%)"
  widest name 153px, widest count 43.6px, widest share 36.8px
== desktop and paper
desktop and paper, 640px: bars from x=298 to x=620, 322px for 12480, 0.0258px per person
  head line 422px -> 1 line(s)
  Open the sign-up page  bar 322.0px
  drop "−4,240 (34%)" 90px at x=511 (lost part 510.6 to 620.0, 109.4px)
  Fill in the form       bar 212.6px
  drop "−4,120 (50%)" 90px at x=404 (lost part 404.3 to 510.6, 106.3px)
  Confirm the email      bar 106.3px
  drop "−1,220 (30%)" 90px at x=373 (lost part 372.8 to 404.3, 31.5px)
  Choose a plan          bar 74.8px
  drop "−1,040 (36%)" 90px at x=346 (lost part 346.0 to 372.8, 26.8px)
  Finish the sign-up     bar 48.0px
  height about 280px
== phone
phone, 264px: bars from x=20 to x=244, 224px for 12480, 0.0179px per person
  head line 422px -> 2 line(s)
  Open the sign-up page  bar 224.0px, name on 2 line(s) in 123px
  drop "−4,240 (34%)" 90px at x=162 (lost part 167.9 to 244.0, 76.1px)
  Fill in the form       bar 147.9px, name on 1 line(s) in 123px
  drop "−4,120 (50%)" 90px at x=94 (lost part 93.9 to 167.9, 73.9px)
  Confirm the email      bar 73.9px, name on 1 line(s) in 123px
  drop "−1,220 (30%)" 90px at x=72 (lost part 72.1 to 93.9, 21.9px)
  Choose a plan          bar 52.1px, name on 1 line(s) in 123px
  drop "−1,040 (36%)" 90px at x=53 (lost part 53.4 to 72.1, 18.7px)
  Finish the sign-up     bar 33.4px, name on 1 line(s) in 123px
  height about 364px
== eight steps, heights only
  height about 424px on a desktop
  height about 538px on a phone
== a name of 28 Chinese characters: 392px; in 200px: 2 lines; in 224px: 2 lines
== worst case on a desktop: bars from x=381 to 620
== widest numbers
  999,999,999          79px
  100%                 37px
  −999,999,999 (100%)  141px
  under 0.1%           69px
== step names at 14px
  Open the sign-up page          153px, 21 characters
  A name of twenty-eight chars   196px, 28 characters
```

The "head line" is the line above the bars. The eight-step funnel is measured for its height only.

---

## Decisions

The user asked the author to settle these questions, with the report reader first. Each is listed with the choice, the reason, and the other choices, so a reviewer can change one. The proposal above follows every choice.

1. **The name of the kind: `"funnel"`.** It is the word that report writers search for and use, so an author finds the kind in the table of the reader's questions. `"steps"` is too close to the walkthrough's steps and to numbered steps. `"conversion"` names one number, not the picture. The risk that the name makes an author expect the funnel shape is handled by the docs, and by the drawing, which the author cannot change.

2. **The kept bar: hollow, as a range chart's bar.** It has the page color inside and a text-color outline. A reader of a Docent page already knows this bar as a span from one value to another, and a kept bar is that span, from 0 to the count. Eight bars filled in the text color would be the heaviest thing on a calm page, and they would pull the eye away from the drop numbers, which answer the reader's question. The kept bar (a dark outline) and the lost part (a light outline) are still easy to tell apart. The other choice was a bar filled in the text color. If a real page shows the hollow form is too weak, filling it is a one-line change in `svg.cjs`.

3. **The shares: both, with the line above the bars naming each base.** Each bar shows its share of the first step, and each drop shows its share of the step before. A reader needs the first to see how much of the start is left, and the second to see which step is worst. With only the first, a bad late step looks small: in 1,000 → 500 → 100 → 50, the last drop is 5% of the start but half of the people who reached it. With only the second, the reader cannot see what is left at the end. The cost is one line above the bars, two lines on a phone. The table in words heads each column with its base, so a screen reader hears it on every cell.

4. **A count that goes up: refused.** It means people skipped a step, or the counts come from different sources, and a funnel cannot show either honestly. A drawing with a warning would still put a wrong picture into a report, and the report reader never sees the warning. The message tells the author to use a table. The other choice was to draw it with a plus sign and a warning.

5. **Two groups in one funnel: not now.** It is the most likely next request, so it gets its own proposal when a real report needs it. It needs its own answers: both groups on one scale (or the bars mislead), two bars for each step on a 240px phone row, and a table in words that a screen reader can follow. Until then, two funnels or a table are enough. Two funnels each have their own scale, so their shares compare and their bar lengths do not, and `diagrams.md` says so.

6. **The largest drop: never marked in the drawing, and named in the words.** "The largest drop" has two meanings, the most people and the largest share, and they are often on different steps (steps 2 and 3 in the example). A bold or marked drop would pick one meaning without telling the reader. The two lines under the table in words name both, and the author's `label` and text can say which one matters for the report.

7. **The number format: a comma every three digits, with every digit.** `12,480` is the most common form in English reports, and Docent writes English. Short forms such as `12.5k` lose digits that a report may need, and they read differently in other languages. The other choice was a thin space (`12 480`), the SI form, which no reader takes for a decimal point. It can come later as one field if a host project asks for it.

## Not in this proposal

- Code. Item 1 comes in its own pull request.
- A change to the range chart, the layout to scale or the plan, other than the one sentence in `diagrams.md` (section 8).
- The heat map, which has its own proposal in `heat-maps.md`.
