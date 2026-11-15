# Docent

**A guide inside every document.**

Docent is a design kit for documents: guides and reports written as single HTML files. It gives a document one calm look, a walkthrough that lights one step at a time, and workflow diagrams where a dot travels the route. A document opens in light or dark, prints cleanly, and stays readable without scripts.

Docent is packaged as an agent skill. An agent that writes a document loads the skill, follows its rules, and (later) runs its scripts.

## Status

Draft. The design is settled and a sample page shows it. The scripts are not built yet.

| Part | State |
|---|---|
| Design rules ([`DESIGN.md`](skills/docent/references/DESIGN.md)) | Written |
| Sample page ([`specimen.html`](skills/docent/assets/specimen.html)) | Works; its diagrams were placed by hand |
| Brand: brief, texts, mark ([`brand/`](brand/)) | Written |
| Script that draws diagrams | Not built |
| Script that stamps the styles into a document | Not built |
| Script that checks a document | Not built |
| Built-in icon set | Seven icons so far |

## See it

Open [`skills/docent/assets/specimen.html`](skills/docent/assets/specimen.html) in a browser. Scroll the walkthrough, switch the theme, and open the print preview.

## What is in this repository

```
skills/docent/        the skill an agent installs
  SKILL.md            when to use it, and how to work today
  references/         DESIGN.md, the design rules
  assets/             specimen.html, the sample page
brand/                the brand brief, short texts, and the mark
prototype/            the scripts used to draw and check the sample page
DESIGN.md             a link to skills/docent/references/DESIGN.md
```

## The prototype scripts

These are working notes from the design phase, kept as the starting point for the real scripts. They are not part of the skill.

- `prototype/route.py` holds the three diagram forms with hand-placed coordinates, the icons, and the motion rules. It writes the drawings into the sample page.
- `prototype/check-render.cjs` loads the sample page in a browser and runs the checks: accessibility, themes, motion, print and narrow screens.
- `prototype/measure.cjs` measures line length and block edges.
- `prototype/contrast.py` prints the contrast of every color pair.

Run them from the top of the repository:

```bash
python3 prototype/route.py skills/docent/assets/specimen.html
```

```bash
python3 prototype/contrast.py
```

The two browser scripts need `playwright-core` and `axe-core`. Point `DOCENT_NODE_MODULES` at a `node_modules` folder that has both:

```bash
DOCENT_NODE_MODULES=/path/to/node_modules node prototype/check-render.cjs
```

## What comes next

1. A renderer that draws the three diagram forms from data and keeps the spacing rules.
2. A script that stamps the styles and the page script into a document.
3. A check that tests a document and rejects a bad icon.
4. The built-in icon set.
5. A single-track diagram form for phones.

## License

MIT. See [`LICENSE`](LICENSE).
