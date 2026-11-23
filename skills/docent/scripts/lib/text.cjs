// Text widths without a browser. A script with no packages cannot measure text, so it estimates.
// Each number is the advance width of one printable ASCII character (space to ~), in thousandths of the font size.
// It is the widest of Helvetica Neue, Arial and Tahoma, plus 3%. Those are wider than San Francisco, so a
// drawing laid out with this table has room to spare on Apple devices. Segoe UI and Roboto were not measured
// on a real device. tests/browser/check-render.cjs fails when a real width in a drawing is larger than the estimate.
// The hyphen is set from San Francisco at 12px and 14px (472 and 480 thousandths), plus 3%: at small sizes the system font
// draws it wider than at large sizes, and wider than the other fonts.
const WIDTHS = {
  400: [
    322, 342, 439, 750, 573, 1030, 695, 287, 395, 395, 563, 750, 312, 486, 312, 394, 573, 573, 573,
    573, 573, 573, 573, 573, 573, 573, 365, 365, 750, 750, 750, 573, 1046, 688, 706, 744, 744, 688,
    630, 802, 744, 385, 535, 688, 573, 898, 744, 802, 688, 802, 744, 688, 630, 744, 688, 973, 688,
    688, 630, 395, 394, 395, 750, 573, 563, 573, 611, 554, 611, 573, 328, 592, 575, 236, 291, 535,
    236, 879, 575, 592, 611, 611, 372, 515, 345, 575, 515, 781, 534, 515, 515, 495, 394, 495, 750,
  ],
  600: [
    302, 354, 504, 843, 656, 1235, 805, 287, 468, 468, 656, 843, 322, 494, 322, 595, 656, 656, 656,
    656, 656, 656, 656, 656, 656, 656, 375, 375, 843, 843, 843, 630, 1005, 744, 744, 764, 781, 688,
    630, 802, 788, 498, 573, 744, 630, 935, 794, 802, 688, 802, 748, 688, 631, 764, 696, 1059, 706,
    691, 668, 468, 595, 468, 843, 656, 563, 617, 651, 592, 649, 612, 394, 649, 660, 311, 374, 621,
    311, 983, 660, 636, 649, 649, 447, 573, 428, 660, 596, 917, 623, 593, 542, 642, 656, 642, 843,
  ],
};
const OTHER = { 400: 1000, 600: 1050 }; // any character outside ASCII: assume a full square

/** Estimated width in px of one line of text in the system sans-serif. */
function textWidth(text, size, weight = 400) {
  const table = WIDTHS[weight];
  let units = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    units += code >= 32 && code <= 126 ? table[code - 32] : OTHER[weight];
  }
  return Math.ceil((units * size) / 1000);
}

module.exports = { textWidth };
