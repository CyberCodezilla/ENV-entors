'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '@/lib/store/useAppStore';
import { PILOT_ZONE_GEOJSON, PILOT_ZONE_LAYERS, CARTO_DARK_STYLE } from './layers';
import { SegmentTooltip } from './SegmentTooltip';
import type { Place, Segment, Route } from '@/lib/api/types';
import { scoreToRiskColor } from '@/lib/theme/risk';

const rawToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
const hasValidToken =
  rawToken.startsWith('pk.') &&
  !rawToken.includes('YOUR_') &&
  !rawToken.includes('<') &&
  rawToken.length > 30;

if (hasValidToken) {
  mapboxgl.accessToken = rawToken;
}

const INITIAL_CENTER: [number, number] = [72.845, 19.1225];
const INITIAL_ZOOM = 13.5;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [72.7, 19.0],
  [73.0, 19.3],
];

export interface MapViewProps {
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  onRequestReport?: (lat: number, lon: number) => void;
}

export default function MapView({ onBboxChange, onRequestReport }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const gateMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayersRef = useRef<string[]>([]);
  const routeSourcesRef = useRef<string[]>([]);
  const incidents = useAppStore((state) => state.viewportIncidents.items);

  const onBboxChangeRef = useRef(onBboxChange);
  onBboxChangeRef.current = onBboxChange;

  const onRequestReportRef = useRef(onRequestReport);
  onRequestReportRef.current = onRequestReport;

  const lastFittedRouteIdRef = useRef<string | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<{
    segment: Segment;
    x: number;
    y: number;
  } | null>(null);

  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    mapPickingTarget,
    setMapPickingTarget,
    analysis,
    selectSegment,
    selectRoute,
    metricLens,
  } = useAppStore();

  const routes = analysis.data?.routes ?? [];
  const selectedRouteId = analysis.selectedRouteId;

  // Create custom DOM element for origin marker (Teal dot with white core + pulse)
  const createOriginMarkerEl = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'group relative flex items-center justify-center cursor-grab active:cursor-grabbing';
    el.style.width = '24px';
    el.style.height = '24px';

    const pulse = document.createElement('div');
    pulse.className = 'absolute inset-0 rounded-full bg-flood/30 animate-ping';
    el.appendChild(pulse);

    const outer = document.createElement('div');
    outer.className =
      'w-4 h-4 rounded-full bg-flood border-2 border-white shadow-glow flex items-center justify-center relative z-10';
    const inner = document.createElement('div');
    inner.className = 'w-1.5 h-1.5 rounded-full bg-void';
    outer.appendChild(inner);
    el.appendChild(outer);

    return el;
  }, []);

  // Create custom DOM element for destination marker (Heat-colored pin)
  const createDestMarkerEl = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'group relative flex items-center justify-center cursor-grab active:cursor-grabbing';
    el.style.width = '24px';
    el.style.height = '24px';

    const outer = document.createElement('div');
    outer.className =
      'w-4 h-4 rotate-45 bg-heat border-2 border-white shadow-glowHeat flex items-center justify-center relative z-10 rounded-sm';
    const inner = document.createElement('div');
    inner.className = 'w-1.5 h-1.5 rounded-full bg-void';
    outer.appendChild(inner);
    el.appendChild(outer);

    return el;
  }, []);

  // Create custom Gate marker for hard-blocked segment midpoint
  const createGateMarkerEl = useCallback((reason: string | null) => {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-center cursor-pointer';
    el.style.width = '28px';
    el.style.height = '28px';

    const ring = document.createElement('div');
    ring.className =
      'w-6 h-6 rounded-full bg-risk-4 border-2 border-white shadow-glass flex items-center justify-center text-white font-mono font-bold text-xs animate-pulse';
    ring.innerText = '✕';
    ring.title = `Impassable: ${reason || 'Hazard closure'}`;
    el.appendChild(ring);

    return el;
  }, []);

  // Initialize Mapbox instance ONCE on mount (empty deps so map NEVER reloads on clicks or parent re-renders)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle = hasValidToken ? 'mapbox://styles/mapbox/dark-v11' : CARTO_DARK_STYLE;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    // Automatic fallback if Mapbox style returns 401/403 Forbidden
    map.on('error', (e) => {
      const msg = e.error?.message ?? '';
      if (
        msg.includes('403') ||
        msg.includes('401') ||
        msg.includes('Forbidden') ||
        msg.includes('Unauthorized') ||
        (e.error as any)?.status === 403
      ) {
        console.warn('[MapView] Mapbox style unauthorized (403). Falling back to Carto Dark Matter.');
        try {
          map.setStyle(CARTO_DARK_STYLE);
        } catch {
          /* ignore */
        }
      }
    });

    const setupBaseLayers = () => {
      if (!map.getSource('pilot-zone-source')) {
        map.addSource('pilot-zone-source', {
          type: 'geojson',
          data: PILOT_ZONE_GEOJSON,
        });
      }

      if (!map.getLayer(PILOT_ZONE_LAYERS.fill.id)) {
        map.addLayer(PILOT_ZONE_LAYERS.fill);
      }
      if (!map.getLayer(PILOT_ZONE_LAYERS.line.id)) {
        map.addLayer(PILOT_ZONE_LAYERS.line);
      }

      setMapLoaded(true);
    };

    map.on('load', setupBaseLayers);
    map.on('style.load', setupBaseLayers);

    // Handle map clicks without triggering map teardown or reloads
    map.on('click', (e) => {
      const {
        mapPickingTarget: currentTarget,
        setOrigin: setOrg,
        setDestination: setDst,
        setMapPickingTarget: clearTarget,
      } = useAppStore.getState();

      const clickedLat = Number(e.lngLat.lat.toFixed(4));
      const clickedLon = Number(e.lngLat.lng.toFixed(4));

      if (currentTarget === 'origin') {
        const place: Place = {
          name: `Map Pick (${clickedLat}, ${clickedLon})`,
          lat: clickedLat,
          lon: clickedLon,
        };
        setOrg(place);
        clearTarget(null);
        return;
      }

      if (currentTarget === 'destination') {
        const place: Place = {
          name: `Map Pick (${clickedLat}, ${clickedLon})`,
          lat: clickedLat,
          lon: clickedLon,
        };
        setDst(place);
        clearTarget(null);
        return;
      }

      // Check if user clicked on or near a route line or interactive element
      try {
        const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
          [e.point.x - 6, e.point.y - 6],
          [e.point.x + 6, e.point.y + 6],
        ];
        const routeFeatures = map.queryRenderedFeatures(bbox).filter((f) =>
          f.layer?.id?.startsWith('route-') || f.layer?.id?.startsWith('seg-hover-')
        );
        if (routeFeatures.length > 0) {
          // User clicked a route feature, not open map terrain
          return;
        }
      } catch {
        /* ignore feature query error */
      }

      onRequestReportRef.current?.(clickedLat, clickedLon);
    });

    // Viewport bounding box tracking (debounced 300ms)
    let moveTimeout: NodeJS.Timeout;
    const emitBbox = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        const b = map.getBounds();
        if (b) {
          onBboxChangeRef.current?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
        }
      }, 300);
    };

    map.on('moveend', emitBbox);
    map.on('zoomend', emitBbox);

    mapRef.current = map;

    return () => {
      clearTimeout(moveTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map crosshair cursor when picking on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mapPickingTarget) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [mapPickingTarget]);

  // Synchronize origin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!origin) {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      return;
    }

    if (!originMarkerRef.current) {
      const el = createOriginMarkerEl();
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([origin.lon, origin.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setOrigin({
          name: `Custom Pin (${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)})`,
          lat: Number(lngLat.lat.toFixed(4)),
          lon: Number(lngLat.lng.toFixed(4)),
        });
      });

      originMarkerRef.current = marker;
    } else {
      originMarkerRef.current.setLngLat([origin.lon, origin.lat]);
    }
  }, [origin, mapLoaded, setOrigin, createOriginMarkerEl]);

  // Synchronize destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!destination) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    if (!destMarkerRef.current) {
      const el = createDestMarkerEl();
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([destination.lon, destination.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setDestination({
          name: `Custom Pin (${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)})`,
          lat: Number(lngLat.lat.toFixed(4)),
          lon: Number(lngLat.lng.toFixed(4)),
        });
      });

      destMarkerRef.current = marker;
    } else {
      destMarkerRef.current.setLngLat([destination.lon, destination.lat]);
    }
  }, [destination, mapLoaded, setDestination, createDestMarkerEl]);

  // Draw multi-candidate route lines with sub-pixel hover layers & lens coloring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const drawRoutes = () => {
      if (!map.isStyleLoaded()) return;

      try {
        // Clear old route layers safely
        routeLayersRef.current.forEach((id) => {
          if (map.getLayer(id)) {
            try { map.removeLayer(id); } catch {}
          }
        });
        routeLayersRef.current = [];

        // Clear old route sources safely
        routeSourcesRef.current.forEach((id) => {
          if (map.getSource(id)) {
            try { map.removeSource(id); } catch {}
          }
        });
        routeSourcesRef.current = [];

        // Extra fallback cleanup for any remaining route/seg layers
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            style.layers.forEach((l) => {
              if (l.id.startsWith('route-') || l.id.startsWith('seg-hover-')) {
                if (map.getLayer(l.id)) {
                  try { map.removeLayer(l.id); } catch {}
                }
              }
            });
          }
          if (style && style.sources) {
            Object.keys(style.sources).forEach((s) => {
              if (s.startsWith('route-') || s.startsWith('seg-hover-')) {
                if (map.getSource(s)) {
                  try { map.removeSource(s); } catch {}
                }
              }
            });
          }
        } catch {
          // getStyle may throw if style is loading; ignore
        }

        // Clear gate markers
        gateMarkersRef.current.forEach((m) => m.remove());
        gateMarkersRef.current = [];

        if (routes.length === 0) return;

        routes.forEach((route) => {
          const isSelected = route.routeId === selectedRouteId;
          const srcId = `route-${route.routeId}`;
          const casingId = `route-casing-${route.routeId}`;
          const glowId = `route-glow-${route.routeId}`;
          const mainId = `route-main-${route.routeId}`;

          // Convert segments into GeoJSON feature collection for fine-grained per-segment styling
          const segmentFeatures: GeoJSON.Feature[] = route.segments.map((seg) => {
            let score = Math.max(seg.floodRisk, seg.heatRisk);
            if (metricLens === 'flood') score = seg.floodRisk;
            if (metricLens === 'heat') score = seg.heatRisk;
            if (metricLens === 'confidence') score = 100 - seg.confidence; // higher is worse

            const color = scoreToRiskColor(score);

            return {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [seg.startCoord.lon, seg.startCoord.lat],
                  [seg.endCoord.lon, seg.endCoord.lat],
                ],
              },
              properties: {
                routeId: route.routeId,
                segmentIndex: seg.segmentIndex,
                color: route.isHardBlocked ? '#7F1D1D' : color,
                floodRisk: seg.floodRisk,
                heatRisk: seg.heatRisk,
                confidence: seg.confidence,
                hardBlock: seg.hardBlock,
                hardBlockReason: seg.hardBlockReason,
                segmentLengthM: seg.segmentLengthM,
                estimatedArrivalUtc: seg.estimatedArrivalUtc,
              },
            };
          });

          map.addSource(srcId, {
            type: 'geojson',
            lineMetrics: true,
            data: {
              type: 'FeatureCollection',
              features: segmentFeatures,
            },
          });
          routeSourcesRef.current.push(srcId);

          // 1. Casing (width 10, dark #0A0E14)
          map.addLayer({
            id: casingId,
            type: 'line',
            source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#0A0E14',
              'line-width': isSelected ? 10 : 7,
              'line-opacity': 0.8,
            },
          });
          routeLayersRef.current.push(casingId);

          // 2. Glow (width 14, blur opacity 0.25, selected route only)
          if (isSelected) {
            map.addLayer({
              id: glowId,
              type: 'line',
              source: srcId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#FFFFFF',
                'line-width': 14,
                'line-opacity': 0.25,
                'line-blur': 3,
              },
            });
            routeLayersRef.current.push(glowId);
          }

          // 3. Main Route Line
          map.addLayer({
            id: mainId,
            type: 'line',
            source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': isSelected ? 6 : 4,
              'line-opacity': isSelected ? 1.0 : route.isHardBlocked ? 0.35 : 0.65,
              ...(route.isHardBlocked ? { 'line-dasharray': [2, 2] } : {}),
            },
          });
          routeLayersRef.current.push(mainId);

          // 4. Sub-pixel invisible hover hit layer (width 20, opacity 0) for selected route
          if (isSelected) {
            const hoverId = `seg-hover-${route.routeId}`;
            map.addLayer({
              id: hoverId,
              type: 'line',
              source: srcId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#ffffff',
                'line-width': 22,
                'line-opacity': 0,
              },
            });
            routeLayersRef.current.push(hoverId);

            map.on('mousemove', hoverId, (e) => {
              if (!e.features?.[0]) return;
              const props = e.features[0].properties as Record<string, unknown>;
              const segIdx = Number(props.segmentIndex);
              const fullSeg = route.segments[segIdx];

              if (fullSeg) {
                setHoveredSegment({
                  segment: fullSeg,
                  x: e.originalEvent.clientX,
                  y: e.originalEvent.clientY,
                });
                try { map.getCanvas().style.cursor = 'pointer'; } catch {}
              }
            });

            map.on('mouseleave', hoverId, () => {
              setHoveredSegment(null);
              try { map.getCanvas().style.cursor = ''; } catch {}
            });

            map.on('click', hoverId, (e) => {
              if (!e.features?.[0]) return;
              const props = e.features[0].properties as Record<string, unknown>;
              selectSegment(Number(props.segmentIndex));
            });
          }

          // Add Gate marker at blocked segment midpoint if route is hard-blocked
          if (route.isHardBlocked) {
            const blockedSeg = route.segments.find((s) => s.hardBlock);
            if (blockedSeg) {
              const midLat = (blockedSeg.startCoord.lat + blockedSeg.endCoord.lat) / 2;
              const midLon = (blockedSeg.startCoord.lon + blockedSeg.endCoord.lon) / 2;
              const gateEl = createGateMarkerEl(blockedSeg.hardBlockReason);
              const gateMarker = new mapboxgl.Marker({ element: gateEl })
                .setLngLat([midLon, midLat])
                .addTo(map);

              gateMarker.getElement().addEventListener('click', () => {
                selectRoute(route.routeId);
                selectSegment(blockedSeg.segmentIndex);
              });

              gateMarkersRef.current.push(gateMarker);
            }
          }
        });

        // Camera fitBounds to selected route ONLY if route selection changed
        if (selectedRouteId && lastFittedRouteIdRef.current !== selectedRouteId) {
          lastFittedRouteIdRef.current = selectedRouteId;
          const selectedRoute = routes.find((r) => r.routeId === selectedRouteId);
          if (selectedRoute?.geometry?.coordinates?.length) {
            const coords = selectedRoute.geometry.coordinates;
            const lons = coords.map((c) => c[0]);
            const lats = coords.map((c) => c[1]);

            const isMobile = window.innerWidth < 1024;
            map.fitBounds(
              [
                [Math.min(...lons), Math.min(...lats)],
                [Math.max(...lons), Math.max(...lats)],
              ],
              {
                padding: isMobile
                  ? { top: 80, right: 40, bottom: 320, left: 40 }
                  : { top: 80, right: 80, bottom: 140, left: 448 },
                maxZoom: 15.5,
                duration: 1200,
                essential: true,
              }
            );
          }
        }
      } catch (err) {
        console.warn('Mapbox route render warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      drawRoutes();
    } else {
      map.once('styledata', drawRoutes);
    }

    return () => {
      map.off('styledata', drawRoutes);
    };
  }, [
    routes,
    selectedRouteId,
    mapLoaded,
    metricLens,
    selectRoute,
    selectSegment,
    createGateMarkerEl,
  ]);


  // Synchronize active incident markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];

    incidents.forEach((inc) => {
      if (inc.status === "rejected") return;

      const el = document.createElement("div");
      el.className = "flex items-center justify-center cursor-pointer group";
      el.style.width = "24px";
      el.style.height = "24px";

      const iconEmoji =
        inc.type === "waterlogging"
          ? "💧"
          : inc.type === "underpass_flooded"
          ? "🌊"
          : inc.type === "road_blocked"
          ? "🚧"
          : inc.type === "extreme_heat" || inc.type === "heat_exposure"
          ? "🔥"
          : "⚠️";

      const badge = document.createElement("div");
      badge.className = `w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-glass ${
        inc.status === "verified"
          ? "border-2 border-conf-good bg-conf-good/20 text-white"
          : inc.status === "corroborated"
          ? "border border-flood bg-flood/20 text-white"
          : "border border-dashed border-heat bg-heat/20 animate-pulse text-white"
      }`;
      badge.innerText = iconEmoji;
      badge.title = `${inc.type.replace("_", " ")} (${inc.status})`;
      el.appendChild(badge);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([inc.longitude, inc.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-family: monospace; font-size: 11px; padding: 4px; color: #070B12;">
              <strong>${inc.type.replace("_", " ").toUpperCase()}</strong><br/>
              Status: ${inc.status}<br/>
              Depth: ${inc.depthCategory || "none"}
            </div>`
          )
        )
        .addTo(map);

      incidentMarkersRef.current.push(marker);
    });
  }, [incidents, mapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Crosshair indicator banner when picking location */}
      {mapPickingTarget && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2 rounded-pill border border-flood/40 shadow-glow flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="w-2.5 h-2.5 rounded-full bg-flood animate-ping" />
          <span className="text-xs font-medium text-ink">
            Click map to set <strong className="capitalize text-flood">{mapPickingTarget}</strong>
          </span>
          <button
            onClick={() => setMapPickingTarget(null)}
            className="ml-2 text-[11px] font-mono text-ink-3 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Segment Tooltip on hover */}
      {hoveredSegment && (
        <SegmentTooltip
          segment={hoveredSegment.segment}
          x={hoveredSegment.x}
          y={hoveredSegment.y}
        />
      )}
    </div>
  );
}