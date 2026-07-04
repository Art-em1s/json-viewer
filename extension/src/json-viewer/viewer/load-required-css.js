import { loadCss } from "../load-css.js";
import themeDarkness from "../theme-darkness.js";

export default async function loadRequiredCss(options) {
  const loaders = [loadCss("assets/viewer.css")];

  const theme = options.theme;
  if (theme && theme !== "default") {
    // A missing theme file should not prevent highlighting
    loaders.push(loadCss(`themes/${themeDarkness(theme)}/${theme}.css`).catch(() => {}));
  }

  await Promise.all(loaders);

  const style = document.createElement("style");
  style.textContent = options.style;
  document.head.appendChild(style);
}
