import Highlighter from "../highlighter.js";
import loadRequiredCss from "../viewer/load-required-css.js";
import renderExtras from "../viewer/render-extras.js";
import renderFormatButton from "./render-format-button.js";
import { reformatJson } from "../format-json.js";

export default async function loadScratchPad(pre, options) {
  await loadRequiredCss(options);

  const scratchPadOptions = {
    ...options,
    structure: { ...options.structure, readOnly: false }
  };

  const highlighter = new Highlighter("", scratchPadOptions);
  highlighter.highlight();

  renderExtras(pre, options, highlighter);
  renderFormatButton(() => {
    try {
      const { formatted, decoded } = reformatJson(highlighter.editor.getValue(), {
        tabSize: options.structure.tabSize,
        indentCStyle: options.structure.indentCStyle,
        showArraySize: options.structure.showArraySize
      });
      highlighter.editor.setValue(formatted);
      window.json = JSON.parse(decoded);
    } catch {
      // not JSON (yet): leave the text as typed
    }
  });
}
