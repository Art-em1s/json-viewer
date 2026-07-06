import CodeMirror from "codemirror";

// A copy button that floats in the gutter next to the hovered row.
// Copying a plain row yields that row (without its trailing comma); copying
// a row that opens an object/array yields the entire node including the
// opening row; copying the root row yields the whole JSON. Works on
// collapsed nodes too — the hidden text is still in the document.

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API needs a focused document; fall back to execCommand
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    scratch.remove();
    return ok;
  }
}

function textForLine(editor, line) {
  const lineText = editor.getLine(line);
  const startCh = lineText.length - lineText.trimStart().length;

  const fold = CodeMirror.fold.auto(editor, CodeMirror.Pos(line, 0));
  if (fold) {
    // brace-fold: from.ch is after the open brace, to.ch is at the close
    return editor.getRange(
      { line, ch: startCh },
      { line: fold.to.line, ch: fold.to.ch + 1 }
    );
  }

  return lineText.trim().replace(/,$/, "");
}

export default function bindCopyOnHover(editor) {
  const wrapper = editor.getWrapperElement();
  const button = document.createElement("div");
  button.className = "jv-copy-line";
  button.title = "Copy this row (or the whole node it opens)";
  button.textContent = "⧉";
  button.hidden = true;
  wrapper.appendChild(button);

  let currentLine = null;
  let pending = null;
  let resetTimer = null;

  const hide = () => {
    button.hidden = true;
    currentLine = null;
  };

  const update = (event) => {
    const line = editor.lineAtHeight(event.clientY, "window");
    if (line < editor.firstLine() || line > editor.lastLine()) return hide();

    const coords = editor.charCoords({ line, ch: 0 }, "window");
    if (event.clientY < coords.top || event.clientY > coords.bottom) return hide();

    const wrapperRect = wrapper.getBoundingClientRect();
    const gutter = editor.getGutterElement();
    // sit at the right edge of the line numbers, clear of the fold arrows
    const foldGutter = gutter.querySelector(".CodeMirror-foldgutter");
    const rightEdge = gutter.offsetWidth - (foldGutter ? foldGutter.offsetWidth : 0);
    button.style.top = `${coords.top - wrapperRect.top + (coords.bottom - coords.top - 18) / 2}px`;
    button.style.left = `${Math.max(2, rightEdge - 20)}px`;
    button.hidden = false;
    currentLine = line;
  };

  wrapper.addEventListener("mousemove", (event) => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      update(event);
    });
  });
  wrapper.addEventListener("mouseleave", hide);
  editor.on("scroll", hide);

  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentLine === null) return;

    const ok = await copyText(textForLine(editor, currentLine));
    button.textContent = ok ? "✓" : "✕";
    button.classList.toggle("copied", ok);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = "⧉";
      button.classList.remove("copied");
    }, 900);
  });
}
