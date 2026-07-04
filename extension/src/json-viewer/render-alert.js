import { loadCss } from "./load-css.js";

export default async function renderAlert(content) {
  const alertContainer = document.createElement("div");
  alertContainer.className = "json-viewer-alert";
  alertContainer.appendChild(content);

  const closeBtn = document.createElement("a");
  closeBtn.className = "close";
  closeBtn.href = "#";
  closeBtn.title = "Close";
  closeBtn.textContent = "×";
  closeBtn.onclick = (e) => {
    e.preventDefault();
    alertContainer.remove();
  };
  alertContainer.appendChild(closeBtn);

  try {
    await loadCss("assets/viewer-alert.css");
  } catch {
    // styling failed to load; show the alert anyway
  }
  document.body.appendChild(alertContainer);
  return alertContainer;
}
