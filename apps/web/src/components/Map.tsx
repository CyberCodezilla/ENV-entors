/**
 * Map — Day 4 update:
 *   + Segment-level hover tooltip
 *   + MapLegend overlay
 *   + Segment GeoJSON source per route for hover events
 *   + Selected route fly-to on route change
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RouteResult, SegmentAssessment } from '@heatflood/shared';
import { mapboxRouteColor } from '@/lib/riskColors';
import { MapTooltip } from './MapTooltip';
import { MapLegend } from './MapLegend';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

const PILOT_CENTER: [number, number] = [72.8477, 19.1197];
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

interface TooltipState {
  segment: {
    floodScore: number;
    heatScore: number;
    confidenceScore: number;
    floodLevel: string;
    heatLevel: string;
    confidenceLevel: string;
    hardBlock: boolean;
    hardBlockReason: string | null;
    segmentLengthM: number;
    reasons: string[];
  };
  x: number;
  y: number;
}

interface Props {
  routes: RouteResult[];
  selectedRouteId: string | null;
  incidents: MapIncident[];
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  onRequestReport?: (lat: number, lon: number) => void;
}

const INCIDENT_ICONS: Record<string, string> = {
  waterlogging: '💧',
  road_blocked: '🚧',
  underpass_flooded: '🌊',
  extreme_heat: '🔥',
  other: '⚠️',
};

export function Map({ routes, selectedRouteId, incidents, onBboxChange, onRequestReport }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // ---- Init map ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: PILOT_CENTER,
      zoom: PILOT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

    map.on('load', () => {
      setReady(true);
      // Pilot zone
      map.addSource('pilot-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[72.79, 19.09], [72.90, 19.09], [72.90, 19.15], [72.79, 19.15], [72.79, 19.09]]],
          },
          properties: {},
        },
      });
      map.addLayer({ id: 'pilot-zone-fill', type: 'fill', source: 'pilot-zone', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.04 } });
      map.addLayer({ id: 'pilot-zone-line', type: 'line', source: 'pilot-zone', paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [4, 3] } });
    });

    map.on('click', (e) => { onRequestReport?.(e.lngLat.lat, e.lngLat.lng); });

    const emitBbox = () => {
      const b = map.getBounds();
      if (b) {
        onBboxChange?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
    };
    map.on('moveend', emitBbox);
    map.on('zoomend', emitBbox);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Draw routes with segment hover layers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const eventCleanups: Array<() => void> = [];

    // Cleanup
    map.getStyle()?.layers?.forEach(l => {
      if (l.id.startsWith('route-') || l.id.startsWith('seg-')) map.removeLayer(l.id);
    });
    Object.keys(map.getStyle()?.sources ?? {}).forEach(s => {
      if (s.startsWith('route-') || s.startsWith('seg-')) map.removeSource(s);
    });

    routes.forEach((route) => {
      const isSelected = route.routeId === selectedRouteId;
      const color = mapboxRouteColor(route.overallFloodLevel, route.isHardBlocked);
      const srcId = `route-${route.routeId}`;
      const lineId = `route-line-${route.routeId}`;
      const casingId = `route-casing-${route.routeId}`;

      map.addSource(srcId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: route.geometry as GeoJSON.Geometry, properties: { routeId: route.routeId } },
      });

      if (isSelected) {
        map.addLayer({ id: casingId, type: 'line', source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.5 } });
      }

      map.addLayer({ id: lineId, type: 'line', source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': isSelected ? 6 : 4,
          'line-opacity': isSelected ? 1.0 : (route.isHardBlocked ? 0.35 : 0.65),
          ...(route.isHardBlocked ? { 'line-dasharray': [2, 2] } : {}),
        },
      });

      // Per-segment hover sources (invisible wide lines for hit detection)
      route.segments?.forEach((seg, idx) => {
        const segSrcId = `seg-${route.routeId}-${idx}`;
        const segHoverId = `seg-hover-${route.routeId}-${idx}`;

        const segGeoJSON: GeoJSON.Feature = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [seg.startCoord.lon, seg.startCoord.lat],
              [seg.endCoord.lon, seg.endCoord.lat],
            ],
          },
          properties: {
            floodScore: seg.floodRisk,
            heatScore: seg.heatRisk,
            confidenceScore: seg.confidence,
            floodLevel: seg.floodRiskLevel,
            heatLevel: seg.heatRiskLevel,
            confidenceLevel: seg.confidenceLevel,
            hardBlock: seg.hardBlock,
            hardBlockReason: seg.hardBlockReason,
            segmentLengthM: (seg as { segmentLengthM?: number }).segmentLengthM ?? 0,
            reasons: JSON.stringify(seg.reasons ?? []),
          },
        };

        map.addSource(segSrcId, { type: 'geojson', data: segGeoJSON });
        map.addLayer({
          id: segHoverId, type: 'line', source: segSrcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 20, 'line-opacity': 0 }, // invisible hit area
        });

        const onMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          setTooltip({
            segment: {
              floodScore: props.floodScore,
              heatScore: props.heatScore,
              confidenceScore: props.confidenceScore,
              floodLevel: props.floodLevel,
              heatLevel: props.heatLevel,
              confidenceLevel: props.confidenceLevel,
              hardBlock: props.hardBlock,
              hardBlockReason: props.hardBlockReason,
              segmentLengthM: props.segmentLengthM,
              reasons: JSON.parse(props.reasons ?? '[]'),
            },
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
          map.getCanvas().style.cursor = 'crosshair';
        };

        const onMouseLeave = () => {
          setTooltip(null);
          map.getCanvas().style.cursor = '';
        };

        map.on('mousemove', segHoverId, onMouseMove);
        map.on('mouseleave', segHoverId, onMouseLeave);

        eventCleanups.push(() => {
          map.off('mousemove', segHoverId, onMouseMove);
          map.off('mouseleave', segHoverId, onMouseLeave);
        });
      });
    });

    // Fly to selected route bbox
    const selected = routes.find(r => r.routeId === selectedRouteId);
    if (selected?.geometry?.coordinates?.length) {
      const coords = selected.geometry.coordinates as [number, number][];
      const lons = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      map.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding: 60, maxZoom: 15, duration: 800 }
      );
    }

    return () => {
      eventCleanups.forEach(fn => fn());
    };
  }, [routes, selectedRouteId, ready]);

  // ---- Incident markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    incidents.forEach(inc => {
      const icon = INCIDENT_ICONS[inc.type] ?? INCIDENT_ICONS.other;
      const isVerified = inc.status === 'verified' || inc.status === 'corroborated';

      const el = document.createElement('div');
      el.style.cssText = [
        'width:28px', 'height:28px', 'border-radius:50%',
        `background:${isVerified ? '#ef4444' : '#f59e0b'}`,
        'border:2px solid #fff', 'display:flex', 'align-items:center',
        'justify-content:center', 'font-size:14px', 'cursor:pointer',
        'box-shadow:0 2px 6px rgba(0,0,0,0.5)',
      ].join(';');
      el.textContent = icon;

      const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
        <div style="color:#1f2937;font-size:13px;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px">${inc.type.replace(/_/g, ' ')}</div>
          <div>Depth: ${inc.depthCategory}</div>
          <div>Status: <strong>${inc.status}</strong></div>
          <div style="color:#6b7280;font-size:11px;margin-top:4px">
            ${new Date(inc.observedAt).toLocaleTimeString()}
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
          Loading map…
        </div>
      )}
      <MapLegend />
      {tooltip && <MapTooltip segment={tooltip.segment} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
