# Docent

**A guide inside every document.**

Docent is a design kit for documents: guides and reports written as single HTML files. It gives a document one calm look, a walkthrough that lights one step at a time, and workflow diagrams where a dot travels the route. A document opens in light or dark, prints cleanly, and stays readable without scripts.

Docent is packaged as an agent skill. An agent that writes a document loads the skill, follows its rules, and runs its scripts.

## Status

Version 0.1.0. The design is settled, and the three scripts exist with tests.

| Part | State |
|---|---|
| Design rules ([`DESIGN.md`](skills/docent/references/DESIGN.md)) | Written |
| `render`: draws diagrams from data | Built: Route wide, Route tall, Plates, and a single-track form for phones |
| `stamp`: puts the styles and the page script into a document | Built |
| `check`: tests a document against the rules | Built. It reads the source only; it does not open a browser |
| Built-in icon set | 15 icons |
| Sample page ([`specimen.html`](skills/docent/assets/specimen.html)) | Made by the scripts |
| Brand: brief, texts, mark ([`brand/`](brand/)) | Written |

Known limits:

- The renderer estimates text widths. The estimate was tested against the fonts of an Apple device only.
- Paths that branch have no single-track form for phones.
- A diagram has at most 4 lanes, 12 parts and 16 legs.

## See it

Open [`skills/docent/assets/specimen.html`](skills/docent/assets/specimen.html) in a browser. Scroll the walkthrough, switch the theme, make the window narrow, and open the print preview.

## Use it

The scripts need Node 18 or newer and no packages.

```bash
node skills/docent/scripts/render.cjs document.html
```

```bash
node skills/docent/scripts/stamp.cjs document.html
```

```bash
node skills/docent/scripts/check.cjs document.html
```

[`SKILL.md`](skills/docent/SKILL.md) says how an agent works with them. [`diagrams.md`](skills/docent/references/diagrams.md) says how to write a diagram as data.

## What is in this repository

```
skills/docent/        the skill an agent installs
  SKILL.md            when to use it, and how to work
  VERSION             the version of the kit
  references/         DESIGN.md (the design rules) and diagrams.md (diagram data)
  assets/             kit.css and kit.js (the page styles and script), template.html (the starting page),
                      specimen.html (the sample page)
  scripts/            render.cjs, stamp.cjs, check.cjs, and their parts in lib/
tests/                tests for the scripts, with stored expected drawings
  browser/            checks that open the sample page in a browser
brand/                the brand brief, short texts, and the mark
DESIGN.md             a link to skills/docent/references/DESIGN.md
```

## Tests

The tests need Node only:

```bash
node --test tests/*.test.cjs
```

When a drawing changes on purpose, look at it, then store the new expected output:

```bash
UPDATE=1 node --test tests/*.test.cjs
```

The contrast of every color pair:

```bash
python3 tests/contrast.py
```

The browser checks open the sample page and test accessibility, themes, motion, print, narrow screens and text widths. They need `playwright-core` and `axe-core`. Point `DOCENT_NODE_MODULES` at a `node_modules` folder that has both:

```bash
DOCENT_NODE_MODULES=/path/to/node_modules node tests/browser/check-render.cjs
```

After a change to the kit or the renderer, make the sample page and the starting page again and commit them:

```bash
for page in specimen template; do node skills/docent/scripts/render.cjs skills/docent/assets/$page.html && node skills/docent/scripts/stamp.cjs skills/docent/assets/$page.html; done
```

## License

MIT. See [`LICENSE`](LICENSE).
