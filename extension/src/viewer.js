// The heavy half of the extension (CodeMirror and the formatting pipeline).
// Never loaded by regular pages: the detector content script dynamically
// imports this bundle only after a page is identified as a JSON document.
import { locateJson } from "./json-viewer/locate-json.js";
import { reformatJson } from "./json-viewer/format-json.js";
import Highlighter from "./json-viewer/highlighter.js";
import loadRequiredCss from "./json-viewer/viewer/load-required-css.js";
import renderExtras from "./json-viewer/viewer/render-extras.js";
import exposeJson from "./json-viewer/viewer/expose-json.js";
import timestamp from "./json-viewer/timestamp.js";

// Highlights the JSON document held by `pre`. Returns false when the text
// turns out not to be JSON (the caller restores the raw page).
// `insidePage` is true in the content-script context and false on the
// omnibox extension page.
export async function init(pre, options, insidePage = true) {
  const raw = pre.textContent;
  const loc = locateJson(raw);
  if (!loc) return false;

  let result;
  try {
    result = reformatJson(raw.slice(loc.start, loc.end), {
      sortKeys: options.addons.sortKeys,
      tabSize: options.structure.tabSize,
      indentCStyle: options.structure.indentCStyle,
      showArraySize: options.structure.showArraySize
    });
  } catch {
    return false;
  }

  await loadRequiredCss(options);

  // The document text around the JSON payload (JSONP callback, anti-hijack
  // prefix) stays visible, wrapped around the formatted JSON
  let text = raw.slice(0, loc.start) + result.formatted + raw.slice(loc.end);

  const structure = { ...options.structure };
  if (insidePage && options.addons.prependHeader) {
    // Exactly 3 header lines; shifting firstLineNumber keeps the JSON's
    // first line numbered as before (default: header lines are -2, -1, 0)
    text = `// ${timestamp()}\n// ${document.location.href}\n\n${text}`;
    structure.firstLineNumber = structure.firstLineNumber - 3;
  }

  const highlighter = new Highlighter(text, { ...options, structure });
  highlighter.highlight();

  if (!options.addons.autoHighlight) {
    highlighter.hide();
    pre.hidden = false;
    console.info(
      "[JSONViewer] Raw view shown because the autoHighlight addon is off. " +
      "Use the RAW button (top-right) to toggle the highlighted view."
    );
  }

  if (options.addons.alwaysFold || options.addons.awaysFold) {
    highlighter.fold();
  }

  exposeJson(result.decoded, insidePage);
  renderExtras(pre, options, highlighter);
  return true;
}
