export default function renderStructure(CodeMirror, value) {
  const structureInput = document.getElementById("structure");
  structureInput.value = JSON.stringify(value, null, 2);

  return CodeMirror.fromTextArea(structureInput, {
    mode: "application/ld+json",
    lineWrapping: true,
    lineNumbers: true,
    tabSize: 2
  });
}
