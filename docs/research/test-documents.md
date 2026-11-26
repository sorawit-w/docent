# Test documents: what Docent is missing

Status: research, written on 2026-11-24 with kit 0.18.0. It records evidence only, and proposes no designs.

## The answer first

We wrote five realistic documents with Docent as it is today, by following `SKILL.md` step by step, as an agent would. All five pass `check` with 0 errors. No document needed a widget, and every built-in kind that we tried drew on the first or second try.

The gaps are in the text around the charts more than in the charts:

1. **How to write numbers.** All five documents wrote signed changes, percentage points, decimals, units and intervals in their own way, and nothing told the writer how.
2. **The brand step.** All five documents are about an invented product, not about the repo that holds them. `SKILL.md` says to copy the brand of the repo's newest page or to ask, and covers neither case.
3. **Where a number comes from.** Four documents needed a source line under a figure or a table, and put it in a margin note or a caption.
4. **The profile table.** Four documents are a kind that the profile table does not name: a business analysis, a research summary, a decision record and a research report.
5. **References and footnotes.** Three documents needed a list of sources, and three needed a footnote.

Items 1, 3 and 5 are covered by the sources proposal (`docs/proposals/sources.md`, open as PR 64). Items 2 and 4 are `SKILL.md` gaps that no proposal covers. The full ranked table is at the end.

## How we tested

Each document is one HTML file in [`examples/`](../../examples/), copied from `assets/template.html` with a file copy. For each one we read `DESIGN.md`, chose a profile, wrote every diagram as data, and ran `render`, `stamp` and `check`. We changed nothing under `skills/docent/` or `tests/`. Every name, number, quote and source is invented, and each page says so in its margin note.

We opened each document in Chrome at 1366px and 320px, in light and dark, and with print styles at A4 width (794px), and took a screenshot of each view and of each figure. We could not open the A4 PDFs that Chrome made, because the PDF reader on this machine failed, so the print view is the print-media screenshot, not Chrome's print preview dialog.

| Document | Audience | Profile | Kinds used | `check` |
|---|---|---|---|---|
| [Churn analysis](../../examples/churn-analysis.html) | Business | Brief | line chart, heat map, dumbbell, bar chart, two funnels, card grid | 0 errors, 0 warnings |
| [Customer interview summary](../../examples/interview-summary.html) | Business | Standard | bar chart (two), hand-drawn user journey | 0 errors, 1 warning |
| [Decision record](../../examples/decision-record.html) | Software | Standard | range chart, bar chart, sequence diagram | 0 errors, 0 warnings |
| [Incident review](../../examples/incident-review.html) | Software | Brief, Harbor palette | status grid, line chart, walkthrough, hand-drawn fishbone, card grid | 0 errors, 2 warnings |
| [Research report](../../examples/research-report.html) | Research | Standard | range chart, dumbbell | 0 errors, 1 warning |

## 1. Churn analysis

Why paying accounts of an invented planning product left in one quarter: a trend by plan, cohorts, segments, exit-survey reasons, a setup funnel for accounts that left and accounts that stayed, and three proposed changes.

**A table or words, because Docent had no fitting kind or block**

- The four key numbers are a card grid. Each change against the last quarter is written in the card's line: "of paying accounts cancelled in Q3, up from 10.1% in Q2".
- Three customer quotes are items of a plain list, in quotation marks, with the plan and seats in brackets.
- The source of each chart is a margin note headed "Source", beside the text and not under the figure. The sources of the whole report are a plain list under "Method and data".
- The definition of churn, and the note that paused accounts do not count, went into a margin note and a definition list, where a footnote on the table would fit.
- The "All plans" row of the plan table is a plain body row. Docent has no style for a total row.
- The three proposed changes are a table with a state column. Docent has no block for a recommendation or a key finding.

**Blocks we wanted**

- A number with its change, such as 14.4% up 4.3 points against Q2.
- A quote with its speaker.
- A source line under a figure or a table, and a footnote.
- A way to compare one funnel across two groups. We drew two funnels in one well, which works, but each has its own scale, so the caption has to say "compare the shares, not the bar lengths".
- In the cohort heat map, an empty cell means "this month has not happened yet". The legend can only say "no data", so the text above the figure explains it.

**`render` and `check`**

`render` drew all six drawings with no warning. `check` reported 0 errors and 0 warnings.

**`SKILL.md`**

- The profile table does not name a business analysis report. We chose Brief, as "a report for managers".
- The brand step says to copy the brand of the repo's newest Docent page, or to ask the user about the brand. The newest page here belongs to Docent, while this document belongs to an invented product, and there was no user to ask. `SKILL.md` does not say what to do when the document's host is not the repo's project. We used the product's name, no logo, Docent's own colors, no tagline, and the credit as a link.

**In the browser**

- The text row after the card grid has no space above it, on a desktop and in print: the paragraph and the margin note's line touch the cards. The kit adds space after a card grid only when a `p`, `ul`, `ol` or `dl` follows, not a `.row`.
- The page does not scroll sideways at 320px. In print, the heat map takes the five grays, and the hollow cells stay clear.

## 2. Customer interview summary

Findings from eight interviews with codes P1 to P8: a participant table, six themes with counts and quotes, how the first weeks feel, and a survey of 167 customers on a five-point agree scale.

**A table or words, because Docent had no fitting kind or block**

- Six quotes are paragraphs in quotation marks, ending with "— P1, office manager".
- Which participant raised which theme is a table of "Yes" and "—". A heat map needs 3 to 5 steps, and a status grid would color a "No" as a failure.
- The survey answers are a table of five counts for each statement. To draw them we used a bar chart of "agree minus disagree", with values below 0. It works, but it drops the middle answer and the spread of the answers. The caption and the text say so.

**Blocks we wanted**

- A quote with its speaker. Participant codes are `<code>` in the table, as `SKILL.md` asks, but `<code>` in each of six quotes would be heavy, so the quotes use plain text.
- A survey chart for agree and disagree answers. `docs/proposals/charts.md` names this chart under "Not in this proposal" and says it may come once test documents show the need. This document shows it.
- A line for the base of each number ("of 8", "167 answers"). We wrote it by hand in captions and margin notes.
- A way to mark an open question. We used the `plan` state, which means "planned, or behind a feature flag"; that is a stretch.

**`render` and `check`**

`render` drew both bar charts with no warning. `check` gave 1 warning, which was right: the user journey is hand-drawn, so look at it in a browser.

The profile guess is silent here only by chance. The margin label "Research summary" matches the Brief rule, and the findings list plus the interview questions count as 9 numbered steps, so the Task rule wins too. Two rules win, so `check` names neither. Both guesses were wrong.

**The hand-drawn user journey**

The rules in `references/diagrams.md` were clear enough: the drawing kept the contract on the first try. We copied the frame of the fishbone example, used `hd-rule` for the three feeling levels, `hd-strong` for the line and `hd-fill` for the dots. Three things were not clear:

- There is no help to estimate text widths. We placed each name and note by eye, then checked in the browser.
- A name on two lines needs a `tspan` with `dy`. The rules allow it, but the example does not show it.
- `check`'s warning says to look at 375px. `SKILL.md` step 10 says "phone width", and this task asked for 320px.

**In the browser**

The journey reads well in light and dark. At 320px it scrolls sideways inside its well, with the line that says so, as the rules say. The theme table scrolls inside itself on a phone.

## 3. Decision record

Choosing between three ways to run reminder jobs: context, criteria, three options, a load test, cost, a scored comparison, the chosen design, and its consequences.

**A table or words, because Docent had no fitting kind or block**

- The scored comparison of three options on five criteria is a table. Nothing marks the chosen option. The "Weighted total" row is a plain row, and we first worked out the totals wrong by hand (33, 42, 33 in place of 35, 41, 33).
- Option A's load-test delays are in a sentence, because they do not fit the scale of the chart (see below).
- The status of the record ("Accepted") is an `ok` state in a status note, and again in the margin facts.
- Related records ("replaces decision record 9") are a plain list.

**Blocks we wanted**

- A point inside a range. The range chart shows the delay from the median to the 99th percentile, but nothing names the two ends, and a reader may take the range for the lowest and highest value.
- A scale for values that span three orders of size: from 0.1 seconds to 58 seconds.
- Status words for a decision: proposed, accepted, superseded, rejected. `SKILL.md` gives `ok`, `warn`, `err`, `info` and `plan`, and does not say which one a rejected or a replaced decision takes.

**`render` and `check`**

On the first run `render` refused the range chart:

> diagram 1 ("delay"): the range 0.1–0.6 is 3.42px wide on a desktop and on paper; write it as a point, with "at", or narrow the scale

The refusal is right by the rule: a bar of 3px cannot be read. But the cause is the data, not a mistake: the table option needs a scale up to 58 seconds, and the other two options need tenths of a second. We took option A out of the chart and wrote its numbers in words, so the chart no longer compares all three options, which was its purpose. After that, `render` drew all three drawings, and `check` reported 0 errors and 0 warnings.

The sequence diagram, with a loop and an alt inside it, drew on the first try.

**`SKILL.md`**

The description of the skill names decision records, but the profile table does not. We chose Standard.

**In the browser**

No problem at 1366px or 320px, in light or dark, or in print. On a phone the sequence diagram becomes its script form, with each fragment as a band.

## 4. Incident review

An outage of 47 minutes: impact by part of the service, a timeline, the cause in the connection data, how the response went, a fishbone of causes, and seven actions with owners.

**A table or words, because Docent had no fitting kind or block**

- The timeline is a table of 13 rows. A timeline kind is planned (item 5 of `charts.md`), but `charts.md` also says a long incident timeline stays a table.
- The times of the alert (08:44) and the rollback (09:19) are in the caption of the line chart. A line chart cannot mark an event.
- The pool limit, which dropped from 200 to 20 at once, is a second series of the line chart. The range chart has named lines (`marks`); the line chart has none.
- The before and after of the configuration is a code block with comment lines. Docent has no marks for added and removed lines.

**Blocks we wanted**

- Event marks on a line chart.
- A step line, for a value that changes at one moment. The line chart draws each change as a slope between two points, so the limit looks as if it fell over five minutes.
- A state for "in progress". We used `warn` ("It needs care, or it waits") for actions in progress, which reads as a problem.

**`render` and `check`**

`render` drew all three drawings with no warning. For the status grid it said "column labels on two lines on a desktop; every 3rd column label on a phone".

`check` gave 2 warnings:

- The fishbone is hand-drawn, so look at it in a browser. Right.
- `<html> has data-profile="brief"; the page looks like "reference": 1 code blocks and 3 tables hold more text than the paragraphs`. Wrong. `SKILL.md` puts incident reports in Brief, and Brief exists for timeline tables, so a Brief page holds table text by design. The guess in `scripts/lib/profile.cjs` names Brief only for a margin label with "report", "brief", "summary" or "release", and "Incident review" has none of these.

**The hand-drawn fishbone**

The rules were clear enough: we copied the geometry of the example and moved each bone, and the drawing kept the contract on the first try. We worked out where each cause line meets its bone by hand.

**In the browser**

- The text row after the card grid has no space above it, as in the churn analysis.
- In the line chart, the "In use" line lies on the "Pool limit" line from 08:35 to 09:20. On a phone, the line also runs across the value label "50", which `DESIGN.md` allows (labels sit under the lines) but makes the label hard to read.
- The status grid's legend writes "1 % errors or less", with a space before the percent sign, because the unit is "% errors".
- The Harbor palette, the walkthrough and the fishbone look right in light, dark and print.

## 5. Research report

A small study of 24 developers: a question with three expectations, method, results with 95% intervals, the spread of times, discussion, limits and references.

**A table or words, because Docent had no fitting kind or block**

- The three effects are a range chart of their 95% intervals. The middle value of each is only a row note: "0.04–0.72, d = 0.38".
- The three measures are in different units, so we turned each into a standardized effect, d, to draw them on one scale.
- The spread of times is a table of five numbers (fastest, first quarter, median, third quarter, slowest). Docent has no box plot or strip plot.
- How each of 24 participants changed is a sentence. A slopegraph allows at most 10 series.
- Citations in the text are plain words, such as "(Ortega and Lindqvist, 2019)". The references are a plain list with the addresses written out.
- The formula for d is a code block. Docent has no math.
- The intervals in the results table ("+2 to +31 points") are a text column, because no rule says how to write an interval in a table.

**Blocks we wanted**

- An estimate with its interval in one row.
- A list of sources, citations that link to it, and a footnote.
- A plot of the spread of values.

**`render` and `check`**

`render` drew both drawings with no warning. `check` gave 1 warning:

> `<html> has data-profile="standard"; the page looks like "brief": the document's kind is "Research report"`

We think it is wrong: Brief is "a report for managers", and the guess matched the word "report". A research report explains a result, which is what Standard is for.

**`SKILL.md`**

The profile table does not name a research report or any research document.

**In the browser**

- At 320px the page is 388px wide and scrolls sideways. The two reference addresses are long words with no place to break, and the kit breaks long words only in code and table cells.
- The range chart writes "0.2–0.9" beside "0.04–0.72". The data said 0.20 and 0.90, but JSON drops the last zero, so the decimals differ in one column.

## What worked well

- Every built-in kind we used drew on the first try, except the one range chart above.
- Two funnels in one well, the dumbbell with `"order": "change"`, the heat map with empty cells, the status grid with its own state names, and a sequence diagram with a nested fragment all worked as `diagrams.md` describes.
- Both hand-drawn figures kept the contract on the first try, and look right in light, dark, on a phone and in print.
- No page scrolled sideways at 320px except the research report, and every wide table scrolled inside itself.
- No document needed a widget. The four widgets fit how-to pages more than reports.

## Ranked table of gaps

Ranked by how many of the five documents hit the gap, then by audience (software and business first, research third). "Covered" names the proposal that covers the gap: `charts.md` items 5 to 8 (date scale, scatter plot, tree, database schema), or the sources proposal (`docs/proposals/sources.md`, PR 64, still open) by its build item.

| # | Gap | Documents | Audience | Covered |
|---|---|---|---|---|
| 1 | Rules for writing numbers: signed changes, percentage points, decimals, unit spacing, intervals | 5: churn, interviews, decision, incident, research | All | Sources, item 2 |
| 2 | The brand step when the document's host is not the repo's project, or no user can be asked | 5 | All | No |
| 3 | A source line under a figure or a table | 4: churn, interviews, decision, research | All | Sources, item 1 |
| 4 | The profile table names no business analysis, research summary, research report or decision record | 4: churn, interviews, decision, research | All | No |
| 5 | A list of sources, and citations in the text | 3: churn, decision, research | All | Sources, item 5 |
| 6 | Footnotes | 3: churn, decision, research | All | Sources, item 4 |
| 7 | A block for a key finding or a recommendation | 3: churn, interviews, decision | Business, software | No |
| 8 | Status words beyond the five states: accepted, in progress, open question | 3: interviews, decision, incident | Software, business | No |
| 9 | `check`'s profile guess: wrong for the incident review and the research report, silent by chance for the interviews | 3: interviews, incident, research | All | No |
| 10 | A quote with its speaker | 2: churn, interviews | Business | No |
| 11 | An estimate inside its range (median and 99th percentile, or an estimate and its 95% interval) | 2: decision, research | Software, research | Sources, item 6 |
| 12 | Event marks on a line chart, such as an alert or a release | 2: churn, incident | Software, business | No |
| 13 | A total row in a table | 2: churn, decision | Business, software | No |
| 14 | No space between a card grid and a text row after it | 2: churn, incident | All | No (a kit bug) |
| 15 | Hand-drawn figures: no help to estimate text widths; `check` says 375px where `SKILL.md` says phone width | 2: interviews, incident | All | No |
| 16 | A number with its change, such as a key number against last quarter | 1: churn | Business | Sources, item 3 |
| 17 | A chart for agree and disagree answers | 1: interviews | Business, research | No (named in `charts.md`, "Not in this proposal") |
| 18 | A step line, for a value that changes at one moment | 1: incident | Software | No |
| 19 | One funnel compared across two groups | 1: churn | Business | No |
| 20 | A yes-or-no grid, such as themes by participant | 1: interviews | Business | No |
| 21 | Empty cells that mean "not yet", as in a cohort grid | 1: churn | Business | No |
| 22 | A timeline | 1: incident | Software | `charts.md` item 5, but it keeps a long incident timeline as a table |
| 23 | Values that span several orders of size (a log scale) | 1: decision | Software | No |
| 24 | Marks for added and removed lines in a code block | 1: incident | Software | No |
| 25 | A long web address scrolls the page sideways on a phone | 1: research | All | Sources, item 5, for addresses in the list of sources only |
| 26 | The spread of values (a box plot or a strip plot) | 1: research | Research | `charts.md` item 6 (the strip form), in part |
| 27 | More than 10 paired values, such as each participant before and after | 1: research | Research | No |
| 28 | Math notation | 1: research | Research | No |

None of the five documents needed the tree or the database schema (`charts.md` items 7 and 8).
