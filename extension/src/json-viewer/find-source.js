let removedTextNode = null;

function allTextNodes(nodes) {
  for (const node of nodes) {
    if (node.nodeName !== "#text") return false;
  }
  return true;
}

// Finds the element holding the raw document text. Chrome renders
// application/json and text/plain responses as a single <pre> inside body;
// JSON served as text/html surfaces as bare text nodes (possibly split into
// several when the content is long), which get wrapped in a synthetic <pre>.
export function findSource() {
  const body = document.body;
  if (!body || body.childNodes.length === 0) return null;

  if (body.childNodes.length > 1 && allTextNodes(body.childNodes)) {
    body.normalize(); // concatenates adjacent text nodes
  }

  const first = body.childNodes[0];
  if (first.nodeName === "PRE") return first;

  if (first.nodeName === "#text" && first.textContent.trim().length > 0) {
    const pre = document.createElement("pre");
    pre.textContent = first.textContent;
    removedTextNode = first;
    first.remove();
    body.appendChild(pre);
    return pre;
  }

  return null;
}

// Puts the original text node back when the synthetic <pre> turns out not to
// contain JSON. No-op when the body was not modified.
export function restoreSource(pre) {
  if (!removedTextNode) return;
  document.body.insertBefore(removedTextNode, document.body.firstChild);
  pre.remove();
  removedTextNode = null;
}
