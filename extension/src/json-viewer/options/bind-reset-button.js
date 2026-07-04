import defaults from "../defaults.js";
import { saveOptions } from "../storage.js";

export default function bindResetButton() {
  document.getElementById("reset").onclick = async (e) => {
    e.preventDefault();

    if (!confirm("Reset to defaults? You will not be able to recover your custom settings.")) {
      return;
    }

    await saveOptions({
      theme: defaults.theme,
      addons: defaults.addons,
      structure: defaults.structure,
      style: defaults.style
    });
    document.location.reload();
  };
}
