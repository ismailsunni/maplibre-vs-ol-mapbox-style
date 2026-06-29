import { cities } from "../data.js";

// Shared view, so both maps start framed identically.
const CENTER = [7.7, 46.8];
const ZOOM = 6.6;

// MapLibre's free demo glyph endpoint (no API key). ol-mapbox-style ignores this
// and renders text with the browser's own fonts instead — which is exactly one of
// the differences these examples surface.
const DEMO_GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const base = (layers, extra = {}) => ({
  version: 8,
  center: CENTER,
  zoom: ZOOM,
  sources: {
    cities: { type: "geojson", data: cities },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#eaf2ea" },
    },
    ...layers,
  ],
  ...extra,
});

const dots = {
  id: "city-dots",
  type: "circle",
  source: "cities",
  paint: {
    "circle-radius": 6,
    "circle-color": "#1d3557",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

const labelLayer = (overrides = {}) => ({
  id: "city-labels",
  type: "symbol",
  source: "cities",
  layout: {
    "text-field": ["get", "name"],
    "text-size": 15,
    "text-anchor": "top",
    "text-offset": [0, 0.8],
    "text-allow-overlap": true,
    ...overrides.layout,
  },
  paint: {
    "text-color": "#c1121f",
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.5,
    ...overrides.paint,
  },
});

export const examples = [
  {
    id: "no-glyphs",
    title: "Labels with NO glyphs URL",
    description:
      "A symbol layer with a text-field, but the style declares no `glyphs` endpoint. " +
      "MapLibre GL cannot rasterise text without a glyph source, so it renders the dots " +
      "but NO labels (watch the status box for its error). ol-mapbox-style renders text " +
      "with the browser's own fonts, so the labels appear. Same style, opposite result — " +
      "this is the labelling divergence in a nutshell.",
    style: () => base([dots, labelLayer()]),
  },
  // Temporarily hidden — re-enable to show the "labels WITH a glyphs URL" case.
  // {
  //   id: "with-glyphs",
  //   title: "Labels WITH a glyphs URL",
  //   description:
  //     "The same style, now with MapLibre's demo `glyphs` endpoint and text-font " +
  //     "\"Open Sans Regular\". Both renderers now show labels — but compare them: MapLibre " +
  //     "uses the downloaded SDF glyphs (Open Sans), while ol-mapbox-style substitutes a " +
  //     "local browser font, so typeface, halo and offset rendering differ. (Needs network " +
  //     "for the glyph PBFs.)",
  //   style: () =>
  //     base([dots, labelLayer({ layout: { "text-font": ["Open Sans Regular"] } })], {
  //       glyphs: DEMO_GLYPHS,
  //     }),
  // },
  {
    id: "text-background",
    title: "Label background box (icon-text-fit)",
    description:
      "The Mapbox/MapLibre spec has no `text-background-*` paint property — the way to " +
      "draw a filled box behind a label is an `icon-image` sized to the text with " +
      "`icon-text-fit: \"both\"` (+ `icon-text-fit-padding`). Here the background image " +
      "is registered on the MapLibre map (see `styleimagemissing` in main.js), so MapLibre " +
      "stretches it to wrap each label. ol-mapbox-style parses `icon-text-fit` in its spec " +
      "but has NO code that applies it (and never sets OpenLayers' Text `backgroundFill`), " +
      "so the labels appear with no background box at all — the divergence we hit in the " +
      "portal. (Uses the demo `glyphs` endpoint so MapLibre can rasterise the text the box " +
      "wraps — needs network.)",
    style: () =>
      base(
        [
          dots,
          {
            id: "city-label-bg",
            type: "symbol",
            source: "cities",
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 15,
              "text-anchor": "top",
              "text-offset": [0, 0.8],
              "text-allow-overlap": true,
              "icon-allow-overlap": true,
              // "label-bg" is provided to MapLibre via the styleimagemissing
              // handler in main.js; ol-mapbox-style ignores icon-text-fit entirely.
              "icon-image": "label-bg",
              "icon-text-fit": "both",
              "icon-text-fit-padding": [3, 6, 3, 6],
            },
            paint: {
              "text-color": "#1d3557",
            },
          },
        ],
        { glyphs: DEMO_GLYPHS },
      ),
  },
  {
    id: "dots-only",
    title: "Dots only (control)",
    description:
      "No labels at all — just the circle layer. Both renderers agree here, which confirms " +
      "the divergence in the other examples is specific to text/symbol rendering, not the " +
      "geometry or the source.",
    style: () => base([dots]),
  },
];
