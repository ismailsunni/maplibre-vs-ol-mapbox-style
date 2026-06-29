// A handful of Swiss cities, used as the GeoJSON source for every example.
// Coordinates are [lng, lat] (EPSG:4326), which is what both MapLibre GL and
// ol-mapbox-style expect for a "geojson" source.
export const cities = {
  type: "FeatureCollection",
  features: [
    feature("Zürich", 8.5417, 47.3769),
    feature("Bern", 7.4474, 46.9479),
    feature("Genève", 6.1432, 46.2044),
    feature("Basel", 7.5886, 47.5596),
    feature("Lausanne", 6.6323, 46.5197),
    feature("Lugano", 8.9511, 46.0037),
    feature("Luzern", 8.3093, 47.0502),
    feature("St. Gallen", 9.3767, 47.4245),
  ],
};

function feature(name, lng, lat) {
  return {
    type: "Feature",
    properties: { name },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}
