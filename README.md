# MapLibre GL vs OpenLayers (ol-mapbox-style)

A tiny side-by-side harness that feeds the **exact same MapLibre GL style object**
to two renderers:

- **MapLibre GL JS** — the reference/native renderer for the Mapbox/MapLibre style
  spec.
- **OpenLayers + [ol-mapbox-style](https://github.com/openlayers/ol-mapbox-style)** —
  which interprets the same style spec on top of OpenLayers.

The point is to make it obvious **where the two renderers disagree on an identical
style** — most notably around **label / `symbol` rendering**.

**Live demo:** <https://ismailsunni.github.io/maplibre-vs-ol-mapbox-style/>

## Why this exists

In the SWISSGEO web portal we convert geoadmin's proprietary "literals" GeoJSON
styles into standard MapLibre styles and render them through OpenLayers via
`ol-mapbox-style`. Because OpenLayers is the actual renderer (not MapLibre GL),
some style constructs behave differently than they would in a native MapLibre map.
This repo isolates those differences in the smallest possible reproduction.

## Run it

```sh
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Then open the printed `http://localhost:5173` URL and switch between the examples.

## The examples

| Example | MapLibre GL JS | OpenLayers + ol-mapbox-style |
|---|---|---|
| **Labels with NO glyphs URL** | Dots only — **no labels** (errors: it needs a glyph source) | Dots **and** labels (uses the browser's fonts) |
| **Labels WITH a glyphs URL** | Labels via downloaded SDF glyphs (Open Sans) | Labels via a substituted local font — typeface/halo/offset differ |
| **Label background box (`icon-text-fit`)** | Filled box behind each label (icon stretched to the text) | Labels with **no background** — `icon-text-fit` is parsed but not applied |
| **Dots only (control)** | Identical | Identical |

### The headline difference: `glyphs`

MapLibre GL **cannot render any `text-field` without a `glyphs` endpoint** — text is
rasterised from signed-distance-field glyph PBFs that must be fetched from a URL
declared in the style (`"glyphs": "…/{fontstack}/{range}.pbf"`). Omit it and the
labels silently disappear (with an error on the map's `error` event).

`ol-mapbox-style` does **not** use glyph PBFs at all. It maps `text-field` onto an
OpenLayers `Text` style and draws it with the **browser's own fonts**, so labels
render with or without a `glyphs` URL.

So the *same* style produces **labels in one renderer and nothing in the other** —
which is the kind of mismatch you hit when validating a converted style against a
native MapLibre preview.

### The other difference: `icon-text-fit` (label backgrounds)

The Mapbox/MapLibre spec has **no `text-background-*` paint property**. The
standard way to draw a filled box behind a label is an `icon-image` stretched to
the text with `icon-text-fit: "both"`. MapLibre GL applies it; `ol-mapbox-style`
parses `icon-text-fit` in its embedded spec but has **no code that applies it**
(and never sets OpenLayers' `Text` `backgroundFill`), so labels render with no
background box at all.

## How it's wired

`src/styles/examples.js` builds each style object **once**; `src/main.js` hands that
same object to both `new maplibregl.Map({ style })` and `apply('ol', style)`. No
per-renderer tweaking — any difference you see is the renderer, not the input.

**Show MapLibre style** opens an editable JSON editor (CodeMirror — line numbers,
folding, syntax highlight). Tweak the style and hit **Update rendering** to re-render
both maps from your edits, or **Reset** to restore the example. The same edited object
goes to both renderers, so it stays an apples-to-apples comparison.

## Versions

Pinned to match the SWISSGEO portal: `ol@^10.9.0`, `ol-mapbox-style@^13.4.1`,
`maplibre-gl@^5.6.0`.
