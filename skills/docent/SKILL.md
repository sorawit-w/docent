---
name: docent
description: Design kit for self-contained HTML documents such as guides and reports. It gives a quiet page look, step-by-step walkthroughs, workflow diagrams with a moving dot, and three small widgets for the reader (a chooser, a checklist, a decision helper). It carries scripts that draw the diagrams and build the widgets from data, put the page styles into the document, and check the result. Use it when the user asks to write, restyle or check a document "with Docent" or "in the Docent style".
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
2. **Start from the template.** Copy `assets/template.html` to the new file with a file copy, not by typing it again, and replace its content. A comment names each block: the top bar, the title block, a section with a margin note, a figure in the text flow, the walkthrough, the three widgets, a block heading, lists, a table, a status note, a code block and a closed section. Use the class names as they are, and remove the blocks that you do not need. Each diagram block and widget block in the template holds its data and nothing else: `render` writes the drawing or the markup after the data. The template has no page styles and no page script: `stamp` adds them between `docent:kit` markers. Do not edit anything between those markers. Your own styles, if you need any, go in a separate `<style>` after the kit. `stamp` puts the kit just before `</head>`, so add your `<style>` after `stamp` ran.
3. **Keep one file.** No fonts, scripts, styles or images from the network.
4. **Pick the block for steps.** When the steps have two or more actors (a person and a system, or two teams), use the walkthrough: its diagram shows who acts and what moves, and a list cannot show that. When one actor does every step, write a plain numbered list (`<ol>`); the walkthrough block needs a diagram, so it is not for these steps. When such a step holds a code block, a table or a widget, write each step as a numbered block heading (`<h3 class="step">`) with its blocks below it; the kit writes the number. When `render` warns that the drawing is too wide beside the steps, put one diagram in the text flow and write the steps as a numbered list below it. Points are a plain `<ul>`. The kit styles both lists; write no styles of your own for a list.
5. **Write in the Docent voice.** Plain words, one idea per sentence. A step heading is one sentence of at most six words. The `<title>` is `Document title — Host project`.
6. **Write each diagram as data.** Read `references/diagrams.md`. Draw a diagram only when it shows something that words cannot, and never draw the same thing twice. Let the renderer pick the form. Give a part a `state` (`ok`, `warn` or `err`) only when the document reports how that part ended; there is no other way to color a diagram. Never write or edit the SVG by hand: change the data in the block, and `render` replaces the drawing.
7. **Write each widget as data, and only when the reader needs one.** Read `references/widgets.md`. A widget is allowed only when the reader must choose one case of several, track what is done, or decide between answers. In every other case write text, a table or a closed section. Docent has three widgets: a chooser, a checklist and a decision helper. Never write the markup of a widget by hand, and never write a widget of your own with a script.
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
- A diagram has at most 4 lanes, 12 parts and 16 legs. Text that is too long is refused.
- Paths that branch have no single-track form for phones. Their drawing scrolls sideways inside its well on a narrow screen. With scripts on, a line under the well tells the reader to scroll. `render` warns when a whole arrow is off the first phone screen; then say that path in the text too.
- With scripts on, each code block has a button that copies the code. With scripts off, the button and the line under a wide drawing do not show.
- A widget holds text only: paragraphs, code, lists and short lines. It cannot hold a table, a diagram or a picture.
- A chooser remembers the choice, and a checklist remembers the ticks, in the reader's own browser. With scripts off they still work, but they remember nothing.
- `check` tests the rules that a source can show: the kit, each drawing and each widget against its data, no network, a flat page, text sizes, the title, and one step for each leg of a walkthrough. It does not test whether the accent is used as a fill, whether the text is in plain words, or whether the reader needs a widget. It warns when a document has more than 4 widgets.
