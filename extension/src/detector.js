// The only code that runs on every page. Kept intentionally tiny: it decides
// whether the page is a JSON document and, only then, dynamically imports the
// CodeMirror-sized viewer bundle.
import { findSource, restoreSource } from "./json-viewer/find-source.js";
import { locateJson } from "./json-viewer/locate-json.js";
import { loadOptions } from "./json-viewer/storage.js";
import renderOversizeAlert from "./json-viewer/oversize-alert.js";

async function highlight(pre, options, performanceMode = false) {
  pre.hidden = true;
  let ok = false;
  try {
    const viewer = await import(chrome.runtime.getURL("assets/viewer.js"));
    ok = await viewer.init(pre, options, true, performanceMode);
  } catch (e) {
    console.error("[JSONViewer] error: " + e.message, e);
  }
  if (!ok) {
    pre.hidden = false;
    restoreSource(pre);
  }
}

async function run() {
  const pre = findSource();
  if (!pre) return;

  if (!locateJson(pre.textContent)) {
    restoreSource(pre);
    return;
  }

  const options = await loadOptions();
  if (pre.textContent.length > options.addons.maxJsonSize * 1024) {
    return renderOversizeAlert(pre, options, () => highlight(pre, options, true));
  }

  await highlight(pre, options);
}

run().catch((e) => console.error("[JSONViewer] error: " + e.message, e));
