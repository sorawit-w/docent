// Finds what looks like personal data in text: email addresses and phone numbers. check only warns, so a miss is better than
// a false alarm: a phone number must have the shape of one, with its separators, and dates, times, versions, IP addresses,
// numbers with thousands separators, ids and hashes do not have that shape. Names and postal addresses cannot be found this way.

// The names that RFC 2606 and RFC 6761 reserve for examples, and the fake numbers of North America (555-0100 to 555-0199).
const RESERVED_DOMAIN = /(^|\.)example\.(com|org|net)$|\.(example|test|invalid|localhost)$/i;
// A local part that names a system, not a person: an SSH remote (git@github.com) or a no-reply sender.
const SYSTEM_USER = /^(git|no-?reply)$/i;
// A "domain" that is a file name, such as icon@2x.png.
const FILE_END = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|cjs|json|html?|md|txt|pdf|zip)$/i;

const EMAIL = /(?<![\w.%+-])([A-Za-z0-9._%+-]+)@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})(?![\w-])/g;
// Three shapes of a phone number, each with its separators: international (+ and a country code), North American, and national with a leading 0.
const PHONE = new RegExp([
  String.raw`\+\d{1,3}(?:[ .-]?\(\d{1,4}\))?(?:[ .-]\d{1,4}){2,5}`, // +44 20 7946 0958, +1 (415) 555-2671, +66 81 234 5678
  String.raw`(?:\(\d{3}\) ?|\d{3}[.-])\d{3}[.-]\d{4}`, // (415) 555-2671, 415-555-2671, 415.555.2671
  String.raw`\d{3} \d{3} \d{4}`, // 415 555 2671
  String.raw`0\d{1,4}[ -]\d{3,4}[ -]\d{3,4}`, // 020 7946 0958, 081 234 5678
].map((s) => `(?:${s})`).join("|"), "g");
// Around a phone number: not inside a word, an id (BUG-415-555-2671), a path, a time, an address or a longer number (1.415.555.2671.9).
const BEFORE = /[\w.,:/#@+-]$/;
const AFTER = /^(?:[\w/:@]|[.,-]\d)/;

const maskEmail = (user, domain) => `${user[0]}***@${domain}`;
const maskPhone = (phone) => { let keep = 2; return [...phone].reverse().map((c) => (/\d/.test(c) && keep-- <= 0 ? "*" : c)).reverse().join(""); };
/** True for a North American number in the fake range 555-0100 to 555-0199, with or without +1. */
const fake = (digits) => /^(1)?\d{3}55501\d\d$/.test(digits);

/** Returns each finding once, in order: { kind: "email" | "phone", masked }. */
function findPersonal(text) {
  const found = [], seen = new Set();
  const add = (kind, masked) => { if (!seen.has(masked)) { seen.add(masked); found.push({ kind, masked }); } };
  for (const m of text.matchAll(EMAIL)) {
    const [, user, domain] = m;
    if (RESERVED_DOMAIN.test(domain) || SYSTEM_USER.test(user) || FILE_END.test(`.${domain}`)) continue;
    add("email", maskEmail(user, domain));
  }
  for (const m of text.matchAll(PHONE)) {
    const phone = m[0], digits = phone.replace(/\D/g, "");
    if (BEFORE.test(text.slice(0, m.index)) || AFTER.test(text.slice(m.index + phone.length))) continue;
    if (digits.length < 9 || digits.length > 15 || fake(digits)) continue;
    add("phone", maskPhone(phone));
  }
  return found;
}

/** A tel: link is a phone number whatever its shape. */
function findTel(value) {
  const digits = value.replace(/^tel:/i, "").replace(/\D/g, "");
  return digits.length >= 7 && !fake(digits) ? [{ kind: "phone", masked: maskPhone(value.replace(/^tel:/i, "")) }] : [];
}

module.exports = { findPersonal, findTel };
