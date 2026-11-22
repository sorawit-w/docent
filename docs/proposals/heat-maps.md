# Proposal: heat maps — numbers shown as steps of gray

Status: **proposed on 2026-11-23, with each open question decided** (see "Decisions" at the end). It waits for review. No code is written yet. An earlier talk settled four things: the grid heat map comes first; a page heat map would use the plan's grid; 3D is rejected, because it hides data, skews sizes and needs scripts; and the color rule must change through this proposal.

## The answer first

Build one new kind, `"kind": "heatmap"`. A heat map shows one number for each pair of a row and a column, such as sign-ups by weekday and hour, or errors by service and day. Each cell is filled with one of **five new grays, the heat steps**, from light (the least) to dark (the most). In dark mode the steps run the other way, so the most is always the step that stands out most from the page. A legend above the grid names each step's numbers, and the table in words gives every exact number.

The color rule must change for this, and the change is small: the heat steps are five more of Docent's own grays, and they fill the cells of a heat map and nothing else. A heat map has no ultramarine, no lamp, and no green, amber or red. Section 2 compares this with three other options and gives the exact words for `DESIGN.md`.

The phone form keeps the grid. Each row name moves to its own line above its row of cells, as a range chart does on a phone, and the columns still line up. With 24 columns, each column is 9.3px wide on a phone. Within the limits, every heat map fits, so the phone form never refuses.

The page heat map (counts for each area of a page) comes later, as its **own kind on the plan's code**, so the plan keeps its rule that every box looks the same. Raw click points do not belong in the renderer: the author counts them into cells first, and writes a grid heat map.

| # | Pull request | Size |
|---|---|---|
| 1 | The heat steps and the grid heat map: the tokens, the `DESIGN.md` change, the kind, both forms, the table in words, the fit warnings, the docs | Medium |
| 2 | One heat map on a real page: the specimen page, in its "Report a bug" topic | Small |
| 3 | The page heat map, `"kind": "heatplan"`, on the plan's grid, only after item 2 | Medium |

## The obvious answers that would be wrong

**A rainbow, or a ramp from yellow through orange to red.** It is the usual heat map, and it breaks two Docent rules: green, amber and red mean status only, and the page has one ink. It is also a poor heat map. A rainbow has no order that a reader sees, so "is blue more than green?" needs the legend. Red and green look the same to many readers, and the colors turn into grays of almost one value on a printer without color.

**A blurred glow over a screenshot of the page.** It looks like the heat maps of analytics tools. But the blur draws numbers between the points that were never measured, and it gives no exact value. It needs an image of the page and a gradient with opacity, and the page has neither: Docent is flat, and every color comes from a page token. Sections 8 and 9 give the honest forms for a page: counts for each area, or counts for each cell of a grid.

**Shrink the desktop drawing, or let it scroll, on a phone.** Docent never shrinks a drawing on a screen. A heat map that scrolls shows its first hours, and that part looks complete.

---

## 1. The reader's question

**The question:** *Where are the numbers highest, across two sets of things?* For example: at which hours of which days do people sign up? Which service had the most errors on which day?

**Use it when** there are 2 to 12 rows and 3 to 24 columns, with one number in each cell, and the reader needs the pattern more than each number: the busy hours, the bad day, the one service that differs.

**Do not use it** in these cases:

| The reader needs | Use |
|---|---|
| Each exact number, or fewer than 12 cells | A table |
| Values or ranges on one scale, one row each | A range chart (`"kind": "range"`) |
| How much happens in each area of a page or screen | The page heat map (section 8), once it is built; a plan with a table until then |
| Change over time for one or two series | A table, or a sentence. Docent has no line chart. |
| Above and below a middle, such as change against last week | A table. A heat map has one scale from least to most; a scale with a middle needs two hues. |

---

## 2. The color rule

`DESIGN.md` allows "one ink, one light, and Docent's own grays". The accent is a mark and never a fill. Green, amber and red mean status only. So the heat map needs a way to show "more" that keeps these rules, or a deliberate change to them. Four options:

- **A1. Five tints of ultramarine,** from a pale tint to the accent itself.
- **A2. Five heat steps: five more of Docent's grays,** with the same lean toward ultramarine as the grays the page has.
- **B. A square in the text color in each cell,** whose area grows with its number.
- **C. The five tokens the page already has** (page, well, line, muted, text) as the five steps.

### What each option does

| | A1. Ultramarine tints | A2. Heat steps (grays) | B. Squares by size | C. The page's own tokens |
|---|---|---|---|---|
| New tokens | 5, and 5 for dark | 5, and 5 for dark | None | None |
| Order seen at a glance | Yes | Yes | Yes, but the eye judges area poorly | No: steps 1 and 2 cannot be told apart |
| A number inside a cell | Fails at step 4: no text color reaches 4.5:1 | Yes, at 5.11:1 or more in every theme | No: the square covers the number | Yes |
| The smallest value on a phone (cell 8.3px) | A pale cell | A pale cell | A square 0.9px wide for the value 5 | A cell in the page color, the same as the band |
| Dark mode | Needs its own tints | The steps run from dark to light | Works: the text color flips | The order breaks |
| Paper, printer without color | Mixed with the ink of links | 10% to 72% ink, in five steps | Black squares | As in light mode |
| A host accent | Clashes, or contrast is unknown | Not touched | Not touched | Not touched |
| Change to `DESIGN.md` | Large: the accent becomes a fill | Medium: five grays that fill one thing | Small: one sentence | Small, but it does not work |

### A1. Five tints of ultramarine

The tints go from a pale violet to the accent (`#ded7f7`, `#bcafee`, `#988ae5`, `#6f65db`, `#2f3fd0`).

- **Contrast.** Step 4 (`#6f65db`) sits in the "dead zone": the text color on it is 3.55:1 and the page color 4.46:1, so no number can sit on it. The tints could move, but a heat map of 168 cells in the accent breaks "two or three marks in one view" for any values.
- **Modes.** Dark mode needs its own five tints. On paper the cells print in the same ink as the links.
- **Tokens.** A host project replaces the accent with `--host-accent`. Fixed tints would then show an ultramarine heat map on a green page: two accents. Tints made from the host accent in the browser (with `color-mix`) are not fixed colors, so neither `check` nor the contrast test can test them.
- **Exact values.** The legend and the table, as for A2.
- **The `DESIGN.md` change** would rewrite the rule for the primary color: "A mark, never a fill, except the cells of a heat map, which take five tints of it." It also makes ultramarine mean two things: "you are here" (the dot, the current leg) and "much".

**Rejected:** it breaks the meaning of the accent, it cannot follow a host accent, and its middle step fails contrast.

### A2. Five heat steps: five more of Docent's grays

Five grays with a little blue (CIELAB a\* 1, b\* −7), as Docent's grays have. The lightness was chosen for two things: the steps are clearly apart, and each step keeps out of the "dead zone" where neither the text color nor the page color reaches 4.5:1.

| Step | Light | L\* | Number on it | Contrast | Dark | L\* | Number on it | Contrast |
|---|---|---|---|---|---|---|---|---|
| 1, the least | `#dee2f0` | 90 | text `#1c1f2e` | 12.64 | `#2a2e38` | 19 | text `#e7e9f3` | 11.22 |
| 2 | `#babecb` | 77 | text | 8.81 | `#434751` | 30 | text | 7.68 |
| 3 | `#9498a5` | 63 | text | 5.68 | `#5d616c` | 41 | text | 5.11 |
| 4 | `#616571` | 43 | page `#fbfbfe` | 5.63 | `#8f939f` | 61 | page `#12141f` | 5.97 |
| 5, the most | `#3e424d` | 28 | page | 9.72 | `#babecb` | 77 | page | 9.88 |

- **Contrast.** In light, a number on a cell needs L\* 56 or more to take the text color, and 49 or less to take the page color; in dark, 44.6 or less for the text color, and 52.7 or more for the page color. The steps keep out of both gaps. So the rule for the number is the same in both themes: **steps 1 to 3 take the text color, and steps 4 and 5 take the page color.** Because the page color is light in light mode and dark in dark mode, one CSS rule serves both. Every number reaches 5.11:1 or more.
- **Modes.** In dark mode the steps run from dark to light, because the most should stand out most from a dark page. On paper the kit prints in light colors, so the cells take the light steps on white paper, and the numbers keep 5.68:1 or more. A printer without color prints the steps as about 10%, 23%, 37%, 57% and 72% ink: five levels, the most that gray print keeps apart. The numbers in the cells, where they fit, and the table in words give the exact values when a printer merges two steps.
- **Tokens.** Ten new tokens, `--heat-1` to `--heat-5`, set by the kit in its four places (light, dark by the system, dark by the switch, and print), with the light values as the fallback inside each drawing, as for every other color of a drawing. Each cell is a solid fill. Nothing uses opacity, a gradient or a filter. A host project cannot set them, like the page and the status colors.
- **Exact values.** The legend shows each step with the numbers at its edges and the unit. The cells show their numbers when every number fits (section 4). The table in words gives every number, and the line under it names the highest and the lowest.
- **The `DESIGN.md` change** is below, word for word.

### B. A square in the text color, sized by the number

Each cell holds a square in the text color, centred, whose area grows with the number. It is honest and well known: a "punch card" of days and hours is drawn this way.

- **Contrast.** The square is the text color on the page color: 15.82:1 in light and 15.14:1 in dark. No number can sit in a cell, because the square covers it.
- **Modes.** It works in every theme with no new token, and it prints black.
- **Tokens.** None. This is its strength.
- **Exact values.** The eye judges area poorly: a square twice as large in area does not look twice as much. A legend of sizes is harder to read than a legend of shades. And small values disappear on a phone. In a 19.1px desktop cell the value 5 of 250 is a square 2.4px wide; in an 8.3px phone cell it is 0.9px, and the value 25 is 2px.
- **The `DESIGN.md` change** would be one sentence in **Diagrams**: "In a heat map, each cell holds a square in the text color, whose area grows with its number."

### C. The five tokens the page already has

The page, the well, the line color, the muted color and the text color are five grays from light to dark in light mode.

- **Contrast and order.** The page and the well are 1.07:1 apart in light, and 1.06:1 in dark: a reader cannot tell step 1 from step 2. In dark mode the well is darker than the page, so step 2 is darker than step 1, and the order breaks. The line color (L\* 86) and the muted color (L\* 40) are far apart, so the steps are not even.

**Rejected:** it does not work. It shows why new grays are needed.

### Recommendation: A2, the heat steps

A2 is the only option that reads at a glance in an 8px phone cell, keeps a number readable inside a cell, keeps one order in every theme, and leaves the accent and the status colors to their own meanings. Its cost is ten tokens and a deliberate change to the color rule. B is the fallback if the color rule must not change at all; its price is that small values disappear and no number sits in a cell.

**The risk:** two steps can merge on a poor printer. The numbers in the cells and the table in words carry the exact values. Item 1 checks this in print preview.

### The change to `DESIGN.md`

**In the front matter, under `colors`,** after `error`:

```yaml
  heat-1: "#dee2f0"             # Heat steps — the cells of a heat map only, from the least (1) to the most (5)
  heat-2: "#babecb"
  heat-3: "#9498a5"
  heat-4: "#616571"
  heat-5: "#3e424d"
```

and after `dark-error`:

```yaml
  dark-heat-1: "#2a2e38"
  dark-heat-2: "#434751"
  dark-heat-3: "#5d616c"
  dark-heat-4: "#8f939f"
  dark-heat-5: "#babecb"
```

**In Colors,** a new bullet after **Status**:

> - **Heat steps (heat-1 to heat-5):** Five more of Docent's grays, for the cells of a heat map and nothing else. Step 1 holds the least and step 5 the most. In light the steps grow darker, and in dark they grow lighter, so the most is always the step that stands out most from the page. A step is a fill, but it is not a mark and not a status: a heat map has no ultramarine, no lamp, and no green, amber or red. A number on steps 1 to 3 takes the text color, and a number on steps 4 and 5 takes the page color. Every heat map has a legend, and its exact numbers are in the table in words.

**In Colors, the paragraph Diagrams,** the sentence "The one other color in a diagram is a status color, on the outline of a part that carries a state (see Status above)." becomes:

> Two other colors can appear in a diagram: a status color, on the outline of a part that carries a state (see Status above), and the heat steps, in the cells of a heat map (see Heat steps above).

**In Colors, the paragraph Contrast,** at the end:

> The number on a heat step: 5.63 or higher in light, 5.11 or higher in dark, and 5.68 or higher on paper.

**In Layout,** a new paragraph after **Plans**:

> **Heat maps.** A heat map shows one number for each pair of a row and a column, such as sign-ups by weekday and hour, as a grid of cells on one band. Each cell is filled with the heat step of its number: 3 to 5 steps of equal size on one scale. A legend above the grid shows each step, with the numbers at its edges and the unit. Cells are 2px apart (1px when they are narrower than 16px), with corners of 2px. A cell with no data shows the band, with a thin outline in the line color. When every number fits inside its cell, each cell shows its number at 12px with tabular figures; when one does not fit, no cell shows one. Row names are 14px at weight 400 in a column at the left. Column labels are 12px, muted, above the grid; when they do not all fit, every second, third, fourth, sixth or twelfth label stands. Nothing moves, and nothing is dashed. It has the two forms of a range chart: 640px on a desktop and on paper, and 264px on a phone, where each row name stands on its own line above its row of cells and the columns still line up. Its numbers are also written as a table under the drawing.

**In Do's and Don'ts,** after "Don't use green, amber or red for anything except status.":

> - Don't use a heat step outside the cells of a heat map, and don't use a step to make a part stand out. A heat step says how much, and nothing else.

The palette sentence ("one ink, one light, and Docent's own grays") stays as it is, because the heat steps are grays.

---

## 3. The data

```json
{
  "id": "signups-by-hour",
  "kind": "heatmap",
  "label": "Sign-ups to a public app in one week, by weekday and hour. On weekdays they peak from 10 to 12 and again at 20 and 21. Weekends are lower and flatter. The most was 224, on Thursday at 11.",
  "scale": {"from": 0, "to": 250, "step": 50, "unit": "sign-ups"},
  "columns": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"],
  "rows": [
    {"name": "Monday",    "values": [6, 6, 6, 7, 6, 8, 15, 38, 72, 158, 187, 199, 202, 129, 104, 71, 50, 45, 65, 112, 157, 136, 105, 50]},
    {"name": "Tuesday",   "values": [6, 6, 5, 6, 6, 7, 15, 37, 85, 153, 212, 222, 167, 137, 99, 81, 53, 42, 64, 102, 161, 151, 97, 50]},
    {"name": "Wednesday", "values": [6, 6, 6, 6, 6, 8, 15, 35, 78, 146, 188, 195, 187, 143, 106, 75, 54, 40, 63, 100, 138, 159, 105, 51]},
    {"name": "Thursday",  "values": [7, 6, 6, 6, 6, 8, 14, 33, 81, 129, 190, 224, 194, 140, 104, 78, 52, 42, 64, 101, 152, 136, 110, 52]},
    {"name": "Friday",    "values": [5, 5, 5, 5, 5, 7, 13, 29, 61, 120, 156, 198, 149, 123, 92, 72, 48, 40, 49, 85, 127, 124, 92, 43]},
    {"name": "Saturday",  "values": [9, 8, 8, 9, 9, 12, 20, 32, 51, 85, 117, 135, 118, 103, 79, 50, 36, 40, 59, 77, 102, 96, 75, 53]},
    {"name": "Sunday",    "values": [8, 9, 9, 8, 10, 11, 20, 31, 51, 84, 100, 134, 122, 103, 83, 55, 40, 43, 55, 89, 92, 102, 82, 48]}
  ]
}
```

The numbers are made up for this proposal.

| Field | Needed | What it is |
|---|---|---|
| `scale` | yes | `from`, `to`, `step` and `unit`, as in a range chart. `to` minus `from` is 3, 4 or 5 steps, and each step is one heat step. `unit` is needed, at most 12 characters, because the legend names what is counted. `marks` is refused. |
| `columns` | yes | 3 to 24 labels, left to right, each at most 10 characters, all different. A label is text, also when it is a number: `"0"` to `"23"` for hours, `"Mon"` for a day. |
| `rows` | yes | 2 to 12 rows, top to bottom. Each has a `name` (at most 20 characters, all different) and `values`: one for each column, in the order of `columns`. A value is a number on the scale, from `from` to `to`, or `null` for a cell with no data. At least one value is a number. |

`id` and `label` are needed, as for every kind. Other fields are ignored, as in the other kinds, with four exceptions that `render` refuses, because an author who knows the other kinds may write them: `form`, a `place` other than `"flow"`, `groups`, and `areas`.

**Numbers** are written as the author writes them, with a minus sign for a value below zero (`fmt` in `scale.cjs`). A value may have decimals. A heat map does not add a thousands separator; write large counts in a larger unit ("thousands of visits") when the legend or the cells need it.

**The steps.** Each step holds the values from its lower edge up to its upper edge. A value on an edge takes the higher step, and the value `to` takes the top step. With 5 steps the cells take heat steps 1 to 5. With 4 steps they take 1, 2, 4 and 5, and with 3 steps they take 1, 3 and 5, so the least and the most look the same in every heat map, and the steps stay clearly apart.

**Why `scale` is needed, and not computed.** The author knows what the edges mean ("40 errors is our limit"), and a renderer that picks its own edges can draw two weeks of the same data with different steps. `readScale` already checks every rule of a scale, so a needed scale costs no new code. Decision 4 explains why, and a computed scale can come later.

### The limits

- 2 to 12 rows, 3 to 24 columns, so at most 288 cells.
- A row name is at most 20 characters; a column label at most 10; the unit at most 12.
- 3 to 5 steps of equal size. No open top step ("250 and more"): every value lies on the scale.

---

## 4. The forms

### Rules that both forms keep

- **The three layers.** The well is the ground. The grid is one band in the page color. The cells sit on it.
- **Cells.** Each cell is a solid rectangle in its heat step, with corners of 2px. Cells are 2px apart, or 1px when they are narrower than 16px, so the band shows between them. A cell with no data has no fill: the band shows, inside a 1px outline in the line color.
- **The number in a cell.** When every number fits inside its cell (its width at 12px with tabular figures, plus 4px on each side), each cell shows its number in the middle, in the text color on steps 1 to 3 and in the page color on steps 4 and 5. When one number does not fit, no cell shows one. A mix would make a reader think that the cells without a number are empty.
- **The legend,** above the grid, at the left: one swatch for each step, 12px high and 32px wide (wider when an edge number needs it: its width plus 8px), with the edge numbers under the edges at 12px, muted, with tabular figures, and the unit at the right of the swatches. When a cell has no data, the legend adds an outlined swatch and the words "no data". When the legend does not fit in one line, the "no data" key goes to a second line.
- **Column labels** are 12px, muted, above the middle of each column. A label needs its width plus 4px. When every label fits its column, every column has its label. When they do not, the renderer keeps every second, third, fourth, sixth or twelfth label, the first that fits, always from the first column. These numbers divide 24 and 12, so hours and months keep their round labels.
- **Text at real size.** Row names are 14px, weight 400, in the text color, as in a range chart.
- **No dot, no walkthrough, no state, nothing dashed, no icons, no grid lines.** A heat map has no order of steps, so nothing moves.

### Desktop and paper (640px)

The band runs from 8px to 632px. The row names stand in a column at the left, from 20px. The grid starts 16px after the widest row name and ends at 620px, and its columns share that width equally. Each row is 24px high.

For the sign-ups example the widest name, "Wednesday", is 78px. The grid runs from 114px to 620px: 506px for 24 columns, so 21.1px for each column and cells 19.1px wide and 22px high. The widest number, "224", needs 23.8 + 8 = 31.8px, so no cell shows its number. The widest label, "23", needs 15.8 + 4 = 19.8px, and every column has its label. The legend is 5 swatches of 32px, then the unit: 217px. The drawing is about 262px high.

Within the limits the desktop form always fits. The widest row name possible, 20 characters of the widest letter, is 273px, and it still leaves 13px for each of 24 columns. A real name of 20 characters, such as "Image upload service", is 143px.

### The phone (264px)

The grid has 24 columns at most, and 240px of room. Three honest options:

**P1. The same form, with the names at the left.** With the full day names (78px) each of 24 columns gets 5.8px; with "Mon" to "Sun" (31px), 7.7px. Both are below the 8px that a cell needs to read as a cell. The author would also have to write shorter names for the phone than for the desktop.

**P2. Turned on its side.** The hours become rows and the days become columns. The hour labels (15.8px) leave 7 columns of 28.6px. But the day names must then fit 28.6px at 12px: "Wednesday" is 67px, so only "Mon" to "Sun" fit. The grid is 24 rows of 16px, 384px high. And the reader must turn the picture in their head: on a desktop "later" runs to the right, and on a phone it runs down.

**P3. Each row name above its row of cells.** The grid keeps its orientation and uses the full 224px inside the band (from 20px to 244px). Each row name stands on its own line above its row, as each row name of a range chart does on a phone. The columns line up across all rows, so the picture stays a grid. With 24 columns each column is 9.3px wide, and a cell 8.3px wide with a 1px gap. A row of cells is 16px high, or 24px when the cells show numbers.

- It keeps the picture and its orientation, so the phone shows the same grid as the desktop.
- It costs height: 18px for each name line. For 7 rows of 24 columns the grid is 7 × (18 + 16 + 6) = 280px.
- It fits every heat map within the limits: 24 columns give 9.3px, above the least of 8px. So the phone form never refuses for room, and needs no fallback.
- A long row name wraps onto a second line, at its spaces, as on a range chart. A name of 20 characters needs at most two lines.

**Recommendation: P3.** It is the only option that fits every heat map within the limits, it keeps the grid as the reader saw it on a desktop, and it is the phone form that Docent's other scale charts already use.

For the sign-ups example on a phone: 24 columns of 9.3px. The labels need 19.8px, so two columns (18.7px) are too narrow and three (28px) are enough: every third label stands, 0, 3, 6 and so on to 21. No cell shows its number. The legend is 217px, so it fits 240px in one line. The drawing is about 368px high.

---

## 5. Paper, dark mode, and the diagram in words

**Paper.** The 640px form prints at its real size, as a range chart does: an A4 figure well holds about 641.6px. The tallest heat map, 12 rows, is about 382px high, far below the kit's cap of 220mm (about 831px) for a drawing on paper. The kit already prints the figure well with `print-color-adjust: exact`. The cells are SVG fills, part of the drawing, not CSS backgrounds, so they print; item 1 checks this in print preview, with and without "background graphics". The print block of `kit.css` sets the light heat steps, as it sets the other tokens.

**Dark mode.** The heat map takes every color from the page tokens. Its styles add the heat steps for the cells, `var(--text)` for a number on steps 1 to 3, `var(--bg)` for a number on steps 4 and 5, and `var(--line)` for the outline of a cell with no data. The dark tokens flip, and the same classes serve both themes. `svg.cjs` writes these styles only for the form `heatmap`, as it writes the styles of a plan only for the form `plan`.

**The diagram in words** is a table in the closed section under the drawing, with the same rows and columns as the drawing: the row names as row headers, the column labels as column headers, and an empty corner. Each cell holds its number, or "no data". On a phone the table scrolls sideways inside itself, as every wide table does.

Under the table, two lines say how to read it, computed from the data. For the sign-ups example:

> Each cell is shaded by its number, in 5 steps of 50 sign-ups from 0 to 250. A number on the edge of two steps takes the higher step. The highest number is 224 (Thursday, 11). The lowest is 5, in 6 cells.

When two or more cells hold the highest number, the line says "in 3 cells", as it does for the lowest. When cells have no data, a third line says how many: "1 cell has no data."

The `label` stays a one- or two-sentence summary. It should say the pattern in words, as the example does: where the numbers are high, where they are low, and the highest.

---

## 6. What `render`, `check` and the fit warnings do

**`render`** reads the data, draws both forms, and writes the table in words. It reports the form, as for the other kinds, with a short note on the numbers in the cells and on the labels, from a flag on each drawing, as the plan reports "not to scale":

- `render doc.html: diagram 3 ("signups-by-hour") drawn as heatmap; every 3rd column label on a phone`
- `render doc.html: diagram 4 ("errors-by-day") drawn as heatmap; numbers in the cells`
- When the desktop shows numbers and the phone does not: `numbers in the cells on a desktop only`.

**The refusals.** Each message names the field and says what to change:

- `a heat map sits in the text flow; "place" must be "flow"`
- `a heat map has no "form"; the renderer draws it 640px wide, and 264px wide on a phone`
- `a heat map has no "groups"; each row is one row of cells`
- `a heat map has no "areas"; for the areas of a page, write a plan, and its counts in a table` (after item 3: `... write a heat plan, "kind": "heatplan"`)
- `"rows" must be a list of 2 to 12 rows, top to bottom, each with a "name" and its "values"`
- `a heat map has 2 to 12 rows; this one has 14`
- `"columns" must be a list of 3 to 24 labels, one for each column`
- `a heat map has 3 to 24 columns; this one has 31`
- `the label of column 3 is 11 characters long; the most is 10: "Wednesday 2"` (the message of `words`, as for every text)
- `the name of row 4 is 23 characters long; the most is 20: "Image upload and resize"`
- `two rows have the name "Monday"`
- `two columns have the label "Mon"`
- `row 3 ("Wednesday") has 23 values, and "columns" has 24`
- `row 2 ("Tuesday") has the value "12" in column "14"; a value is a number, or null for no data`
- `row 2 ("Tuesday") has the value 312 in column "14"; it must be on the scale, from 0 to 250`
- `the scale has 10 steps; a heat map has 3 to 5, one for each heat step. Use a larger "step"`
- `the scale of a heat map needs a "unit", such as "sign-ups"; the legend names it`
- `the scale of a heat map has no "marks"; say a value that matters in the label or the text`
- `every cell has no data; a heat map needs at least one number`
- `the legend needs 320px on a phone, and a phone has 240px; its widest number is "1000000". Write the values in a larger unit, such as thousands`

`readScale` gives its own messages for `from`, `to`, `step`, and a scale that is not a whole number of steps.

The legend is the only part that can be too wide. The phone has the least room, so the phone form refuses first: five swatches of 64px for numbers of seven digits come to 320px. Every other part fits within the limits, as section 4 shows.

**`check`** tests what it tests for every kind:

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- The data passes every rule above.
- A style that sets a `--heat-*` token gets the warning that a style setting `--bg` or `--text` gets today: the kit sets it in four places, so the value is lost in dark mode or in print.

**Fit warnings,** in `fit.cjs`. They never change the drawing:

- `every number is in one step, so the shades show nothing; a sentence or a table says this more simply`
- `the heat map has 9 cells; a table with the numbers says this more simply` (fewer than 12 cells)
- `61 of 72 cells are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text` (4 cells in 5, or more, in the lowest step)
- `40 of 72 cells have no data; a table of the cells that have data may say this better` (more than half)
- `only every 3rd column label fits on a desktop; when the columns are names, not a series such as hours, turn the grid so that the names are rows` (thinned labels on the desktop form only; on a phone thinning is normal)

---

## 7. Worked examples

### Sign-ups by weekday and hour

The data is in section 3: 7 rows, 24 columns, a scale from 0 to 250 in 5 steps of 50.

| | Desktop and paper | Phone |
|---|---|---|
| Grid | 114px to 620px, 506px | 20px to 244px, 224px |
| Each column | 21.1px; cell 19.1 × 22px, 2px apart | 9.3px; cell 8.3 × 15px, 1px apart |
| Numbers in cells | No: "224" needs 31.8px | No |
| Column labels | Every hour: "23" needs 19.8px | Every third hour: 0, 3, 6 … 21 |
| Legend | 5 × 32px + "sign-ups" = 217px, one line | The same |
| Height | About 262px | About 368px |

The cells fall into the steps as 69, 44, 34, 17 and 4 cells. The four darkest cells are at 10 and 11 on Tuesday, 11 on Thursday and 12 on Monday. The highest is 224, on Thursday at 11.

### Errors by service and day

A web service's errors over one week, with one cell that has no data, and 4 steps:

```json
{
  "id": "errors-by-day",
  "kind": "heatmap",
  "label": "Errors of a web service in one week, by part and day. Checkout and Payments had most errors on Wednesday and Thursday, after a release. Image upload rose through the weekend. Email has no data for Thursday.",
  "scale": {"from": 0, "to": 40, "step": 10, "unit": "errors"},
  "columns": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "rows": [
    {"name": "Sign-in",      "values": [3, 2, 4, 3, 5, 1, 1]},
    {"name": "Search",       "values": [6, 7, 5, 9, 8, 4, 3]},
    {"name": "Checkout",     "values": [12, 14, 38, 31, 11, 6, 5]},
    {"name": "Payments",     "values": [4, 5, 22, 17, 4, 2, 2]},
    {"name": "Email",        "values": [1, 0, 2, null, 1, 0, 0]},
    {"name": "Image upload", "values": [9, 8, 10, 12, 15, 19, 21]}
  ]
}
```

| | Desktop and paper | Phone |
|---|---|---|
| Grid | 128px to 620px, 492px (after "Image upload", 92px) | 20px to 244px, 224px |
| Each column | 70.3px; cell 68.3 × 22px | 32px; cell 30 × 22px |
| Numbers in cells | Yes: "38" needs 23.8px | Yes |
| Column labels | Every day: "Wed", the widest label, needs 30px | Every day |
| Legend | 4 × 32px + "errors" + the "no data" key = 246px, one line | 246px is more than 240px, so the "no data" key takes a second line |
| Height | About 238px | About 392px |

The 4 steps take heat steps 1, 2, 4 and 5. The cells fall into them as 29, 8, 2 and 2 cells. The numbers on the two darkest steps (Checkout on Wednesday and Thursday, at 38 and 31; Payments on Wednesday, at 22; Image upload on Sunday, at 21) take the page color. The line under the table says: "The highest number is 38 (Checkout, Wed). The lowest is 0, in 3 cells. 1 cell has no data."

---

## 8. The page heat map

**The question:** *How much happens in each area of a page or screen?* For example: how many clicks did the header, the "Sign up" button, the sidebar and the footer get?

The plan already draws the areas of a page as a grid of named areas. But the approved plan rules out colors and a look of its own for a box, and it limits a plan to 4 columns, 5 rows and 8 boxes. Two ways to add counts:

**A. A deliberate change to the plan.** A plan would accept a `scale` and a `value` on each box, and its boxes would take heat steps.

- One kind for authors to learn.
- It breaks the plan's promise that every box looks the same, which the approved proposal and `DESIGN.md` state.
- It lifts a refusal that exists today, "a plan has no `scale`", and gives `scale` a meaning different from the layout to scale, where an author learned it.

**B. Its own kind, `"kind": "heatplan"`, on the plan's code.**

- One kind for one reader's question. This is the pattern of the range chart and the layout to scale: two questions, two kinds, one shared `scale.cjs`. Here: two questions, two kinds, one shared `plan.cjs`.
- The plan keeps its rules unchanged. A reader who learned that a plan has no colors is never misled.
- Its fields are the plan's fields, plus the heat map's `scale` and a `value` on each box, so an author learns nothing new.
- Its cost is one more kind in the table of `SKILL.md` and one more section in `diagrams.md`.

**Recommendation: B, after item 2.** It changes nothing that is approved, and it reuses `readPlan`, `sizeColumns`, the grid form and the stack form, with the legend and the steps of the heat map.

What the heat plan adds to the plan:

- **Data:** `scale` as in a heat map (3 to 5 steps, `unit` needed), and on each box a `value`: a number on the scale, or `null`. The plan's `columns` and `unit` keep their meaning: the widths of the columns.
- **Limits:** the plan's limits stay: 4 columns, 5 rows, 8 boxes. The phone form of the plan depends on them. A page with more areas is a table of counts, sorted by count.
- **Boxes:** each box is filled with the heat step of its value. Its name, its value (12px, tabular figures, under the name) and its note all take the step's text color; a note is not muted on a step, because the muted color fails on the darker steps. A box with no data keeps the plan's look and says "no data" under its name.
- **Sizing:** the value is one more line in a box, so it counts in `needOf` and in the row height.
- **The phone stack:** each small map shows every box in its step, and this band's box has a 2px outline in the text color. In the plan, a filled box means "this box"; in a heat plan the fill means "how much", so the thick outline says "this box" instead.
- **The diagram in words:** the plan's table, with a Value column, and the heat map's lines on the steps, the highest and the lowest.

---

## 9. Density from raw points

Raw points are x and y positions, one for each click, which the renderer would sort into cells. **They do not belong in the renderer.** Four reasons:

- **Size.** The data stays in the document. Five thousand clicks at about 10 characters each add 50KB to a one-file page, and `check` reads them again each time it runs.
- **Positions without a page.** Clicks from a 375px phone and a 1440px desktop share no coordinates. Only the author knows how the points were made comparable, and the renderer cannot check it.
- **The cell size is a choice.** Cells of 120px and cells of 60px give two different pictures of the same clicks. The author makes that choice and should say it in the label; a renderer that makes it hides it.
- **The obvious form is the wrong default.** Points invite the blurred glow that section "The obvious answers" rejects.

**How points reduce to the grid.** The author counts the points with a short script before writing the data, by these rules:

1. Take the page size that the points were measured on, say 1440 × 900px.
2. Choose the columns and rows within the limits, say 12 columns of 120px and 9 rows of 100px.
3. A point at (x, y) goes to column ⌊x / 120⌋ and row ⌊y / 100⌋. A point on the right or the bottom edge goes to the last column or row.
4. Write a grid heat map: the columns labelled by their left edge (`"0"`, `"120"` … `"1320"`), the rows named by their range (`"0–100"` … `"800–900"`), and each count as a value. The label says how many points there were and how large a cell is.

This example fits both forms: the label "1320" needs 35.7px, and a desktop column is about 44px; on a phone a column is 18.7px, so every second label stands. When the areas of the page are known, the author counts the points for each area instead, and writes a heat plan (section 8).

---

## 10. What it reuses, and what is new

| From | What the heat map reuses |
|---|---|
| `scale.cjs` | `readScale` for the scale (the heat map then checks 3 to 5 steps and a unit); `tickAt` and `fmt` for the edge numbers of the legend; `valueWidth` for numbers, labels and the legend; `isNum` and `num` |
| `range.cjs` | `wrapName`, for a row name on a phone, at 14px and weight 400 |
| `blocks.cjs` | `fail`, `words` and `id`, for every check of the data |
| `diagram.cjs` | `renderScaleChart`: the two forms, the swap between them, the table in words, and the `note` that `render` prints. The heat map joins it as a fourth kind. |
| `svg.cjs` | The styles for `row` and `val`. The heat map adds its own short list for the form `heatmap`: the five steps, the two colors of a number, and the outline of a cell with no data. The light values of the five steps join `LIGHT`, the fallback colors. |
| `fit.cjs` | The fit warnings, as five more lines |
| `check.cjs` | The list of kit tokens that a style must not set gains `heat-1` to `heat-5` |
| `kit.css` | The five steps in its four places: light, dark by the system, dark by the switch, and print |
| `tests/contrast.py` | Ten more pairs: each step with its number, in light and dark |

**New,** in `scripts/lib/heatmap.cjs`:

- Reading the rows, the columns and the values, and the step of each value.
- The sizing of both forms: the name column, the column width, the gap, and the choice of numbers in cells and of labels to keep.
- The legend, and its second line.
- The table in words and its lines on the steps, the highest and the lowest.

The test that every color comes from a page token uses the pattern `var\(--[a-z]+,#…\)` today. Token names with a digit (`--heat-1`) need `[a-z0-9-]+` in the heat map's own test.

---

## 11. Phases, and what is out of scope

1. **The heat steps and the grid heat map.** The tokens in `kit.css` and `svg.cjs`; the `DESIGN.md` change in section 2; `scripts/lib/heatmap.cjs`; the dispatch in `diagram.cjs`; the fit warnings; the token list in `check.cjs`; a section "Heat maps" in `references/diagrams.md`; a row in the table of reader's questions and a line under "Limits to know" in `SKILL.md`. Tests: the two worked examples as fixtures, with their expected SVG; one test for each refusal; tests for 3 and 4 steps, a value on an edge, a value below zero, a cell with no data, numbers that fit on a desktop only, thinned labels, a long row name on a phone, and `check` on a drawing edited by hand; the contrast pairs; and a look in print preview. The tokens ship with the kind, so no token waits for a user. Medium.
2. **One heat map on a real page.** The specimen page shows every rule, and its topic is "Report a bug". A heat map of bug reports by weekday and hour fits that topic and tests the kind beside real neighbours. Small.
3. **The page heat map,** `"kind": "heatplan"` (section 8), only after item 2. Medium.

**Out of scope:**

- 3D, in any form. It hides cells behind other cells, it skews sizes with the angle, and it needs scripts.
- A blurred glow over a screenshot, and raw points in the data (section 9).
- A scale with a middle (above and below zero, or against a target). It needs two hues.
- Steps of unequal size, quantiles and a log scale. Equal steps on the author's scale can be checked by eye against the legend.
- An open top step ("250 and more"), until a real report needs one (decision 5).
- A calendar of a whole year (7 rows × 53 weeks). It is more than 24 columns.
- Axis titles. The caption and the label name the rows and the columns.
- Route maps on a world map, which are a separate item, and funnels, which have their own proposal.

---

## Measured

The colors come from a script with the WCAG formula for contrast and the CIELAB formula for lightness. The sizes come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs`) and `valueWidth` in `scripts/lib/scale.cjs`, at 14px for names and 12px for numbers and labels. The scripts are in the session scratchpad and are not part of the kit. Their output:

```text
== Docent's grays in CIELAB (the lean toward ultramarine is the negative b)
   page       #fbfbfe L*98.7 a0.5 b-1.4
   well       #f2f3f9 L*95.9 a0.7 b-3.0
   line       #d3d6e3 L*85.7 a1.4 b-6.7
   muted      #575d75 L*39.8 a3.5 b-14.3
   text       #1c1f2e L*12.1 a3.2 b-10.4
   dark page  #12141f L*6.6 a2.3 b-7.9
   dark well  #0b0d15 L*3.7 a1.0 b-4.5
   dark line  #2d3146 L*20.8 a4.2 b-13.6
   dark muted #959bb3 L*64.2 a2.9 b-13.2
   dark text  #e7e9f3 L*92.5 a1.2 b-5.1
== dead zone, light: page-color text needs L* <= 49.0; text-color text needs L* >= 56.0
== dead zone, dark:  text-color text needs L* <= 44.6; page-color text needs L* >= 52.7
== light: steps 1 to 3 carry the text color #1c1f2e, steps 4 and 5 the page color #fbfbfe
   step 1 #dee2f0 L*90.0 a1.3 b-7.3 | value text #1c1f2e: 12.64:1 ok | vs the page #fbfbfe: 1.25:1
   step 2 #babecb L*77.0 a1.1 b-7.0 | value text #1c1f2e: 8.81:1 ok | dL* from step 1: -12.9
   step 3 #9498a5 L*62.9 a1.2 b-7.3 | value text #1c1f2e: 5.68:1 ok | dL* from step 2: -14.1
   step 4 #616571 L*42.8 a1.1 b-7.3 | value text #fbfbfe: 5.63:1 ok | dL* from step 3: -20.1
   step 5 #3e424d L*28.0 a1.1 b-7.2 | value text #fbfbfe: 9.72:1 ok | dL* from step 4: -14.8
== dark: steps 1 to 3 carry the text color #e7e9f3, steps 4 and 5 the page color #12141f
   step 1 #2a2e38 L*18.9 a0.9 b-7.0 | value text #e7e9f3: 11.22:1 ok | vs the page #12141f: 1.35:1
   step 2 #434751 L*30.1 a0.8 b-6.5 | value text #e7e9f3: 7.68:1 ok | dL* from step 1: 11.2
   step 3 #5d616c L*41.2 a0.9 b-6.8 | value text #e7e9f3: 5.11:1 ok | dL* from step 2: 11.0
   step 4 #8f939f L*61.0 a1.0 b-6.8 | value text #12141f: 5.97:1 ok | dL* from step 3: 19.8
   step 5 #babecb L*77.0 a1.1 b-7.0 | value text #12141f: 9.88:1 ok | dL* from step 4: 16.1
== paper (light steps on a white page, value text the same)
   step 1 #dee2f0: value text #1c1f2e 12.64:1; step vs white 1.29:1
   step 2 #babecb: value text #1c1f2e 8.81:1; step vs white 1.86:1
   step 3 #9498a5: value text #1c1f2e 5.68:1; step vs white 2.88:1
   step 4 #616571: value text #ffffff 5.82:1; step vs white 5.82:1
   step 5 #3e424d: value text #ffffff 10.04:1; step vs white 10.04:1
== gray on a printer without color (CIE L* only, the tint drops out)
   step 1: 10% ink
   step 2: 23% ink
   step 3: 37% ink
   step 4: 57% ink
   step 5: 72% ink
== option C: the five tokens the page has (page, well, line, muted, text), as steps 1 to 5
   light: L* 98.7, 95.9, 85.7, 39.8, 12.1; step 1 to 2 contrast 1.07:1
   dark: L* 6.6, 3.7, 20.8, 64.2, 92.5; step 1 to 2 contrast 1.06:1
== option A1: ultramarine tints (#2f3fd0 toward the page), step 5 is the accent itself
   step 1 #ded7f7 L*87.4 a8.4 b-14.8
   step 2 #bcafee L*74.5 a17.4 b-29.8
   step 3 #988ae5 L*62.1 a25.8 b-44.4
   step 4 #6f65db L*49.3 a34.7 b-59.4
   step 5 #2f3fd0 L*35.4 a44.5 b-75.8
== option A1 step 4 #6f65db: text color 3.55:1, page color 4.46:1
== outline of a cell with no data (line color) vs the page: 1.40:1 light, 1.43:1 dark
== row names at 14px: Monday 53, Tuesday 56, Wednesday 78, Thursday 62, Friday 42, Saturday 60, Sunday 50
== row names at 14px: Sign-in 47, Search 47, Checkout 63, Payments 66, Email 37, Image upload 92
sign-ups desktop: grid 114..620 (506px), 24 columns, pitch 21.1px, gap 2, cell 19.1 x 22px; widest value 23.8px -> numbers in cells: no; column label 15.8px -> every column; legend 5 swatches of 32px + unit = 217px; about 262px tall
sign-ups phone  : grid 20..244 (224px), 24 columns, pitch 9.3px, gap 1, cell 8.3 x 15px; widest value 23.8px -> numbers in cells: no; column label 15.8px -> every 3rd column; legend 5 swatches of 32px + unit = 217px; about 368px tall
errors desktop  : grid 128..620 (492px), 7 columns, pitch 70.3px, gap 2, cell 68.3 x 22px; widest value 15.8px -> numbers in cells: yes; column label 26px -> every column; legend 4 swatches of 32px + unit + no-data key = 246px; about 238px tall
errors phone    : grid 20..244 (224px), 7 columns, pitch 32px, gap 2, cell 30 x 22px; widest value 15.8px -> numbers in cells: yes; column label 26px -> every column; legend 4 swatches of 32px + unit + no-data key = 246px (two lines); about 392px tall
== worst case within the limits: 24 columns, a 20-character row name of the widest letter
   name 273px -> desktop pitch 13px; phone pitch 9.3px; a realistic 20-character name, "Image upload service", is 143px
== phone options for the 7 x 24 grid
   P1, names at the left as on a desktop: full names 78px -> pitch 5.8px; short names 31px -> pitch 7.7px
   P2, turned on its side: hour labels 15.8px -> 7 columns of 28.6px; day labels at 12px: full 67px, short 26px; 24 rows of 16px = 384px of grid
   P3, each row name above its strip: 24 columns of 9.3px, 7 strips of 16px + 7 name lines of 18px + 6px = 280px of grid
== option B, a square in the text color whose area grows with the value
   desktop cell 19.1px: value 5 -> 2.4px, 25 -> 5.4px, 100 -> 10.8px, 224 -> 16.2px
   phone cell 8.3px: value 5 -> 0.9px, 25 -> 2px, 100 -> 4px, 224 -> 6px
== values that fit a cell, at 12px tabular: '7' 7.9px, '38' 15.8px, '224' 23.8px, '1250' 31.7px
== legend with large numbers: bounds 0..1000000 step 200000 -> swatch 64px x 5 = 320px
unit widths: sign-ups 49 errors 34 | 'no data' 44
errors legend + no-data key: 246
column labels + 4px: hours 19.8 | Mon 29 | 'Wed' 26
highest 224 [ 'Thursday 11' ] | lowest 5 [
  'Tuesday 2',
  'Friday 0',
  'Friday 1',
  'Friday 2',
  'Friday 3',
  'Friday 4'
]
sign-ups cells per step: 69, 44, 34, 17, 4
errors highest 38 [ 'Checkout Wed' ] | lowest 0 3 cells
errors cells per step: 29, 8, 2, 2
```

The heights ("about 262px") follow the layout in section 4: the legend and its numbers take the top 42px, the column labels the next 16px, and the band starts at 66px. They are estimates until item 1 draws the forms.

---

## Decisions

Decided on 2026-11-23, so that the work can go on while the user is away. Each choice puts the report reader first: readable at a glance, honest about the numbers, and working on a phone, on paper and with a screen reader. Each one can be changed in review, because no code exists yet.

1. **The color: A2, the heat steps.** It is the only option that still reads in an 8px phone cell, keeps a number readable inside a cell, keeps one order in light, dark and on paper, and leaves the accent and the status colors to their own meanings. The other real choice was B, squares by size. B needs no change to the color rule, but small values shrink to 1px on a phone and no number fits in a cell, so the reader loses the most.
2. **The name: `"heatmap"`.** It is the word that readers and authors already use, written as one word like `"usecase"`. `"heat"` is unclear alone, and `"matrix"` says nothing about the shades.
3. **The phone form: P3, each row name above its row of cells.** It fits every heat map within the limits, so a phone reader always gets the picture, and it keeps the grid the way the desktop shows it. P2, turned on its side, gives wider cells, but the reader must turn the picture in their head: "later" runs to the right on a desktop and down on a phone.
4. **The scale: needed in the data.** The reader of two weekly reports sees the same steps in both, because the author fixed the edges. A scale that the renderer computes could move the edges from week to week. `readScale` already checks every rule. A computed scale can come later without breaking any data.
5. **Values above the scale: refused.** Every step is then exact, and the legend has no open end, so the reader can trust it. The cost is that one spike can press every other cell into step 1; the fit warning on the lowest step tells the author, who can say the spike in the text. An open top step ("200 and more") comes when a real report needs it, and adding it breaks no data.
6. **The page heat map: its own kind, `"heatplan"`, on the plan's code, after item 2.** One reader's question gets one kind, as for the range chart and the layout to scale. The plan keeps its approved rule that every box looks the same, so a reader who knows plans is never misled by a filled box.
7. **Raw points: not in the renderer.** The author counts the points into cells with the rules in section 9, and says the cell size in the label. A `points` field would put thousands of numbers in a one-file page, and it would hide the choice of cell size, which changes the picture.

## Not in this proposal

- Code. Item 1 comes in its own pull request.
- A change to the range chart, the layout to scale or the plan.
- Any color other than the five heat steps. A heat map has no field for a color.
