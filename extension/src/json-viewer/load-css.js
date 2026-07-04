export function loadCss(path, id) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL(path);
    if (id) link.id = id;
    link.onload = () => resolve(link);
    link.onerror = () => {
      link.remove();
      reject(new Error(`[JSONViewer] failed to load css: ${path}`));
    };
    document.head.appendChild(link);
  });
}
