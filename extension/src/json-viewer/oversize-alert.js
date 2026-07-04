import renderAlert from "./render-alert.js";

// Warns that the document exceeds addons.maxJsonSize, with a link to
// highlight it anyway (via the supplied callback).
export default async function renderOversizeAlert(pre, options, onHighlightAnyway) {
  const container = document.createElement("div");

  const message = document.createElement("div");
  message.textContent =
    `[JSONViewer] Not highlighted: the document is ${Math.ceil(pre.textContent.length / 1024)} KB, ` +
    `above the ${options.addons.maxJsonSize} KB limit (Options → Add-ons → maxJsonSize).`;
  container.appendChild(message);

  const highlightAnyway = document.createElement("a");
  highlightAnyway.href = "#";
  highlightAnyway.title = "Highlight anyway!";
  highlightAnyway.textContent = "Highlight anyway!";
  container.appendChild(highlightAnyway);

  const alert = await renderAlert(container);
  highlightAnyway.onclick = (e) => {
    e.preventDefault();
    alert.remove();
    onHighlightAnyway();
  };
}
