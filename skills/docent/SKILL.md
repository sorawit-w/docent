---
name: docent
description: Design kit for self-contained HTML documents such as guides and reports. It gives a quiet page look, step-by-step walkthroughs, and workflow diagrams with a moving dot. It carries scripts that draw the diagrams from data, put the page styles into the document, and check the result. Use it when the user asks to write, restyle or check a document "with Docent" or "in the Docent style".
---

# Docent

A guide inside every document.

Docent is a design kit for documents: single HTML files that open without a network. A docent is a museum guide. The kit does the same job for a long document. It shows the reader where to look, one step at a time.

## What the skill holds

| Path | What it is |
|---|---|
| [`references/DESIGN.md`](references/DESIGN.md) | The design rules. The single authority for colors, type, layout, diagrams, icons, motion and voice. |
| [`references/diagrams.md`](references/diagrams.md) | How to write a diagram as data, and the names of the built-in icons. |
| [`assets/template.html`](assets/template.html) | The starting page. It holds one of each block, and a comment names each block. |
| [`assets/specimen.html`](assets/specimen.html) | The sample page: a full document that follows every rule. Read it as an example. |
| `scripts/render.cjs` | Draws every diagram of a document from its data. |
| `scripts/stamp.cjs` | Puts the page styles and the page script into a document. |
| `scripts/check.cjs` | Tests a document against the rules. |

The scripts need Node 18 or newer and nothing else. They install no packages and use no network.

## When to use it

- The user asks for a guide, a report or another long document as one HTML file, and wants the Docent look.
- The user asks to restyle an existing HTML document with Docent.
- The user asks whether a document follows the Docent rules.

Do not use it for app screens, slide decks or marketing pages.

## How to work

1. **Read the rules.** Read `references/DESIGN.md` in full before you write.
2. **Start from the template.** Copy `assets/template.html` to the new file and replace its content. A comment names each block: the top bar, the title block, a section with a margin note, the walkthrough, a table, a status note, a code block and a closed section. Use the class names as they are, and remove the blocks that you do not need. Do not edit anything between the `docent:kit` markers. Your own styles, if you need any, go in a separate `<style>` after the kit.
3. **Keep one file.** No fonts, scripts, styles or images from the network.
4. **Write in the Docent voice.** Plain words, one idea per sentence. A step heading is one sentence of at most six words. The `<title>` is `Document title — Host project`.
5. **Write each diagram as data.** Read `references/diagrams.md`. Draw a diagram only when it shows something that words cannot, and never draw the same thing twice. Let the renderer pick the form. Never write or edit the SVG by hand: change the data in the block, and `render` replaces the drawing.
6. **Run the three scripts**, in this order. `SKILL` stands for the folder that holds this file:

   ```bash
   node SKILL/scripts/render.cjs document.html
   ```

   ```bash
   node SKILL/scripts/stamp.cjs document.html
   ```

   ```bash
   node SKILL/scripts/check.cjs document.html
   ```

   `render` draws every diagram that it can. When it refuses one, it says why, leaves that block as it was, and ends with exit code 1. Fix every error that `render` and `check` report, then run them again. Read every warning and decide.
7. **Look at the result.** Open the document in a browser at desktop and phone width, in light and dark, and in print preview. `check` cannot do this for you. If you have no browser, say so to the user.

## Who does what

| The scripts do | The agent does |
|---|---|
| Draw diagrams, pick the form, and keep the spacing rules | Decide whether a diagram is needed, and write its data |
| Put the same styles and page script into every document | Write the text |
| Check a document and reject a bad icon | Pick or draw icons, and look at the result |

## What to tell the user

Say what was tested and what was not. Use these words:

- When `check` ends with 0 errors: "`check` reports 0 errors." Add the number of warnings and what they say.
- `check` reads the source only. It does not open a browser. So do not say that the contrast, the phone layout, print or motion were checked, unless you looked yourself. Say which views you opened.
- When `render` refused a diagram, say which one and why.

## Limits to know

- The renderer estimates text widths, because it cannot measure them. The estimate is wide enough for Apple devices (tested). It was not tested on Windows, Android or Linux fonts.
- A diagram has at most 4 lanes, 12 parts and 16 legs. Text that is too long is refused.
- Paths that branch have no single-track form for phones. Their drawing scrolls sideways inside its well on a narrow screen.
- `check` tests the rules that a source can show: the kit, each drawing against its data, no network, a flat page, text sizes, the title, and one step for each leg of a walkthrough. It does not test whether the accent is used as a fill, or whether the text is in plain words.
