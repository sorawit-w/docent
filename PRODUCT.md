# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Single self-contained HTML files. The skill's scripts are Node only, with no packages to install, so they run on a machine where nothing can be installed.

## Users

- **Authors:** agents, and the people who direct them, who write a guide or a report as one HTML file. An author loads the Docent skill, follows its rules and runs its scripts.
- **Readers:** developers, testers, managers and business stakeholders. Many read English as a second language. They scan, print, and sometimes read with JavaScript turned off.

## Product Purpose

Docent is a design kit for documents: guides and reports written as single self-contained HTML files. It gives a document one calm look, a walkthrough that lights one step at a time, and workflow diagrams where a dot travels the route.

Success means two things. Every document made with Docent looks and behaves the same. A reader can follow a long document step by step.

## Positioning

Guidance. The document shows the reader where to look, one step at a time, instead of leaving the reader to find the path.

Docent ships as an agent skill that carries scripts, not as written rules alone, so the result is the same every time. It stays quiet so that the host project's content and name lead. It draws its own diagrams and uses no third-party renderer.

## Operating Context

- An agent writes a document, then runs the skill's scripts to draw the diagrams, to put the page styles and the page script into the document, and to check the document.
- A document opens from a file with no network. Readers open it in light or dark, on a desktop or a phone, and in print.

## Capabilities and Constraints

- Every document is one self-contained HTML file with no network.
- The page is flat: no gradients and no shadows. The accent is a mark and never a fill.
- Three diagram forms (Route wide, Route tall, Plates) show the same data: lanes, parts, and numbered legs.
- No text below 14px outside diagrams. Inside diagrams, names are 14px and notes are 12px, shown at real size.
- The theme follows the reader's system, and a switch wins. Print is light.
- The design rules live in [`DESIGN.md`](DESIGN.md), the single authority for the design.
- This repository names no other product.

Open decisions:

- The heading font: system fonts, or one heading font inside each document.
- The format of a document's `<title>`.
- An optional local agent link, for later.

## Brand Commitments

- Name: Docent. Tagline: "A guide inside every document."
- One idea: a dot travels along a route. The mark, the top bar, the walkthrough rail and the diagrams all show it.
- Ultramarine as the single ink, and a lamp-yellow dot.
- Voice: plain words, one idea per sentence, no idioms, no praise words.

## Evidence on Hand

- The sample page: [`skills/docent/assets/specimen.html`](skills/docent/assets/specimen.html).
- The brand brief, short texts and the mark: [`brand/`](brand/).
- No users, quotes, case studies or numbers exist. Future work must not invent them.

## Product Principles

1. The content leads. Docent stays quiet.
2. Guide the reader, one step at a time.
3. The same every time: scripts do what must be identical, and the agent does what needs judgment.
4. One file, no network, readable without scripts and in print.
5. Plain words, for a reader whose first language is not English.

## Accessibility & Inclusion

- WCAG AA contrast: 4.5:1 for text, 3:1 for large text and the focus ring.
- Reduced motion is respected: every moving state has a still form with the same information.
- The page is readable with JavaScript off and in print.
- The text is written for readers of English as a second language.
