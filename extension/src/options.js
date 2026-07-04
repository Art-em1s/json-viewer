import CodeMirror from "codemirror";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/hint/css-hint.js";
import "codemirror/mode/css/css.js";

import { loadOptions, saveOptions } from "./json-viewer/storage.js";
import { migrateLegacyOptions } from "./json-viewer/migrate-legacy.js";
import renderThemeList from "./json-viewer/options/render-theme-list.js";
import renderAddons from "./json-viewer/options/render-addons.js";
import renderStructure from "./json-viewer/options/render-structure.js";
import renderStyle from "./json-viewer/options/render-style.js";
import bindResetButton from "./json-viewer/options/bind-reset-button.js";
import showToast from "./json-viewer/options/toast.js";

function parseSection(name, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`"${name}" isn't a valid JSON`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`"${name}" must be a JSON object`);
  }
  return value;
}

function renderVersion() {
  const version = chrome.runtime.getManifest().version;
  const versionLink = document.getElementsByClassName("version")[0];
  versionLink.textContent = version;
  versionLink.href = `https://github.com/tulios/json-viewer/tree/${version}`;
}

function bindSaveButton(themesInput, addonsEditor, structureEditor, styleEditor) {
  document.getElementById("options").onsubmit = () => false;

  document.getElementById("save").onclick = async (e) => {
    e.preventDefault();

    try {
      const options = {
        theme: themesInput.value,
        addons: parseSection("Add-ons", addonsEditor.getValue()),
        structure: parseSection("Structure", structureEditor.getValue()),
        style: styleEditor.getValue()
      };
      await saveOptions(options);
      showToast("Options saved!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}

async function onLoaded() {
  await migrateLegacyOptions();
  const currentOptions = await loadOptions();

  renderVersion();
  renderThemeList(CodeMirror, currentOptions.theme);
  const addonsEditor = renderAddons(CodeMirror, currentOptions.addons);
  const structureEditor = renderStructure(CodeMirror, currentOptions.structure);
  const styleEditor = renderStyle(CodeMirror, currentOptions.style);

  bindResetButton();
  bindSaveButton(document.getElementById("themes"), addonsEditor, structureEditor, styleEditor);
}

document.addEventListener("DOMContentLoaded", () => {
  onLoaded().catch((e) => console.error("[JSONViewer] error: " + e.message, e));
});
