// Runs inside the offscreen document the service worker creates once after
// install/update: extension pages can still read the pre-0.19 localStorage
// options that the MV3 service worker cannot.
import { migrateLegacyOptions } from "./json-viewer/migrate-legacy.js";

migrateLegacyOptions()
  .catch(() => {})
  .finally(() => {
    chrome.runtime.sendMessage({ action: "migration-done" }).catch(() => {});
  });
