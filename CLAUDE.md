# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A tiny, framework-free **Vite** harness that renders the **exact same MapLibre GL
style object** through two renderers, side by side, to expose where they disagree:

- **MapLibre GL JS** (`maplibre-gl`) — the native/reference renderer for the
  Mapbox/MapLibre style spec.
- **OpenLayers + [ol-mapbox-style](https://github.com/openlayers/ol-mapbox-style)** —
  which interprets the same spec on top of OpenLayers.

It exists to isolate, in the smallest possible reproduction, the rendering
differences we hit in the SWISSGEO web portal, where geoadmin "literals" styles are
converted to MapLibre styles and rendered through `ol-mapbox-style` (so OpenLayers,
not MapLibre GL, is the actual renderer). The headline difference is **label /
`symbol` rendering** (e.g. MapLibre needs a `glyphs` endpoint to draw text;
ol-mapbox-style uses browser fonts and does not).

## Commands

```sh
pnpm install   # install deps (or npm install)
pnpm dev       # Vite dev server at http://localhost:5173
pnpm build     # production build to dist/
pnpm preview   # serve the production build
```

There are no tests, linters, or type-checking configured — this is a demo harness.

## Architecture

The whole point is a **single shared style object**. Do not let the two renderers
drift apart by tweaking the style per-renderer.

- `src/styles/examples.js` — builds each MapLibre style object **once**. Each
  example is `{ id, title, description, style() }`. Add new comparisons here.
- `src/main.js` — hands that same object to both `new maplibregl.Map({ style })`
  and `apply('ol', style)`. Any visible difference must be the renderer, not the
  input. Also wires the example picker and the per-map status boxes (the MapLibre
  `error` event is surfaced there — that's how the "no glyphs" case shows its
  failure).
- `src/olTextBackground.js` — generic, style-driven post-`apply()` step that gives
  symbol layers a real fitted label box on the OpenLayers side (OL's native `Text`
  `backgroundFill`), which ol-mapbox-style can't produce. Opt in per layer via
  `metadata["ol:text-background"]` in the GL style. `main.js` calls it after every
  `apply()`. This is the portal-side recipe; keep it generic (no per-example logic).
- `src/data.js` — inline GeoJSON (Swiss cities) used as the `geojson` source.
- `index.html` / `src/style.css` — two-panel layout.

### Conventions

- **Keep it dependency-light and framework-free.** Vanilla JS + Vite only. Don't
  add a UI framework, a state library, or a basemap/tile provider — examples should
  stay self-contained (inline GeoJSON, no API keys) wherever possible.
  - **Exception:** CodeMirror 6 (`codemirror`, `@codemirror/lang-json`) powers the
    editable style panel (line numbers, JSON folding/expand-shrink, syntax
    highlight). It's dev tooling for inspecting/editing the shared style, not part
    of the examples — keep that boundary.
- Coordinates in `data.js` and style `center` are **[lng, lat]** (EPSG:4326), which
  both renderers expect for a `geojson` source.
- When adding an example that needs the network (e.g. a `glyphs` PBF endpoint), say
  so in its `description` so it's clear why it might fail offline.
- Pin map deps to match the SWISSGEO portal: `ol@^10.9.0`,
  `ol-mapbox-style@^13.4.1`. Bump deliberately, not via blanket upgrades.

## Pitfalls

- **`glyphs`**: MapLibre GL renders **no** `text-field` without a `glyphs` URL in the
  style; ol-mapbox-style ignores `glyphs` and uses browser fonts. This asymmetry is
  the main thing the harness demonstrates — preserve it, don't "fix" it.
- **Label background box — different mechanism per renderer.** The spec has no
  `text-background-*` paint, and ol-mapbox-style honours neither `icon-text-fit` nor a text
  background, so the box is produced two ways:
  - **MapLibre**: `icon-image` + `icon-text-fit: "both"`, where the image is a rounded,
    coloured **9-slice sprite** in `public/` (`sprite.{json,png}` + `@2x`), supplied via the
    style's `sprite` URL. Regenerate/recolour with `node scripts/gen-sprite.cjs public` —
    there is no style property for the box colour.
  - **OpenLayers**: a real fitted box via OL's native `Text` `backgroundFill`, applied by
    `src/olTextBackground.js` after `apply()`. It's **style-driven** — the layer opts in
    with `metadata["ol:text-background"]` (fill/stroke/padding, and `hideIcon` to drop the
    MapLibre icon box) — and generic across layers. This is the portal recipe.
  - Keep the two colours in sync by hand (sprite `FILL` in `scripts/gen-sprite.cjs` vs the
    `metadata` fill); the sprite colour is baked into the PNG and can't be read at runtime.
    MapLibre corners are rounded; OL's box is rectangular (OL has no radius).
- Always tear down the previous maps before rebuilding (`map.remove()` for MapLibre,
  `map.setTarget(undefined)` for OL) when switching examples, or containers leak.
