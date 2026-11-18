# Diagram data

A diagram is written as data, and `scripts/render.cjs` draws it. Do not write the SVG by hand, and do not edit a drawing after it is made. To change a drawing, change its data and run `render` again.

## The block

Put one block where the drawing belongs, inside the well of a figure:

```html
<figure>
  <div class="fig" role="region" aria-label="Figure 1, the path of an order" tabindex="0">
<!-- docent:diagram
{
  "id": "order",
  "label": "An order in three steps: the customer places an order, the shop packs it, and the parcel goes to the customer.",
  "lanes": [
    {"id": "customer", "name": "Customer", "icon": "person"},
    {"id": "shop", "name": "Shop", "icon": "team"}
  ],
  "parts": [
    {"id": "order", "lane": "customer", "name": "Order", "note": "two books", "icon": "document"},
    {"id": "parcel", "lane": "shop", "name": "Parcel", "note": "packed and weighed", "icon": "release"},
    {"id": "receipt", "lane": "customer", "name": "Delivery note", "note": "signed at the door", "icon": "message"}
  ],
  "legs": [
    {"from": "order", "to": "parcel", "verb": "place"},
    {"from": "parcel", "to": "receipt", "verb": "ship"}
  ]
}
-->
<!-- /docent:diagram -->
  </div>
  <figcaption><strong>Figure 1</strong>The path of an order.</figcaption>
</figure>
```

`render` writes the drawing between `-->` and `<!-- /docent:diagram -->`. The data stays in the document, so `render` and `check` can run again at any time.

## The fields

| Field | Needed | What it is |
|---|---|---|
| `id` | yes | A short id, unique in the document: small letters, digits and `-`, starting with a letter. |
| `label` | yes | One or two sentences that say what the drawing shows. A screen reader reads this in place of the drawing. |
| `lanes` | yes | 1 to 5 lanes. Each has an `id`, a `name` (at most 28 characters) and, if you want, an `icon`. |
| `parts` | yes | 2 to 12 parts. Each has an `id`, the `lane` it belongs to, a `name` (at most 32 characters) and, if you want, a `note` (at most 40 characters), an `icon` and a `state`. |
| `legs` | yes | 1 to 16 legs, in order. Each goes `from` one part `to` another and, if you want, has a `verb` (at most 24 characters). A leg can also have `"optional": true`. The legs are numbered in the order you write them. |
| `side` | no | 1 or 2 side legs: a short dashed path from a part of the route to an extra part. See "Side legs". |
| `place` | no | `"flow"` (the default) for a diagram in the text flow. `"walk"` for the diagram beside walkthrough steps: leg 1 lights with step 1, leg 2 with step 2, and so on. |
| `form` | no | `"auto"` (the default), `"wide"`, `"tall"` or `"plates"`. Leave it out and the renderer picks. Name a form only when you have a reason. |
| `icons` | no | Icons that you draw for this diagram: an object from a name to the shapes of the icon. See below. |

Keep names, notes and verbs short. A verb is one to three words. Leave the verb out only when the leg means "and then"; the leg keeps its number. `render` warns when no leg has a verb. The renderer refuses text that is too long.

## Two drawings in one figure

When the text has two separate chains (two flows that do not meet), write two diagram blocks in one well. They stand side by side when both fit, and one below the other when they do not. Each keeps its own numbers, its own dot and its own phone form. Do not join two chains into one diagram: one drawing numbers its legs in one order, so the reader would read an order that is not there. A well holds at most two drawings, and the well beside walkthrough steps holds one; `check` reports an error otherwise.

```html
<figure>
  <div class="fig" role="region" aria-label="Figure 3, an order and a refund" tabindex="0">
<!-- docent:diagram
{ ...the first chain... }
-->
<!-- /docent:diagram -->
<!-- docent:diagram
{ ...the second chain... }
-->
<!-- /docent:diagram -->
  </div>
  <figcaption><strong>Figure 3</strong>An order on the left, and a refund on the right.</figcaption>
</figure>
```

## Route or Plates

- A **route** is data in which each leg starts where the leg before it ended, and every part is visited once. A route can be drawn in any form, and it also gets a single-track form for phones.
- Any other data (paths that branch, an arrow that goes back, a part with no leg) is drawn as **Plates**. On a phone and on paper it takes a **column form**: the parts in one column, an arrow down to the next part, and a go-to row ("to Answer", "back to Check") for every other leg. Keep part names to about 20 characters, so the column fits a 320px screen.
- **A stack of layers** (screens, a service, a queue, workers, a store) is one lane with one part for each layer, a leg from each layer to the next, and one more leg for a call that skips a layer. Plates draws it on a desktop, and the column form on a phone.

A walkthrough needs a route with one leg for each step. Give it at most two lanes; the room beside the steps is 520px wide.

In Plates every part has its own row, in the order in which the legs reach the parts. Two arrows may cross at a right angle; they never share a line. Plates is easiest to draw when most legs go from one lane to another. When `render` refuses a Plates diagram, move a part to another lane, remove a leg, or shorten a verb.

## Side legs

A walkthrough needs a route, because step 1 lights leg 1, step 2 lights leg 2, and so on. When the text also needs one short branch beside the steps, such as "if the report is known, it is closed", write it as a **side leg**:

```json
"parts": [
  ...,
  {"id": "closed", "lane": "maintainers", "name": "Closed", "note": "as a duplicate", "icon": "merge"}
],
"side": [
  {"from": "report", "to": "closed", "verb": "if it is known"}
]
```

- A side leg goes from a part of the route to an extra part that only this side leg uses. The extra part sits in another lane, level with the part where the side leg starts.
- It is drawn dashed, with its verb above it. It has no number, no step lights it, and no dot travels it. On a phone it is a go-to row with no number under the part where it starts.
- The `verb` is needed: it says when the side path happens. Say the side path in the `label` too.
- At most 2 side legs. A diagram with side legs is drawn as Route tall, beside the steps or in the text flow.
- The walkthrough has one step for each leg of the route; side legs have no step.

## Sequence diagrams

A sequence diagram shows messages between a few participants, in time order: a browser asks a web app, the web app asks a database, the replies come back. It is drawn in UML notation. Write it with `"kind": "sequence"`:

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

| Field | What it is |
|---|---|
| `participants` | 2 to 6. Each has an `id` and a `name` (at most 20 characters). |
| `messages` | In time order, at most 30 messages in all. A message has `from`, `to` and a `verb` (at most 24 characters). A message from a participant to itself is a call to itself. |
| `"reply": true` | The message answers a call: a dashed line with an open arrowhead. |
| `"async": true` | The sender does not wait for an answer: a solid line with an open arrowhead. With neither, a message is a call that waits: a filled arrowhead. |
| `"create": true` | The message creates its receiver. The receiver's box starts at this row, and no message may use the receiver before it. |
| `"destroy": true` | The message ends its receiver. Its track stops at a cross, and no message may use the receiver after it. |
| `alt`, `par` | A fragment with 2 or 3 cases, in place of a message: `{"alt": [{"when": "If not", "messages": [...]}, ...]}`. `alt`: one case happens. `par`: the cases happen at the same time. A `when` is at most 32 characters; it is needed for `alt` and may be left out for `par`. |
| `opt`, `loop`, `break`, `critical` | A fragment with one case: `{"loop": {"when": "for each item", "messages": [...]}}`. `opt`: only when the condition holds. `loop`: repeated. `break`: when the condition holds, these messages happen and the rest is skipped. `critical`: one step that nothing can interrupt; its `when` may be left out. |
| `ref` | A frame for steps drawn in another diagram, in place of a message: `{"ref": "Log in", "over": ["browser", "app"]}`. `over` names the participants it covers, and they must stand side by side. The name is at most 32 characters. |

- A fragment may hold one more fragment, not more. Write the `when` as the condition, such as "If the cache has the page" or "for each item"; the drawing puts it in brackets.
- The activation bars are worked out from the messages: a call starts a bar on its receiver, and the receiver's last reply to the caller ends it. A call with no reply gets a short bar.
- On a desktop each participant is a plain box at the top with a track below it, and each message is a level arrow with its number. Each fragment is a frame with its operator in a tab and its guards in brackets. One dot travels the messages in order, twice.
- On a phone the drawing is a script: one row for each message, with its number, "From → To", and the verb. A reply, a message that does not wait, a create and a destroy say so before the verb. Each case of a fragment is a band named by its operator and guard.
- On paper the desktop form prints, shrunk to the sheet when it keeps at least 80% of its size; else the script prints.
- `render` also writes the steps in words, in a closed section under the drawing ("The diagram in words"), and ends them with a key to the marks the drawing uses. A screen reader reaches it, and it prints. The `label` stays a one- or two-sentence summary.
- A sequence diagram sits in the text flow. It has no `form`, no `lanes`, no `parts` and no `legs`. Six participants with long names need more than the page; then the script shows on a desktop too.

## Flowcharts

A flowchart shows steps with decisions: a path that splits on a question, ends early, or goes back to an earlier step. Write it with `"kind": "flow"`:

```json
{
  "id": "job",
  "kind": "flow",
  "label": "A job is read, set up and run. A bad input stops it. A bad result is run again while tries are left.",
  "nodes": [
    {"id": "get", "name": "Get the job"},
    {"id": "valid", "ask": "Input valid?"},
    {"id": "run", "name": "Run the work"},
    {"id": "good", "ask": "Result good?"},
    {"id": "refuse", "name": "Refuse the job", "stop": true},
    {"id": "done", "name": "Done"}
  ],
  "edges": [
    {"from": "get", "to": "valid"},
    {"from": "valid", "to": "run", "when": "yes"},
    {"from": "valid", "to": "refuse", "when": "no"},
    {"from": "run", "to": "good"},
    {"from": "good", "to": "done", "when": "yes"},
    {"from": "good", "to": "run", "when": "no, try again"}
  ]
}
```

| Field | What it is |
|---|---|
| `nodes` | 2 to 16. A **step** has an `id` and a `name` (at most 32 characters). A **decision** has an `id` and an `ask`, a question of at most 28 characters. A step with `"stop": true` ends a path. At most 4 decisions. |
| `edges` | 1 to 24, each `from` one node `to` another. A step has one exit and no `when`. A decision has 2 or 3 exits, each with a `when` (at most 16 characters, such as "yes" or "more than 10"). |

- **The main path** is the first node, then each node's first exit, in the order you write the edges. Write the exit that most readers take first.
- Every node is reached from the first node. A path ends at a stop or at the last node of the list.
- On a desktop the main path stands in the first column and every other node in the second. A decision is a plate with pointed ends, a stop has a thick outline, and the arrows have no numbers: the `when` of an exit sits beside its arrow. An arrow back runs between the columns. One dot travels the main path, twice.
- On a phone and on paper the flowchart takes the column form: a side exit or an arrow back is a go-to row ("yes, back to Run the work").
- `render` also writes the steps in words, in a closed section under the drawing.
- A flowchart sits in the text flow and has no `form`. When `render` says that there is "no free path" between two nodes, let the arrow back go to a nearer step, or split the flowchart in two.

## Activity diagrams

An activity diagram is a flowchart in UML notation: actions, decisions, paths that run at the same time, and who does each step. Write it with `"kind": "activity"` when the readers know UML or the document is a design; for other readers a flowchart (`"kind": "flow"`) says the same with fewer marks.

```json
{
  "id": "order-flow",
  "kind": "activity",
  "label": "The shop takes an order and checks the stock. When the items are in stock, the warehouse packs them while the shop sends the invoice.",
  "partitions": [{"id": "shop", "name": "Shop"}, {"id": "warehouse", "name": "Warehouse"}],
  "nodes": [
    {"id": "start", "type": "initial", "partition": "shop"},
    {"id": "take", "name": "Take the order", "partition": "shop"},
    {"id": "stock", "type": "decision", "partition": "shop"},
    {"id": "split", "type": "fork", "partition": "warehouse"},
    {"id": "pack", "name": "Pack the items", "partition": "warehouse"},
    {"id": "invoice", "type": "send", "name": "Send the invoice", "partition": "shop"},
    {"id": "both", "type": "join", "partition": "warehouse"},
    {"id": "done", "type": "final", "partition": "warehouse"},
    {"id": "tell", "name": "Tell the customer", "partition": "shop"},
    {"id": "closed", "type": "flow-final", "partition": "shop"}
  ],
  "flows": [
    {"from": "start", "to": "take"},
    {"from": "take", "to": "stock"},
    {"from": "stock", "to": "split", "guard": "in stock"},
    {"from": "split", "to": "pack"},
    {"from": "split", "to": "invoice"},
    {"from": "pack", "to": "both"},
    {"from": "invoice", "to": "both"},
    {"from": "both", "to": "done"},
    {"from": "stock", "to": "tell", "guard": "else"},
    {"from": "tell", "to": "closed"}
  ]
}
```

| Field | What it is |
|---|---|
| `nodes` | 2 to 20, each with an `id` and a `type`. An `action` (the default type), an `object`, a `send` (a signal is sent) and an `accept` (the activity waits for an event) have a `name` of at most 32 characters; an object may have a `state` of at most 20 characters, drawn in brackets. An `initial`, `decision`, `merge`, `fork`, `join`, `final` or `flow-final` node has no name, as in UML. At most 4 forks. |
| `flows` | 1 to 30, each `from` one node `to` another. Only a flow out of a decision has a `guard` (at most 24 characters, without brackets: the renderer adds them). |
| `partitions` | Optional, at most 5, each with an `id` and a `name`. When a diagram has partitions, every node names one in `partition`, and each partition is a column. |

- An initial node has one flow out and none in. A decision has one flow in and two or more out, each with a different guard; a merge has two or more in and one out. A fork has one in and two or more out; a join has two or more in and one out. An action, object, send or accept node has at most one flow out: to split the path, add a decision or a fork. A path ends at a `final` node (the activity ends) or a `flow-final` node (only this path ends).
- Every node is reached from an initial node.
- **The main path** is the first initial node, then each node's first flow, in the order you write the flows. One dot travels it; the other flows keep still.
- The renderer puts the nodes in rows, routes each flow with right angles, and puts each guard beside its flow, near the decision. It draws each mark in UML notation: a filled dot, round-cornered actions, a hollow diamond, a thick bar, a ring around a dot, a ring with a cross. The lines are solid with an open arrowhead.
- On a phone and on paper the diagram takes the column form: each node one under another, an arrow when a node's only flow goes to the next one, and else a row for each flow ("[else] to Tell the customer"). Partitions become bands.
- `render` also writes the steps in words, in a closed section under the drawing, and a key to the marks the drawing uses.
- When `render` says that there is "no free path" or "no room beside its line", make the diagram smaller: fewer flows back, or two diagrams.

## Optional legs

A leg with `"optional": true` is a path that only some readers take, or that happens only in some cases. It is drawn as a dashed arrow:

```json
{"from": "check", "to": "answer", "verb": "skip the review", "optional": true}
```

Say in the verb, or in the text beside the figure, who takes this path or when. A dashed arrow alone does not say it. Say it in the `label` too. A leg that every reader takes has no `optional`.

## State

A part can carry a state, when the document reports how that part ended:

```json
{"id": "tests", "lane": "server", "name": "Tests", "note": "3 tests failed", "icon": "inspect", "state": "err"}
```

| `state` | Means | Color |
|---|---|---|
| `"ok"` | It succeeded. | Green |
| `"warn"` | It needs care, or it waits. | Amber |
| `"err"` | It failed. | Red |

The renderer draws the outline of the part in the status color and puts a small status dot on the outline. The name, the note and the icon keep their colors.

- **Say the status in words.** A part with a state needs a `note` that says it, such as `"3 tests failed"`. Some readers cannot tell red from green, and a printed page may have no color. `render` refuses a part with a state and no note.
- **Say it in the `label` too**, because a screen reader reads the label in place of the drawing.
- **Use a state only for a status.** A state is not a way to make a part stand out, to mark a team, or to show which part is new. A part with no state is the normal case.
- Only parts have a state. A leg has none: the color of a leg shows the current step of a walkthrough.
- These three states are the only colors that an author can give. There is no field for another color.

## Icons

Built-in names: `person`, `team`, `computer`, `server`, `store`, `timer`, `key`, `document`, `message`, `branch`, `release`, `inspect`, `check`, `commit`, `merge`.

Pick by kind. Two parts of the same kind share one icon; two parts of different kinds never share one. In one diagram, either every part has an icon or no part has one. The same holds for lanes.

When no built-in icon fits, draw one in `icons`, to the rules in `DESIGN.md` (a 16 by 16 grid, at most six shapes, no letters):

```json
"icons": { "bug": "<circle cx=\"8\" cy=\"9\" r=\"3.5\"/><path d=\"M8 5.5V3M4.5 9h-2M13.5 9h-2\"/>" }
```

An icon may hold only these shapes and attributes: `path` (`d`), `circle` (`cx`, `cy`, `r`), `rect` (`x`, `y`, `width`, `height`, `rx`, `ry`), `line` (`x1`, `y1`, `x2`, `y2`) and `polyline` (`points`). Write each shape as one closed tag, such as `<circle cx="8" cy="8" r="4"/>`. Anything else is rejected: `render` leaves the icon out and warns, and `check` reports an error. A drawn icon belongs to one diagram; to use it in two diagrams, write it in both. When no clear picture exists, use no icons. A wrong picture is worse than none.

## What the renderer says

- `render doc.html: diagram 1 ("order") drawn as wide` — the drawing is in the document.
- `... cannot be drawn within the spacing rules: ...` — the data asks for more than the form can hold. Shorten the text that the message names, remove a part, or let the renderer pick the form.
- `... warning: the drawing is 734px wide; beside the walkthrough steps there is room for 520px, so it will scroll sideways. It has 3 lanes, and two lanes fit there. The widest texts are "..." and "..."` — the drawing will scroll sideways beside the steps. Each lane is as wide as its widest name or note. Beside walkthrough steps, two lanes fit when the names have up to about 12 characters. Three lanes fit only when every name has about 4 characters. So use two lanes there, or shorten the texts that the message names.
- `... warning: the drawing is 796px wide; beside the walkthrough steps there is room for 520px, so it will scroll sideways. Its data is not a route ..., so it is drawn as Plates, which needs more room` — the diagram beside the steps has a path that branches, so it is not a route. Shorter texts do not help here. Choose one: when the extra path is one short branch to a part of its own, write it as a side leg (see "Side legs" above); or take the extra path out; or put the diagram in the text flow (`"place": "flow"`) and write the steps as a numbered list.

- `... warning: no phone form: The column form cannot be drawn within the spacing rules: ...` — rare: the column form failed, so the drawing scrolls on a phone. Shorten the text that the message names.
- `... warning: on a phone this drawing scrolls sideways, and leg 3 ("...") is not on the first screen: its two parts show there, but its arrow does not` — only after the warning above: the drawing has no phone form. On a phone the reader sees the left part first, and there this arrow is missing. Say the path in the text too. The warning stays after you did, because `render` cannot read the text; tell the user that this warning is handled. With scripts on, the page shows a line under the figure that tells the reader to scroll.

`render` draws every diagram that it can. When one is refused, the others are still drawn, and `render` ends with exit code 1.

To see one drawing without a document: `node scripts/render.cjs --data diagram.json > drawing.svg`. The SVG goes to standard output, and the message goes to standard error.
