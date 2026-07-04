let timer = null;

export default function showToast(message, kind) {
  let toast = document.querySelector(".jv-toast");
  if (!toast) {
    toast = document.createElement("div");
    document.body.appendChild(toast);
  }
  toast.className = `jv-toast ${kind} visible`;
  toast.textContent = message;

  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.remove("visible"), 2600);
}
