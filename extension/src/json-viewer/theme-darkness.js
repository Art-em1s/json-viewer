// __THEMES__ is injected at build time from the extension/themes directory
const themes = __THEMES__;

export default function themeDarkness(name) {
  return themes.dark.includes(name) ? "dark" : "light";
}
