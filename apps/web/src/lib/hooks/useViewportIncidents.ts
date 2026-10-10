'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { api } from '@/lib/api/client';
import type { Bbox } from '@/lib/geo/bbox';
import { clampBbox } from '@/lib/geo/bbox';

const POLL_INTERVAL_MS = 20_000; // 20-second refresh per Section 9.4

export function useViewportIncidents(activeBbox: [number, number, number, number] | null) {
  const { setViewportIncidents, viewportIncidents, pendingReports } = useAppStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedBboxRef = useRef<string | null>(null);

  const fetchIncidents = useCallback(
    async (bbox: Bbox) => {
      // Hard law: span <= 0.25 deg per axis (Section 2, Rule 4)
      const clamped = clampBbox(bbox);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const res = await api.listIncidents(clamped, abortControllerRef.current.signal);

        // Merge: API is authoritative; preserve optimistic pending reports by idempotencyKey
        const fetchedIds = new Set(res.incidents.map((i) => i.incidentId));
        const activeOptimistic = pendingReports
          .filter((p) => p.state === 'pending' && !fetchedIds.has(p.idempotencyKey))
          .map((p) => ({
            incidentId: p.idempotencyKey,
            latitude: p.latitude,
            longitude: p.longitude,
            type: p.payload.type,
            depthCategory: p.payload.depthCategory ?? 'unknown',
            observedAt: p.payload.observedAt,
            status: 'pending' as const,
            sourceType: 'community_report' as const,
            isOptimistic: true,
          }));

        setViewportIncidents([...res.incidents, ...activeOptimistic], clamped);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        /* fail silently, retain previous items */
      } finally {
        abortControllerRef.current = null;
      }
    },
    [pendingReports, setViewportIncidents]
  );

  // Trigger on bbox change (debounced 800ms)
  useEffect(() => {
    if (!activeBbox) return;

    const [lngMin, latMin, lngMax, latMax] = activeBbox;
    const rawBbox: Bbox = { lngMin, latMin, lngMax, latMax };
    const clamped = clampBbox(rawBbox);
    const key = `${clamped.lngMin},${clamped.latMin},${clamped.lngMax},${clamped.latMax}`;

    if (key === lastFetchedBboxRef.current) return;
    lastFetchedBboxRef.current = key;

    const timer = setTimeout(() => {
      fetchIncidents(clamped);
    }, 800);

    return () => clearTimeout(timer);
  }, [activeBbox, fetchIncidents]);

  // Interval refresh every 20s while tab is visible (Section 9.4)
  useEffect(() => {
    if (!viewportIncidents.bbox) return;

    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && viewportIncidents.bbox) {
        fetchIncidents(viewportIncidents.bbox);
      }
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && viewportIncidents.bbox) {
        fetchIncidents(viewportIncidents.bbox);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewportIncidents.bbox, fetchIncidents]);

  return {
    incidents: viewportIncidents.items,
    phase: viewportIncidents.phase,
    refetch: () => viewportIncidents.bbox && fetchIncidents(viewportIncidents.bbox),
  };
}