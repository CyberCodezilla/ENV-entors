import type { Style } from 'mapbox-gl';

export const CARTO_DARK_STYLE: Style = {
  version: 8,
  sources: {
    'carto-dark-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark-tiles',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

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
        title: 'PILOT ZONE - ANDHERI WEST / VERSOVA',
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
