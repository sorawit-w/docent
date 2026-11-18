---
name: docent
description: Design kit for self-contained HTML documents such as guides and reports. It gives a quiet page look, step-by-step walkthroughs, workflow diagrams with a moving dot, card grids, and four small widgets for the reader (a chooser, a value picker, a checklist, a decision helper). It carries scripts that draw the diagrams and build the widgets from data, put the page styles into the document, and check the result. Use it when the user asks to write, restyle or check a document "with Docent" or "in the Docent style".
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
| `scripts/render.cjs` | Draws every diagram and builds every widget of a document, each from its data. |
| `scripts/stamp.cjs` | Puts the page styles and the page script into a document. |
| `scripts/check.cjs` | Tests a document against the rules. |

The scripts need Node 18 or newer and nothing else. They install no packages and use no network. When Node is missing, see "When a script cannot run" below.

## When to use it

- The user asks for a guide, a report or another long document as one HTML file, and wants the Docent look.
- The user asks to restyle an existing HTML document with Docent.
- The user asks whether a document follows the Docent rules.

Do not use it for app screens, slide decks or marketing pages.

## How to work

1. **Read the rules.** Read `references/DESIGN.md` in full before you write.
2. **Start from the template.** Copy `assets/template.html` to the new file with a file copy, not by typing it again, and replace its content. A comment names each block: the top bar, the title block, a section with a margin note, a figure in the text flow, the walkthrough, the four widgets, a block heading, a small heading, a card grid, lists, a definition list, a table, status notes, a code block and a closed section. Use the class names as they are, and remove the blocks that you do not need. Each diagram block and widget block in the template holds its data and nothing else: `render` writes the drawing or the markup after the data. The template has no page styles and no page script: `stamp` adds them between `docent:kit` markers. Do not edit anything between those markers. Your own styles, if you need any, go in a separate `<style>` after the kit. `stamp` puts the kit just before `</head>`, so add your `<style>` after `stamp` ran. A host project's accent, heading color and fonts are the one exception: set them with the `--host-*` tokens (see "Host colors and fonts" below), which work anywhere in the document.
3. **Keep one file.** No fonts, scripts, styles or images from the network.
4. **Pick the block for steps.** When the steps have two or more actors (a person and a system, or two teams), use the walkthrough: its diagram shows who acts and what moves, and a list cannot show that. When one actor does every step, write a plain numbered list (`<ol>`); the walkthrough block needs a diagram, so it is not for these steps. When such a step holds a code block, a table or a widget, write each step as a numbered block heading (`<h3 class="step">`) with its blocks below it; the kit writes the number. When the steps have one short branch beside them, such as "if the report is known, it is closed", give the diagram a side leg (see `references/diagrams.md`); it keeps the walkthrough. When `render` warns that the drawing is too wide beside the steps, put one diagram in the text flow and write the steps as a numbered list below it. Points are a plain `<ul>`. The kit styles both lists; write no styles of your own for a list.
5. **Write in the Docent voice.** Plain words, one idea per sentence. A step heading is one sentence of at most six words. The `<title>` is `Document title — Host project`. When the `<h1>` is long, the left part may be shorter, made of the `<h1>`'s own words in the same order: `<h1>How to report a bug and get a fix</h1>` can have `<title>Report a bug — Host project</title>`.
6. **Write each diagram as data.** Read `references/diagrams.md`. Draw a diagram only when it shows something that words cannot, and never draw the same thing twice. Let the renderer pick the form. For calls and replies between a few participants in time order, write a sequence diagram (`"kind": "sequence"`), not a numbered list. For steps with decisions, paths that end early or arrows back, write a flowchart (`"kind": "flow"`); when the readers know UML, or the steps run at the same time or belong to different people, write an activity diagram (`"kind": "activity"`). For the states one thing moves through and the events that move it, write a state machine diagram (`"kind": "state"`). When a flow is made of several exchanges that each have their own sequence diagram, write an interaction overview diagram (`"kind": "interaction-overview"`). When exact times matter, such as a timeout or a deadline, write a timing diagram (`"kind": "timing"`). For who uses a system and for what, write a use case diagram (`"kind": "usecase"`). Give a part a `state` (`ok`, `warn` or `err`) only when the document reports how that part ended; there is no other way to color a diagram. Never write or edit the SVG by hand: change the data in the block, and `render` replaces the drawing.
7. **Write each widget as data, and only when the reader needs one.** Read `references/widgets.md`. A widget is allowed only when the reader must choose one case of several, track what is done, or decide between answers. In every other case write text, a table or a closed section. Docent has four widgets: a chooser, a value picker, a checklist and a decision helper. When the text is the same for every reader and only small values differ (an environment's host name, a port, a folder), use the value picker. Never write the markup of a widget by hand, and never write a widget of your own with a script.
8. **Run the three scripts**, in this order. `SKILL` stands for the folder that holds this file:

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
9. **Look at the result.** Open the document in a browser at desktop and phone width, in light and dark, and in print preview. Use each widget once. `check` cannot do this for you. If you have no browser, say so to the user.

When the user asks for something that a design rule forbids, follow the rule, say which rule it is, and offer the user's way. Do it the user's way when the user confirms. This holds for design rules only. When the user asks for an app screen, a slide deck or a marketing page, say that Docent is not made for it, and write nothing with Docent.

## Text blocks to know

- **Status notes** come in five kinds: `<span class="state ok">`, `warn` and `err` take the status colors; `info` (plain information, a muted dot) and `plan` (planned, or behind a feature flag, a muted ring) take none. Use a state in a status note, in a table cell, or in a line of text. A label may be long; it wraps.
- **A definition list** (`<dl>`, `<dt>`, `<dd>`) holds terms and their meanings, such as a glossary or the fields of a form. Use a table when each term has more than one fact.
- **A small heading** (`<h4>`) names a part inside the part of a block heading. Do not write a bold paragraph in its place.
- **A card grid** (`<ul class="cards">`) shows 3 to 8 short items side by side: each `<li>` holds an `<h3>` or a large number (`<p class="big">`), and one `<p>` line. Use it for a few parallel items that the reader should see together. Use a list when the items are a sequence, and a table when the reader compares facts. `check` warns about fewer than 3 or more than 8 cards.
- **Short codes and labels** are `<code>`, such as `<code>P1</code>` or `<code>GET</code>`. A status is a state: `<span class="state err">Blocked</span>`. Docent has no colored badge: a colored fill breaks the rule that the accent is a mark, and green, amber and red mean status only.
- **Code blocks** have no colors by kind of word. Mark a comment line with `<span class="cm">`, as the starting page does; it takes the muted color. Docent has no syntax highlighting: more colors would add a palette that the page does not have.
- **A table** may hold code in its cells: a long path or command breaks inside its cell. A closed section may hold a table, a code block or a figure; then it takes the full width.

## Host colors and fonts

A host project may set its accent, its heading color and its fonts, with these tokens in a `<style>` anywhere in the `<head>`, also before `stamp`:

```html
<style>
:root {
  --host-accent: #0b6e4f;       /* links, the dots and the focus ring in light mode and on paper */
  --host-accent-dark: #6fd3a8;  /* the same in dark mode */
  --host-ink: #0b3d2e;          /* the title and section headings in light mode */
  --host-sans: "Inter", system-ui, sans-serif;  /* body text; also --host-serif and --host-mono */
}
</style>
```

- Set the accent for both themes. Each needs a contrast of 4.5:1 on its page: `check` tests a hex color and reports an error below that.
- Do not set the kit's own tokens (`--primary`, `--bg`, and the others). The kit sets them in four places, so your value is lost in dark mode or in print; `check` warns.
- There is no token for the page, the text or the status colors.
- A font must be in the file or on the reader's system. Drawings keep the system font.
- **To turn dark mode off**, write `<html lang="en" data-theme="light">`. The switch is hidden, and the page stays light. `data-theme="dark"` keeps it dark.

## Optional lines

- **Keep a document out of search engines.** Most documents are internal. When a document will sit on a web server and must not appear in search results, add this line in the `<head>`, after the viewport line. The starting page does not have it, because a public guide that carries it disappears from search, and the author may not notice.

  ```html
  <meta name="robots" content="noindex">
  ```

- **A code formatter.** A formatter such as Prettier rewrites the kit, the drawings and the widgets of a built document, and `check` then reports them as changed. Keep each Docent document out of the formatter: add its path to the formatter's ignore list, for Prettier the file `.prettierignore`. If a formatter already ran, run `render` and `stamp` again; they write the kit, the drawings and the widgets anew, and the data blocks are not harmed.

## When a script cannot run

- **The machine has no Node 18 or newer, and you write a document.** Write the document with its data blocks. Write no drawing, no widget markup and no page styles by hand. Give the user the three commands of step 8, and say that the document is not finished until they ran.
- **The machine has no Node 18 or newer, and you check a document.** Read its source against `references/DESIGN.md` by hand. Say that this was a reading by hand, and that `check` did not run.
- In both cases, report no result of a script that did not run.

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

## Limits to know

- The renderer estimates text widths, because it cannot measure them. The estimate is wide enough for Apple devices (tested). It was not tested on Windows, Android or Linux fonts.
- A diagram has at most 5 lanes, 12 parts and 16 legs. Text that is too long is refused. Beside walkthrough steps, two lanes fit.
- A figure holds one drawing, or two for two separate chains.
- On a phone and on paper, a route takes its single-track form and any other data takes its column form, where a leg that is not to the next part is a go-to row ("to Answer"). Both fit a 320px screen when names have up to about 20 characters. A drawing that is still wider than its well scrolls sideways inside it; with scripts on, a line under the well tells the reader to scroll.
- The styles count the steps of a numbered block heading and of a walkthrough. With scripts on, the page script writes each number as text, so a screen reader reads it. With scripts off, a screen reader in Chromium does not read the number.
- With scripts on, each code block has a button that copies the code. With scripts off, the button and the line under a wide drawing do not show.
- A value picker changes text only. A value cannot sit in a link address, an attribute, a drawing or another widget.
- A widget holds text only: paragraphs, code, lists and short lines. It cannot hold a table, a diagram or a picture.
- A chooser remembers the choice, and a checklist remembers the ticks, in the reader's own browser. With scripts off they still work, but they remember nothing.
- `check` tests the rules that a source can show: the kit, each drawing and each widget against its data, no network, a flat page, text sizes, the title, and one step for each leg of a walkthrough. It does not test whether the accent is used as a fill, whether the text is in plain words, or whether the reader needs a widget. It warns when a document has more than 4 widgets.
