import "maplibre-gl/dist/maplibre-gl.css";
import "ol/ol.css";
import "./style.css";

import maplibregl from "maplibre-gl";
import { apply } from "ol-mapbox-style";

import { examples } from "./styles/examples.js";

const selectEl = document.getElementById("example");
const descriptionEl = document.getElementById("description");
const mlStatusEl = document.getElementById("maplibre-status");
const olStatusEl = document.getElementById("ol-status");
const toggleStyleEl = document.getElementById("toggle-style");
const styleJsonEl = document.getElementById("style-json");

// Keep references so we can tear the maps down before rebuilding them.
let mlMap;
let olMap;

// The exact style object currently fed to both renderers — shown by the
// "Show MapLibre style" button so it's clear both get identical input.
let currentStyle;

function syncStyleViewer() {
  styleJsonEl.textContent = currentStyle
    ? JSON.stringify(currentStyle, null, 2)
    : "";
}

toggleStyleEl.addEventListener("click", () => {
  const hidden = styleJsonEl.hidden;
  styleJsonEl.hidden = !hidden;
  toggleStyleEl.textContent = hidden ? "Hide MapLibre style" : "Show MapLibre style";
});

function status(el, lines) {
  el.textContent = lines.filter(Boolean).join("\n");
}

function destroyMaps() {
  if (mlMap) {
    mlMap.remove();
    mlMap = undefined;
  }
  if (olMap) {
    // ol-mapbox-style returns a real OL Map; detaching the target disposes it.
    olMap.setTarget(undefined);
    olMap = undefined;
  }
}

async function render(example) {
  destroyMaps();
  descriptionEl.textContent = example.description;

  // IMPORTANT: build the style ONCE and feed the very same object to both
  // renderers, so any difference is purely the renderer, not the input.
  const style = example.style();
  currentStyle = style;
  syncStyleViewer();

  // --- MapLibre GL JS (native) ---------------------------------------------
  status(mlStatusEl, ["loading…"]);
  try {
    mlMap = new maplibregl.Map({
      container: "maplibre",
      style,
      center: style.center,
      zoom: style.zoom,
      attributionControl: false,
    });
    // The "text-background" example references icon-image "label-bg" so MapLibre
    // can size a filled box to each label via icon-text-fit. The spec has no
    // text-background paint, so we supply a tiny solid image here and let MapLibre
    // stretch it. ol-mapbox-style has no icon-text-fit support, so it can't.
    mlMap.on("styleimagemissing", (e) => {
      if (e.id !== "label-bg" || mlMap.hasImage(e.id)) return;
      const w = 8;
      const h = 8;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        data[i * 4 + 0] = 255; // R  #ffe28a, slightly translucent
        data[i * 4 + 1] = 226; // G
        data[i * 4 + 2] = 138; // B
        data[i * 4 + 3] = 235; // A
      }
      mlMap.addImage(e.id, { width: w, height: h, data });
    });
    const errors = [];
    mlMap.on("error", (e) => {
      // The "no glyphs" example trips this: MapLibre needs a glyph source to
      // render any text-field.
      errors.push(e.error?.message ?? String(e.error ?? e));
      status(mlStatusEl, ["⚠ errors:", ...errors]);
    });
    mlMap.on("load", () => {
      if (!errors.length) {
        status(mlStatusEl, ["✓ loaded — " + describeLayers(style)]);
      }
    });
  } catch (err) {
    status(mlStatusEl, ["✗ failed: " + (err?.message ?? err)]);
  }

  // --- OpenLayers + ol-mapbox-style ----------------------------------------
  status(olStatusEl, ["loading…"]);
  try {
    // apply() builds an OL Map from the gl style (sources + layers + view).
    olMap = await apply("ol", style);
    status(olStatusEl, ["✓ loaded — " + describeLayers(style)]);
  } catch (err) {
    status(olStatusEl, ["✗ failed: " + (err?.message ?? err)]);
  }
}

function describeLayers(style) {
  const types = style.layers
    .filter((l) => l.type !== "background")
    .map((l) => l.type);
  return `${types.length} layer(s): ${types.join(", ")}`;
}

// Show the installed renderer versions (injected by Vite — see vite.config.js).
document.getElementById("ml-ver").textContent = `v${__MAPLIBRE_VERSION__}`;
document.getElementById("ol-ver").textContent =
  `ol v${__OL_VERSION__} · ol-mapbox-style v${__OLMS_VERSION__}`;

// Populate the example picker.
for (const example of examples) {
  const opt = document.createElement("option");
  opt.value = example.id;
  opt.textContent = example.title;
  selectEl.appendChild(opt);
}

selectEl.addEventListener("change", () => {
  const example = examples.find((e) => e.id === selectEl.value);
  if (example) {
    render(example);
  }
});

// First paint.
render(examples[0]);
