// Click on a collapsed fold placeholder (↔) selects the whole folded node
// (row start through the closing brace) so it can be copied without
// expanding; double-click unfolds. Uses capture-phase delegation on the
// wrapper: the fold addon clones widget elements (dropping any listeners
// attached in a widget factory) and adds its own unfold-on-mousedown to the
// clone — capture-phase stopPropagation keeps that handler from firing.

function markerTarget(event) {
  return event.target.closest?.(".CodeMirror-foldmarker");
}

function foldRangeAt(editor, event) {
  const pos = editor.coordsChar({ left: event.clientX, top: event.clientY }, "window");
  const mark = editor.findMarksAt(pos).find((m) => m.__isFold);
  return mark ? mark.find() : null;
}

export default function bindFoldSelection(editor) {
  const wrapper = editor.getWrapperElement();

  wrapper.addEventListener("mousedown", (e) => {
    if (!markerTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  wrapper.addEventListener("click", (e) => {
    if (!markerTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const range = foldRangeAt(editor, e);
    if (!range) return;
    const lineText = editor.getLine(range.from.line);
    const startCh = lineText.length - lineText.trimStart().length;
    editor.setSelection(
      { line: range.from.line, ch: startCh },
      { line: range.to.line, ch: range.to.ch + 1 }
    );
    editor.focus();
  }, true);

  wrapper.addEventListener("dblclick", (e) => {
    if (!markerTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const range = foldRangeAt(editor, e);
    if (range) editor.foldCode(range.from, null, "unfold");
  }, true);
}
