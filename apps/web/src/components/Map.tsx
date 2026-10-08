/**
 * Map — Day 3: Mapbox GL map with:
 *  - Coloured route LineLayer overlays (flood risk colour)
 *  - Selected route highlight
 *  - Incident markers (with type + status icons)
 *  - Hotspot circle overlays
 *  - Click-to-report incident modal trigger
 *  - Viewport bbox emitter for live incident fetch
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RouteResult } from '@heatflood/shared';
import { mapboxRouteColor } from '@/lib/riskColors';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

const PILOT_CENTER: [number, number] = [72.8477, 19.1197]; // [lon, lat]
const PILOT_ZOOM = 13.5;

export interface MapIncident {
  incidentId: string;
  latitude: number;
  longitude: number;
  type: string;
  status: string;
  depthCategory: string;
  observedAt: string;
}

interface Props {
  routes: RouteResult[];
  selectedRouteId: string | null;
  incidents: MapIncident[];
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  onRequestReport?: (lat: number, lon: number) => void;
}

const INCIDENT_ICONS: Record<string, string> = {
  waterlogging: '\uD83D\uDCA7',
  road_blocked: '\uD83D\uDEA7',
  underpass_flooded: '\uD83C\uDF0A',
  extreme_heat: '\uD83D\uDD25',
  other: '\u26A0\uFE0F',
};

export function Map({ routes, selectedRouteId, incidents, onBboxChange, onRequestReport }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // ---- Initialise map ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: PILOT_CENTER,
      zoom: PILOT_ZOOM,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');

    map.on('load', () => {
      setReady(true);

      // Pilot zone boundary (soft visual)
      map.addSource('pilot-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [72.79, 19.09], [72.90, 19.09],
              [72.90, 19.15], [72.79, 19.15], [72.79, 19.09],
            ]],
          },
          properties: {},
        },
      });
      map.addLayer({
        id: 'pilot-zone-fill',
        type: 'fill',
        source: 'pilot-zone',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.04 },
      });
      map.addLayer({
        id: 'pilot-zone-line',
        type: 'line',
        source: 'pilot-zone',
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [4, 3] },
      });
    });

    // Click-to-report
    map.on('click', (e) => {
      onRequestReport?.(e.lngLat.lat, e.lngLat.lng);
    });

    // Bbox emitter
    const emitBbox = () => {
      const b = map.getBounds();
      onBboxChange?.([
        b.getWest(), b.getSouth(), b.getEast(), b.getNorth()
      ]);
    };
    map.on('moveend', emitBbox);
    map.on('zoomend', emitBbox);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Draw route layers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clean up previous route layers + sources
    map.getStyle()?.layers?.forEach(l => {
      if (l.id.startsWith('route-')) map.removeLayer(l.id);
    });
    Object.keys(map.getStyle()?.sources ?? {}).forEach(s => {
      if (s.startsWith('route-')) map.removeSource(s);
    });

    routes.forEach((route, idx) => {
      const isSelected = route.routeId === selectedRouteId;
      const color = mapboxRouteColor(route.overallFloodLevel, route.isHardBlocked);
      const sourceId = `route-${route.routeId}`;
      const lineId = `route-line-${route.routeId}`;
      const casingId = `route-casing-${route.routeId}`;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: route.geometry as GeoJSON.Geometry,
          properties: { routeId: route.routeId, rank: route.rank },
        },
      });

      // Casing (white outline) for selected route
      if (isSelected) {
        map.addLayer({
          id: casingId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.6 },
        });
      }

      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': isSelected ? 6 : 4,
          'line-opacity': isSelected ? 1.0 : (route.isHardBlocked ? 0.35 : 0.65),
          ...(route.isHardBlocked ? { 'line-dasharray': [2, 2] } : {}),
        },
      });
    });
  }, [routes, selectedRouteId, ready]);

  // ---- Draw incident markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    incidents.forEach(inc => {
      const icon = INCIDENT_ICONS[inc.type] ?? INCIDENT_ICONS.other;
      const isVerified = inc.status === 'verified' || inc.status === 'corroborated';

      const el = document.createElement('div');
      el.style.cssText = [
        'width:28px', 'height:28px',
        'border-radius:50%',
        `background:${isVerified ? '#ef4444' : '#f59e0b'}`,
        'border:2px solid #fff',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-size:14px', 'cursor:pointer',
        'box-shadow:0 2px 6px rgba(0,0,0,0.5)',
      ].join(';');
      el.textContent = icon;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: true })
        .setHTML(`
          <div style="color:#1f2937;font-size:13px;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${inc.type.replace('_', ' ')}</div>
            <div>Depth: ${inc.depthCategory}</div>
            <div>Status: <strong>${inc.status}</strong></div>
            <div style="color:#6b7280;font-size:11px;margin-top:4px">
              Observed: ${new Date(inc.observedAt).toLocaleTimeString()}
            </div>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([inc.longitude, inc.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [incidents, ready]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500 text-sm">
          Loading map\u2026
        </div>
      )}
    </div>
  );
}
