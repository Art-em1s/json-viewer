import svgGear from "./svg-gear.js";
import svgRaw from "./svg-raw.js";
import svgUnfold from "./svg-unfold.js";

export default function renderExtras(pre, options, highlighter) {
  const extras = document.createElement("div");
  extras.className = "extras";

  if (!options.addons.autoHighlight) {
    extras.classList.add("auto-highlight-off");
  }

  const optionsLink = document.createElement("a");
  optionsLink.className = "json_viewer icon gear";
  optionsLink.href = "#";
  optionsLink.title = "Options";
  optionsLink.innerHTML = svgGear;
  optionsLink.onclick = (e) => {
    e.preventDefault();
    try {
      chrome.runtime.sendMessage({ action: "open-options" }).catch(() => {});
    } catch {
      // orphaned content script after an extension update; reload to reconnect
    }
  };

  const rawLink = document.createElement("a");
  rawLink.className = "json_viewer icon raw";
  rawLink.href = "#";
  rawLink.title = "Original JSON toggle";
  rawLink.innerHTML = svgRaw;
  rawLink.onclick = (e) => {
    e.preventDefault();
    if (pre.hidden) {
      highlighter.hide();
      pre.hidden = false;
      extras.classList.add("auto-highlight-off");
    } else {
      highlighter.show();
      pre.hidden = true;
      extras.classList.remove("auto-highlight-off");
    }
  };

  const unfoldLink = document.createElement("a");
  unfoldLink.className = "json_viewer icon unfold";
  unfoldLink.href = "#";
  unfoldLink.title = "Fold/Unfold all toggle";
  unfoldLink.innerHTML = svgUnfold;
  unfoldLink.onclick = (e) => {
    e.preventDefault();
    if (pre.getAttribute("data-folded") === "true") {
      highlighter.unfoldAll();
      pre.setAttribute("data-folded", "false");
    } else {
      highlighter.fold();
      pre.setAttribute("data-folded", "true");
    }
  };

  pre.setAttribute("data-folded", String(!!(options.addons.alwaysFold || options.addons.awaysFold)));

  extras.append(optionsLink, rawLink, unfoldLink);
  document.body.appendChild(extras);
}
