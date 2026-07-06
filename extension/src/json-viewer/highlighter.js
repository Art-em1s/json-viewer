import CodeMirror from "codemirror";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/dialog/dialog.js";
import "codemirror/addon/scroll/annotatescrollbar.js";
import "codemirror/addon/search/matchesonscrollbar.js";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/search.js";
import "codemirror/mode/javascript/javascript.js";
import defaults from "./defaults.js";
import URL_PATTERN from "./url-pattern.js";
import bindCopyOnHover from "./copy-on-hover.js";
import bindFoldSelection from "./fold-select.js";

// Decodes HTML entities (&amp; &#63; ...) that some APIs embed in URLs.
// DOMParser documents are inert: nothing is fetched and no handlers run,
// unlike the innerHTML-on-a-div trick this replaces.
function decodeEntities(text) {
  return new DOMParser().parseFromString(text, "text/html").documentElement.textContent || "";
}

function stripQuotes(text) {
  return text.replace(/^"+/, "").replace(/"+$/, "");
}

// The fold addon clones this element (attributes survive, listeners would
// not) — the click/double-click behavior lives in fold-select.js
function makeFoldMarker() {
  const marker = document.createElement("span");
  marker.className = "CodeMirror-foldmarker";
  marker.textContent = "↔";
  marker.title = "Click to select for copying · double-click to unfold";
  return marker;
}

export default class Highlighter {
  constructor(jsonText, options) {
    this.options = options || {};
    this.text = jsonText;
    this.defaultSearch = false;
    this.theme = (this.options.theme || "default").replace(/_/, " ");
  }

  highlight() {
    this.editor = CodeMirror(document.body, this.getEditorOptions());
    if (!this.alwaysRenderAllContent()) this.preventDefaultSearch();
    if (this.isReadOnly()) this.editor.getWrapperElement().classList.add("read-only");

    this.bindRenderLine();
    this.bindMousedown();
    bindCopyOnHover(this.editor);
    bindFoldSelection(this.editor);
    this.editor.refresh();
    this.editor.focus();
  }

  hide() {
    this.editor.getWrapperElement().hidden = true;
    this.defaultSearch = true;
  }

  show() {
    this.editor.getWrapperElement().hidden = false;
    this.defaultSearch = false;
  }

  fold() {
    let skippedRoot = false;
    const lastLine = this.editor.lastLine();

    for (let line = this.editor.firstLine(); line <= lastLine; line++) {
      if (!skippedRoot) {
        if (/[[{]/.test(this.editor.getLine(line).trim())) skippedRoot = true;
      } else {
        this.editor.foldCode({ line, ch: 0 }, null, "fold");
      }
    }
  }

  unfoldAll() {
    for (let line = 0; line < this.editor.lineCount(); line++) {
      this.editor.foldCode({ line, ch: 0 }, null, "unfold");
    }
  }

  bindRenderLine() {
    this.editor.on("renderLine", (cm, line, element) => {
      if (!this.clickableUrls()) return;

      const stringNodes = element.getElementsByClassName("cm-string");
      if (stringNodes.length === 0) return;

      const nodes = Array.from(stringNodes);
      const text = stripQuotes(nodes.map((node) => node.textContent).join(""));
      // no useful clickable URL is this long; keeps the regex cost bounded
      if (text.length > 8192 || !URL_PATTERN.test(text)) return;

      const decodedText = decodeEntities(text);
      for (const node of nodes) {
        if (this.wrapLinkWithAnchorTag()) {
          const linkTag = document.createElement("a");
          linkTag.href = decodedText;
          linkTag.target = "_blank";
          linkTag.rel = "noopener";
          linkTag.classList.add("cm-string");

          // reparent the child nodes to preserve the cursor when editing
          while (node.firstChild) linkTag.appendChild(node.firstChild);

          // block CodeMirror's contextmenu handler
          linkTag.addEventListener("contextmenu", (e) => e.stopPropagation());

          node.appendChild(linkTag);
        } else {
          node.classList.add("cm-string-link");
          node.setAttribute("data-url", decodedText);
        }
      }
    });
  }

  bindMousedown() {
    this.editor.on("mousedown", (cm, event) => {
      const element = event.target;
      if (element.classList.contains("cm-string-link")) {
        const url = element.getAttribute("data-url");
        window.open(url, this.openLinksInNewWindow() ? "_blank" : "_self");
      }
    });
  }

  getEditorOptions() {
    const foldGutter = this.options.structure.foldGutter !== false;
    const obligatory = {
      value: this.text,
      theme: this.theme,
      readOnly: this.isReadOnly(),
      mode: "application/ld+json",
      indentUnit: 2,
      tabSize: 2,
      gutters: foldGutter
        ? ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        : ["CodeMirror-linenumbers"],
      foldOptions: { widget: makeFoldMarker },
      extraKeys: this.getExtraKeysMap()
    };

    if (this.alwaysRenderAllContent()) {
      obligatory.viewportMargin = Infinity;
    }

    return { ...defaults.structure, ...this.options.structure, ...obligatory };
  }

  getExtraKeysMap() {
    const extraKeyMap = {
      "Esc": (cm) => {
        CodeMirror.commands.clearSearch(cm);
        cm.setSelection(cm.getCursor());
        cm.focus();
      }
    };

    if (this.isReadOnly()) {
      extraKeyMap["Enter"] = (cm) => CodeMirror.commands.findNext(cm);
      extraKeyMap["Shift-Enter"] = (cm) => CodeMirror.commands.findPrev(cm);
      extraKeyMap["Ctrl-V"] = extraKeyMap["Cmd-V"] = () => {};
    }

    const nativeSearch = this.alwaysRenderAllContent();
    extraKeyMap["Ctrl-F"] = nativeSearch ? false : this.openSearchDialog;
    extraKeyMap["Cmd-F"] = nativeSearch ? false : this.openSearchDialog;
    return extraKeyMap;
  }

  preventDefaultSearch() {
    const isMac = navigator.platform.includes("Mac");
    document.addEventListener("keydown", (e) => {
      const metaKey = isMac ? e.metaKey : e.ctrlKey;
      if (!this.defaultSearch && metaKey && e.key.toLowerCase() === "f" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
      }
    });
  }

  openSearchDialog(cm) {
    cm.setCursor({ line: 0, ch: 0 });
    CodeMirror.commands.find(cm);
  }

  alwaysRenderAllContent() {
    // "awaysRenderAllContent" was a long-supported typo; saved options may
    // still carry it
    return this.options.addons.alwaysRenderAllContent ||
      this.options.addons.awaysRenderAllContent;
  }

  clickableUrls() {
    return this.options.addons.clickableUrls;
  }

  wrapLinkWithAnchorTag() {
    return this.options.addons.wrapLinkWithAnchorTag;
  }

  openLinksInNewWindow() {
    return this.options.addons.openLinksInNewWindow;
  }

  isReadOnly() {
    return !!this.options.structure.readOnly;
  }
}
