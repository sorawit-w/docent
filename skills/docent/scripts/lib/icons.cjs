// Icons for diagrams: a 16 by 16 grid, a stroke of 1.5, round ends and joins, no fill, at most six shapes.
// An icon is accepted only when it is made of plain shapes and nothing else.
const ICONS = {
  person: '<circle cx="8" cy="5" r="2.5"/><path d="M3 13.5c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/>',
  team: '<circle cx="6" cy="5.5" r="2.25"/><path d="M1.75 13c0-2.4 1.9-3.75 4.25-3.75s4.25 1.35 4.25 3.75M10.5 3.5a2.25 2.25 0 0 1 0 4.25M12 9.6c1.4.5 2.25 1.7 2.25 3.4"/>',
  computer: '<rect x="3" y="3.5" width="10" height="7" rx="1"/><path d="M1.5 12.5h13"/>',
  server: '<rect x="2.5" y="2.5" width="11" height="4.5" rx="1"/><rect x="2.5" y="9" width="11" height="4.5" rx="1"/><path d="M5 4.75h.01M5 11.25h.01"/>',
  store: '<path d="M3 4.5a5 2 0 0 0 10 0 5 2 0 0 0-10 0v7a5 2 0 0 0 10 0v-7"/><path d="M3 8a5 2 0 0 0 10 0"/>',
  timer: '<circle cx="8" cy="9" r="4.75"/><path d="M8 6.5V9l1.75 1.25M6.5 1.75h3M8 1.75v2.5"/>',
  key: '<circle cx="5.25" cy="10.75" r="2.75"/><path d="M7.25 8.75l6.25-6.25M10.5 5.5l1.75 1.75M12.25 3.75L13.5 5"/>',
  document: '<path d="M9.5 2.5h-5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7z"/><path d="M9.5 2.5v3h3M6 9h4M6 11.25h4"/>',
  message: '<path d="M2.5 4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7l-3 2.5v-2.5h-.5a1 1 0 0 1-1-1z"/><path d="M5.5 6.25h5M5.5 8.5h3"/>',
  branch: '<circle cx="5" cy="3.5" r="1.5"/><circle cx="5" cy="12.5" r="1.5"/><circle cx="11" cy="5.5" r="1.5"/><path d="M5 5v6M11 7c0 2.6-6 1.4-6 4"/>',
  release: '<path d="M2.5 8.4V3.5a1 1 0 0 1 1-1h4.9l5.1 5.1a1 1 0 0 1 0 1.4l-4.5 4.5a1 1 0 0 1-1.4 0z"/><path d="M5.6 5.6h.01"/>',
  inspect: '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
  check: '<circle cx="8" cy="8" r="5.5"/><path d="M5.5 8.2l1.8 1.8 3.2-3.6"/>',
  commit: '<circle cx="8" cy="8" r="2.5"/><path d="M1.5 8h4M10.5 8h4"/>',
  merge: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="8.5" r="1.5"/><path d="M4.5 5v6M4.5 5c0 2.8 2.6 3.5 5.5 3.5"/>',
};

const SHAPES = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
};
const MAX_SHAPES = 6;

/** Why an icon is rejected, or null when it is made of plain shapes only. */
function iconProblem(markup) {
  if (typeof markup !== "string" || !markup.trim()) return "it is empty";
  const tags = /<([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g;
  let shapes = 0;
  let match;
  while ((match = tags.exec(markup))) {
    const [, name, attrs] = match;
    if (!SHAPES[name]) return `<${name}> is not a plain shape (use path, circle, rect, line or polyline)`;
    for (const [, attr, value] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      if (!SHAPES[name].includes(attr)) return `<${name}> has the attribute "${attr}", which a plain shape does not take`;
      if (!/^[0-9A-Za-z .,\-]*$/.test(value)) return `the value of "${attr}" holds characters that a shape does not need`;
    }
    shapes += 1;
  }
  const rest = markup.replace(tags, "").trim();
  const other = rest.match(/<\/?([A-Za-z][\w:-]*)/);
  if (other && !SHAPES[other[1]]) return `<${other[1]}> is not a plain shape (use path, circle, rect, line or polyline)`;
  if (rest) return "it holds something that is not a plain shape";
  if (shapes > MAX_SHAPES) return `it has ${shapes} shapes; the most is ${MAX_SHAPES}`;
  return null;
}

module.exports = { ICONS, iconProblem };
