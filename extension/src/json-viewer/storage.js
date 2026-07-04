import defaults from "./defaults.js";

const KEY = "options";

export async function loadOptions() {
  const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
  return {
    theme: stored.theme || defaults.theme,
    addons: { ...defaults.addons, ...stored.addons },
    structure: { ...defaults.structure, ...stored.structure },
    style: typeof stored.style === "string" && stored.style.length > 0
      ? stored.style
      : defaults.style
  };
}

export function saveOptions(options) {
  return chrome.storage.local.set({ [KEY]: options });
}
