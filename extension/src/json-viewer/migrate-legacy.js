// Versions up to 0.18.x (Manifest V2) kept options in the extension origin's
// localStorage under "v2.options", with the addons/structure sections stored
// as nested JSON strings. The MV3 service worker has no localStorage, but
// extension pages (options, omnibox) still see the old data, so they migrate
// it into chrome.storage.local on load.
export async function migrateLegacyOptions() {
  let legacy = null;
  try {
    legacy = localStorage.getItem("v2.options");
  } catch {
    return;
  }
  if (!legacy) return;

  const existing = await chrome.storage.local.get("options");
  if (!existing.options) {
    try {
      const old = JSON.parse(legacy) || {};
      const addons = typeof old.addons === "string" ? JSON.parse(old.addons) : old.addons || {};
      const structure = typeof old.structure === "string" ? JSON.parse(old.structure) : old.structure || {};

      // "awaysFold"/"awaysRenderAllContent" were long-supported typos
      for (const [typo, fixed] of [["awaysFold", "alwaysFold"], ["awaysRenderAllContent", "alwaysRenderAllContent"]]) {
        if (typo in addons) {
          if (!(fixed in addons)) addons[fixed] = addons[typo];
          delete addons[typo];
        }
      }

      await chrome.storage.local.set({
        options: { theme: old.theme, addons, structure, style: old.style }
      });
    } catch {
      // Corrupted legacy options; the defaults take over
    }
  }

  localStorage.removeItem("v2.options");
  localStorage.removeItem("options");
}
