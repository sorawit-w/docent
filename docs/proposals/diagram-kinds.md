# Proposal: new diagram kinds and looser diagram rules

Status: **approved on 2026-11-18**, with one change: the sequence diagram comes before the flowchart, because four documents needed it. The commit graph is declined, and the text form is visible. The items are built in this order, each in its own pull request. The sample page [`diagram-kinds.html`](diagram-kinds.html) shows the proposed forms as drawings made by hand, with neutral content. Open it in a browser and switch the theme and the width.

## The answer first

Build one shared piece first: **a one-column form for any diagram that is not a route.** It closes the phone gap for branching drawings, and the flowchart, the layered stack and the side leg all depend on it. Then loosen two rules (verbs, long notes) and raise the lane limit to 5. Then build the flowchart and the sequence diagram, each as a new kind. Decline the commit graph for now. Handle two separate chains as two drawings in one figure, not as one drawing.

| # | Gap | Answer | Size |
|---|---|---|---|
| 1 | A branching drawing has no phone form | **Build** a one-column form ("Column") for all non-route data | Medium |
| 2 | Every arrow needs a verb; a note over 28 characters forces Plates | **Loosen both** | Small |
| 3 | At most 4 lanes | **Raise to 5** in the text flow; beside a walkthrough the room is 520px anyway | Small |
| 4 | Two separate chains | **Two drawings in one figure**, side by side when both fit | Small |
| 5 | A branch beside walkthrough steps | **Build** "side legs" in Route tall | Medium |
| 6 | Layered architecture with a skipping arrow | **Already possible** as one-lane Plates; the Column form gives it a phone form. An instruction fix | Small |
| 7 | Sequence diagram | **Build** a new kind, `"kind": "sequence"` | Large |
| 8 | Flowchart with decisions and loops | **Build** a new kind, `"kind": "flow"` | Large |
| 9 | Commit graph: merge against squash | **Decline for now**; one document needed it | — |

Order: 1, 2, 3, 4, 5, 6 (with 1), 7, 8. Items 1 to 6 change the existing renderer and give every document something. Items 7 and 8 are new layouts; each is about as large as Plates was. The sequence diagram (7) comes first of the two, because more documents needed it.

## The obvious answer that would be wrong

Adding Mermaid, or another third-party renderer, for the new kinds. It would close every gap at once, but it breaks three rules: the page is one file with no network (a renderer is a large script), the drawing is made by a script before the page opens (so it is the same every time and `check` can compare it), and every drawing uses the page tokens and the spacing rules. DESIGN.md already says that Docent does not use a third-party diagram renderer.

## Rules that every new form keeps

- The three layers: the well as the ground, a band or panel in the page color for each group, and the drawing on top. No box, no fill in a color, no gradient, no shadow.
- Names 14px weight 600, notes and verbs 12px, at real size. Text color for lines and names, muted for notes, outline color for tracks. Ultramarine (lamp in dark) only for the current leg and the dot.
- The spacing rules of DESIGN.md: a straight run behind each arrowhead, marks clear of arrowheads and bends, no text on a line, no dot on a mark.
- A dashed line keeps one meaning: a path that only some readers take.
- **A text form.** For the sequence diagram and the flowchart, the `label` alone cannot carry 10 or 20 steps. `render` also writes the steps in words, as an ordered list in a closed section under the figure ("The diagram in words"). A screen reader reaches it, it prints, and it is the form that works everywhere. The `label` stays a one- or two-sentence summary.
- `check` tests each new drawing as it tests the old ones: the drawing is the one that `render` makes from its data, and the text form matches the data.

---

## 1. Column: a one-column form for data that is not a route

**Build.** Today a drawing whose paths branch is drawn as Plates only. On a phone it scrolls sideways, and `render` warns when a whole arrow is off the first screen. A route has a single-track form; non-route data has none.

**The form.** The parts stand in one column, in the same order as in Plates. A leg from a part to the next part in the column is a short arrow down. Every other leg (a skip, a branch, an arrow back) is not drawn as a line. In its place, a short line to the right of the part says where it goes: its numbered mark, its verb, and a **go-to mark** (a ring with the number of the target part). Each part has its number in a mark at its left, so the go-to mark can name it. A dashed go-to line is an optional leg.

| Where | Form |
|---|---|
| Desktop | Plates, as today. |
| Phone (narrower than the Plates drawing plus the page room) | Column, in place of Plates, like the single-track form of a route. It fits 264px. |
| Print | Plates when it fits the sheet; Column when Plates would shrink below 80% of its size. |
| Screen reader | The `label`, as today. |

**Data.** No new field. Any data that is not a route gets the Column form, when its texts fit 264px.

**Limits.** The limits of Plates. A part name longer than about 24 characters does not fit the column; then there is no Column form and `render` warns, as now.

**`check`.** The Column drawing must match the data like the other forms. The phone warning about an arrow off the first screen goes away when a Column form exists.

## 2. Looser rules: verbs and long notes

**Verbs become optional** for a leg whose meaning is "and then". A leg with no verb still gets its numbered mark, so the order shows. `check` warns when no leg of a diagram has a verb, because then the drawing may show order and nothing else, and a numbered list would do.

**The 28-character rule goes.** Today a note longer than 28 characters forces Plates before the renderer tries a route. Instead, the renderer tries Route wide and Route tall with the long note, and the spacing rules decide. A note may wrap onto two lines in a route form (at most 40 characters, as now). The phone form wraps it the same way.

**Data.** `"verb"` may be left out. Nothing else changes.

**Limits.** As today: name 32, note 40, verb 24 characters.

## 3. Five lanes

**Raise the lane limit from 4 to 5.** I measured a five-lane route with short names on the current renderer, with only the limit changed: Route wide 922px, Route tall 1022px, Plates 1100px. All three keep the spacing rules and fit a full-width well (1104px). The single-track phone form shows one band per visit, so the number of lanes does not change its width.

Beside walkthrough steps the room is 520px, which holds two lanes. Five lanes there keep the existing warning that names the cause.

**`check`.** The tests run the stored drawings again with a five-lane fixture in all forms.

## 4. Two separate chains in one figure

**Two drawings, not one.** One drawing numbers its legs in one order, and the dot travels them in that order, so two unrelated chains in one drawing tell the reader a false order. Instead, a figure may hold two diagram blocks. They stand side by side in the well when both fit at real size, and one below the other when they do not. Each is a route, so each keeps its own single-track phone form and its own dot.

**Data.** Two `docent:diagram` blocks in one `.fig` well. The caption names both.

**Limits.** At most two drawings in one figure.

**`check`.** A third block in one well is an error.

## 5. Side legs beside walkthrough steps

**Build.** A walkthrough needs a route, because step n lights leg n. A real document needed one short branch beside the steps, and today that turns the drawing into Plates (796px in the reported case), too wide for the 520px beside the steps.

**The form.** Route tall keeps its route. A **side leg** goes from a part of the route to an extra part that is not on the route. It is a short dashed arrow to the side, in the same lane or the next one. A side leg has no number, no step, and is never lit; its verb says when it happens ("if it is known"). The extra part is a plain ring with its name.

| Where | Form |
|---|---|
| Desktop, beside the steps | Route tall with the side leg. |
| Phone | The single-track form; the side leg is a short dashed spur to the right inside its band. |
| Print | As on a phone when it does not fit. |
| Screen reader | The `label`, which must say the side path in words. |

**Data.**

```json
"side": [
  {"from": "triage", "to": "duplicate", "verb": "if it is known"}
],
"parts": [ ..., {"id": "duplicate", "lane": "maintainers", "name": "Closed", "note": "as a duplicate", "side": true} ]
```

**Limits.** At most 2 side legs. An extra part has exactly one side leg into it and no leg out.

**`check`.** The walkthrough step count still equals the number of route legs; side legs are not counted.

## 6. Layered architecture with a skipping arrow

**Already possible.** About five layers in a chain, plus one arrow that skips layers, is one-lane Plates: one part per layer, a leg from each layer to the next, and one more leg that skips. The test fixture `skip.json` is that drawing. It is 540px wide, so today it scrolls on a phone. With the Column form (item 1) it gets a narrow form.

**Fix.** An instruction in `diagrams.md`: "A stack of layers is one lane with one part per layer." A drawn sample is on the sample page.

## 8. Flowchart

**Build, as a new kind.** Decisions, loops and arrows back cannot be drawn as Plates in a way that reads: Plates puts every part on its own row in leg order, with no shape for a decision, and an arrow back crosses the drawing.

**The form.** One main column holds the main path, top to bottom. A **step** is a plate with its number in a mark at its left. A **decision** is a plate with pointed ends, and it holds a question. Each exit of a decision has a short label ("yes", "no", "more than 10"). The first exit goes on down the main column. The other exits go to the right, to a second column. A **stop** is a plate with a thick outline, and it ends a path. An **arrow back** leaves a part on its right side, rises in the space between the columns, and meets the target on its right side, so it never crosses the main column. No arrow passes behind a plate.

The dot travels the main path, twice, then rests. Arrows back and side exits have no dot.

| Where | Form |
|---|---|
| Desktop | Two columns, as above. A decision tree (one value leads to a second decision, then to five results) puts the results in a row under the last decision. |
| Phone | The Column form of item 1: steps and decisions in one column; each side exit is an indented line under its decision with its label and a go-to mark or a stop. |
| Print | Desktop when it fits, else Column. |
| Screen reader | The text form: "1. Get the job. 2. Read the input. Is the input valid? If no: refuse the job, and stop. If yes: go on to step 3." |

**Data.**

```json
{
  "id": "job",
  "kind": "flow",
  "label": "A job is read, set up and run. A bad input stops it. A bad result is run again while tries are left.",
  "nodes": [
    {"id": "get", "name": "Get the job"},
    {"id": "read", "name": "Read the input"},
    {"id": "valid", "ask": "Input valid?"},
    {"id": "refuse", "name": "Refuse the job", "stop": true}
  ],
  "edges": [
    {"from": "get", "to": "read"},
    {"from": "read", "to": "valid"},
    {"from": "valid", "to": "setup", "when": "yes"},
    {"from": "valid", "to": "refuse", "when": "no"}
  ]
}
```

A node with `"ask"` is a decision; every edge out of a decision needs `"when"`. An edge out of a step needs nothing. The main path is the first exit of each decision, in the order written.

**Limits.** 16 nodes, 24 edges, 4 decisions, 2 or 3 exits for each decision, 2 columns. Names 32 characters, questions 28, exit labels 16.

**`check`.** Every node is reached from the first node. Every path ends in a stop or in the last node. Each decision has 2 or 3 labelled exits. The drawing and the text form match the data.

## 7. Sequence diagram

**Build, as a new kind.** Four documents needed it and wrote a numbered list.

**The form.** Each participant is a plate at the top, with a track (a thin line in the outline color) going down. Each message is a level arrow from one track to another, in order from top to bottom, with its numbered mark in the middle and its verb above. A **reply** is a thin muted line with an open arrowhead; it is not dashed, because dashed means optional. A **call to itself** is a small loop to the right of the track. **One group of alternatives** is a set of bands in the page color across the drawing, one band for each case, each with a short label at its upper left ("If the cache has the page", "If not").

The dot travels the messages in order, twice, then rests.

| Where | Form |
|---|---|
| Desktop | As above. 6 participants need about 720px. |
| Phone | A script form: one row for each message, with its mark, "From → To" in names, and the verb below. A group is a band with its label, holding its rows. It fits 264px. |
| Print | Desktop, shrunk to the sheet when needed (at 6 participants about 90%), or the script form when it would shrink below 80%. |
| Screen reader | The text form: "1. Browser to web app: ask for the page. 2. Web app to itself: check the session. If the cache has the page: 3. ..." |

**Data.**

```json
{
  "id": "page",
  "kind": "sequence",
  "label": "The browser asks for a page. The web app reads it from the cache, or from the database when the cache does not have it.",
  "participants": [
    {"id": "browser", "name": "Browser"},
    {"id": "app", "name": "Web app"},
    {"id": "cache", "name": "Cache"},
    {"id": "db", "name": "Database"}
  ],
  "messages": [
    {"from": "browser", "to": "app", "verb": "ask for the page"},
    {"from": "app", "to": "app", "verb": "check the session"},
    {"alt": [
      {"when": "If the cache has the page", "messages": [
        {"from": "app", "to": "cache", "verb": "read"},
        {"from": "cache", "to": "app", "verb": "page", "reply": true}
      ]},
      {"when": "If not", "messages": [
        {"from": "app", "to": "db", "verb": "query"},
        {"from": "db", "to": "app", "verb": "rows", "reply": true}
      ]}
    ]},
    {"from": "app", "to": "browser", "verb": "page", "reply": true}
  ]
}
```

**Limits.** 3 to 6 participants, at most 24 messages, one group of 2 or 3 cases, no group inside a group. Names 20 characters, verbs 24, case labels 32.

**`check`.** Every message names two participants. The group holds at least one message in each case. The drawing and the text form match the data.

## 9. Commit graph: merge against squash

**Decline for now.** One document needed it. A commit graph has its own look (branches as lines, commits as dots, a merge that joins two lines) and its own rules, and it would be a third new layout for one use. The document can show the difference today with two small one-lane-per-branch drawings in one figure (item 4) and one sentence each. If a second document needs it, it is worth a proposal of its own.

---

## Decided

1. The order: Column form, looser rules, five lanes, two drawings in a figure, side legs, then the sequence diagram, then the flowchart.
2. The commit graph is declined for now.
3. The flowchart and the sequence diagram get a visible text form ("The diagram in words"), in a closed section under the figure.
