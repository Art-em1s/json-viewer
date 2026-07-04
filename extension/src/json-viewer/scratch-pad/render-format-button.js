import svgFormat from "./svg-format.js";

export default function renderFormatButton(onFormatClick) {
  const extras = document.getElementsByClassName("extras")[0];

  const formatLink = document.createElement("a");
  formatLink.className = "json_viewer icon format";
  formatLink.href = "#";
  formatLink.title = "Format (ctrl+shift+F / command+shift+F)";
  formatLink.innerHTML = svgFormat;
  formatLink.onclick = (e) => {
    e.preventDefault();
    onFormatClick();
  };

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      onFormatClick();
    }
  });

  extras.appendChild(formatLink);
}
