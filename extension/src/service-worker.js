// Options saved by pre-0.19 (MV2) versions live in the extension origin's
// localStorage, which a service worker cannot read — an offscreen document
// (see pages/migrate.html) copies them into chrome.storage.local once.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install" && reason !== "update") return;
  const { options } = await chrome.storage.local.get("options");
  if (options) return;
  try {
    await chrome.offscreen.createDocument({
      url: "pages/migrate.html",
      reasons: ["LOCAL_STORAGE"],
      justification: "Migrate pre-0.19 options from extension localStorage to chrome.storage.local"
    });
  } catch {
    // an offscreen document already exists
  }
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request?.action === "migration-done") {
    chrome.offscreen.closeDocument().catch(() => {});
  } else if (request?.action === "expose-json" && typeof request.json === "string" && sender.tab?.id != null) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: "MAIN",
      func: (raw) => {
        try {
          window.json = JSON.parse(raw);
        } catch {
          // lenient documents (e.g. leading-zero numbers) are shown but not exposed
        }
      },
      args: [request.json]
    }).catch(() => {
      // no host permission for this page (e.g. the Chrome Web Store)
    });
  } else if (request?.action === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([
    {
      content: "Format JSON",
      description: "(Format JSON) Open a page with json highlighted"
    },
    {
      content: "Scratch pad",
      description: "(Scratch pad) Area to write and format/highlight JSON"
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener((text) => {
  const page = chrome.runtime.getURL("pages/omnibox.html");
  const url = /scratch pad/i.test(text)
    ? `${page}?scratch-page=true`
    : `${page}?json=${encodeURIComponent(text)}`;
  chrome.tabs.update({ url });
});
