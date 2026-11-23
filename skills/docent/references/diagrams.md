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

## State machine diagrams

A state machine diagram shows the states that one thing can be in, and the events that move it from one state to the next. Write it with `"kind": "state"`:

```json
{
  "id": "order-states",
  "kind": "state",
  "label": "An order is new until it is paid. A paid order is packed and labeled at the same time, then it is shipped.",
  "states": [
    {"id": "start", "type": "initial"},
    {"id": "new", "name": "New", "entry": "reserve stock"},
    {"id": "check", "type": "choice"},
    {"id": "paid", "name": "Paid"},
    {"id": "shipping", "type": "composite", "name": "Shipping", "regions": 2},
    {"id": "s1", "type": "initial", "in": "shipping", "region": 1},
    {"id": "packing", "name": "Packing", "in": "shipping", "region": 1},
    {"id": "s2", "type": "initial", "in": "shipping", "region": 2},
    {"id": "labeling", "name": "Labeling", "in": "shipping", "region": 2},
    {"id": "out", "name": "Shipped"},
    {"id": "end", "type": "final"}
  ],
  "transitions": [
    {"from": "start", "to": "new"},
    {"from": "new", "to": "check", "trigger": "pay"},
    {"from": "check", "to": "paid", "guard": "card valid"},
    {"from": "check", "to": "new", "guard": "else", "effect": "show error"},
    {"from": "paid", "to": "shipping", "trigger": "pick"},
    {"from": "s1", "to": "packing"},
    {"from": "s2", "to": "labeling"},
    {"from": "shipping", "to": "out", "trigger": "hand over"},
    {"from": "out", "to": "end"}
  ]
}
```

| Field | What it is |
|---|---|
| `states` | 2 to 16, not counting composite states. A `state` (the default type) has a `name` of at most 28 characters, and may have `entry`, `do` and `exit` actions (each at most 28 characters). A `composite` state has a `name` and holds the states that name it in `in`; it has 1 or 2 `regions`, and each state inside names its `region`. The pseudostates `initial`, `final`, `choice`, `junction`, `history`, `deep-history`, `fork`, `join` and `terminate` have no name. |
| `transitions` | 1 to 30, each `from` one state `to` another, or to itself. Each may have a `trigger` (the event), a `guard` (a condition, without brackets) and an `effect` (what is done, without the slash), each at most 24 characters. The label is drawn as `trigger [guard] / effect`. |

- A state machine has one initial pseudostate outside every composite state; each region has at most one. A transition out of an initial pseudostate has no trigger and no guard. A choice has two or more transitions out, each with a guard. A final state and a terminate have no transition out. A history sits inside a composite state.
- Composite states go one level deep. A transition may start or end on a composite state's frame; it never joins the frame to a state inside it.
- **The main path** is the initial pseudostate, then each state's first transition, in the order you write them. One dot travels it.
- The renderer draws each mark in UML notation: round-cornered states with their actions under a line, a rounded frame for a composite state with a dashed line between its regions, a hollow diamond for a choice, H or H* in a ring, a thick bar, a cross. A transition to itself is a loop at the right of its state.
- On a phone and on paper the diagram takes the column form; a composite state's regions become bands. `render` also writes the states and transitions in words, with a key to the marks.

## Interaction overview diagrams

An interaction overview diagram shows how several interactions follow one another: an activity diagram whose steps are ref frames, each standing for a sequence diagram. Write it with `"kind": "interaction-overview"` when a flow is made of several exchanges that each deserve their own sequence diagram:

```json
{
  "id": "checkout-overview",
  "kind": "interaction-overview",
  "label": "A customer logs in, then pays. A failed payment is tried again; a paid order gets a receipt and the warehouse is told, at the same time.",
  "nodes": [
    { "id": "start", "type": "initial" },
    { "id": "login", "ref": "Log in", "diagram": "login" },
    { "id": "pay", "ref": "Pay for the order" },
    { "id": "paid", "type": "decision" },
    { "id": "split", "type": "fork" },
    { "id": "receipt", "ref": "Send the receipt" },
    { "id": "notify", "ref": "Tell the warehouse" },
    { "id": "both", "type": "join" },
    { "id": "end", "type": "final" }
  ],
  "flows": [
    { "from": "start", "to": "login" },
    { "from": "login", "to": "pay" },
    { "from": "pay", "to": "paid" },
    { "from": "paid", "to": "split", "guard": "paid" },
    { "from": "split", "to": "receipt" },
    { "from": "split", "to": "notify" },
    { "from": "receipt", "to": "both" },
    { "from": "notify", "to": "both" },
    { "from": "both", "to": "end" },
    { "from": "paid", "to": "pay", "guard": "failed" }
  ]
}
```

| Field | What it is |
|---|---|
| `nodes` | 2 to 20. An `interaction` (the default type) has a `ref`: the name of the interaction, at most 32 characters. It may name the sequence diagram that draws it in `diagram`: the `id` of that diagram, without `dg-`. The other types are `initial`, `decision`, `merge`, `fork`, `join`, `final` and `flow-final`, as in an activity diagram. At most 12 interactions. |
| `flows` | As in an activity diagram. Only a flow out of a decision has a `guard`. |

- It has no partitions: each interaction names its participants in its own sequence diagram.
- The rules for flows, the main path and the dot are those of an activity diagram.
- Each interaction is a frame with the tag `ref` and its name. The words under the drawing link each named interaction to its sequence diagram, and `check` reports a `diagram` that is not in the document.

## Timing diagrams

A timing diagram shows how the states of a few things change over time, read against a time axis: when each one changes, the messages between them at a moment, and how long a stretch may take. Write it with `"kind": "timing"` when the exact times matter, such as a timeout or a deadline; when only the order matters, a sequence diagram or a state machine says it more simply.

```json
{
  "id": "door-timing",
  "kind": "timing",
  "label": "A user presses the button at 1 second. The controller is busy for 2 seconds and opens the door at 3 seconds; the door must open within 3 seconds of the press. The door closes again at 8 seconds.",
  "time": { "from": 0, "to": 10, "step": 1, "unit": "s" },
  "lifelines": [
    { "id": "user", "name": "User", "states": ["Waiting", "Idle"] },
    { "id": "ctrl", "name": "Controller", "states": ["Busy", "Ready"] },
    { "id": "door", "name": "Door", "states": ["Open", "Moving", "Closed"] }
  ],
  "changes": [
    { "lifeline": "user", "at": 0, "state": "Idle" },
    { "lifeline": "user", "at": 1, "state": "Waiting" },
    { "lifeline": "user", "at": 4, "state": "Idle" },
    { "lifeline": "ctrl", "at": 0, "state": "Ready" },
    { "lifeline": "ctrl", "at": 1, "state": "Busy" },
    { "lifeline": "ctrl", "at": 3, "state": "Ready" },
    { "lifeline": "door", "at": 0, "state": "Closed" },
    { "lifeline": "door", "at": 3, "state": "Moving" },
    { "lifeline": "door", "at": 4, "state": "Open" },
    { "lifeline": "door", "at": 8, "state": "Moving" },
    { "lifeline": "door", "at": 9, "state": "Closed" }
  ],
  "messages": [
    { "from": "user", "to": "ctrl", "at": 1, "verb": "press" },
    { "from": "ctrl", "to": "door", "at": 3, "verb": "open" }
  ],
  "constraints": [
    { "lifeline": "door", "from": 1, "to": 4, "text": "{≤ 3 s}" }
  ]
}
```

| Field | What it is |
|---|---|
| `time` | The axis: `from`, `to` and `step` are numbers, and `unit` (at most 8 characters, such as `ms`) is optional. At most 24 steps. |
| `lifelines` | 1 to 4, each with an `id`, a `name` (at most 20 characters) and 2 to 6 `states` (each at most 16 characters), listed from the top of its row down. |
| `changes` | 1 to 20. Each sets one `lifeline` to one of its `state`s `at` a time on the axis. Every lifeline has a change at the start of the axis, and never changes to the state it is already in. |
| `messages` | Optional, at most 10. Each goes `from` one lifeline `to` another, `at` a time, with a `verb` of at most 20 characters. |
| `constraints` | Optional, at most 6. Each is on one `lifeline`, `from` one time `to` a later one, with a `text` in braces, such as `{≤ 3 s}`. |

- Each lifeline is a row with its states at the left; a thick line steps from level to level at each change. A message is an arrow from the sender's line to the receiver's at its moment; a constraint is a line with a tick at each end, with its text above.
- Nothing moves: a timing diagram has no dot.
- On a phone the diagram becomes a table: one row for each change and each message, in time order. `render` also writes the moments in words, with a key to the marks.

## Use case diagrams

A use case diagram shows who uses a system and for what: the actors outside it, the use cases inside it, and how they are linked. Write it with `"kind": "usecase"`:

```json
{
  "id": "shop-usecases",
  "kind": "usecase",
  "label": "Customers browse the catalog and place orders; placing an order always includes paying, and a coupon may be applied. Members are customers who can also track orders. The payment service takes part in paying.",
  "system": "Online shop",
  "actors": [
    { "id": "customer", "name": "Customer" },
    { "id": "member", "name": "Member" },
    { "id": "bank", "name": "Payment service", "side": "right" }
  ],
  "usecases": [
    { "id": "browse", "name": "Browse the catalog" },
    { "id": "order", "name": "Place an order" },
    { "id": "pay", "name": "Pay" },
    { "id": "coupon", "name": "Apply a coupon" },
    { "id": "track", "name": "Track an order" }
  ],
  "relations": [
    { "from": "customer", "to": "browse" },
    { "from": "customer", "to": "order" },
    { "from": "member", "to": "track" },
    { "from": "member", "to": "customer", "type": "generalization" },
    { "from": "order", "to": "pay", "type": "include" },
    { "from": "coupon", "to": "order", "type": "extend" },
    { "from": "bank", "to": "pay" }
  ]
}
```

| Field | What it is |
|---|---|
| `system` | The name of the system, at most 32 characters, drawn on its boundary. A diagram has one boundary. |
| `actors` | 1 to 6, each with an `id` and a `name` of at most 20 characters: a person or another system. An actor stands at the left of the boundary, or at the right with `"side": "right"` (use it for a system that serves this one, such as a payment service). |
| `usecases` | 1 to 16, each with an `id` and a `name` of at most 32 characters: something an actor does with the system, said as a verb and an object. |
| `relations` | 1 to 30, each `from` one `to` another, with a `type`. An `association` (the default) goes from an actor to a use case it takes part in. An `include` goes from a use case to one it always uses; an `extend` goes from a use case to one it may add to. A `generalization` goes from an actor to a more general actor, or from a use case to a more general use case. |

- Every actor and every use case has a relation. A use case never includes itself, by a chain or at once.
- The renderer places every node: the actors in a column at their side, the use cases in a column inside the boundary, and each included, extending or more special use case one column to the right of the one it serves. It draws each mark in UML notation: a stick figure, an oval, solid lines for associations, dashed lines with an open arrowhead for «include» and «extend», and a hollow triangle for a generalization.
- Nothing moves: a use case diagram has no dot and no walkthrough.
- On a phone the diagram becomes a list with a band for each actor: the use cases it takes part in, each with what it includes and what may extend it. `render` also writes the diagram in words, with a key to the marks.

## Class diagrams

A class diagram shows the classes of a design, what each one holds and does, and how they relate. Write it with `"kind": "class"`:

```json
{
  "id": "order-classes",
  "kind": "class",
  "label": "A customer places orders. An order owns its lines, and each line names a product. Payment is an interface that card payment implements; an order uses a payment.",
  "classes": [
    { "id": "customer", "name": "Customer", "attributes": ["- id: UUID", "- email: String"], "operations": ["+ placeOrder(): Order"] },
    { "id": "order", "name": "Order", "attributes": ["- total: Money", { "text": "- count: Integer", "static": true }], "operations": ["+ addLine(p: Product, n: Integer)", "+ pay(with: Payment)"] },
    { "id": "line", "name": "OrderLine", "attributes": ["- quantity: Integer"] },
    { "id": "product", "name": "Product", "attributes": ["- name: String", "- price: Money"] },
    { "id": "payment", "name": "Payment", "stereotype": "interface", "operations": [{ "text": "+ charge(amount: Money): Boolean", "abstract": true }] },
    { "id": "card", "name": "CardPayment", "attributes": ["- last4: String"], "operations": ["+ charge(amount: Money): Boolean"] }
  ],
  "relations": [
    { "from": "customer", "to": "order", "name": "places", "multiplicity": ["1", "0..*"], "navigable": true },
    { "from": "order", "to": "line", "type": "composition", "multiplicity": ["1", "1..*"], "roles": ["", "lines"] },
    { "from": "line", "to": "product", "multiplicity": ["*", "1"], "navigable": true },
    { "from": "card", "to": "payment", "type": "realization" },
    { "from": "order", "to": "payment", "type": "dependency", "stereotype": "use" }
  ],
  "notes": [
    { "id": "n1", "text": "{total = sum of the line prices}", "on": "order" }
  ]
}
```

| Field | What it is |
|---|---|
| `classes` | 1 to 16, each with an `id` and a `name` (at most 28 characters). Optional: a `stereotype` without guillemets, such as `interface` or `enumeration`; `"abstract": true`, drawn in italics; up to 8 `attributes` and 8 `operations`. A member is text of at most 40 characters, such as `"- total: Money"`, or an object with `text` and `"static": true` (underlined) or, for an operation, `"abstract": true` (italics). Start a member with its visibility: `+` public, `-` private, `#` protected, `~` package. |
| `relations` | At most 24, each `from` one class `to` another, with a `type`: `association` (the default), `aggregation` and `composition` (from the whole to the part), `generalization` (from the child to the parent), `realization` (from a class to the interface it implements) and `dependency` (from the class that needs to the class it needs). |
| `notes` | Optional, at most 4, each with an `id`, a `text` of at most 80 characters and the class it is `on`. A constraint is a note in braces. |

- An association, an aggregation and a composition may have a `name`, `multiplicity` and `roles`: each a list of two, for the `from` end and the `to` end (`""` for none). A multiplicity is `1`, `0..1`, `*`, `1..*` and the like. An association with `"navigable": true` gets an open arrowhead at its `to` end. A dependency may have a `stereotype`, such as `use`.
- A class is never a kind of itself, by a chain. A realization goes to a class with the stereotype `interface`.
- The renderer puts a parent above its children and a whole above its parts, and draws each mark in UML notation: a box in parts, a hollow triangle (dashed for a realization), a hollow or filled diamond at the whole, a dashed line with an open arrowhead for a dependency, a note with a folded corner.
- Not drawn: templates, qualified and n-ary associations, and association classes (draw the link as a class with two associations).
- On a phone the diagram becomes a list of cards, one per class, with a row under it for each relation that starts there. `render` also writes the classes and relations in words, with a key to the marks.

## Object diagrams

An object diagram shows a moment in a running system: the objects that exist, their values, and the links between them. Write it with `"kind": "object"`, often next to the class diagram it is an example of:

```json
{
  "id": "order-objects",
  "kind": "object",
  "label": "Ana has one order, number 1042, with two lines: two mugs and one teapot.",
  "objects": [
    { "id": "ana", "name": "ana", "class": "Customer", "slots": ["email = \"ana@example.test\""] },
    { "id": "o1", "name": "o1042", "class": "Order", "slots": ["total = 46.00"] },
    { "id": "l1", "class": "OrderLine", "slots": ["quantity = 2"] },
    { "id": "l2", "class": "OrderLine", "slots": ["quantity = 1"] },
    { "id": "mug", "name": "mug", "class": "Product", "slots": ["price = 12.00"] },
    { "id": "pot", "name": "teapot", "class": "Product", "slots": ["price = 22.00"] }
  ],
  "links": [
    { "from": "ana", "to": "o1", "name": "places" },
    { "from": "o1", "to": "l1" },
    { "from": "o1", "to": "l2" },
    { "from": "l1", "to": "mug" },
    { "from": "l2", "to": "pot" }
  ]
}
```

| Field | What it is |
|---|---|
| `objects` | 1 to 12, each with an `id`, its `class` and an optional `name` (each at most 28 characters), drawn underlined as `name : Class`, and up to 8 `slots` such as `"total = 46.00"`. |
| `links` | At most 16, each `from` one object `to` another, with an optional `name`. |
| `notes` | As in a class diagram. |

- Nothing moves in a class or an object diagram: there is no dot and no walkthrough.

## Package diagrams

A package diagram shows how a system's code or model is grouped, and which group needs which. Write it with `"kind": "package"`:

```json
{
  "id": "shop-packages",
  "kind": "package",
  "label": "The shop has three packages: ordering, catalog and billing. Ordering imports the catalog and uses billing; all of the shop imports the shared utilities.",
  "packages": [
    { "id": "shop", "name": "Shop" },
    { "id": "ordering", "name": "Ordering", "in": "shop", "members": ["Order", "OrderLine", "Cart"] },
    { "id": "catalog", "name": "Catalog", "in": "shop", "members": ["Product", "Category"] },
    { "id": "billing", "name": "Billing", "in": "shop", "members": ["Invoice", "Payment"] },
    { "id": "util", "name": "Shared utilities", "members": ["Money", "Clock"] }
  ],
  "dependencies": [
    { "from": "ordering", "to": "catalog" },
    { "from": "ordering", "to": "billing", "type": "access" },
    { "from": "shop", "to": "util" }
  ]
}
```

| Field | What it is |
|---|---|
| `packages` | 1 to 12, each with an `id` and a `name` (at most 28 characters). A package may sit `in` another one; packages nest one level deep. A package that holds no packages may list up to 8 `members` (at most 32 characters each), such as its main classes. |
| `dependencies` | Optional, at most 20, each `from` one package `to` another, with a `type`: `import` (the default), `access`, `merge`, or `use` for a plain dependency. A dependency may start or end on a package that holds packages. |

- A package that holds packages lists no members of its own, and no dependency joins a package to the package around it.
- The renderer draws each package as a folder: its name in the tab and its members in the body. A package that holds packages is a frame around them, its name in the tab. A dependency is a dashed line with an open arrowhead and its keyword, such as «import».
- On a phone the diagram becomes a list of folders, with the packages of one frame in a band, and a row for each dependency.

## Profile diagrams

A profile diagram shows how a team extends UML for its own models: the stereotypes it adds, and the UML metaclass each one extends. Write it with `"kind": "profile"` only for readers who model in UML:

```json
{
  "id": "persistence-profile",
  "kind": "profile",
  "label": "The persistence profile adds two stereotypes. Entity extends Class and has a table name; Id extends Property. The shop model applies the profile.",
  "profile": "Persistence",
  "stereotypes": [
    { "id": "entity", "name": "Entity", "attributes": ["table: String"] },
    { "id": "idst", "name": "Id" }
  ],
  "metaclasses": [
    { "id": "class", "name": "Class" },
    { "id": "property", "name": "Property" }
  ],
  "extensions": [
    { "from": "entity", "to": "class" },
    { "from": "idst", "to": "property", "required": true }
  ],
  "appliedTo": ["Shop model"]
}
```

| Field | What it is |
|---|---|
| `profile` | The name of the profile, drawn in the tab of its frame after «profile». |
| `stereotypes` | 1 or more, each with an `id`, a `name` and up to 8 `attributes` (its tag definitions, such as `"table: String"`). |
| `metaclasses` | The UML metaclasses that the stereotypes extend, each with an `id` and a `name`, such as `Class` or `Property`. At most 12 stereotypes and metaclasses together. |
| `extensions` | Each `from` a stereotype `to` a metaclass. `"required": true` means every element of that metaclass carries the stereotype. |
| `generalizations` | Optional: a stereotype `from` that is a kind of another, `to`. |
| `appliedTo` | Optional, at most 3: the names of packages that use the profile. |

- Every stereotype extends a metaclass or is a kind of another stereotype, and every metaclass is extended.
- The renderer draws the profile as a frame with stereotype boxes marked «stereotype», metaclass boxes marked «metaclass» above them, extensions as solid lines with a filled triangle, and «apply» as a dashed line from each package that uses the profile.
- Nothing moves in a package or a profile diagram: there is no dot and no walkthrough.

## Component diagrams

A component diagram shows the replaceable parts of a system and the services, the interfaces, that they offer and need. Write it with `"kind": "component"`:

```json
{
  "id": "shop-parts",
  "kind": "component",
  "label": "The parts of the shop: the web shop needs the order service, which the back end offers through Orders.",
  "components": [
    { "id": "web", "name": "Web shop" },
    { "id": "backend", "name": "Back end" },
    { "id": "orders", "name": "Orders", "in": "backend" },
    { "id": "stock", "name": "Stock", "in": "backend" },
    { "id": "pay", "name": "Payments" }
  ],
  "interfaces": [
    { "id": "order-api", "name": "OrderAPI", "provider": "backend", "users": ["web"], "port": "api" },
    { "id": "stock-check", "name": "StockCheck", "provider": "stock", "users": ["orders"] },
    { "id": "charge", "name": "Charge", "provider": "pay", "users": ["orders"] }
  ],
  "delegations": [{ "from": "backend", "to": "orders", "port": "api" }],
  "dependencies": [{ "from": "web", "to": "pay" }]
}
```

| Field | What it is |
|---|---|
| `components` | 1 to 12, each with an `id` and a `name` (at most 28 characters). A component may sit `in` another one; components nest one level deep. |
| `interfaces` | Optional, at most 16, each with an `id`, a `name`, the `provider` (the component that offers it) and the `users` (up to 3 components that need it). It needs at least one of the two. `port` names the port on the provider where the interface is offered. |
| `delegations` | Optional: `from` an outer component `to` a component inside it, which does the outer component's work. `port` names the port on the outer component. |
| `dependencies` | Optional: `from` one component `to` another that it needs, without a named interface. |

- The renderer draws each component as a box marked «component», with the component icon. An interface is a ball on a line from its provider; each user holds the ball in a socket, a half circle, so a provider and a user meet as ball and socket. A port is a small square where its line meets the component. A component that holds components is a frame around them.
- A dependency is a dashed line with an open arrowhead; a delegation is a line marked «delegate» from a port on the frame to the part inside.
- On a phone the diagram becomes a list of components, with a row for each interface it offers or needs.

## Composite structure diagrams

A composite structure diagram shows the inside of one class: the parts it is made of, how they connect, and its ports to the outside. Write it with `"kind": "composite"`:

```json
{
  "id": "car-inside",
  "kind": "composite",
  "label": "The inside of a car: the engine drives the rear axle, and the fuel port feeds the engine.",
  "classifier": "Car",
  "parts": [
    { "id": "engine", "name": "e", "type": "Engine", "multiplicity": "1" },
    { "id": "rear", "name": "rear", "type": "Axle", "multiplicity": "1" },
    { "id": "wheels", "name": "w", "type": "Wheel", "multiplicity": "4" }
  ],
  "ports": [{ "id": "fuel", "name": "fuel" }],
  "connectors": [
    { "from": "engine", "to": "rear", "label": "drives" },
    { "from": "rear", "to": "wheels" },
    { "from": "fuel", "to": "engine" }
  ]
}
```

| Field | What it is |
|---|---|
| `classifier` | The name of the class whose inside the diagram shows. It is drawn as the frame. |
| `parts` | 1 to 10, each with an `id`, a `name` (its role), a `type`, and an optional UML `multiplicity`, such as `"4"` or `"0..1"`. A part is drawn as a box named `role : Type [multiplicity]`. |
| `ports` | Optional, at most 8, each with an `id` and a `name`. Each port needs a connector to a part. |
| `connectors` | At most 24, each joining two parts, or a port and a part, with an optional `label`. |

- The renderer draws a port as a small square on the frame, with its name beside it, and a connector as a solid line.
- Collaborations, the dashed ovals, are not drawn.

## Deployment diagrams

A deployment diagram shows where the software runs: the machines and runtimes, the files deployed on them, and how they talk. Write it with `"kind": "deployment"`:

```json
{
  "id": "shop-deploy",
  "kind": "deployment",
  "label": "Where the shop runs: a phone talks to the app server over HTTPS, and the server talks to the database.",
  "nodes": [
    { "id": "phone", "name": "Phone", "type": "device" },
    { "id": "server", "name": "App server", "type": "device" },
    { "id": "jvm", "name": "JVM", "type": "executionEnvironment", "in": "server" },
    { "id": "db", "name": "Database server", "type": "device" }
  ],
  "artifacts": [
    { "id": "app-apk", "name": "shop.apk", "in": "phone" },
    { "id": "shop-jar", "name": "shop.jar", "in": "jvm" },
    { "id": "schema", "name": "schema.sql", "in": "db" }
  ],
  "components": [{ "id": "mobile", "name": "Mobile app" }],
  "manifests": [{ "artifact": "app-apk", "component": "mobile" }],
  "paths": [
    { "from": "phone", "to": "server", "protocol": "HTTPS" },
    { "from": "jvm", "to": "db", "protocol": "JDBC" }
  ]
}
```

| Field | What it is |
|---|---|
| `nodes` | 1 to 10, each with an `id`, a `name` and a `type`: `device` (the default), `executionEnvironment` or `node`. A node may sit `in` another node, one level deep. |
| `artifacts` | Optional, at most 16, each with an `id`, a `name` and the node it is deployed on (`in`). |
| `components` | Optional: components that an artifact makes real. Each one needs a line in `manifests`. |
| `manifests` | Each joins an `artifact` to a `component`, drawn as a dashed line marked «manifest». |
| `paths` | Optional: communication paths `from` one node `to` another, with an optional `protocol`, such as `"HTTPS"`. |

- The renderer draws each node as a 3D box marked with its type. A node at the top that holds nodes or artifacts is a frame around them; a node inside a node lists its artifacts by name, each with the page icon. An artifact inside a node shows that it is deployed there, so no «deploy» arrow is drawn.
- Nothing moves in a component, composite structure or deployment diagram: there is no dot and no walkthrough.

## Communication diagrams

A communication diagram shows who is linked to whom, and the numbered messages they send over those links. Write it with `"kind": "communication"`; when the order of the messages matters more than the links, write a sequence diagram instead:

```json
{
  "id": "checkout-talk",
  "kind": "communication",
  "label": "Checkout asks the cart to place the order; the cart reserves each item with stock, then asks payments to charge the card.",
  "lifelines": [
    { "id": "ui", "name": ": Checkout" },
    { "id": "cart", "name": "c : Cart" },
    { "id": "stock", "name": ": Stock" },
    { "id": "pay", "name": ": Payments" }
  ],
  "messages": [
    { "n": "1", "from": "ui", "to": "cart", "text": "placeOrder()" },
    { "n": "1.1", "from": "cart", "to": "stock", "text": "reserve(item)", "repeat": "i=1..n" },
    { "n": "1.2", "from": "cart", "to": "pay", "text": "charge(total)", "guard": "all reserved" },
    { "n": "1.3", "from": "pay", "to": "cart", "text": "receipt" },
    { "n": "2", "from": "cart", "to": "ui", "text": "showReceipt()" }
  ]
}
```

| Field | What it is |
|---|---|
| `lifelines` | 2 to 8, each with an `id` and a `name`, written as `role : Type` (at most 28 characters). |
| `messages` | 1 to 20, in number order, each with a decimal number `n` (`"1"`, `"1.1"`, `"1.2"`, `"2"`), `from`, `to` and `text` (at most 40 characters). Message `1.1` happens inside message `1`, so `1` must be in the list. A message may have a `guard` (sent only when it holds) or a `repeat` (such as `"i=1..n"`), not both. |
| `links` | Optional: links `from` one lifeline `to` another that send no message here. Every pair that sends a message is linked already. |

- The renderer draws each lifeline as a box and each link as one solid line. Beside the line it writes each message as `1.1 *[i=1..n]: reserve(item)`, with a small arrow the way the message travels.
- The numbers give the order, so nothing moves: there is no dot. The diagram in words lists the messages in number order.
- On a phone the diagram becomes a list of lifelines, each with the messages it sends.

## Range charts

A range chart shows values and ranges on one numeric scale, one row each, so the reader sees where each one falls and whether one range sits inside another: line lengths that studies recommend, and the line length of a page. Write it with `"kind": "range"` when there are 3 to 12 values in one unit. For one or two values, write a sentence. For an amount over time, use a line chart (see "Line charts" below); for states over time, a timing diagram. For amounts compared by size from zero, use a bar chart (see "Bar charts" below).

```json
{
  "id": "line-lengths",
  "kind": "range",
  "label": "Readers prefer 45 to 76 characters in a line, and one study rated 55 easiest. Advice and standards set upper limits from 70 to 90. Docent holds 63 to 70 on screen and 52 to 64 on paper.",
  "scale": { "from": 40, "to": 100, "step": 10, "unit": "characters" },
  "groups": [
    { "id": "evidence", "name": "The evidence" },
    { "id": "docent", "name": "Docent" }
  ],
  "rows": [
    { "name": "Readers prefer", "from": 45, "to": 76, "group": "evidence" },
    { "name": "Rated easiest, Dyson", "at": 55, "group": "evidence" },
    { "name": "A literature review", "to": 70, "group": "evidence" },
    { "name": "Advice for dyslexia", "from": 50, "to": 75, "group": "evidence" },
    { "name": "WCAG 1.4.8, AAA", "to": 80, "group": "evidence" },
    { "name": "Print, Butterick", "from": 45, "to": 90, "group": "evidence" },
    { "name": "Docent on screen", "from": 63, "to": 70, "group": "docent" },
    { "name": "Docent on paper", "from": 52, "to": 64, "note": "computed", "group": "docent" }
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from`, `to` and `step` are numbers; `to` minus `from` is a whole number of steps, at most 20. `unit` is optional, at most 12 characters, such as `px`. `marks` is optional: at most 2 named lines, each with `at` and a `name` of at most 20 characters, such as `{"at": 66, "name": "our aim"}`. |
| `groups` | Optional, at most 3, each with an `id` and a `name` (at most 20 characters), written like lanes. When there are groups, every row names one in `group`, and the rows of one group stand one after another. Each group is a band. |
| `rows` | 2 to 12, top to bottom. Each has a `name` (at most 28 characters) and one mark: `from` and `to` for a **range**, `at` for a **point**, `to` alone for an **upper limit** ("up to 80"), or `from` alone for a **lower limit** ("at least 45"). Every number lies on the scale. A `note` is optional, at most 24 characters, and is written after the value: "52–64, computed". |

- A range is a bar with a small round corner, a point is a filled circle, and a limit is a line from the edge of the scale to a cap at the limit. The line has no cap at the edge, so it claims no other limit. `render` writes each value from the numbers, beside its mark.
- Use groups, not color, to set your own rows apart from the others. A range chart has no `state`, and nothing in it is dashed.
- A named line (`marks`) is a thin muted line through the bands, with its name over the ticks.
- On a desktop and on paper the chart is 640px wide: the row names in a column at the left, the scale at the right. It prints at that size, with no shrink. On a phone it is 264px wide, and each row name stands on its own line above its mark. The tick labels keep 48px apart, so a phone may show every second or every fifth tick.
- Nothing moves: a range chart has no dot and no walkthrough. It sits in the text flow and has no `form`.
- `render` also writes the rows as a table, in a closed section under the drawing ("The diagram in words").
- `render` refuses a range narrower than 4px in either form ("the range 63–64 is 3.2px wide on a phone; write it as a point"), and a value that has no free place beside its mark or above it. When a value does not fit on the right of its mark, it stands on the left, or on a line above.

## Layouts to scale

A layout to scale shows where each part sits along one measured width, how wide it is, and how big the gaps are: the text, the notes and the wide blocks on a 1920px screen, or the margins and columns of an A4 page. Write it with `"kind": "layout"` when the parts sit along one width and their positions are known numbers. It has one axis only: for a page with a header, two columns and a footer, write a plan (below). For steps in order, use a workflow; for states over time, a timing diagram.

```json
{
  "id": "a4-notes",
  "kind": "layout",
  "label": "An A4 page is 210mm wide: an 18mm margin, a 112mm text column, an 8mm gap, a 50mm note column, 4mm left over, and an 18mm margin.",
  "scale": { "from": 0, "to": 210, "unit": "mm" },
  "rows": [
    { "name": "A4 page", "measure": true, "boxes": [
      { "name": "Margin", "from": 0, "to": 18 },
      { "name": "Text", "from": 18, "to": 130 },
      { "name": "Notes", "from": 138, "to": 188 },
      { "name": "Margin", "from": 192, "to": 210 }
    ] }
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | As in a range chart, but `step` is optional. With no `step` there are no ticks; then at least one row needs `"measure": true`, so the drawing has numbers. `marks` is optional: at most 2 named lines, such as `{"at": 960, "name": "the middle"}`. |
| `rows` | 1 to 6, top to bottom. Each has a `name` (at most 16 characters), an optional `note` (at most 24 characters), `boxes`, and optional `"measure": true`. |
| `boxes` | 1 to 6 in a row. Each has a `name` (at most 16 characters), `from` and `to` on the scale, and an optional `track`: 1 (the default) or 2. Track 2 sits under track 1, so a wide block can stand under the text it lines up with. Two boxes on one track may touch, but not overlap. |

- Every box looks the same. Its name sits inside it when the name fits; when it does not, the name stands above the box, joined to its left edge by a short tick. When two names above would meet, the second goes to a second line. A third line is refused: shorten a name, or move a box to track 2.
- A measured row writes the length of every stretch between box edges on track 1, from the start of the scale to its end, gaps included: 18, 112, 8, 50, 4 and 18. The unit stands once, at the left of the measures, or in the row's name line on a phone.
- To mark a choice, say it in the row's `note` ("Tufte, chosen"). A layout has no dot, no `state`, and nothing in it is dashed.
- The forms are those of a range chart: 640px on a desktop and on paper, with the row names in a column at the left, and 264px on a phone, with each row name on a line above its boxes. Nothing moves, so it sits in the text flow and has no `form`.
- `render` also writes the boxes as a table (row, box, from, to and width) under the drawing, with a line for each measured row.
- `render` refuses a box narrower than 4px in either form, with the box's name.

## Plans

A plan shows where the parts of a page or a screen sit, and what is next to what: the navigation on the left, the text in the middle, and an "On this page" list on the right. Write it with `"kind": "plan"` when a page or screen has 2 to 8 parts in rows and columns, and the reader needs the picture to find them. For parts along one width, or exact positions and gaps, use a layout to scale. For several facts about each part, or more than 8 parts, use a table. For two parts, write a sentence.

```json
{
  "id": "editor-screen",
  "kind": "plan",
  "label": "An editor screen 1440px wide. A toolbar runs across the top and a status bar across the bottom. The list of files fills the left side between them. The editor is on the right, with the output under it.",
  "unit": "px",
  "columns": [320, 1120],
  "areas": [
    "toolbar toolbar",
    "files   editor",
    "files   output",
    "status  status"
  ],
  "boxes": [
    {"id": "toolbar", "name": "Toolbar"},
    {"id": "files", "name": "Files"},
    {"id": "editor", "name": "Editor"},
    {"id": "output", "name": "Output", "note": "can be closed"},
    {"id": "status", "name": "Status bar"}
  ]
}
```

| Field | What it is |
|---|---|
| `areas` | 1 to 5 strings, one for each row, top to bottom, as CSS writes `grid-template-areas`. Each string has 1 to 4 cells, split by spaces; extra spaces may line up the columns. A cell is a box `id`, or `.` for an empty cell. Every row has the same number of cells, and the cells of one box form one rectangle. A row or a column of empty cells only is refused. |
| `boxes` | 2 to 8. Each has an `id` that appears in `areas`, a `name` (at most 20 characters) and an optional `note` (at most 24 characters). The order of the list does not matter: the drawing and the words follow `areas`, row by row, left to right. |
| `columns` | Optional: one width for each column, numbers more than 0. Each width is written above its column, and the plan is drawn to scale across when the names allow it. With no widths, the columns are sized by their names, and the drawing says "Not to scale". |
| `unit` | The unit of the widths, at most 12 characters, such as `px`. `columns` and `unit` go together. |

- Every box looks the same: the page color inside and a text-color outline. Two boxes that touch stand 4px apart. A name sits at the upper left of its box, at 14px, and wraps at its spaces onto at most 3 lines; a note sits under it, on at most 2 lines. A word never breaks. A name written without spaces, as in Thai or Chinese, breaks between characters.
- Row heights are not data: a row is as tall as its names need, and the words say the rows are not drawn to scale. When a height matters, write it in a note ("64px high") and in the `label`.
- A plan has no box inside a box, no lines between boxes, no ticks, no `state`, no icons and no dot. To show what is inside a box, write a second plan.
- The forms: 640px on a desktop and on paper, and 264px on a phone. A plan cannot become one strip, so the phone form is the same grid, drawn again: a narrow column grows until its names fit, the line above the plan then says "not to scale", and the real widths stay above the columns. `render` says which forms are not to scale, such as `drawn as plan; not to scale on a phone`.
- When the grid cannot fit a phone, the phone gets a stack instead: each box on a band of its own, in the order of `areas`, with its name, its note and its width, and a small map of the whole plan beside it where its box is filled. The map is to scale across, but no column in it is narrower than 3px; when one had to grow, the line above says "maps not to scale". `render` says `drawn as plan; stacked on a phone`. With four columns, the grid fits a phone only when the longest word of each column is about 40px.
- When the names cannot fit a desktop, `render` refuses the plan and names the widest names and their columns: shorten them, or use fewer columns.
- To show one page on a desktop and on a phone, write two plans in two figures.
- `render` also writes the boxes as a table under the drawing: each box's row and column in words (`top`, `left`, `full width`, `rows 2 to 3`), its width, and its note.

## Funnels

A funnel shows how many people reach each step of one flow, and how many leave between two steps: of everyone who opened the sign-up page, how many finished, and which step lost the most. Write it with `"kind": "funnel"` when one flow has 3 to 8 steps, every person takes them in the same order, and you have a count for each step. For two steps, write a sentence. For paths that split, steps that people skip, or people who go back, use a flowchart with the counts in its notes, or a table. For a count over time, use a line chart.

```json
{
  "id": "signup-may",
  "kind": "funnel",
  "label": "Of 12,480 people who opened the sign-up page in May, 1,860 finished the sign-up: 15%. The largest number left before the form: 4,240. The largest share left at the email check: half of the people who filled in the form did not confirm their email.",
  "unit": "people",
  "steps": [
    {"name": "Open the sign-up page", "count": 12480},
    {"name": "Fill in the form", "count": 8240},
    {"name": "Confirm the email", "count": 4120},
    {"name": "Choose a plan", "count": 2900},
    {"name": "Finish the sign-up", "count": 1860}
  ]
}
```

| Field | What it is |
|---|---|
| `steps` | 2 to 8 steps, in the order people take them, top to bottom. Each has a `name` (at most 28 characters; no word in it wider than 200px at 14px, about 27 small letters) and a `count`. |
| `count` | How many reached this step: a whole number from 0 to 999,999,999. The first count is at least 1. No count is more than the count before it, and no step comes after a step with 0. |
| `unit` | What each count counts, as a plural noun of at most 20 characters, such as `people`, `sessions` or `bug reports`. It starts the line above the bars and heads a column of the table in words. |

- **Write the counts only.** The renderer computes each drop (the count before, minus this count), its share of the step before, and each count's share of the first step. So the numbers always agree. A share is a whole percent, and a half rounds up. A share above 0 that would round to 0% keeps one decimal, such as `0.4%`, or says `under 0.1%`; a share near 100% does the same (`99.6%`, `over 99.9%`). A count is written with a comma every three digits, and every digit stays.
- **It is drawn as bars, not as a funnel shape.** Each step is a row with a bar from 0, on one scale that ends at the first count, so every bar starts at the same left edge. A narrowing shape would make each drop look larger than it is. The kept bar is the bar of a range chart. The part that a step lost follows it on the same row, up to the length of the bar above, filled in the line color, as a soft gray block. The drop is written over it: `−4,120 (50%)`.
- **Two shares.** Beside each name stand its count and its share of the first step: how much of the start is left. Each drop carries its share of the step before: how badly that one step loses people. Two short lines above the bars name both bases, so the reader never has to guess which one a percent uses.
- **No mark for the largest drop.** The step that loses the most people and the step that loses the largest share are often not the same. The table in words names both. Say in the `label` and the text which one matters for the report.
- **A count that goes up is refused.** It means people skipped a step, or the counts come from different sources, and a funnel cannot show either. Two equal counts are allowed: the drop is `0 (0%)`. A count of 0 is allowed at the end.
- A funnel has no `scale`, no ticks, no `note` on a step, no `state`, no color and no dot. A drop is not a status, so it is never red. Write a remark about a step in the text beside the figure.
- A count above 0 is never drawn narrower than 2px, so it shows. Its numbers give the exact count, and the words say when a bar was drawn wider than its scale.
- The forms: 640px on a desktop and on paper, with the names, the counts and the shares in columns at the left; and 264px on a phone, where each name stands on its own line with its numbers at the right, and its bar runs under it. When a name needs more than two lines beside its numbers, the numbers go on their own line under it. Within the limits, a funnel is never refused for its width.
- To compare two groups, such as phone and desktop, write two funnels, or a table. Each funnel has its own scale, so their shares compare and their bar lengths do not.
- `render` also writes the steps as a table under the drawing, with both shares, and three lines: how many reached the last step, where the most people left, and where the largest share left.

## Bar charts

A bar chart shows how large each amount is, and which is largest: how many bug reports each area of the app got last quarter. Write it with `"kind": "bar"` when there are 2 to 16 amounts in one unit, each for one named thing. For one or two amounts, write a sentence. For the steps of one flow, use a funnel. For values or ranges on a scale that does not start at 0, use a range chart. For amounts over time, use a line chart. When each exact number matters more than the picture, use a table.

```json
{
  "id": "reports-by-area",
  "kind": "bar",
  "label": "Sign-in had the most bug reports in the third quarter, 412. Search and Checkout had about 250 each. Help pages had the fewest, 18. Notifications has no count, because reports had no area label for it before April.",
  "scale": {"from": 0, "to": 500, "step": 100, "unit": "reports"},
  "order": "largest",
  "rows": [
    {"name": "Sign-in", "value": 412},
    {"name": "Search", "value": 268},
    {"name": "Checkout", "value": 231},
    {"name": "Settings", "value": 97},
    {"name": "Profile", "value": 64},
    {"name": "Help pages", "value": 18},
    {"name": "Notifications", "value": null}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from`, `to`, `step` and an optional `unit`, as in a range chart, with no `marks`. **`from` is 0** when no value is below 0. With values below 0, `from` is below 0 and `to` is 0 or more, so 0 lies on the scale. |
| `order` | `"largest"` (the default), `"smallest"` or `"written"`. `render` sorts the rows and says the order in the line above the chart. `"written"` needs `orderNote`, at most 32 characters, such as `"oldest release first"`, which the line above repeats. Rows with the same value keep the order they were written in. |
| `rows` | 2 to 16. Each has a `name` (at most 28 characters) and a `value`: a number on the scale, or `null` when the number is not known. An optional `group` works as in a range chart, at most 3: the rows are sorted inside each group. |

- **A bar starts at 0.** `render` refuses a scale from above 0, because it cuts every bar short and their lengths no longer compare. A bar below 0 runs to the left of a solid muted line at 0.
- **Write a missing number as `null`, never leave the row out.** The row stays in the chart with `no data` where its bar would start, and a line under the table names it: "No data: Notifications." A row with no `value` at all is refused, so that a missing number is a choice and not a typing mistake. A row with no number goes last when the rows are sorted.
- A bar is the bar of a range chart. Its value stands 8px after its end, in tabular figures, written as the scale's ticks are. Room is kept beside the scale for the widest value, so every value fits. A bar above or below 0 that would be narrower than 2px is drawn 2px wide, and the words say so. A value of 0 has no bar.
- No bar is marked as the largest: the order already puts it first. A bar chart has no legend, no `state`, no color and no dot, and nothing in it is dashed.
- One line above the chart says the unit, where the scale starts, and the order: "Reports, bars from 0. Largest first." The ticks do not repeat the unit.
- The forms are those of a range chart: 640px on a desktop and on paper, with the row names in a column at the left; and 264px on a phone, where each name stands on its own line above its bar. It prints at 640px, with no shrink.
- `render` also writes the rows as a table under the drawing, in the order of the drawing, with the line above the chart and the lines on rows with no data.

### Two values in each row: the dumbbell

When the reader compares two values for each thing, such as last year and this year, name the two in `series`. Each row then has `values`, a list of two numbers or `null`s, in place of `value`.

```json
{
  "id": "days-to-fix",
  "kind": "bar",
  "label": "The median time to fix a bug fell in three of five areas from 2025 to 2026. Settings fell most, from 15 days to 6. Checkout rose from 6 to 8. Profile stayed at 5.",
  "scale": {"from": 0, "to": 20, "step": 5, "unit": "days"},
  "series": ["2025", "2026"],
  "order": "written",
  "orderNote": "as in the app's menu",
  "rows": [
    {"name": "Sign-in", "values": [9, 4]},
    {"name": "Search", "values": [12, 7]},
    {"name": "Checkout", "values": [6, 8]},
    {"name": "Settings", "values": [15, 6]},
    {"name": "Profile", "values": [5, 5]}
  ]
}
```

- `series` names the two values, each at most 16 characters. The first value is a ring, the second a filled dot, joined by a 2px muted line. Shape tells them apart, not color, so they stay apart in gray print. The line shows the gap, not a path: it says nothing about the values between.
- The series names stand above the ring and the dot of the first row that has both, as the only key. When the two names would meet, they move apart, and a thin muted line joins each to its mark. The marks never move.
- The smaller value stands left of the left mark, the larger right of the right mark. Two equal values are a smaller dot inside the ring, with the value written once. When the marks touch, the dot lies over the ring, and both values are still written.
- A dumbbell's scale may start above 0, because a gap does not change when the scale moves. The line above the chart says where it starts: "Days, scale from 0."
- `order` may also be `"change"`: the largest change first, rise or fall. `"largest"` and `"smallest"` sort by the second value, and the line above says so: "Sorted by 2026, largest first."
- A row with one `null` draws the known mark alone, with its value and the words for the other: `9; no data for 2026`. A row with two `null`s writes `no data`. Lines under the table name each series' missing rows.
- The table in words has a column for each series and a column for the change, such as `−5` or `+2`.
- Grouped and stacked bars are not offered. Two bars side by side in a row say what a dumbbell says with more ink, and only the first part of a stacked bar starts at 0. Use a table for both.

The rules against a cut scale, for a stated order, for rows with no data and for the dumbbell's line follow the chart guides of diagram-design by Cathryn Lavery (MIT).

## Line charts

A line chart shows how an amount changed over time, and when it rose or fell: how many bug reports came in each month for each area. Write it with `"kind": "line"` when there are 3 to 36 points in time, equally spaced, such as days, weeks or months, and 1 to 5 series in one unit. For amounts for named things, not for times, use a bar chart. For the states a thing was in against a clock, use a timing diagram. For the state of each cell, such as uptime each day, use a status grid. For points that are not equally spaced in time, use a table: a line drawn across unequal steps tells the reader a false rate.

```json
{
  "id": "reports-by-month",
  "kind": "line",
  "label": "Sign-in reports rose from 62 in January to 138 in June, then fell to 66 in December. Search and Checkout stayed between 28 and 52 all year.",
  "scale": {"from": 0, "to": 150, "step": 50, "unit": "reports"},
  "points": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "series": [
    {"name": "Sign-in", "focus": true, "values": [62, 70, 81, 95, 120, 138, 131, 112, 96, 84, 71, 66]},
    {"name": "Search", "values": [40, 42, 39, 45, 48, 44, 46, 50, 47, 49, 52, 51]},
    {"name": "Checkout", "values": [30, 28, 35, 33, 31, 36, 34, 30, 29, 33, 32, 35]}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from`, `to`, `step` and an optional `unit`, as in a range chart, with no `marks`. It may start above 0, because a line shows change, not size; the line above the chart then says so: "The scale starts at 40, not 0." A scale across 0 has a solid muted line at 0. |
| `points` | 3 to 36 labels for the points in time, at most 10 characters each, such as `Jan`, `W14` or `2026`. They are equally spaced. A label may be used again, such as `Feb` in each year; mark each January with its year, such as `2026`, so a phone keeps one label a year. Two points make a slopegraph (below). |
| `series` | 1 to 5. Each has a `name` (at most 20 characters) and `values`, one for each point: a number on the scale, or `null` when it is not known. |
| `focus` | `true` on the one series that the text talks about. At most one series has it. A chart with one series draws it in the text color, with no `focus`. |
| `multiples` | `true` for small multiples (below). |

- **The series that the text talks about takes the text color; the others are gray.** The focus line is 2.5px in the text color, with a small dot at each point when the points stand at least 8px apart. Every other line is 1.5px in the muted color, with no dots. Both pass 3:1 on the page, so nothing rests on a color the reader must tell apart.
- **With two or more series and no `focus`, choose.** Such data is refused: say which series the text talks about with `focus`, or show each series in its own panel with `"multiples": true`. Five gray lines with no main series say what a table says.
- **Each line is named at its end,** 8px after its last point, in 14px text: the focus name in the text color, the others muted. When two names would stand closer than 18px, they move apart in the order of their lines, and a thin muted line joins each moved name to its line's end; so does a name whose line ends before the last point. Every name then stands 20px after the plot, so those lines have room. The last point never moves. No chart has a legend.
- **A gap stays a gap.** A `null` breaks the line, and a point alone between two gaps is a dot. Lines are straight from point to point and never smoothed. The line above the chart says "A gap in a line is a time with no data."
- `render` refuses a value outside the scale, a series whose number of values is not the number of points, two series with the same name, and two series that are equal at every point: they cannot be told apart, so write one and say in the text that both are the same.
- The forms: 640px on a desktop and on paper, with the value labels at the left of the plot and the points along the bottom; and 264px on a phone, where the value labels stand inside the plot, above their grid lines at the left edge, so they take no width. On a phone a name wider than 96px wraps onto two lines, so the plot keeps 120px. The time labels follow the heat map's rule (one line, two lines, then every 2nd, 3rd, 4th, 6th or 12th label), and a time axis may keep two labels as its last step. It prints at 640px, with no shrink.
- `render` also writes the values as a table under the drawing, a row for each point and a column for each series, and one line for each series: "Sign-in: 62 in Jan, 66 in Dec; highest 138 in Jun; lowest 62 in Jan." A label used more than once is named with its place, such as "Feb (point 14)".

### Several series that matter equally: small multiples

With `"multiples": true`, each series gets its own small panel. All panels share one scale and one set of points, so they compare. Each panel names its series above it, at 14px weight 600, and draws its series in the text color; the other series stand behind it as thin lines in the outline color, so the reader sees where this series stands among the others. Those lines have low contrast on purpose: they repeat data that another panel draws in the text color.

- 2 to 6 panels. `focus` is refused with `multiples`.
- On a desktop and on paper up to 3 panels stand in a row, each 184px wide; 4 panels make two rows of 2. On a phone each panel has a row, 224px wide.

### Two points in time: the slopegraph

When `points` has exactly two labels, the line chart draws a slopegraph: two upright axes, one for each point, and a straight line for each series between them. The reader sees which series rose or fell, how steeply, and which passed another.

```json
{
  "id": "days-to-fix-slope",
  "kind": "line",
  "label": "The median time to fix a bug fell in three of five areas from 2025 to 2026. Settings fell most, from 15 days to 6. Checkout rose from 6 to 8. Profile stayed at 5.",
  "scale": {"from": 0, "to": 20, "unit": "days"},
  "points": ["2025", "2026"],
  "series": [
    {"name": "Sign-in", "values": [9, 4]},
    {"name": "Search", "values": [12, 7]},
    {"name": "Checkout", "focus": true, "values": [6, 8]},
    {"name": "Settings", "values": [15, 6]},
    {"name": "Profile", "values": [5, 5]}
  ]
}
```

- 2 to 10 series. The focus rule and the rule for names that would meet are as above. Both values of each series are needed: a slopegraph refuses a `null`, so leave such a series out and say why in the text.
- Each line is named at both ends, with its value: name, then value, on the left; value, then name, on the right. On a phone the names stand on the right only, and the left axis shows the values alone. The two point labels stand above their axes.
- The run between the axes is no wider than the plot is tall, so the slopes keep their angle. A slopegraph draws no grid, so its scale needs no `step`. The scale may start above 0: the slopes do not change when both axes move together.
- The table in words has a row for each series, a column for each point, and a column for the change, such as `−9` or `+2`. When every series matters equally, a dumbbell (a bar chart with `series`) compares the two times row by row.

The rules for gaps, for lines that are never smoothed, for names that move while their points stay, and for the slopegraph's run follow the chart guides of diagram-design by Cathryn Lavery (MIT).

## Heat maps

A heat map shows one number for each pair of a row and a column, such as sign-ups by weekday and hour, or errors by service and day. Write it with `"kind": "heatmap"` when there are 2 to 12 rows and 3 to 24 columns, one number in each cell, and the reader needs the pattern more than each number: the busy hours, the bad day, the one service that differs. For fewer than 12 cells, or when each exact number matters, write a table. For values on one scale, one row each, use a range chart. For change over time in one to five series, use a line chart. For numbers above and below a middle (such as change against last week), use a table.

```json
{
  "id": "errors-by-day",
  "kind": "heatmap",
  "label": "Errors of a web service in one week, by part and day. Checkout and Payments had most errors on Wednesday and Thursday, after a release. Image upload rose through the weekend. Email has no data for Thursday.",
  "scale": {"from": 0, "to": 40, "step": 10, "unit": "errors"},
  "columns": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "rows": [
    {"name": "Sign-in",      "values": [3, 2, 4, 3, 5, 1, 1]},
    {"name": "Search",       "values": [6, 7, 5, 9, 8, 4, 3]},
    {"name": "Checkout",     "values": [12, 14, 38, 31, 11, 6, 5]},
    {"name": "Payments",     "values": [4, 5, 22, 17, 4, 2, 2]},
    {"name": "Email",        "values": [1, 0, 2, null, 1, 0, 0]},
    {"name": "Image upload", "values": [9, 8, 10, 12, 15, 19, 21]}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from`, `to`, `step` and `unit`, as in a range chart. `to` minus `from` is 3, 4 or 5 steps, and each step is one shade. `unit` is needed (at most 12 characters), because the legend names what is counted. A heat map has no `marks`. |
| `columns` | 3 to 24 labels, left to right, each at most 10 characters, all different. A label is text, also when it is a number: `"0"` to `"23"` for hours, `"Mon"` for a day. |
| `rows` | 2 to 12 rows, top to bottom. Each has a `name` (at most 20 characters, all different) and `values`: one for each column, in the order of `columns`. A value is a number from `from` to `to`, or `null` for a cell with no data. At least one value is a number. |

- **You fix the scale.** The renderer never picks its own edges, so two weekly reports of the same data show the same steps. Each step holds the values from its lower edge up to its upper edge; a value on an edge takes the higher step, and `to` takes the top step. A value outside the scale is refused: widen the scale, or say the large value in the text.
- **Five shades of one teal on screen, the heat steps,** and five grays on paper. With 5 steps the cells take all five; with 4 they take steps 1, 2, 4 and 5; with 3, steps 1, 3 and 5. So the least and the most look the same in every heat map. In light mode the most is the darkest, and in dark mode the lightest, so the most always stands out from the page. A heat map has no ultramarine, no green, amber or red, and no field for a color.
- **A legend above the grid** shows each step, with the numbers at its edges and the unit. When the unit does not fit at the right of the swatches, it takes a second line.
- **A cell with no data is hollow:** the page color inside a thin muted outline. It never looks like the palest step. The legend then adds a hollow key, "no data".
- **Numbers in the cells.** When every number fits inside its cell, each cell shows it; when one does not fit, no cell does, so a cell without a number never looks empty. The table in words always gives every number.
- **Column labels** are kept whole. When they do not all fit on one line, they take two lines; when two are not enough, every second, third, fourth, sixth or twelfth label stands, never fewer than three. These divide 24 and 12, so hours and months keep their round labels. A label of up to 7 characters (about 43px) fits a phone at any number of columns.
- The forms: 640px on a desktop and on paper, with the row names in a column at the left; and 264px on a phone, where each row name stands on its own line above its row of cells, and the columns still line up. The grid always fits a phone; only a legend whose edge numbers are too wide, or column labels that are too long, are refused, and the message says what to shorten.
- Numbers are written as you write them, with a minus sign below zero and no thousands separator. Write large counts in a larger unit, such as `thousands of visits`, when the legend needs it.
- `render` also writes the numbers as a table under the drawing, with the same rows and columns, and lines on the steps, the highest number, the lowest and the cells with no data. A grid too wide for a sheet of paper is written as several tables of fewer columns, each with the row names, so every number prints; on a narrow screen each table scrolls inside itself.
- `render` says how the cells and labels came out, such as `drawn as heatmap; every 3rd column label on a phone`, or `numbers in the cells on a desktop only`.
- **The areas of a page** (clicks on the header, the sidebar and the footer) are not a heat map: write a heat plan (see "Heat plans" below). Raw click points do not go into the data: count them into cells first, and say the size of a cell in the label.

## Heat plans

A heat plan shows how much happens in each area of a page or a screen, such as the clicks on the header, the photo gallery and the "Add to cart" box of a product page. Write it with `"kind": "heatplan"` when the page has 2 to 8 areas in rows and columns, each with one number, and the reader needs to see where on the page the numbers are high. It is a plan whose boxes are filled with the shades of a heat map. For the areas alone, with no numbers, write a plan. For more than 8 areas, write a table of the counts, sorted by count. For numbers across two sets of things, such as weekdays and hours, write a heat map.

This is not the blurred glow over a screenshot that analytics tools draw. A glow shows numbers between the points that were never measured, and it gives no exact value. A heat plan gives one exact number for each area you name.

```json
{
  "id": "product-clicks",
  "kind": "heatplan",
  "label": "Clicks on each area of a product page in one week. The Add to cart box got the most, 870, and the photo gallery the next most, 610. The footer got the fewest, 60. The help chat was not tracked.",
  "scale": {"from": 0, "to": 1000, "step": 200, "unit": "clicks"},
  "unit": "px",
  "columns": [480, 480, 480],
  "areas": [
    "header  header  header",
    "gallery details cart",
    "reviews reviews related",
    "footer  footer  chat"
  ],
  "boxes": [
    {"id": "header", "name": "Header", "note": "search and menu", "value": 420},
    {"id": "gallery", "name": "Photo gallery", "value": 610},
    {"id": "details", "name": "Product details", "value": 240},
    {"id": "cart", "name": "Add to cart", "note": "price and size", "value": 870},
    {"id": "reviews", "name": "Reviews", "value": 430},
    {"id": "related", "name": "Related items", "value": 150},
    {"id": "footer", "name": "Footer", "value": 60},
    {"id": "chat", "name": "Help chat", "note": "not tracked", "value": null}
  ]
}
```

| Field | What it is |
|---|---|
| `areas`, `boxes`, `columns`, `unit` | As in a plan: the grid of named areas, 2 to 8 boxes in at most 4 columns and 5 rows, and the optional widths of the columns with their unit. |
| `value` | On each box, needed: a number from `from` to `to` of the scale, or `null` for a box with no data. At least one box has a number. |
| `scale` | As in a heat map: `from`, `to`, `step` and `unit`, 3 to 5 steps, and no `marks`. Its `unit` (at most 12 characters) is what is counted, such as `clicks`; the plan's own `unit` stays the unit of the widths. |

- **Each box with a number is filled with its heat step,** by the rules of a heat map: you fix the scale, a value on an edge takes the higher step, and a value outside the scale is refused. The legend of a heat map stands above the plan.
- **The value stands under the name,** at 12px with tabular figures, and the note under the value. On a step the name, the value and the note take the text color, or the page color on the two darkest steps; a note is not muted there.
- **A box with no data** keeps the look of a plan's box, the page color inside, and says "no data" under its name. The legend needs no key for it.
- The forms are a plan's: 640px on a desktop and on paper, and 264px on a phone, where a narrow column grows until its names and values fit. The value is one more line, so it counts in the size of each box. When the grid cannot fit a phone, each box stands on its own band, with its value and unit (`460 clicks`), beside a small map where every box is filled with its step and its own box has a thick outline with a thin light line inside, so it shows on every step.
- `render` says which forms are not to scale, as for a plan, such as `drawn as heatplan; not to scale; stacked on a phone`.
- `render` also writes the boxes as a table under the drawing, the plan's table with a Value column, and lines on the steps, the highest number, the lowest and the boxes with no data. On a narrow screen the table scrolls inside itself, so no word breaks.

## Status grids

A status grid shows the state of each pair of a row and a column, such as the uptime of each part of a service on each day, or the nightly builds of each project. Write it with `"kind": "statusgrid"` when there is one state for each cell, 1 to 12 rows and 3 to 24 columns, and the reader needs to find the failures more than to read each number. Each cell is OK, Warning or Error. For how much, such as errors by day, where 30 and 38 both matter, write a heat map. For the state of a few things right now, write a status note for each, or a table with a state column. When every cell is OK, write a sentence: "Every part was up every day of the month."

```json
{
  "id": "tracker-uptime",
  "kind": "statusgrid",
  "label": "Uptime of the bug tracker's parts from 3 to 16 November. On 11 November the API and Search were down for part of the day, and Sign-in was slow. Every other day was OK, except three short slow periods. Email alerts has no data for 14 November.",
  "thresholds": {"better": "higher", "ok": 99.9, "warn": 99, "unit": "%"},
  "columns": ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"],
  "rows": [
    {
      "name": "Website",
      "values": [100, 100, 99.98, 100, 100, 100, 100, 100, 99.95, 100, 100, 100, 100, 100]
    },
    {
      "name": "Sign-in",
      "values": [100, 100, 100, 100, 100, 100, 100, 100, 99.4, 100, 100, 100, 100, 100]
    },
    {
      "name": "API",
      "values": [100, 99.99, 100, 100, 100, 100, 100, 100, 98.6, 99.7, 100, 100, 100, 100]
    },
    {
      "name": "Email alerts",
      "values": [100, 100, 100, 99.6, 100, 100, 100, 100, 100, 100, 100, null, 100, 100]
    },
    {
      "name": "Search",
      "values": [100, 100, 100, 100, 100, 99.97, 100, 100, 97.9, 100, 100, 100, 100, 100]
    }
  ]
}
```

| Field | What it is |
|---|---|
| `thresholds` | When the values are numbers: `better` (`"higher"` or `"lower"`), `ok` (the edge of the OK state), `unit` (at most 12 characters), and optionally `warn` (the edge of the Warning state). Without `warn` there are two states, OK and Error. |
| `columns` | 3 to 24 labels, left to right, each at most 10 characters, all different, as in a heat map. |
| `rows` | 1 to 12 rows, top to bottom. Each has a `name` (at most 20 characters, all different) and `values`: one for each column. With `thresholds`, a value is a number or `null` for no data. Without `thresholds`, a value is `"ok"`, `"warn"`, `"err"` or `null`. At least one value is not `null`. |
| `names` | Optional words for the states, such as `{"ok": "Up", "warn": "Degraded", "err": "Down"}`, each at most 12 characters and all different. The default words are "OK", "Warning" and "Error". The colors and marks never change with the names. |
| `calendar` | Optional. `true` says the grid is a calendar: 7 rows, one for each day of the week, and each column a week, labelled with its first day, such as `"31 Aug"`. |

- **Two ways to give the states.** Numbers with `thresholds`, for anything measured, such as uptime, error rate or response time: the renderer finds each state, and the table keeps each number. Or each state written directly, for anything with no number, such as a build that passed or failed. One grid uses one way; a mix is refused.
- **`better` says which way is good.** With `"higher"`, a value of `ok` or more is OK, a value of `warn` or more is Warning, and a lower value is Error; `"lower"` is the mirror, for an error rate. A value exactly on a threshold takes the better state, because a target is written "at least" or "at most". `better` is needed, so a swap of `ok` and `warn` is refused instead of turning every good day red.
- **The look.** On screen each cell is filled in its status color: green for OK, the warning color for Warning, and red for Error. On paper only the failures stand out: OK and Warning cells take the outline color, and an Error cell keeps its red fill. A Warning cell always has a slash and an Error cell a cross, so a reader who cannot tell the colors apart, or a gray printer, still sees each state. An OK cell has no mark.
- **A cell with no data is hollow,** as in a heat map, and the legend adds a hollow key, "No data". No data is not a state: a monitor that was off is not a service that was down.
- **A legend above the grid** shows each state as a small cell with its mark, its name and its range, such as "Warning: 99% to below 99.9%". With states written directly it shows OK and Error, and Warning when a cell has it. The keys flow into lines, and a key too wide for a line wraps its words, so a legend is never refused.
- **Cells never show numbers.** The state is the answer; the table in words gives every number.
- **A long strip of one thing,** such as 90 days of one service, is a calendar: write the weekdays as 7 rows and the weeks as columns, from the oldest week at the left, with `"calendar": true`. Label each column with the first day of its week. The words then name a cell "Friday, week of 31 Aug", so a label never reads as that day's date. Use whole weeks: the renderer reads no dates, and a day that has not happened is not "no data". End with the last whole week, and say the dates in the label.
- The forms are a heat map's: 640px on a desktop and on paper, and 264px on a phone, where each row name stands on its own line above its row of cells. The column labels follow the heat map's rules.
- `render` also writes the states as a table under the drawing, with the same rows and columns. A cell holds its number, and its state word when it is not OK, such as "98.6 Error"; with states written directly, the state word. Lines under the table say the thresholds, count the cells of each state, name each Error cell (up to 6), and give the worst value. A table too wide for paper is split, as for a heat map.
- `render` says how the column labels came out, such as `drawn as statusgrid; column labels on two lines on a phone`.

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
- Fit warnings: the data's shape says that another kind, or no diagram, may serve the reader better. They never change the drawing. Read each one, and change the kind or keep it:
  - `... warning: every message goes one way and no reply comes back; this reads as a workflow` — a sequence diagram with no answers is a chain of hand-offs. A workflow diagram (no `"kind"`) shows it better.
  - `... warning: the activity has no decision, no fork and at most one partition; this is a numbered list` — the steps run in one line; write them as `<ol>`.
  - `... warning: the class diagram has no relations; this is a table of the classes and their members` — the same for an object diagram with no links.
  - `... warning: the links form one chain, so they add little; ... a sequence diagram reads better` — a communication diagram earns its place when its links branch.
  - `... warning: the range chart has 2 rows; a sentence says this more simply` — two values read better in a sentence than on a scale.
  - `... warning: every row has one box; a range chart says this more simply` — a layout earns its place when a row holds parts side by side.
  - `... warning: the funnel has 2 steps; a sentence says this more simply` — two counts read better in a sentence: "1,860 of 12,480 people finished".
  - `... warning: no step loses anyone; a sentence says this more simply` — every count is the same, so the bars show nothing.
  - `... warning: the last step keeps 96% of the first, so the bars look almost the same; a table shows small drops better` — when the last count is at least 95% of the first, the loss is too short to see on a phone.
  - `... warning: the bar chart has 2 rows; a sentence says this more simply` — two amounts read better in a sentence.
  - `... warning: every value is the same; a sentence says this more simply` — every bar has the same length. For a dumbbell: `no row changes; a sentence says this more simply`.
  - `... warning: the line chart has one series of 3 points; a sentence says this more simply` — three values read better in a sentence.
  - `... warning: no value changes; a sentence says this more simply` — every line of a line chart, or of a slopegraph, is flat.
  - `... warning: every number is in one step, so the shades show nothing; a sentence or a table says this more simply` — every cell has the same shade.
  - `... warning: 61 of 72 cells are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text` — four cells in five, or more, have the palest shade.
  - `... warning: the heat map has 9 cells; a table with the numbers says this more simply` — fewer than 12 cells.
  - `... warning: 40 of 72 cells have no data; a table of the cells that have data may say this better` — more than half of the cells are hollow.
  - `... warning: only every 3rd column label fits on a desktop; when the columns are names, not a series such as hours, turn the grid so that the names are rows` — names need every label; a series such as hours does not.
  - `... warning: every number is in one step, so the shades show nothing; a plan, with the numbers in a table, says this more simply` — every box of a heat plan has the same shade.
  - `... warning: 6 of 7 boxes are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text` — four boxes in five, or more, have the palest shade.
  - `... warning: 5 of 8 boxes have no data; a plan, with the numbers of the other boxes in a table, may say this better` — more than half of the boxes have no number.
  - `... warning: the heat plan has 2 boxes; a sentence says where they sit and how much each got` — two areas read better in a sentence.
  - `... warning: every cell is "OK"; a sentence says this more simply, such as "every part was up every day"` — every cell of a status grid has one state; the same for any one state.
  - `... warning: the status grid has 9 cells; a table with a state column says this more simply` — fewer than 12 cells.
  - `... warning: 47 of 72 cells are Warning or Error; check the thresholds, or use a heat map when the question is how much, not which cells failed` — more than half of the cells with a number are not OK: a threshold is wrong, or the data is an amount.
  - `... warning: 40 of 72 cells have no data; a table of the cells that have data may say this better` — as for a heat map.
  - `... warning: only every 3rd column label fits on a desktop; when the columns are names, not a series such as days, turn the grid so that the names are rows` — as for a heat map; a calendar never gets it, because its columns are weeks.

`check` also reports a figure well that holds a drawing no diagram block made: `check doc.html: error: Figure 2, ... holds a drawing that no diagram block made; write its data in a block and run render`. A hand-drawn SVG cannot be drawn again or checked against data. Icons outside figure wells are not touched.

`render` draws every diagram that it can. When one is refused, the others are still drawn, and `render` ends with exit code 1.

To see one drawing without a document: `node scripts/render.cjs --data diagram.json > drawing.svg`. The SVG goes to standard output, and the message goes to standard error.
