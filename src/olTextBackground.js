import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";

// Generic, style-driven label backgrounds for the OpenLayers (ol-mapbox-style) side.
//
// ol-mapbox-style maps neither `icon-text-fit` nor any text-background property, so a
// filled box behind a label can't come from the style JSON in OpenLayers. OpenLayers'
// own `Text` style DOES support it natively (backgroundFill/backgroundStroke/padding),
// so this runs AFTER apply(): any symbol layer that wants a box declares it in the GL
// style under `metadata["ol:text-background"]`, and we apply it here. This is the
// portal-side recipe — generic across layers/styles, no per-example code.
//
// Config shape (on a symbol layer's `metadata`):
//   "ol:text-background": {
//     fill: "rgba(14,80,114,0.9)", // box fill colour (required for a visible box)
//     stroke: "#ffffff",          // optional box border colour
//     strokeWidth: 1,             // optional, defaults to 1
//     padding: [3, 6, 3, 6],      // optional [top, right, bottom, left] px
//     hideIcon: true              // drop the layer's icon (e.g. a MapLibre icon-text-fit
//   }                             // box) so only the fitted OL background shows
//
// Note: OpenLayers' text background is a rectangle (no border radius).
export function applyOlTextBackgrounds(olMap, glStyle) {
  // Collect per-GL-layer config keyed by layer id.
  const cfgById = {};
  for (const layer of glStyle.layers || []) {
    const cfg = layer.metadata && layer.metadata["ol:text-background"];
    if (cfg) cfgById[layer.id] = cfg;
  }
  if (Object.keys(cfgById).length === 0) return;

  const decorate = (olLayer) => {
    // Recurse into LayerGroups (ol-mapbox-style may nest layers).
    if (typeof olLayer.getLayers === "function") {
      olLayer.getLayers().forEach(decorate);
      return;
    }
    // Which GL layers does this OL layer render, and does one want a background?
    const ids = olLayer.get("mapbox-layers") || [];
    const cfg = ids.map((id) => cfgById[id]).find(Boolean);
    const base = olLayer.getStyleFunction?.();
    if (!cfg || !base) return;

    // Wrap the existing style function: add the background to text styles.
    olLayer.setStyle((feature, resolution) => {
      const styles = base(feature, resolution);
      const arr = Array.isArray(styles) ? styles : styles ? [styles] : [];
      for (const s of arr) {
        const text = s.getText?.();
        if (!text) continue; // circle dots / icon-only styles have no text → skipped
        // The label style carries both the (fixed-size) icon and the text; drop the
        // icon so only the fitted background box remains.
        if (cfg.hideIcon && s.getImage?.()) s.setImage(null);
        if (cfg.fill) text.setBackgroundFill(new Fill({ color: cfg.fill }));
        if (cfg.stroke) {
          text.setBackgroundStroke(
            new Stroke({ color: cfg.stroke, width: cfg.strokeWidth ?? 1 }),
          );
        }
        if (cfg.padding) text.setPadding(cfg.padding);
      }
      return styles;
    });
  };
  olMap.getLayers().forEach(decorate);
}
