import { cities } from "../data.js";

// Shared view, so both maps start framed identically.
const CENTER = [7.7, 46.8];
const ZOOM = 6.6;

// MapLibre's free demo glyph endpoint (no API key). ol-mapbox-style ignores this
// and renders text with the browser's own fonts instead — which is exactly one of
// the differences these examples surface.
const DEMO_GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

// A self-contained sprite (public/sprite.*) holding a single white box icon,
// used as a label background via icon-text-fit. MapLibre requires the sprite URL
// to be absolute, so resolve BASE_URL (dev "/", Pages "/<repo>/") against the
// current origin. Both renderers load it; only MapLibre stretches it to the text.
const SPRITE = new URL(
  import.meta.env.BASE_URL + "sprite",
  window.location.origin,
).href;

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
  // Temporarily hidden — re-enable to show the "labels with NO glyphs URL" case.
  // {
  //   id: "no-glyphs",
  //   title: "Labels with NO glyphs URL",
  //   description:
  //     "A symbol layer with a text-field, but the style declares no `glyphs` endpoint. " +
  //     "MapLibre GL cannot rasterise text without a glyph source, so it renders the dots " +
  //     "but NO labels (watch the status box for its error). ol-mapbox-style renders text " +
  //     "with the browser's own fonts, so the labels appear. Same style, opposite result — " +
  //     "this is the labelling divergence in a nutshell.",
  //   style: () => base([dots, labelLayer()]),
  // },
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
    title: "Label background box",
    description:
      "Filled box behind each label, fitted to the text in BOTH renderers — but via " +
      "different mechanisms, because there's no single style property for it. MapLibre: a " +
      "rounded `icon-image` from an external `sprite`, stretched with `icon-text-fit: " +
      "\"both\"` (pure style). OpenLayers: ol-mapbox-style honours neither `icon-text-fit` " +
      "nor a text background, so a small generic app step (src/olTextBackground.js) reads " +
      "`metadata[\"ol:text-background\"]` off the layer and applies OpenLayers' native Text " +
      "`backgroundFill` after apply() — driven entirely by the style, working for any " +
      "layer. That post-apply step is the recipe for label backgrounds in the SWISSGEO " +
      "portal. (MapLibre corners are rounded; OL's box is rectangular. Needs network for " +
      "the demo `glyphs` PBFs.)",
    style: () =>
      base(
        [
          dots,
          {
            id: "city-label-bg",
            type: "symbol",
            source: "cities",
            // Read by the OpenLayers side (see src/olTextBackground.js): ol-mapbox-style
            // can't draw a fitted label box, so this declares one for OL to apply
            // natively after apply(). MapLibre ignores `metadata` and uses the sprite.
            metadata: {
              "ol:text-background": {
                // Real geoadmin label background (fill only, no border).
                fill: "rgba(14, 80, 114, 0.9)",
                padding: [3, 6, 3, 6],
                hideIcon: true,
              },
            },
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 15,
              // Sit the label (and its box) above the point.
              "text-anchor": "bottom",
              "text-offset": [0, -0.6],
              "text-allow-overlap": true,
              "icon-allow-overlap": true,
              // The rounded blue box from the sprite, stretched to the text by
              // icon-text-fit (MapLibre only — ol-mapbox-style ignores the fit).
              "icon-image": "label-bg",
              "icon-text-fit": "both",
              "icon-text-fit-padding": [3, 6, 3, 6],
            },
            paint: {
              "text-color": "#ffffff",
            },
          },
        ],
        { glyphs: DEMO_GLYPHS, sprite: SPRITE },
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
