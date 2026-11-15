---
name: docent
description: Design kit for self-contained HTML documents such as guides and reports. It gives a quiet page look, step-by-step walkthroughs, and workflow diagrams with a moving dot. Use it when the user asks to write, restyle or check a document "with Docent" or "in the Docent style". Draft status - the design rules and a sample page exist; the scripts that draw diagrams and stamp the styles into a document are not built yet.
---

# Docent

A guide inside every document.

Docent is a design kit for documents: single HTML files that open without a network. A docent is a museum guide. The kit does the same job for a long document. It shows the reader where to look, one step at a time.

## Status — read this first

This skill is a draft.

**What exists**

- The design rules: [`references/DESIGN.md`](references/DESIGN.md).
- A sample page that follows every rule: [`assets/specimen.html`](assets/specimen.html). It has the page styles, the page script, a walkthrough, and the three diagram forms.

**What does not exist yet**

- A script that draws a diagram from data.
- A script that stamps the styles and the page script into a document.
- A script that checks a document against the rules.
- The built-in icon set. The sample page has seven icons.

Until those scripts exist, an agent places diagrams by hand. So tell the user plainly what you checked and what you did not. Do not say that a document "passes Docent".

## When to use it

- The user asks for a guide, a report or another long document as one HTML file, and wants the Docent look.
- The user asks to restyle an existing HTML document with Docent.
- The user asks whether a document follows the Docent rules.

Do not use it for app screens, slide decks or marketing pages.

## How to work today

1. **Read the rules.** Read `references/DESIGN.md` in full. It is the single authority for colors, type, layout, diagrams, icons, motion and voice.
2. **Start from the sample page.** Copy the `<style>` block and the `<script>` block from `assets/specimen.html` as they are. Do not restyle them. Replace the content.
3. **Keep one file.** No fonts, scripts, styles or images from the network.
4. **Write in the Docent voice.** Plain words, one idea per sentence. A step heading is one sentence of at most six words.
5. **Choose a diagram form** with the table in `references/DESIGN.md` (Layout): Route wide, Route tall, or Plates. Draw a diagram only when it shows something that words cannot.
6. **Keep the spacing rules** when you place a diagram by hand: an arrowhead has 28px of straight line behind it, a numbered mark is 16px clear of everything, and nothing overlaps.
7. **Pick icons in this order:** the icons in the sample page, then an icon you draw to the grid rules, then no icon. A wrong picture is worse than none.
8. **Look at the result.** Open the document at desktop and phone width, in light and dark, and in print preview. Report what you saw.

## What the scripts will do

When they exist, the scripts take over the parts that must be the same every time. The agent keeps the parts that need judgment.

| The scripts will do | The agent does |
|---|---|
| Draw diagrams and keep the spacing rules | Choose the diagram form |
| Put the styles and the page script into each document | Write the text |
| Check a document and reject a bad icon | Pick or draw icons |
