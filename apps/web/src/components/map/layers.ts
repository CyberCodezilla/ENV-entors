export const PILOT_ZONE_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.82, 19.1],
            [72.87, 19.1],
            [72.87, 19.145],
            [72.82, 19.145],
            [72.82, 19.1],
          ],
        ],
      },
      properties: {
        title: 'PILOT ZONE — ANDHERI WEST / VERSOVA',
      },
    },
  ],
};

export const PILOT_ZONE_LAYERS = {
  fill: {
    id: 'pilot-zone-fill',
    type: 'fill' as const,
    source: 'pilot-zone-source',
    paint: {
      'fill-color': '#2DD4BF',
      'fill-opacity': 0.04,
    },
  },
  line: {
    id: 'pilot-zone-line',
    type: 'line' as const,
    source: 'pilot-zone-source',
    paint: {
      'line-color': '#2DD4BF',
      'line-width': 1.5,
      'line-opacity': 0.45,
      'line-dasharray': [4, 3],
    },
  },
};