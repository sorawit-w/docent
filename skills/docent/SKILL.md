---
name: docent
description: Design kit for long documents as one self-contained HTML file that opens with no network, in light and dark, and prints well. Use it to write, restyle or check a document for a software team or a business team. Software teams use it for design docs and RFCs, decision records (ADRs), runbooks, incident reviews, release notes, migration guides, API and settings references, and onboarding guides. Business teams use it for customer and market analysis reports, metrics reviews, and customer research summaries. It gives a quiet page look, step-by-step walkthroughs, diagrams drawn from data (workflows, sequence and UML diagrams, funnels, heat maps, status grids), card grids, and four small widgets for the reader. Its scripts draw the diagrams, build the widgets, put the page styles into the file, and check the result. Also use it when the user asks for a document "with Docent" or "in the Docent style". Do not use it for app screens, slide decks or marketing pages.
---

# Docent

A guide inside every document.

Docent is a design kit for documents: single HTML files that open without a network. A docent is a museum guide. The kit does the same job for a long document. It shows the reader where to look, one step at a time.

## What the skill holds

| Path | What it is |
|---|---|
| [`references/DESIGN.md`](references/DESIGN.md) | The design rules. The single authority for colors, type, layout, diagrams, icons, motion and voice. |
| [`references/diagrams.md`](references/diagrams.md) | How to write a diagram as data, and the names of the built-in icons. |
| [`references/widgets.md`](references/widgets.md) | When a widget is allowed, and how to write one as data. |
| [`assets/template.html`](assets/template.html) | The starting page. It holds one of each block, and a comment names each block. It is not built yet: it has no page styles and no drawings until `render` and `stamp` run. It is short, so read all of it. |
| [`assets/specimen.html`](assets/specimen.html) | The sample page: a full, built document that follows every rule. Open it in a browser to see the look. Do not read its source: it is long, and the starting page shows every block. |
| [`assets/specimen-branded.html`](assets/specimen-branded.html) | The same sample page for a host with a brand: a logo in a light and a dark version, a tagline, and the Harbor palette. Open it in a browser; do not read its source. |
| `scripts/render.cjs` | Draws every diagram and builds every widget of a document, each from its data. |
| `scripts/stamp.cjs` | Puts the page styles and the page script into a document. |
| `scripts/check.cjs` | Tests a document against the rules. |
| `scripts/brand.cjs` | Reads a host project's `DESIGN.md` and prints its host tokens. It writes nothing. |

The scripts need Node 24 or newer and nothing else. They install no packages and use no network. Before the first script, run `node --version`. When it is older than 24, tell the user once, in one sentence, which version you found and that Docent needs 24 or newer. Then run the scripts anyway, and report their results as not tested on that version. When Node is missing, see "When a script cannot run" below.

## When to use it

- The user asks for a long document for a software team as one HTML file: a design doc or RFC, a decision record (ADR), a runbook, an incident review, release notes, a migration guide, an API or settings reference, or an onboarding guide.
- The user asks for a long document for a business team as one HTML file: a customer or market analysis report, a metrics review, or a summary of customer research.
- The user asks for a guide, a report or another long document "with Docent" or in the Docent look.
- The user asks to restyle an existing HTML document with Docent.
- The user asks whether a document follows the Docent rules.

Do not use it for app screens, slide decks or marketing pages. For one picture to use in another tool, or a picture whose main job is a brand's style, see "When another skill fits better" below.

## When another skill fits better

Docent is for a whole document that people read, keep and must trust. It holds text, tables, charts and steps together. People read it on a phone, with a screen reader or on paper, and it is often made again with new numbers.

The diagram-design skill makes one diagram at a time. When it is installed, it fits better for:

- one picture to paste into another tool. It exports PNG and SVG; Docent makes only whole pages;
- a picture whose main job is a brand's style, such as the main picture of a landing page or a pitch;
- a type that Docent leaves out, when the user knows why Docent leaves it out and still wants it;
- an existing draw.io or Mermaid file to draw again;
- a sketchy or magazine style.

To choose, ask four questions:

1. Is the result a whole document, or one picture to use somewhere else?
2. Will people read it on a phone, with a screen reader or on paper?
3. Will it be made again with new numbers that someone must check?
4. Is the brand's style the main goal, or is the type one that Docent leaves out?

**Before you offer it, say what changes.** It writes a separate HTML, SVG or PNG file. Its pictures do not follow Docent's rules: they use web fonts and small text, and they have no phone form and no table in words. So `check` does not test them.

**Never put its picture inside a Docent document.** The picture would break the rules for hand-drawn figures. In the document, show the same facts in a table, or link to the separate picture.

**When it is not installed,** do not tell the user to install it. Name it only when the user asks what else could make the picture.

## How to work

1. **Read the rules.** Read `references/DESIGN.md` in full before you write.
2. **Start from the template.** Copy `assets/template.html` to the new file with a file copy, not by typing it again, and replace its content. A comment names each block: the skip link, the top bar (with a place for the host's logo), the title block, a section with a margin note, a figure in the text flow, the walkthrough, the four widgets, a block heading, a small heading, a card grid, lists, a definition list, a table, status notes, a code block, a closed section, and the footer with the host's tagline and Docent's credit. Use the class names as they are, and remove the blocks that you do not need. Each diagram block and widget block in the template holds its data and nothing else: `render` writes the drawing or the markup after the data. The template has no page styles and no page script: `stamp` adds them between `docent:kit` markers. Do not edit anything between those markers. Your own styles, if you need any, go in a separate `<style>` after the kit. `stamp` puts the kit just before `</head>`, so add your `<style>` after `stamp` ran. A host project's accent, heading color and fonts are the one exception: set them with the `--host-*` tokens (see "Host colors and fonts" below), which work anywhere in the document.
3. **Choose a profile.** Write it on `<html>`, as `data-profile`. See "Choose a profile" below.
4. **Keep one file.** No fonts, scripts, styles or images from the network.
5. **Pick the block for steps.** When the steps have two or more actors (a person and a system, or two teams), use the walkthrough: its diagram shows who acts and what moves, and a list cannot show that. When one actor does every step, write a plain numbered list (`<ol>`); the walkthrough block needs a diagram, so it is not for these steps. When such a step holds a code block, a table or a widget, write each step as a numbered block heading (`<h3 class="step">`) with its blocks below it; the kit writes the number. When the steps have one short branch beside them, such as "if the report is known, it is closed", give the diagram a side leg (see `references/diagrams.md`); it keeps the walkthrough. When `render` warns that the drawing is too wide beside the steps, put one diagram in the text flow and write the steps as a numbered list below it. Points are a plain `<ul>`. The kit styles both lists; write no styles of your own for a list.
6. **Write in the Docent voice.** Plain words, one idea per sentence. A step heading is one sentence of at most six words. The `<title>` is `Document title — Host project`. When the `<h1>` is long, the left part may be shorter, made of the `<h1>`'s own words in the same order: `<h1>How to report a bug and get a fix</h1>` can have `<title>Report a bug — Host project</title>`.

   **Write numbers by the rules in "Numbers" in `references/DESIGN.md`.** They hold in the text, tables, captions, chart data and cards; code keeps its own form. In short: digits and a space before the unit (`320 ms`, but `18%`); two or three digits that matter, and the same decimals down a column; a comma from 1,000 up (`12,400`), but none in a year or a code; a minus sign (`−12`), or a word in the text ("fell by 12"); an en dash for a range in a table (`45–76`), and "from 45 to 76" in the text; "percentage points" in full for a change in a rate, never `pp` or `pts`; `n = 1,090 reports` in a source line; a change with its direction as a word, its amount and the period it is compared with ("up 12% against Q2 2026 (973)"); dates as `1 July 2026`, never `7/1/2026`; "about 250", not `~250`. `check` warns about rules 2 to 6, 9 and 10, and quotes what it found. It cannot read the meaning: whether a number needs a unit, whether a change of a rate is in percent, whether n is given, or whether a change names its period. Check those yourself.
7. **Write each diagram as data.** Read `references/diagrams.md`. Draw a diagram only when it shows something that words cannot, and never draw the same thing twice. Pick the kind by what the reader needs to learn: find the reader's question in this table, and write what it says. Let the renderer pick the form.

   | The reader asks | Write |
   |---|---|
   | What happens, in order, when one actor does every step? | A numbered list (`<ol>`), no diagram |
   | Who does what, in order, across people and systems? | A workflow diagram (no `"kind"`), in the walkthrough |
   | Who calls whom, and what comes back? | A sequence diagram (`"kind": "sequence"`) |
   | Which path does a job take, with decisions and loops? | A flowchart (`"kind": "flow"`) for readers who do not know UML; an activity diagram (`"kind": "activity"`) when they do, or when the steps run at the same time or belong to different people |
   | Which states can a thing be in, and what moves it? | A state machine diagram (`"kind": "state"`) |
   | How do several exchanges fit together, each with its own sequence diagram? | An interaction overview diagram (`"kind": "interaction-overview"`) |
   | When does each state change, against a clock, such as a timeout? | A timing diagram (`"kind": "timing"`) |
   | Who uses the system, and for what? | A use case diagram (`"kind": "usecase"`) |
   | Which things exist, and how do they relate? | A class diagram (`"kind": "class"`) |
   | What does one example of that look like, with values? | An object diagram (`"kind": "object"`) |
   | How is the code grouped, and what depends on what? | A package diagram (`"kind": "package"`) |
   | Which stereotypes does our team add to UML? | A profile diagram (`"kind": "profile"`) |
   | Which parts make up the system, and which services do they offer and need? | A component diagram (`"kind": "component"`) |
   | What is inside one part, and how do its pieces connect? | A composite structure diagram (`"kind": "composite"`) |
   | Where does each part run, and how do the machines talk? | A deployment diagram (`"kind": "deployment"`) |
   | Who is linked to whom, and in which order do they talk? | A communication diagram (`"kind": "communication"`); a sequence diagram reads better when the order matters more than the links |
   | Where does each value or range fall on one scale, and does ours fall inside theirs? | A range chart (`"kind": "range"`), for 3 to 12 values in one unit; a sentence for one or two |
   | Where does each part sit along one width, how wide is it, and how big are the gaps? | A layout to scale (`"kind": "layout"`), for one axis only, such as a screen or a page |
   | Where do the parts of a page or screen sit, and what is next to what? | A plan (`"kind": "plan"`), a grid of named areas in rows and columns |
   | How many people reach each step of a flow, and where do they leave? | A funnel (`"kind": "funnel"`), for 3 to 8 steps that everyone takes in one order; a sentence for 2 |
   | How large is each amount, and which is largest? Or how did each change between two times? | A bar chart (`"kind": "bar"`), for 2 to 16 amounts in one unit, bars from 0; with `"series"`, a dumbbell for two values in each row. A sentence for one or two amounts; a table when each exact number matters |
   | How did an amount change over time, and when did it rise or fall? | A line chart (`"kind": "line"`), for 3 to 36 equally spaced points and 1 to 5 series in one unit, with `"focus"` on the series the text talks about; `"multiples": true` when several series matter equally; a slopegraph for two points. A table for points that are not equally spaced |
   | Where are the numbers highest, across two sets of things, such as weekdays and hours? | A heat map (`"kind": "heatmap"`), for 2 to 12 rows and 3 to 24 columns; a table for fewer than 12 cells or when each number matters |
   | How much happens in each area of a page or screen, such as clicks on each part? | A heat plan (`"kind": "heatplan"`), a plan whose 2 to 8 boxes each hold a number; a table of the counts for more areas. Never a blurred glow over a screenshot |
   | When, and where, did something fail its target, such as the uptime of each part by day? | A status grid (`"kind": "statusgrid"`), for 1 to 12 rows and 3 to 24 columns, with thresholds or states written directly; a heat map when the question is how much; a sentence when every cell is OK |
   | Where does each thing stand on two judged axes, what lies inside what, which sets overlap, what caused a problem, how mature is each part, how does a user feel at each stage, or which steps go into which release? | A hand-drawn figure (`data-drawn="hand"`), only for a quadrant, nested, Venn, fishbone, Wardley map, user journey or story map, under the contract below; a table or words when it says the same |

   When the data does not fit its kind, `render` and `check` say so in a warning, such as "no reply comes back; this reads as a workflow". Read it, and change the kind or keep it; a warning never changes the drawing. Give a part a `state` (`ok`, `warn` or `err`) only when the document reports how that part ended; there is no other way to color a diagram. Never write or edit the SVG of a built-in kind by hand: change the data in the block, and `render` replaces the drawing.

   **Hand-drawn figures.** When the reader needs a type in the hand-drawn list, you may draw it by hand: a quadrant (2×2), a nested (containment) diagram, a Venn diagram, a fishbone, a Wardley map, a user journey or a story map. Follow the contract in "Hand-drawn figures" in `references/diagrams.md`, and `check` tests it: the marker `data-drawn="hand"` with the type, plain shapes and texts with the kit's `hd-*` classes and no colors or styles of their own, at most 640px wide at its real size, nothing from the network, an accessible name, and the diagram in words beside it. The classes draw from Docent's tokens, so dark mode, print and the reader's settings follow, and no text is under 12px. If the diagram-design skill is installed, you may follow its guide for the type's layout and its anti-patterns. Docent's rules always win: never take its fonts, sizes, colors or legend. Then open the page in a browser, in light and in dark, at a phone width and in print preview, and fix what you see, before you say the figure is done: `check` cannot see a label over a line or an arrow that points at the wrong box. Draw no other SVG in a figure well. A type that Docent draws from data (a bar chart, a line chart, a flowchart and the others in the table above) is refused by name, with the kind to use. A type that Docent leaves out (a pie, radar, polar, pyramid, treemap, bubble or Sankey chart) is refused with the reason, the rule "Position and length" in `references/DESIGN.md`; if the user asks for it anyway, see the rule below on a design rule that the user asks to break. A type that Docent plans as a kind (a scatter plot, a timeline, a Gantt chart, a tree or a database schema) is a table or words until it is built. When no kind and no hand-drawn type fits, say the gap to the user, and use a table or words.

   **The promotion rule.** When two real documents use the same hand-drawn type, it is a candidate for a built-in kind, with a proposal of its own. Tell the user each time you draw one, and name the type, so they can count. A sample page or a test does not count.
8. **Write each widget as data, and only when the reader needs one.** Read `references/widgets.md`. A widget is allowed only when the reader must choose one case of several, track what is done, or decide between answers. In every other case write text, a table or a closed section. Docent has four widgets: a chooser, a value picker, a checklist and a decision helper. When the text is the same for every reader and only small values differ (an environment's host name, a port, a folder), use the value picker. Never write the markup of a widget by hand, and never write a widget of your own with a script.
9. **Run the three scripts**, in this order. `SKILL` stands for the folder that holds this file:

   ```bash
   node SKILL/scripts/render.cjs document.html
   ```

   ```bash
   node SKILL/scripts/stamp.cjs document.html
   ```

   ```bash
   node SKILL/scripts/check.cjs document.html
   ```

   `render` makes every diagram and every widget that it can. When it refuses one, it says why, leaves that block as it was, and ends with exit code 1. Fix every error that `render` and `check` report, then run them again. Read every warning and decide.
10. **Look at the result.** Open the document in a browser at desktop and phone width, in light and dark, and in print preview. Use each widget once. `check` cannot do this for you. If you have no browser, say so to the user.

## Choose a profile

A profile tells the kit how much space the page has and how wide code and tables are. It never changes the text column. Write it on `<html>`: `<html lang="en" data-profile="task">`. The starting page has `data-profile="standard"`.

| Profile | For | Write first | On the page |
|---|---|---|---|
| `standard` | An explanation, a tutorial, a policy, a guide, a decision record (ADR), a research report, a customer research summary | What the reader will understand, then the parts, with figures | Code and tables end at the right edge of the notes |
| `task` | A how-to, a runbook, troubleshooting | What the reader needs, then the numbered steps, then what to do when a step fails | Like Standard, with less space between steps and sections |
| `reference` | Commands, options, an API, settings, a log or a trace | One section for each item, its facts in a margin note, and tables | Code and tables up to 1120px, and tighter table rows |
| `brief` | A report for managers, such as a business analysis report; an incident report, release notes | The outcome and its impact, then a timeline table and the actions | Code and tables up to 1120px |

Choose in this order:

1. The profile that the author names.
2. The kind of document that the user asks for, or the readers that they name.
3. The content. `check` names a profile when the page clearly looks like one: code blocks and tables that hold more text than the paragraphs, numbered steps, many times of day, or the kind of document in the title block's margin note. A timeline table counts toward Brief, not Reference.
4. Standard.

Choose on your own. Ask the author only when two profiles fit equally and the choice matters, such as a page that will be printed or read on phones. Code alone does not make a Reference page: a tutorial and a runbook hold code too, and they are Standard and Task. A word in the name does not choose either: a research report, a customer research summary and a decision record explain a result or a choice, so they are Standard, although they are called a report, a summary or a record. A business analysis report is Brief, because its readers are managers who want the outcome first, and its tables of segments and plans need the wider block.

**A page for the public.** When the readers are the public or older readers, also write `data-text="large"`: `<html lang="en" data-profile="standard" data-text="large">`. The body text is then 18px on screen and 12pt on paper, and the text column grows with it.

When the user asks for something that a design rule forbids, follow the rule, say which rule it is, and offer the user's way. Do it the user's way when the user confirms. This holds for design rules only. When the user asks for an app screen, a slide deck or a marketing page, say that Docent is not made for it, and write nothing with Docent.

## Text blocks to know

- **Status notes** come in five kinds: `<span class="state ok">`, `warn` and `err` take the status colors; `info` (plain information, a muted dot) and `plan` (planned, or behind a feature flag, a muted ring) take none. Use a state in a status note, in a table cell, or in a line of text. A label may be long; it wraps.
- **A definition list** (`<dl>`, `<dt>`, `<dd>`) holds terms and their meanings, such as a glossary or the fields of a form. Use a table when each term has more than one fact.
- **A small heading** (`<h4>`) names a part inside the part of a block heading. Do not write a bold paragraph in its place.
- **A card grid** (`<ul class="cards">`) shows 3 to 8 short items side by side: each `<li>` holds an `<h3>` or a large number (`<p class="big">`), and one `<p>` line. Use it for a few parallel items that the reader should see together. Use a list when the items are a sequence, and a table when the reader compares facts. `check` warns about fewer than 3 or more than 8 cards.
- **Short codes and labels** are `<code>`, such as `<code>P1</code>` or `<code>GET</code>`. A status is a state: `<span class="state err">Blocked</span>`. Docent has no colored badge: a colored fill breaks the rule that the accent is a mark, and green, amber and red mean status only.
- **Code blocks** have no colors by kind of word. Mark a comment line with `<span class="cm">`, as the starting page does; it takes the muted color. Docent has no syntax highlighting: more colors would add a palette that the page does not have.
- **A column of numbers** in a table takes `class="num"` on each of its cells, the heading too: `<th scope="col" class="num">Reports</th>` and `<td class="num">1,204</td>`. The numbers then line up on the right, in figures of one width. `check` warns when every body cell of a column is a number and the column is not marked. A row heading (`<th scope="row">`) is a name, so it stays on the left.
- **A source line** is the last line of a figure's caption: `<span class="source">Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,090 reports.</span>`. Write where the numbers come from, then the dates, then n with its unit; "Sources:" with a semicolon for two; "Source: invented sample data." for made-up numbers, as in a sample or a test. Every chart of measured numbers takes one: a range, bar or line chart, a funnel, a heat map, a heat plan and a status grid. `check` warns when one has none, and about a source line that is empty or stands outside a caption. A table of data from a system, a survey or a study goes in a figure too, with `<strong>Table 1</strong>` and a source line in its caption, as the starting page shows. A caveat does not go in the source line: write it in the text, or in the caption sentence when the reader needs it to read the chart.
- **The skip link** is the first line in `<body>`: `<a class="skip" href="#content">Skip to the content</a>`, with `id="content"` on `<main>`. It shows only when a keyboard reaches it, and it lets the reader jump past the top bar. Keep it as the starting page has it; `check` warns when it is missing.
- **A table** may hold code in its cells: a long path or command breaks inside its cell. A closed section may hold a table, a code block or a figure; then it takes the block width of the profile.

## Host colors and fonts

A host project may set its accent, its heading color and its fonts, with these tokens in a `<style>` anywhere in the `<head>`, also before `stamp`:

```html
<style>
:root {
  --host-accent: #a21caf;       /* links, the dots and the focus ring in light mode and on paper */
  --host-accent-dark: #ec6cf7;  /* the same in dark mode, also the dots */
  --host-ink: #4d0055;          /* the title and section headings in light mode */
  --host-sans: "Inter", system-ui, sans-serif;  /* body text; also --host-serif and --host-mono */
}
</style>
```

- Set the accent for both themes. Each needs a contrast of 4.5:1 on its page: `check` tests a hex color and reports an error below that. When only the light accent is set, `check` warns and names the dark accent of the same hue.
- In dark mode the dots take the dark accent. For a dot of another color, such as the host's second color, set `--host-dot-dark`; it needs 3:1 on the dark page. To keep Docent's lamp dot, write `--host-dot-dark: #f2b824`. A page that set `--host-accent-dark` before kit 0.13 had the lamp dot in dark mode; it takes the dark accent the next time `stamp` runs.
- `check` warns when an accent is close to green, amber or red, because its links and dots would read as a status, and when it has almost no color, because it looks like the body text.
- Do not set the kit's own tokens (`--primary`, `--bg`, and the others). The kit sets them in four places, so your value is lost in dark mode or in print; `check` warns.
- There is no token for the page, the text or the status colors. For a tinted page and grays, name a palette instead.
- **A palette** turns Docent's own colors to one hue, tested in advance: write `data-palette="harbor"`, `"plum"` or `"sepia"` on `<html>`, then run `render` and `stamp`. Harbor is a cool blue-green, for engineering and operations; Plum a deep violet-red, for product and design; Sepia warm paper, for long reading and policy. Host tokens still win over a palette's. See "Palettes" in `references/DESIGN.md`.
- A font must be in the file or on the reader's system. Drawings keep the system font.
- **To turn dark mode off**, write `<html lang="en" data-theme="light">`. The switch is hidden, and the page stays light. `data-theme="dark"` keeps it dark.

## Ask about the brand once

When you create the first Docent page in a repo, ask about the brand once. When the repo already has a Docent page (it carries the `docent:kit` marker), copy the brand from the newest one: the logo, the host tokens, the tagline and the credit. Then ask one question only: "Use the same brand as `docs/onboarding.html`?" The page is the record of the choices; write no other file into the host repo.

**When the document is about another product.** The host is the product that the document is about. When that is not the repo's own project, such as a report on a customer's product, the host is that product: use its name in the top bar and the `<title>`, and show no logo and no tagline unless the user gives them. Take nothing from the repo's own brand or from its other Docent pages: their logo, colors and tagline belong to another host.

**When no user can be asked,** such as an agent that works alone, do not wait for an answer. When the repo's newest Docent page is for the same host, copy its brand: a user chose it. Otherwise use the defaults in the column "When the user skips it" below: the name found, no logo, Docent's own colors, no tagline, and the credit as a link. In your report, name each default you used: "No one could be asked about the brand, so the page uses the name from `package.json`, no logo, Docent's own colors, no tagline, and the credit as a link." Never invent a brand: draw no logo, pick no color by eye, and write no tagline.

**First, read the repo, and change nothing:**

- a `DESIGN.md` at the root or in `docs/`;
- logo files: `logo*.svg`, `*-logo.svg`, `favicon.svg`, and SVG files in folders named `brand`, `logo`, `public`, `static` or `assets`, but not in `node_modules` or a build folder. Offer a PNG only when there is no SVG;
- lines for a tagline: the README's first line under its title, and the `description` in `package.json`, `pyproject.toml` or `Cargo.toml`;
- the host's name: the `name` in the same files, or the README's title.

**Then send one message with the name as a fact and four questions.** The user answers only what they want to change.

| # | Ask | Choices | When the user skips it |
|---|---|---|---|
| — | "The top bar will say **Example project** (from `package.json`)." | A fact. The user can correct it. | That name. With no name found, the folder's name, and say so. |
| 1 | "Which logo should the top bar show?" | Up to three files found, then "No logo". | No logo. |
| 2 | "Which colors should the page use?" | "From your DESIGN.md (accent #…)" when there is one; each palette by name with its mood (Harbor, Plum, Sepia); then "Docent's own colors". | Docent's own colors. |
| 3 | "Which tagline should the footer show?" | Each line found, word for word, then "No tagline". The user may type their own. | No tagline. Never write one. |
| 4 | "The footer says 'Made with Docent'. Keep 'Docent' as a link to the public repo, or plain text?" | "A link (Recommended)", "Plain text". | A link. |

**Colors from a `DESIGN.md`.** Run `node SKILL/scripts/brand.cjs DESIGN.md` and copy its style block into the page's `<head>`. Never pick a color by eye. `brand` fills the six host tokens and nothing else: it darkens a light accent that fails contrast, works out a missing dark accent and heading color with fixed rules, and keeps a brand font by name with Docent's fonts after it. It names every key it does not use, such as the page, status and spacing values: those would break dark mode, print and the tested contrast.

**When there is no `DESIGN.md`** and the host wants its own colors, three other skills can propose one, if they are installed. Offer each only in its case, and say first what it writes:

- **screenwright** infers tokens from the repo's styles and writes a `DESIGN.md` into the repo. Offer it for a repo that has styles.
- **impeccable**, with its `document` command, writes a `DESIGN.md` from the project's code.
- **brand-workshop** makes a new brand: a logo, a tagline and a `DESIGN.md`. Offer it only when the user says they have no brand and want one.

**After the answers,** build the page, run `check`, and report in one or two lines what was worked out and what was not used. For example: "Your DESIGN.md has no dark accent, so `brand` worked one out: #5ab08d. It did not use your page and status colors; Docent keeps its own, so dark mode and print stay readable."

**A logo that needs work.** `check` accepts a flat logo only (see "Logo, tagline and credit" below). When the chosen file uses `use`, `symbol`, a clip path, a mask or opacity, flatten it first: each shape on its own, in solid colors or gradients with hex stops. When it holds text, turn the letters into paths. When it has one color, offer to draw it with `currentColor`. When it shows only on a light page, say that dark mode puts it on a tile, and ask for a dark version. Never change the shapes or the colors as the reader sees them.

## Logo, tagline and credit

The starting page has a place for each one. See "Logo, tagline and credit" in `references/DESIGN.md` for how they look.

- **The logo** goes inside `<span class="host">`, before the name, as `<svg class="logo" ...>` or `<img class="logo" ...>`. It is optional; without one, the name stands alone.
  - **Inline SVG**, flattened to plain shapes: `path`, `circle`, `ellipse`, `rect`, `line`, `polyline` and `polygon`, in groups (`g`), with a `title`. Colors are hex values or `currentColor`. A shape may fill or stroke with a gradient in the same logo (in `defs`), whose stops have hex colors. No `use`, `symbol`, clip path, mask, opacity, script, style, link, image, filter, animation or text: flatten the logo first, and turn letters into paths. At most 24,000 characters, 400 elements and 8 levels deep. Give it a `viewBox` and `class="logo"`; `check` names the `width` and `height` for the slot. Each id in a logo is used once in the whole page, so the two versions of a logo need their own ids.
  - **A PNG or WebP**, only when the host has no SVG: `<img class="logo" src="data:image/png;base64,..." width="96" height="24" alt="">`, with at least three times the pixels it shows. Never a JPEG, a GIF, an SVG in a data URI, or a link to a file.
  - **A symbol** stands before the name, with `aria-hidden="true"` (or `alt=""`). **A wordmark** shows the name, so it stands alone in the host span and carries the name: `role="img" aria-label="Example project"` (or `alt="Example project"`). `check` then reads the host's name from that label.
  - **One color:** draw it with `fill="currentColor"`; it serves both themes and paper. **Its own colors:** it needs one color with 3:1 on the light page and one on the dark page. Otherwise give two versions, `data-for="light"` and `data-for="dark"`, side by side in the host span. A logo with one version only gets a tile in the other theme. Offer the host a one-color or a dark version first; it looks better than the tile.
  - Never draw or change the shapes of a host's logo, beyond the color and the letters as paths.
- **The tagline** is `<p class="tagline">` in the footer: one line of at most 90 characters, in the host's own words, with no link. Never write a tagline for the host. Without one, take the line out.
- **The credit** is `<p class="credit">` in the footer: "Made with Docent", with a one-color mark. Keep it. "Docent" is a link to the public repo by default; when the host chooses plain text, take out the `<a>` and keep the word. `check` warns when the credit is missing.

## Optional lines

- **Keep a document out of search engines.** Most documents are internal. When a document will sit on a web server and must not appear in search results, add this line in the `<head>`, after the viewport line. The starting page does not have it, because a public guide that carries it disappears from search, and the author may not notice.

  ```html
  <meta name="robots" content="noindex">
  ```

- **A code formatter.** A formatter such as Prettier rewrites the kit, the drawings and the widgets of a built document, and `check` then reports them as changed. Keep each Docent document out of the formatter: add its path to the formatter's ignore list, for Prettier the file `.prettierignore`. If a formatter already ran, run `render` and `stamp` again; they write the kit, the drawings and the widgets anew, and the data blocks are not harmed.

## When a script cannot run

- **The machine has no Node, and you write a document.** Write the document with its data blocks. Write no drawing, no widget markup and no page styles by hand. Give the user the three commands of step 9, and say that the document is not finished until they ran.
- **The machine has no Node, and you check a document.** Read its source against `references/DESIGN.md` by hand. Say that this was a reading by hand, and that `check` did not run.
- **Node is older than 24.** Tell the user once, in one sentence, which version `node --version` showed and that Docent needs 24 or newer. Then run the scripts anyway. They print the same warning, and they do not refuse. Report each result as not tested on that version.
- When a script did not run, report no result of it.

## Who does what

| The scripts do | The agent does |
|---|---|
| Draw diagrams, pick the form, and keep the spacing rules | Decide whether a diagram is needed, and write its data |
| Build widgets, and refuse data that is wrong or not complete | Decide whether the reader needs a widget, and write its data |
| Put the same styles and page script into every document | Write the text |
| Check a document and reject a bad icon | Pick or draw icons, and look at the result |

## What to tell the user

Say what was tested and what was not. Use these words:

- When `check` ends with 0 errors: "`check` reports 0 errors." Add the number of warnings and what they say.
- `check` reads the source only. It does not open a browser. So do not say that the contrast, the phone layout, print or motion were checked, unless you looked yourself. Say which views you opened.
- When `render` refused a diagram or a widget, say which one and why.
- Report each hand-drawn figure as hand-drawn, every time, with its type: "Figure 3 is a hand-drawn fishbone. `check` tested its contract; I looked at it in light, dark, at 375px and in print preview." Say which of those views you did not open. `check` names each one in a warning.
- Name the profile you chose and one reason, in one sentence: "I used the Reference profile, because the page is mostly commands and option tables."
- When a script prints a warning that Node is older than 24, pass it on to the user every time, even if you told them before.
- When `check` warns about personal data, tell the user what it found and where, as the warning names it (masked, such as `j***@company.com`). Ask whether to remove it, mask it, or keep it. Do not decide alone.

## Limits to know

- The renderer estimates text widths, because it cannot measure them. The estimate is wide enough for Apple devices (tested). It was not tested on Windows, Android or Linux fonts.
- A diagram has at most 5 lanes, 12 parts and 16 legs. Text that is too long is refused. Beside walkthrough steps, two lanes fit.
- A bar chart has 2 to 16 rows, 3 groups and 20 steps. Its bars run from 0 and are horizontal only; a dumbbell's scale may start above 0. Grouped bars, stacked bars and a second series beyond the dumbbell's two are not offered. A number that is not known is written as `null`, never left out.
- A line chart has 3 to 36 points, 1 to 5 series and 20 steps; small multiples have 2 to 6 panels, and a slopegraph 2 to 10 series. At most one series has `focus`; two or more series need `focus` or `"multiples": true`. There is no second value axis, no area and no smoothed line. Time labels that do not fit a phone are refused, and the message names the one to shorten; over many months, write each January as its year, such as `2026`.
- A heat plan has the limits of a plan: at most 4 columns, 5 rows and 8 boxes. Its numbers come counted by area; raw click points do not go into the data.
- A heat map has at most 12 rows and 24 columns. A column label of up to 7 characters fits a phone at any number of columns; longer labels may be refused, and the message names the one to shorten.
- A status grid has at most 12 rows and 24 columns. For a long strip of days, write a calendar of whole weeks (`"calendar": true`, 7 rows); the renderer reads no dates.
- A figure holds one drawing, or two for two separate chains.
- A hand-drawn figure is not the same every time, and `render` cannot draw it again: a change to its data means drawing it again by hand. It has no phone form, so on a phone it scrolls sideways inside its well, and its words are the phone reader's real form. It is at most 640px wide and 831px high, so it prints at its real size.
- On a phone and on paper, a route takes its single-track form and any other data takes its column form, where a leg that is not to the next part is a go-to row ("to Answer"). Both fit a 320px screen when names have up to about 20 characters. A drawing that is still wider than its well scrolls sideways inside it; with scripts on, a line under the well tells the reader to scroll.
- The styles count the steps of a numbered block heading and of a walkthrough. With scripts on, the page script writes each number as text, so a screen reader reads it. With scripts off, a screen reader in Chromium does not read the number.
- With scripts on, each code block has a button that copies the code. With scripts off, the button and the line under a wide drawing do not show.
- A value picker changes text only. A value cannot sit in a link address, an attribute, a drawing or another widget.
- A widget holds text only: paragraphs, code, lists and short lines. It cannot hold a table, a diagram or a picture.
- A chooser remembers the choice, and a checklist remembers the ticks, in the reader's own browser. With scripts off they still work, but they remember nothing.
- `check` reads the colors of an SVG logo, but not of a PNG or WebP logo. Look at a raster logo in light and dark yourself.
- `check` warns when a page looks like it holds personal data: email addresses and phone numbers, in the page text and in the data of each diagram and widget. It skips the names reserved for examples: `example.com`, `example.org`, `example.net`, any name under `.example`, `.test`, `.invalid` or `.localhost`, and the numbers 555-0100 to 555-0199. Use those in samples. It finds a phone number only by its usual shape, so it can miss one written in another way. It cannot find names or postal addresses: read the page for them yourself.
- `check` tests the rules that a source can show: the kit, each drawing and each widget against its data, the contract of each hand-drawn figure, no network, a flat page, text sizes, the title, the skip link, columns of numbers, a source line for each chart of measured numbers, the number rules that a source can show, and one step for each leg of a walkthrough. It does not test whether the accent is used as a fill, whether the text is in plain words, or whether the reader needs a widget. It warns when a document has more than 4 widgets.
