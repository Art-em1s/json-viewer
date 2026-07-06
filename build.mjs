import { build, transform } from "esbuild";
import { compile } from "sass";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const prod = process.env.NODE_ENV === "production";
const SRC = "extension";
const OUT = "build/json_viewer";
const CM = "node_modules/codemirror";

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));

fs.rmSync("build", { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

// ---------- themes ----------
// Convention: extension/themes/<darkness>/<name>/ contains an optional
// <name>.theme.css (full custom theme) and any number of .scss overrides.
// Without a .theme.css, the stock CodeMirror theme css is used — looked up
// by name, then by the name's prefix before "_" (solarized_dark -> solarized).
function themeNames(darkness) {
  const dir = path.join(SRC, "themes", darkness);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function buildThemeCss(darkness, name) {
  const dir = path.join(SRC, "themes", darkness, name);
  const files = fs.readdirSync(dir).sort();
  const parts = [];

  const customCss = files.find((f) => f.endsWith(".theme.css"));
  if (customCss) {
    parts.push(fs.readFileSync(path.join(dir, customCss), "utf8"));
  } else {
    const stock = [name, name.split("_")[0]]
      .map((n) => path.join(CM, "theme", `${n}.css`))
      .find((p) => fs.existsSync(p));
    if (!stock) throw new Error(`No CodeMirror theme css found for "${name}"`);
    parts.push(fs.readFileSync(stock, "utf8"));
  }

  for (const scss of files.filter((f) => f.endsWith(".scss"))) {
    parts.push(compile(path.join(dir, scss)).css);
  }

  return parts.join("\n");
}

async function writeCss(outPath, css) {
  if (prod) css = (await transform(css, { loader: "css", minify: true })).code;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, css);
}

const themes = { light: themeNames("light"), dark: themeNames("dark") };
for (const darkness of ["light", "dark"]) {
  for (const name of themes[darkness]) {
    await writeCss(
      path.join(OUT, "themes", darkness, `${name}.css`),
      buildThemeCss(darkness, name)
    );
  }
}

// ---------- page/viewer css ----------
const cmCss = (p) => fs.readFileSync(path.join(CM, p), "utf8");
const scss = (p) => compile(path.join(SRC, "styles", p)).css;

await writeCss(path.join(OUT, "assets", "viewer.css"), [
  cmCss("lib/codemirror.css"),
  cmCss("addon/fold/foldgutter.css"),
  cmCss("addon/dialog/dialog.css"),
  cmCss("addon/search/matchesonscrollbar.css"),
  scss("default-theme.scss"),
  scss("viewer-custom.scss"),
  scss("editor-custom.scss")
].join("\n"));

await writeCss(path.join(OUT, "assets", "viewer-alert.css"), scss("viewer-alert.scss"));

await writeCss(path.join(OUT, "assets", "options.css"), [
  cmCss("lib/codemirror.css"),
  cmCss("addon/fold/foldgutter.css"),
  cmCss("addon/hint/show-hint.css"),
  scss("default-theme.scss"),
  scss("editor-custom.scss"),
  scss("options-custom.scss")
].join("\n"));

// ---------- javascript ----------
const common = {
  bundle: true,
  minify: prod,
  target: "chrome114",
  outdir: path.join(OUT, "assets"),
  define: { __THEMES__: JSON.stringify(themes) },
  legalComments: "none",
  logLevel: "warning"
};

await build({
  ...common,
  format: "iife",
  entryPoints: [
    path.join(SRC, "src", "detector.js"),
    path.join(SRC, "src", "service-worker.js"),
    path.join(SRC, "src", "options.js"),
    path.join(SRC, "src", "omnibox-page.js"),
    path.join(SRC, "src", "migrate-page.js")
  ]
});

// The viewer is dynamically import()ed by the detector, so it must be ESM
await build({
  ...common,
  format: "esm",
  entryPoints: [path.join(SRC, "src", "viewer.js")]
});

// The codemirror markdown mode has a known ReDoS (CVE-2025-6493); this build
// never imports it — fail loudly if it ever sneaks into a bundle.
for (const bundle of fs.readdirSync(path.join(OUT, "assets")).filter((f) => f.endsWith(".js"))) {
  const content = fs.readFileSync(path.join(OUT, "assets", bundle), "utf8");
  if (content.includes('defineMode("markdown"')) {
    throw new Error(`${bundle} unexpectedly bundles the codemirror markdown mode`);
  }
}

// ---------- static files + manifest ----------
fs.cpSync(path.join(SRC, "icons"), path.join(OUT, "icons"), { recursive: true });
fs.cpSync(path.join(SRC, "pages"), path.join(OUT, "pages"), { recursive: true });

if (!prod) manifest.name += " - dev";
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

// ---------- report ----------
const sizeOf = (p) => `${(fs.statSync(p).size / 1024).toFixed(1)} KB`;
console.log(`json-viewer ${manifest.version} (${prod ? "production" : "development"})`);
for (const f of fs.readdirSync(path.join(OUT, "assets")).sort()) {
  console.log(`  assets/${f}  ${sizeOf(path.join(OUT, "assets", f))}`);
}
console.log(`  themes: ${themes.light.length} light, ${themes.dark.length} dark`);

if (prod) {
  // manifest.json must sit at the zip root for the Chrome Web Store
  const zipName = `json_viewer-${manifest.version}.zip`;
  try {
    execFileSync("zip", ["-qr", path.join("..", zipName), "."], { cwd: OUT });
    console.log(`  release: build/${zipName}`);
  } catch {
    console.log("  release: `zip` not available — package the contents of build/json_viewer manually");
  }
}
