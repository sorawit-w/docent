// Color rules that check and brand share: WCAG contrast, CIELAB (D65), the CIE76 distance between two colors,
// and the dark accent worked out from a light one. Fixed rules, so the same accent always gives the same result.

const PAGE = { light: "#fbfbfe", well: "#f2f3f9", dark: "#12141f", darkWell: "#0b0d15" };
const STATUS = { light: { ok: "#1a7f37", warn: "#7d4e00", err: "#cf222e" }, dark: { ok: "#3fb950", warn: "#d29922", err: "#f85149" } };

const full = (hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex).toLowerCase();
const channels = (hex) => [1, 3, 5].map((i) => parseInt(full(hex).slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** WCAG 2 contrast of two hex colors. */
function contrast(a, b) {
  const lum = (hex) => { const [r, g, bl] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const WHITE = [0.95047, 1, 1.08883];
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

/** CIELAB of a hex color: { L, a, b, C, h }. */
function lab(hex) {
  const [r, g, b] = channels(hex).map(linear);
  const xyz = [0.4124564 * r + 0.3575761 * g + 0.1804375 * b, 0.2126729 * r + 0.7151522 * g + 0.072175 * b, 0.0193339 * r + 0.119192 * g + 0.9503041 * b];
  const [fx, fy, fz] = xyz.map((v, i) => f(v / WHITE[i]));
  const L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
  return { L, a: A, b: B, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/** The sRGB color of a CIELAB lightness, chroma and hue, or null when it is outside sRGB. */
function fromLch(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const fy = (L + 16) / 116, [x, y, z] = [fy + a / 500, fy, fy - b / 200].map(fi).map((v, i) => v * WHITE[i]);
  const rgb = [3.2404542 * x - 1.5371385 * y - 0.4985314 * z, -0.969266 * x + 1.8760108 * y + 0.041556 * z, 0.0556434 * x - 0.2040259 * y + 1.0572252 * z].map(gamma);
  if (rgb.some((c) => c < -0.0005 || c > 1.0005)) return null;
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** The same hue at another lightness, with the most chroma up to the given one that sRGB can show. */
function atLightness(L, C, h) {
  if (fromLch(L, C, h)) return fromLch(L, C, h);
  let lo = 0, hi = C;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fromLch(L, mid, h)) lo = mid; else hi = mid; }
  return fromLch(L, lo, h);
}

/** CIE76: the straight distance between two colors in CIELAB. Under about 25, two colors read as one family. */
function distance(x, y) { const p = lab(x), q = lab(y); return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b); }

/** A dark accent worked out from a light one: the same hue and chroma, and the lightness raised until it reaches 7:1 on the dark page, about the contrast of Docent's own dark accent (7.23:1). */
function darkAccent(hex) {
  const { L, C, h } = lab(hex);
  for (let l = Math.max(L, 0); l <= 100; l += 0.1) {
    const color = atLightness(l, C, h);
    if (color && contrast(color, PAGE.dark) >= 7 && contrast(color, PAGE.darkWell) >= 4.5) return color;
  }
  return "#ffffff";
}

/** The nearest status color of a theme to an accent: { name, distance }. */
function nearestStatus(hex, theme) {
  return Object.entries(STATUS[theme]).map(([name, color]) => ({ name, distance: distance(hex, color) })).sort((m, n) => m.distance - n.distance)[0];
}

module.exports = { PAGE, STATUS, contrast, lab, fromLch, atLightness, distance, darkAccent, nearestStatus };
