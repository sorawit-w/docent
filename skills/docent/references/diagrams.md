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
| `lanes` | yes | 1 to 4 lanes. Each has an `id`, a `name` (at most 28 characters) and, if you want, an `icon`. |
| `parts` | yes | 2 to 12 parts. Each has an `id`, the `lane` it belongs to, a `name` (at most 32 characters) and, if you want, a `note` (at most 40 characters) and an `icon`. |
| `legs` | yes | 1 to 16 legs, in order. Each goes `from` one part `to` another and has a `verb` (at most 24 characters). The legs are numbered in the order you write them. |
| `place` | no | `"flow"` (the default) for a diagram in the text flow. `"walk"` for the diagram beside walkthrough steps: leg 1 lights with step 1, leg 2 with step 2, and so on. |
| `form` | no | `"auto"` (the default), `"wide"`, `"tall"` or `"plates"`. Leave it out and the renderer picks. Name a form only when you have a reason. |
| `icons` | no | Icons that you draw for this diagram: an object from a name to the shapes of the icon. See below. |

Keep names, notes and verbs short. A verb is one to three words. The renderer refuses text that is too long.

## Route or Plates

- A **route** is data in which each leg starts where the leg before it ended, and every part is visited once. A route can be drawn in any form, and it also gets a single-track form for phones.
- Any other data (paths that branch, an arrow that goes back, a part with no leg) is drawn as **Plates** only.

A walkthrough needs a route with one leg for each step.

## Icons

Built-in names: `person`, `team`, `computer`, `server`, `store`, `timer`, `key`, `document`, `message`, `branch`, `release`, `inspect`, `check`, `commit`, `merge`.

Pick by kind. Two parts of the same kind share one icon; two parts of different kinds never share one. In one diagram, either every part has an icon or no part has one. The same holds for lanes.

When no built-in icon fits, draw one in `icons`, to the rules in `DESIGN.md` (a 16 by 16 grid, at most six shapes, no letters):

```json
"icons": { "bug": "<circle cx=\"8\" cy=\"9\" r=\"3.5\"/><path d=\"M8 5.5V3M4.5 9h-2M13.5 9h-2\"/>" }
```

An icon may hold only `path`, `circle`, `rect`, `line` and `polyline`, with their own geometry attributes. Anything else is rejected: `render` leaves the icon out and warns, and `check` reports an error. When no clear picture exists, use no icons. A wrong picture is worse than none.

## What the renderer says

- `render doc.html: diagram 1 ("order") drawn as wide` — the drawing is in the document.
- `... cannot be drawn within the spacing rules: ...` — the data asks for more than the form can hold. Shorten the text that the message names, remove a part, or let the renderer pick the form.
- `... warning: the drawing is 734px wide; beside the walkthrough steps there is room for 520px` — the drawing will scroll sideways beside the steps. Use fewer lanes or shorter names.

To see one drawing without a document: `node scripts/render.cjs --data diagram.json > drawing.svg`.
