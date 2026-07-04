const HAS_RAW_JSON = typeof JSON.rawJSON === "function";

// For a number, context.source is always the exact whitespace-free lexeme,
// so JSON.rawJSON can never throw here. Wrapping every number in a rawJSON
// marker makes JSON.stringify re-emit it verbatim: 64-bit ids, trailing
// zeros (122.80) and exponent spelling (8.4E8 vs 840000000) all survive.
function numberPreservingReviver(key, value, context) {
  return typeof value === "number" ? JSON.rawJSON(context.source) : value;
}

function deepSortKeys(value) {
  if (value === null || typeof value !== "object") return value;
  if (HAS_RAW_JSON && JSON.isRawJSON(value)) return value;
  if (Array.isArray(value)) return value.map(deepSortKeys);

  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    // defineProperty instead of assignment: a plain `sorted[key] = ...`
    // would silently drop (or worse, set the prototype for) "__proto__" keys
    Object.defineProperty(sorted, key, {
      value: deepSortKeys(value[key]),
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return sorted;
}

// Fallback for documents V8 rejects but the pre-0.19 extension tolerated
// (e.g. leading-zero numbers like 00000): every number-ish token outside
// strings becomes a wrapped string before parsing, and the wrapper is
// stripped from the stringified output afterwards. Direct port of the old
// wrapNumbers walk, kept only for this rare lenient path.
const LENIENT_NUM = /^-?\d+\.?\d*(?:[eE]\+)?\d*$/;

// Entering a run depends on the char before it; once inside, any
// number-ish char continues the run (matching the original walk exactly)
function entersNumber(char, previous) {
  return (char >= "0" && char <= "9") ||
    (previous >= "0" && previous <= "9" && (char === "e" || char === "E")) ||
    ((previous === "e" || previous === "E") && char === "+") ||
    char === "." ||
    char === "-";
}

function continuesNumber(char) {
  return (char >= "0" && char <= "9") ||
    char === "e" || char === "E" || char === "+" || char === "." || char === "-";
}

function lenientParse(text) {
  const token = "wrap_" + Math.random().toString(36).slice(2, 10);
  const open = `<${token}>`;
  const close = `</${token}>`;

  let buffer = "";
  let numberBuffer = "";
  let inString = false;
  let escaped = false;
  let inNumber = false;
  let previous = "";

  const flushNumber = () => {
    inNumber = false;
    buffer += LENIENT_NUM.test(numberBuffer)
      ? `"${open}${numberBuffer}${close}"`
      : numberBuffer;
    numberBuffer = "";
  };

  for (const char of text) {
    if (char === '"' && !escaped) inString = !inString;

    if (!inString && !inNumber && entersNumber(char, previous)) inNumber = true;
    if (!inString && inNumber && !continuesNumber(char)) flushNumber();

    escaped = char === "\\" ? !escaped : false;

    if (inNumber) {
      numberBuffer += char;
    } else {
      buffer += char;
      previous = char;
    }
  }
  if (inNumber) flushNumber();

  const tree = JSON.parse(buffer);
  const unwrap = new RegExp(`"${open}(-?\\d+\\.?\\d*(?:[eE]\\+)?\\d*)${close}"`, "g");
  return { tree, unwrap };
}

function customFormat(tree, tabSize, indentCStyle, showArraySize) {
  const tab = " ".repeat(tabSize);
  const out = [];

  const write = (value, depth) => {
    if (value !== null && typeof value === "object" && !(HAS_RAW_JSON && JSON.isRawJSON(value))) {
      const isArray = Array.isArray(value);
      const keys = isArray ? null : Object.keys(value);
      const count = isArray ? value.length : keys.length;

      if (indentCStyle) out.push("\n" + tab.repeat(depth));
      if (isArray && showArraySize) out.push(`Array[${count}]`);
      if (count === 0) {
        out.push(isArray ? "[]" : "{}");
        return;
      }

      const childIndent = "\n" + tab.repeat(depth + 1);
      out.push(isArray ? "[" : "{");
      for (let i = 0; i < count; i++) {
        out.push(i === 0 ? childIndent : "," + childIndent);
        if (isArray) {
          write(value[i], depth + 1);
        } else {
          out.push(JSON.stringify(keys[i]) + ": ");
          write(value[keys[i]], depth + 1);
        }
      }
      out.push("\n" + tab.repeat(depth) + (isArray ? "]" : "}"));
      return;
    }

    out.push(HAS_RAW_JSON && JSON.isRawJSON(value) ? value.rawJSON : JSON.stringify(value));
  };

  write(tree, 0);
  return out.join("");
}

// Parses and re-formats a JSON document without losing number precision.
// Returns {formatted, decoded}: the pretty-printed text and the minified
// JSON used for window.json. Throws on input that is not JSON.
export function reformatJson(text, { sortKeys = false, tabSize = 2, indentCStyle = false, showArraySize = false } = {}) {
  let tree;
  let unwrap = null;

  if (HAS_RAW_JSON) {
    try {
      tree = JSON.parse(text, numberPreservingReviver);
    } catch (strictError) {
      try {
        ({ tree, unwrap } = lenientParse(text));
      } catch {
        throw strictError;
      }
    }
  } else {
    ({ tree, unwrap } = lenientParse(text));
  }

  if (sortKeys) tree = deepSortKeys(tree);

  // JSON.stringify caps its gap argument at 10, so wide indents also go
  // through the (equivalent) custom formatter
  let formatted = indentCStyle || showArraySize || tabSize > 10
    ? customFormat(tree, tabSize, indentCStyle, showArraySize)
    : JSON.stringify(tree, null, tabSize);
  let decoded = JSON.stringify(tree);

  if (unwrap) {
    formatted = formatted.replace(unwrap, "$1");
    decoded = decoded.replace(unwrap, "$1");
  }

  return { formatted, decoded };
}
