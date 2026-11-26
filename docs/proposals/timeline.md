# Proposal: the timeline — events and spans on a true time scale, in lanes

Status: **proposed on 2026-11-26.** Nothing is built. Each decision at the end has a recommended answer, which the proposal follows. This is the "short proposal first" that item 5 of [`charts.md`](charts.md) asks for, and it changes one part of that plan (decision 1). The worked example is the timeline table of [`docs/research/test-documents/incident-review.html`](../research/test-documents/incident-review.html). All sample content is invented.

## The answer first

Build one new kind, `"kind": "timeline"`. A timeline shows **events** (a point at a time) and **spans** (a bar from a start to an end), one row each, on a time scale that is true: equal time is always equal length. Rows sit in up to 3 **lanes**, such as "The system" and "The people". A Gantt chart and a roadmap are the same kind, with more spans than events.

The timeline draws its rows exactly as the range chart does: names in a column at the left, the scale on the right, a 640px form for a desktop and for paper, and a 264px form for a phone with each name on its own line above its mark. What is new is the **time scale** in the chart core: it reads times, dates and months, places calendar ticks (every 30 minutes, every 2 weeks, every quarter), and writes their labels. The full text of each event goes in the table in words under the drawing.

This replaces the plan in `charts.md` to give the range chart a date scale. The date scale is still built in the core, as planned, but a timeline gets its own kind, because its reader asks a different question and it needs rules that a range chart must not have (decision 1).

| # | Pull request | Size |
|---|---|---|
| 1 | The time scale in the chart core: three grains, a zone, calendar ticks and labels. No drawing changes | Small |
| 2 | The timeline kind: events, spans, lanes, both forms, the table in words, refusals, fit warnings, the docs and the question table | Medium |
| 3 | Roadmaps: the month grain, the "as of" line and spans that are still running | Small |
| 4 | Pages use it: the incident review test document, and one timeline on the sample page | Small |
| 5 | `check` hints at a missed timeline (`visual.timeline`) | Small |

Order: 1, 2, 3, 4, 5. Item 5 comes after item 4, so the hint does not fire on the test document on the day it starts.

## The obvious answers that would be wrong

**One line across the page, with a dot for each event and its name above or below, taking turns.** It is the timeline that most readers picture. It breaks on real data. In the incident review, three events stand 4 and 5 minutes apart (08:40, 08:44, 08:49): on a desktop they are 9 to 11px apart, and their names are 100px wide. On a phone the closest two events are 3.3px apart. The names would have to move far from their dots, joined to them by long lines, or turn. Docent's names never turn. One row for each event keeps every name at 14px, level, beside its own mark.

**A list down the page with each event the same distance apart, as in a changelog.** It reads well and fits a phone. But it tells the reader something false: the 3 minutes from 08:55 to 08:58 take the same room as the 63 minutes from 09:27 to 10:30. In an incident review the gaps are often the finding ("13 minutes from the deploy to the alert"). A list of times is already a table, and the table stays, in words, under the drawing.

**A diamond for a milestone, as most Gantt charts draw it.** In Docent a diamond is a decision, in the flowchart and the activity diagram. A milestone is an event: a filled circle, and its name says what it is.

---

## 1. The reader's question

*When did each thing happen, how long were the gaps between them, and what overlapped?* For example: how long did the incident run before anyone was paged, and how long did the wrong guess cost? Or: which phases of the migration run at the same time, and where does the code freeze fall?

**Use it when** there are 3 to 20 events and spans on one time scale, and the gaps or the overlaps matter. **Do not use it** for:

| The data | Write |
|---|---|
| Only the order matters, not the gaps | A numbered list |
| An amount over time, such as errors each minute | A line chart; it may mark 1 to 3 events |
| Each part was OK or failing in each period | A status grid |
| Each lane is in exactly one state at every moment, such as a connection that is idle, busy or closed | A timing diagram |
| Who calls whom, in order | A sequence diagram |
| Two events, or one span | A sentence |

**The row to add to the question table** in step 7 of `SKILL.md`:

| The reader asks | Write |
|---|---|
| When did each thing happen, how long were the gaps, and what overlapped? Or which phases run when, and where do the milestones fall? | A timeline (`"kind": "timeline"`), for 3 to 20 events and spans on one true time scale, in up to 3 lanes; it also draws a Gantt chart or a roadmap. A numbered list when only the order matters; a timing diagram when each lane is always in one state |

The same pull request takes "a timeline" and "a Gantt chart" out of the list of types that `SKILL.md` "plans as a kind", and `check` refuses a hand-drawn `timeline`, `gantt` or `roadmap` by name, with this kind to use.

## 2. The documents that need it

| Document | Grain | What it draws | Lanes |
|---|---|---|---|
| Incident review | Minute, in UTC | Each event as a point: the change, the deploy, the alert, the page, the wrong guess, the cause found, the rollback, the all-clear. The time people were hurt as one span ("Saving failed", 47 min). The reader sees the 13 minutes from deploy to alert, and the 8 minutes lost on the read replicas, as lengths. | "The system" and "The people" |
| Release notes | Day | The beta as a span, the release as an event, the old version's "security fixes only" window as a span, and its end of support as an event. The reader sees how long they have to move. | One lane for each version |
| Migration plan | Day or week | Each phase as a span (dual writes, backfill, reads move, old store read-only), the code freeze as a span, the switch-off as an event. Overlaps show which phases run together. | One lane for each system or team |
| Project status | Month or week | Each workstream's tasks as spans, milestones as events, an "As of 26 Nov" line, and the tasks still running end at that line. This is the Gantt chart. | One lane for each workstream |

The incident review is the first real document, because its timeline table is the biggest gap that Docent leaves today. In the test document, the timeline is a table of 13 rows, and the only drawings near it are a line chart with 2 events and a status grid.

## 3. The data

```json
{
  "id": "incident-timeline",
  "kind": "timeline",
  "label": "The change was merged at 08:12 and deployed at 08:31. Errors passed 5% at 08:40, and saving failed for 47 minutes, until 09:27. The page came at 08:44; the cause was found at 09:14, after 8 minutes spent on read replicas, and the rollback started at 09:19.",
  "scale": {"from": "08:00", "to": "10:45", "day": "2026-11-12", "zone": "UTC"},
  "lanes": [
    {"id": "system", "name": "The system"},
    {"id": "people", "name": "The people"}
  ],
  "rows": [
    {"name": "Change merged", "at": "08:12", "lane": "people", "note": "Platform engineer. A change to the shared configuration template moves the pool size into a new section, where a default of 20 applies."},
    {"name": "Deployed to all regions", "at": "08:31", "lane": "system", "note": "The deploy pipeline sends the new configuration to all three regions at once."},
    {"name": "Errors pass 5%", "at": "08:40", "lane": "system"},
    {"name": "Saving failed", "from": "08:40", "to": "09:27", "lane": "system", "note": "People could not save changes. Up to 61% of requests failed."},
    {"name": "Alert pages on-call", "at": "08:44", "lane": "system", "note": "Monitoring. The alert \"sync errors above 5% for 3 minutes\" pages the on-call engineer."},
    {"name": "Page acknowledged", "at": "08:49", "lane": "people"},
    {"name": "Errors peak at 61%", "at": "08:55", "lane": "system"},
    {"name": "Incident declared, sev 2", "at": "08:58", "lane": "people", "note": "The status page says saving is failing."},
    {"name": "Read replicas added", "at": "09:06", "lane": "people", "note": "On the guess that the database is overloaded. Errors do not change."},
    {"name": "Cause found in the logs", "at": "09:14", "lane": "people", "note": "Database engineer. \"Connection pool exhausted, limit 20\" in the API logs, and the change in the deploy history."},
    {"name": "Rollback starts", "at": "09:19", "lane": "people"},
    {"name": "Errors under 1%", "at": "09:24", "lane": "system"},
    {"name": "Incident resolved", "at": "09:27", "lane": "people", "note": "The app sends its kept changes again."},
    {"name": "Status page closed", "at": "10:30", "lane": "people", "note": "Support lead, after an hour with no errors."}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from` and `to` in the chart's grain (below), and `to` is later than `from`. `zone` is needed at the minute grain: a short label of at most 12 characters, such as `UTC` or `UTC+7`. `day` is optional at the minute grain: with it, times are written `08:12`; without it, `2026-11-12 08:12`, so a scale may pass midnight. `step` is optional: with no `step`, `render` picks the calendar step for each form (section 5). `marks` is optional: at most 2 named lines in all, with `asOf` counted. |
| `asOf` | Optional: the time or date the page was written, such as `"2026-11-26"`. It is drawn as a named line, and `render` writes its name from the date, "As of 26 Nov". A span with no `to` is still running, and it ends at this line. |
| `lanes` | Optional, at most 3, each with an `id` and a `name` (at most 20 characters), written as a workflow diagram writes its lanes. With lanes, every row names one. |
| `rows` | 2 to 20. Each has a `name` (at most 28 characters), and either `at` (an event) or `from` with an optional `to` (a span). A `note` is optional, at most 200 characters. `render` puts the rows of each lane together and sorts them by time, a span by its start, because in a timeline the order is the time. So the author may write them in any order. |

**The three grains.** Every time in one chart has the scale's grain. A chart never mixes them.

| Grain | Written | An event stands at | A span runs |
|---|---|---|---|
| Minute | `08:12`, or `2026-11-12 08:12` | that minute | from its `from` minute to its `to` minute; equal times are refused: "write it as an event" |
| Day | `2026-11-12` | the start of that day | from the start of its `from` day to the end of its `to` day, so `from` and `to` may be the same day: a span one day long |
| Month | `2026-11` | the start of that month | from the start of its `from` month to the end of its `to` month |

Day and month values are turned into days, so a month on the scale is as long as its real days: February is shorter than March. A milestone in a roadmap is written at the day grain, or at the month grain when only the month is known; its label then says "Mar 2027", and it stands at the start of March.

**Who did it.** The incident table has a "Who" column. In a timeline, who acted goes at the start of the note ("Platform engineer."). When there are 3 or fewer actors, they can be the lanes instead.

### The limits

- 2 to 20 rows, 3 lanes, 2 named lines, a name of 28 characters, a note of 200.
- The scale is at most 72 hours at the minute grain, 2 years at the day grain, and 10 years at the month grain. At those limits, on a phone, the shortest span that can be drawn (4px) is 95 minutes, 16 days and 81 days ("Measured"). Past them almost every span is too short to draw.
- A span narrower than 4px in either form is refused, with a message that names it: "the span 'Code freeze' is 3px wide on a phone; write it as an event, or shorten the scale".
- **Why 20 rows.** A figure does not break across pages. Twenty rows in 3 lanes are 820px tall in the 640px form, and an A4 page holds 986px inside its 18mm margins, which leaves room for the caption and the line above. The range chart's 12 rows would not hold the incident review, which has 14.

## 4. Uneven gaps, drawn honestly

- **The scale is true in every form.** Equal time is equal length, on a desktop, on paper and on a phone. The scale never bends to make room, because the rows already keep close events apart: two events 3 minutes apart stand on two rows, 3.3px apart across and 32px apart down.
- **No break in the scale** (decision 4). A break would hide the length of a wait, and a wait is often what the reader came for. When one empty stretch fills most of the scale, `render` warns, and the author draws the busy part as its own timeline and says the rest in a sentence.
- **The table in words gives every gap as a number.** Its column "Since the last" is computed by `render`: "+13 min", "+1 h 3 min". A reader who needs the exact gap does not measure a drawing.
- **The time zone is written, never guessed.** The page is made before it opens and has no script that reads the clock, so it cannot show the reader's own time. The zone is a label: `render` does not convert times. It stands in the line above the chart ("Times in UTC on 12 Nov 2026") and in the head of the table. A timeline that crosses a change of the clocks should be written in UTC, and `render` warns when a minute scale longer than 24 hours uses a zone that is not UTC or a fixed offset.
- **"Today" is a date.** A page is read after it is written, so the words "today" and "now" are refused as the name of a line. The author writes `asOf`, and `render` names the line from the date.

## 5. The look and the forms

The marks are the range chart's, so `DESIGN.md` needs one short paragraph and no new color, shape or token.

| Mark | Data | Drawn as |
|---|---|---|
| An event | `at` | A filled circle in the text color, 10px across |
| A span | `from` and `to` | A bar 16px high, page color inside, text color outline, the corner of a plate |
| A span still running | `from` only, with `asOf` | The same bar, ending at the "as of" line with no outline on its right side, so it does not claim an end. Its value text says "since 3 Nov, still running". |
| The "as of" line, and named lines | `asOf`, `scale.marks` | A solid line in the muted color, its name above it, as in the range chart |
| A lane | `lanes` | A band in the page color with the lane's name, as a range chart's group |

There is no state, no status color, no dot and no walkthrough. A timeline has an order, but the drawing shows all of it at once, and the table gives the order in words. Nothing is dashed.

**Ticks.** Tick labels stand at least 48px apart, as on every scale. A time scale keeps calendar steps instead of the range chart's 1, 2, 5 and 10:

| Grain | Steps, finest first | Label |
|---|---|---|
| Minute | 5, 10, 15, 30 min; 1, 2, 3, 6, 12 h | `08:30`; a new day adds the date, `13 Nov` |
| Day | 1 day, 2 days, 1 week (Mondays), 2 weeks, 1 month (the 1st) | `12 Nov`; a new year adds the year |
| Month | 1 month, 1 quarter, 6 months, 1 year | `Nov`; each January writes `2027` |

When even the coarsest step keeps fewer than three labels, the scale keeps two, the first and the last. `charts.md` already allows this for the line chart's time axis, because the reader knows that the times between are there.

### The forms

| Where | Form |
|---|---|
| Desktop and paper (640px) | Lane bands down the page, row names in a column at the left, the scale on the right, ticks along the top. For the incident: a name column of 160px, a plot of 376px for 165 minutes (2.28px a minute), ticks every 30 minutes, 448px of rows. It prints on A4 at its real size, as every 640px form does. |
| Phone (264px) | Each row name on its own line, its mark under it across the full width. For the incident: 181px for 165 minutes (1.10px a minute), ticks every hour, 728px of rows. The page scrolls down, never sideways. |
| Dark mode | The marks use only the page tokens (text, muted, line, page and well colors), so dark mode and the reader's high contrast mode follow with no work, as for the range chart. |
| Print | The 640px form at its real size, in black and gray, because the timeline uses no color. The kit opens every closed section before printing, so the table in words prints under the figure. |
| Screen reader | The `label`, then the table in words. |

**A sketch of the incident, desktop form** (one character is 3 minutes; the real drawing is the range chart's marks):

```text
                            08:00     08:30     09:00     09:30     10:00     10:30
                            |         |         |         |         |         |
The system
  Deployed to all regions             ●
  Errors pass 5%                         ●
  Saving failed                          [===============]
  Alert pages on-call                      ●
  Errors peak at 61%                          ●
  Errors under 1%                                       ●
The people
  Change merged                 ●
  Page acknowledged                         ●
  Incident declared, sev 2                     ●
  Read replicas added                             ●
  Cause found in the logs                            ●
  Rollback starts                                     ●
  Incident resolved                                      ●
  Status page closed                                                          ●
```

The hour of quiet before the status page closed is a long empty run on the last row, and the 13 minutes from deploy to alert is the step from the first row of "The system" to the fourth.

**The phone form,** the first rows:

```text
08:00            09:00            10:00
The system
Deployed to all regions
         ●
Errors pass 5%
           ●
Saving failed
           [============]
```

### The diagram in words

The `label` stays a summary of one or two sentences. Under the drawing, in the closed section "The diagram in words", `render` writes:

- **One table in time order across all lanes.** Columns: Time (or "From – To" with the length, "08:40 – 09:27, 47 min"), Lane, What happened (the name), Note, and Since the last. The drawing groups rows by lane; the table gives the one order across lanes, which the drawing shows only by position.
- **Lines under the table,** computed from the data: "14 rows: 13 events and 1 span, from 08:12 to 10:30 UTC (2 h 18 min)." "Longest gap: 1 h 3 min, from 09:27 to 10:30." "Longest span: Saving failed, 47 min." With `asOf`: "2 spans are still running on 26 Nov."

The notes appear only in this table, not in the drawing, so the desktop and phone forms hold the same text. The incident review then needs no second, open timeline table (decision 5).

## 6. One kind or two: the Gantt chart and the date scale in `charts.md`

**The date scale.** `charts.md` (section 6 and build item 5) planned "a date scale in the core, so a range chart draws a timeline or a Gantt chart". This proposal keeps the date scale in the core, as planned: the time scale of build item 1 lives beside `scale.cjs`, and any chart can use it later. It changes only who uses it first: a new kind, not the range chart. Four reasons:

1. **The question differs.** A range chart asks where values fall on one scale, and its rows have no order. A timeline asks when, in what order, and how long between. Authors choose a kind from the question table, so a separate row with a separate name is easier to find than "a range chart with a date scale".
2. **A timeline needs rules a range chart must not have.** The rows are sorted by time; the table has a "Since the last" column; a span may still be running; "today" must be a date; a lane that is always in one state is a timing diagram. Put on the range chart, each of these would need an "only when the scale holds dates" clause.
3. **The limits differ.** A timeline needs 20 rows and notes of 200 characters. The range chart's 12 rows are right for comparing values.
4. **The code stays small.** `timeline.cjs` reads the times, turns them into numbers, and draws with the range chart's row code. The range chart and its stored drawings do not change.

The cost: one more kind name. The range chart keeps numeric scales only.

**The Gantt chart.** One kind, not two (decision 3). A Gantt chart is a timeline whose rows are mostly spans: a task is a span, a phase is a lane, a milestone is an event, and the "as of" line is today. `charts.md` already said the same. Three parts of the usual Gantt chart are left out:

- **Arrows from one task to the next.** They need lines routed between rows, which a scale chart does not draw. A workflow or activity diagram shows what waits on what, and the note can say it: "Starts when the backfill ends."
- **A progress fill inside a bar.** The bar's length would mean two things, time and percent done. The percent goes in the name or the note.
- **The critical path in a color.** A chart has no color in Docent.

**The line chart, the timing diagram and the status grid stay as they are.** The line chart keeps its 1 to 3 events; its message "more events are a timeline, which stays a table" becomes "more events are a timeline (`"kind": "timeline"`)". An incident review uses the three together: the status grid for which parts failed and when, the line chart for the amount, and the timeline for the events.

## 7. What `render` and `check` say

**`render` refuses**, with a message that names the row:

- a time that is not in the scale's grain, a chart that mixes grains, a time outside the scale;
- a span that ends before it starts, or a minute span that starts and ends at the same minute;
- a span narrower than 4px in either form;
- a span with no `to` when there is no `asOf`, or one that starts after `asOf`;
- a line named "today" or "now": "a page is read after it is written; write `asOf`, and the line is named from its date";
- a minute scale with no `zone`;
- a scale longer than its grain allows: "this timeline spans 9 days at the minute grain; write days";
- fewer than 2 rows or more than 20, more than 3 lanes, a name over 28 characters ("move the rest to its note"), a note over 200.

**Fit warnings** (they never change the drawing):

- **2 rows:** "a timeline of 2 rows; a sentence says this more simply".
- **Equal gaps:** every row is an event, in one lane, and the events are equally spaced: "the events are equally spaced, so the drawing shows only their order; a numbered list says the same".
- **A timing diagram:** in every lane, the spans fill the scale end to end with no gap and no overlap: "each lane is always in one state; this reads as a timing diagram".
- **An empty stretch:** one gap between rows fills more than 60% of the scale: "the stretch from 09:30 to 15:00 is 72% of the scale and holds nothing; draw the busy part as its own timeline, and say the rest in a sentence".
- **A zone with clock changes:** a minute scale over 24 hours whose zone is not UTC or a fixed offset.

**`check` tests** that the drawing is the one `render` makes from the data, in both forms, and that the table in words matches the data, as for every scale chart. It adds:

- **The hint `visual.timeline`:** a table of 4 or more rows whose first column holds times or dates in order, not equally spaced (the reader in `periods.cjs` already tells this), with no timeline in its section: "this table lists 13 times in order; a timeline shows the gaps between them". Equally spaced times with numbers already get the hint `visual.line`.
- **The refusal by name:** a hand-drawn `timeline`, `gantt` or `roadmap` points to `"kind": "timeline"`.
- **The profile:** a timeline figure counts toward Brief, as a timeline table does today.

## 8. Build order

Each item is its own pull request, started after the one before it is merged.

1. **The time scale in the chart core.** It reads the three grains, the `day` and the `zone`, turns times into numbers, keeps the calendar steps at 48px, and writes the tick labels, with two labels as the last step. Tests for each grain, a scale over midnight, a new year, February, and both widths. No drawing changes: every stored drawing stays exactly the same. Small.
2. **The timeline kind,** at the minute and day grains: events, spans, lanes, named lines, both forms, the table in words, the refusals and the fit warnings of section 7. The paragraph in `DESIGN.md`, the section in `diagrams.md`, the row in the question table, the change to the "plans as a kind" list in `SKILL.md`, the refusal of a hand-drawn timeline, and the line chart's message. Tests: the incident example as a fixture in both forms; each refusal; each warning; a span one day long; equal times on two rows. Medium.
3. **Roadmaps:** the month grain, `asOf`, and spans that are still running. Tests: a roadmap over 18 months; a span still running; "today" refused. Small.
4. **Pages use it.** The incident review test document's timeline table becomes a timeline, with its notes. The sample page gets one timeline in its "Report a bug" topic: the life of one bug report, from reported to confirmed, fixed, released and closed, at the day grain. Small.
5. **The hint `visual.timeline`,** and the Brief profile count. After item 4, so the test document passes on the day the hint starts. Small.

## Measured

The widths come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs`, 14px names) and the range chart's layout rules in `range.cjs`. The heights come from `layoutRange` itself, with the row limit raised to 20 in memory only. The script is in the session scratchpad and is not part of the kit. Its output:

```text
incident: 14 rows; widest name 160px
 desktop and paper: plot 376px for 165 min = 2.28 px/min; smallest gap 3 min = 6.8px; longest gap 63 min = 144px; span 47 min = 107px; tick every 30 min; a 4px span is 1.8 min
 phone: plot 181px for 165 min = 1.10 px/min; smallest gap 3 min = 3.3px; longest gap 63 min = 69px; span 47 min = 52px; tick every 60 min; a 4px span is 3.6 min
 height at 32px a row: 448px of strips on a desktop; on a phone each row adds a 20px name line: 728px
 share of the scale in the longest empty stretch: 38%
migration desktop and paper: plot 340px for 90 days = 3.78 px/day; a one-day span 3.8px; tick every 14 days
migration phone: plot 182px for 90 days = 2.02 px/day; a one-day span 2.0px; tick every 28 days
limit 72 h at minute grain: 0.0419 px per min; a 4px span needs 95 min
limit 730 days at day grain: 0.2479 px per day; a 4px span needs 16 day
limit 120 months at month grain: 0.0496 px per day; a 4px span needs 81 day

12 rows 3 groups: desktop h 564 phone h 780
14 rows 2 groups: desktop h 580 phone h 832
20 rows 3 groups: desktop h 820 phone h 1180
A4 height inside 18mm margins: 986 px
```

Two things follow. The incident's longest empty stretch is 38% of its scale, under the 60% warning, so it draws as one timeline. And in a migration of 90 days, a span one day long is 2px on a phone, so it is refused: a one-day step in a long plan is an event.

## Decisions

Each decision has a recommended answer, which the proposal above follows, and the other choice.

1. **A new kind, not a date scale on the range chart.** Recommended: a new kind, `"kind": "timeline"`, drawn with the range chart's row code (section 6). The other choice is the plan approved in `charts.md`: the range chart takes a date scale. It adds no kind name, but the range chart gains a set of rules that apply only when its scale holds dates, and its 12-row limit does not hold an incident.
2. **Rows down the page, time across.** Recommended: yes, one row for each event, as in the range chart. Names stay level at 14px, close events never collide, and the scale stays true. The other choice: time running down the page, with each event's full text beside it. It reads like a changelog and holds long text, but close events then need either equal spacing, which is false (section "The obvious answers"), or names that move away from their marks with lines.
3. **The Gantt chart is the same kind, with no arrows between tasks.** Recommended: yes (section 6). The other choice: a separate `"kind": "gantt"` with arrows from one task to the next. It needs line routing between rows, and it gives authors two kinds for one picture.
4. **No break in the scale.** Recommended: no break; `render` warns when one empty stretch fills more than 60% of the scale, and the author splits the timeline. The other choice: at most one break, drawn as a gap in the axis with its length written ("50 min not shown"). It keeps one figure, but the reader must read the words to know the distance is false.
5. **The notes live in the closed table in words.** Recommended: yes, as every chart's numbers do, and the page has no second timeline table. The other choice: an open table under the figure in a Brief, because an incident's readers often scan and quote it. That repeats every row on the page.
6. **20 rows.** Recommended: 20, which fits one A4 page with its caption. The other choice: 12, as the range chart. Then the incident review does not fit, and most incident timelines stay tables.
7. **No planned-against-actual in one row.** Recommended: not now. A project status shows the current plan, an "as of" line, and slips in words ("2 weeks late"). The other choice: two marks in a row, the plan as an outline and the actual as a filled bar. It needs a key, and the range chart already refuses two marks in a row.

## Not in this proposal

- Code, and changes to `SKILL.md`, `DESIGN.md`, `diagrams.md` and `check.cjs`. Each comes in its build item.
- Arrows between tasks, a progress fill, the critical path and resources (section 6).
- A walkthrough that steps through the events with the dot. The table gives the order. It may be proposed if a real document asks for it.
- Real times on the line chart, for points that are not equally spaced. The time scale makes it possible later; it needs its own short proposal.
- A hand-drawn mock page. It can be added if the owner wants to see the forms before approving.
