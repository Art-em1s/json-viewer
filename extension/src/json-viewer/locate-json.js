// Anti-hijack prefixes some APIs prepend to JSON responses. Anchored to the
// start of the document so JSON that merely *contains* "while(1);" inside a
// string value is never touched.
const HIJACK_PREFIX = /^\s*(?:while\s*\(\s*(?:1|true)\s*\)|for\s*\(\s*;;\s*\))\s*;?/;

// JSONP callback: everything up to the last "(" preceding the payload, on a
// single line (e.g. "/**/ XY.__callback.f1c77f051c(" or "(cb)("). The class
// excludes "{" and "[" so it can never scan past the JSON itself.
const CALLBACK_OPEN = /[^{[\r\n][^{[\r\n]*\(\s*/y;

const SCALAR_STARTS = new Set('"-0123456789tfn');

function isWs(code) {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

// Locates the JSON payload inside a raw document, tolerating JSONP callback
// wrappers and anti-hijack prefixes. Returns {start, end} bounds of the JSON
// text or null when the document cannot be JSON. Object/array documents are
// only shape-checked here (the real JSON.parse happens before highlighting);
// bare scalar documents ("a string", 42, true...) are validated with
// JSON.parse, which fails fast on the first invalid character.
export function locateJson(text) {
  let start = 0;
  let end = text.length;

  const hijack = HIJACK_PREFIX.exec(text);
  if (hijack) start = hijack[0].length;

  while (end > start && isWs(text.charCodeAt(end - 1))) end--;
  while (start < end && isWs(text.charCodeAt(start))) start++;
  if (start >= end) return null;

  const first = text[start];
  if (first === "{" || first === "[") {
    const last = text[end - 1];
    return last === "}" || last === "]" ? { start, end } : null;
  }

  if (SCALAR_STARTS.has(first)) {
    try {
      JSON.parse(text.slice(start, end));
      return { start, end };
    } catch {
      // Not a scalar; may still be a callback whose name starts with the
      // same character (e.g. "translate({...})")
    }
  }

  CALLBACK_OPEN.lastIndex = start;
  if (!CALLBACK_OPEN.exec(text)) return null;
  const jsonStart = CALLBACK_OPEN.lastIndex;

  const open = text[jsonStart];
  if (open !== "{" && open !== "[") return null;

  let close = end;
  if (text[close - 1] === ";") {
    close--;
    while (close > jsonStart && isWs(text.charCodeAt(close - 1))) close--;
  }
  if (text[close - 1] !== ")") return null;
  close--;
  while (close > jsonStart && isWs(text.charCodeAt(close - 1))) close--;

  const last = text[close - 1];
  if (open === "{" ? last !== "}" : last !== "]") return null;

  return { start: jsonStart, end: close };
}
