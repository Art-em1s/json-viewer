import { loadCss } from "../load-css.js";
import themeDarkness from "../theme-darkness.js";

const themesList = __THEMES__;
const themeJSONExample = {
  title: "JSON Example",
  nested: {
    someInteger: 7,
    someBoolean: true,
    someArray: [
      "list of",
      "fake strings",
      "and fake keys"
    ]
  }
};

function onThemeChange(themesInput, editor) {
  const selectedTheme = themesInput.value;
  // Underscore marks a theme variation (e.g. solarized_dark -> "solarized dark")
  const themeOption = selectedTheme.replace(/_/, " ");

  document.getElementById("selected-theme")?.remove();

  if (selectedTheme === "default") {
    editor.setOption("theme", themeOption);
    return;
  }

  loadCss(`themes/${themeDarkness(selectedTheme)}/${selectedTheme}.css`, "selected-theme")
    .then(() => editor.setOption("theme", themeOption))
    .catch(() => {});
}

function createOption(theme, optionSelected) {
  const option = document.createElement("option");
  option.value = theme;
  option.text = theme;
  if (theme === optionSelected) option.selected = true;
  return option;
}

function createThemeGroup(label, list, optionSelected) {
  const group = document.createElement("optgroup");
  group.label = label;
  for (const theme of list) {
    group.appendChild(createOption(theme, optionSelected));
  }
  return group;
}

export default function renderThemeList(CodeMirror, selected) {
  const themesInput = document.getElementById("themes");
  const themesExampleInput = document.getElementById("themes-example");
  themesExampleInput.value = JSON.stringify(themeJSONExample, null, 2);

  const themeEditor = CodeMirror.fromTextArea(themesExampleInput, {
    readOnly: true,
    mode: "application/ld+json",
    lineWrapping: true,
    lineNumbers: true,
    tabSize: 2,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
  });

  themesInput.onchange = () => onThemeChange(themesInput, themeEditor);

  themesInput.appendChild(createOption("default", selected));
  if (themesList.light.length > 0) {
    themesInput.appendChild(createThemeGroup("Light", themesList.light, selected));
  }
  if (themesList.dark.length > 0) {
    themesInput.appendChild(createThemeGroup("Dark", themesList.dark, selected));
  }

  if (selected && selected !== "default") {
    onThemeChange(themesInput, themeEditor);
  }
}
