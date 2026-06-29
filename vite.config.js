import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// Read the *installed* versions so the UI shows exactly what's bundled, not the
// semver range from package.json.
const installedVersion = (name) =>
  JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version;

// GitHub Pages serves a project site under /<repo>/, so built asset URLs need
// that prefix. The dev server ignores `base` for its root, so this is safe locally.
export default defineConfig({
  base: "/maplibre-vs-ol-mapbox-style/",
  define: {
    __OLMS_VERSION__: JSON.stringify(installedVersion("ol-mapbox-style")),
    __OL_VERSION__: JSON.stringify(installedVersion("ol")),
    __MAPLIBRE_VERSION__: JSON.stringify(installedVersion("maplibre-gl")),
  },
});
