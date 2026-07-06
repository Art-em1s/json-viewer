import { init } from "./viewer.js";
import { loadOptions } from "./json-viewer/storage.js";
import { migrateLegacyOptions } from "./json-viewer/migrate-legacy.js";
import loadScratchPad from "./json-viewer/scratch-pad/load-editor.js";
import renderOversizeAlert from "./json-viewer/oversize-alert.js";

async function highlight(pre, options, performanceMode = false) {
  pre.hidden = true;
  const ok = await init(pre, options, false, performanceMode);
  if (!ok) pre.hidden = false;
}

async function onLoad() {
  await migrateLegacyOptions();

  const pre = document.querySelector("pre");
  const query = window.location.search.substring(1);
  const options = await loadOptions();

  if (/scratch-page=true/.test(query)) {
    pre.hidden = true;
    await loadScratchPad(pre, options);
    return;
  }

  pre.textContent = decodeURIComponent(query.replace(/^json=/, ""));
  if (pre.textContent.length > options.addons.maxJsonSize * 1024) {
    return renderOversizeAlert(pre, options, () => highlight(pre, options, true));
  }
  await highlight(pre, options);
}

document.addEventListener("DOMContentLoaded", () => {
  onLoad().catch((e) => console.error("[JSONViewer] error: " + e.message, e));
});
