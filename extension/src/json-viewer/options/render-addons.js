export default function renderAddons(CodeMirror, value) {
  const addonsInput = document.getElementById("addons");
  addonsInput.value = JSON.stringify(value, null, 2);

  return CodeMirror.fromTextArea(addonsInput, {
    mode: "application/ld+json",
    lineWrapping: true,
    lineNumbers: true,
    tabSize: 2
  });
}
