// Chrome extension messages hard-fail around 64MB; stay well below it
const EXPOSE_SIZE_LIMIT = 32 * 1024 * 1024;

// Makes the parsed document available as window.json. Content scripts live
// in an isolated world, so the page-world assignment is delegated to the
// service worker, which injects into the MAIN world via chrome.scripting
// (immune to the page's CSP, unlike the old inline-<script> approach).
export default function exposeJson(decoded, insidePage) {
  if (decoded.length > EXPOSE_SIZE_LIMIT) {
    console.info("[JSONViewer] window.json skipped: the document is too large to transfer");
    return;
  }
  if (insidePage) {
    try {
      chrome.runtime.sendMessage({ action: "expose-json", json: decoded }).catch(() => {});
    } catch {
      return;
    }
  } else {
    try {
      window.json = JSON.parse(decoded);
    } catch {
      return;
    }
  }
  console.info("[JSONViewer] The parsed document is available as window.json");
}
