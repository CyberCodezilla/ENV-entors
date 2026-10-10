'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { RouteCard } from './RouteCard';
import { EmergencyAdvisory } from './EmergencyAdvisory';
import { SegmentDrawer } from './SegmentDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';

export function ResultsStack() {
  const { analysis, selectRoute, selectSegment } = useAppStore();
  const { phase, data, error, selectedRouteId, selectedSegmentIndex } = analysis;

  // Initial load: show skeletons only if there is NO route data yet
  if (phase === 'analysing' && !data) {
    return (
      <div
        role="region"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-2.5 mt-2"
      >
        <Skeleton height={110} />
        <Skeleton height={110} />
      </div>
    );
  }

  if (phase === 'error' && error) {
    return (
      <div
        role="alert"
        className="glass-panel border-risk-4/50 bg-risk-4/15 rounded-md p-3.5 mt-2 text-xs text-ink flex items-start gap-2.5 animate-in fade-in"
      >
        <AlertCircle className="w-4 h-4 text-risk-4 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <strong className="text-risk-4 font-semibold uppercase tracking-wide">
            {error.kind === 'routing' ? 'Routing Unavailable' : 'Analysis Error'}
          </strong>
          <span className="text-ink-2">{error.message}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isRefreshing = phase === 'analysing';
  const selectedRoute = data.routes.find((r) => r.routeId === selectedRouteId);
  const selectedSegment =
    selectedRoute && selectedSegmentIndex !== null
      ? selectedRoute.segments[selectedSegmentIndex] ?? null
      : null;

  return (
    <div
      role="region"
      aria-live="polite"
      className={`flex flex-col gap-3 mt-2 transition-opacity duration-200 ${
        isRefreshing ? 'opacity-75' : 'opacity-100'
      }`}
    >
      {/* Background Re-analysis status indicator */}
      {isRefreshing && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-raised/70 border border-line text-[11px] font-mono text-flood animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin text-flood shrink-0" />
          <span>Updating route hazard forecast...</span>
        </div>
      )}

      {/* Segment Evidence Drawer (pops up when segment is clicked) */}
      {selectedSegment && (
        <SegmentDrawer
          segment={selectedSegment}
          onClose={() => selectSegment(null)}
        />
      )}

      {/* Emergency Advisory if no confident recommendation */}
      {!data.hasConfidentRecommendation ? (
        <EmergencyAdvisory reason={data.noConfidentRouteReason} />
      ) : (
        /* Ranked Route Cards */
        <div className="flex flex-col gap-2.5">
          {data.routes.map((route) => (
            <RouteCard
              key={route.routeId}
              route={route}
              selected={selectedRouteId === route.routeId}
              onSelect={() => selectRoute(route.routeId)}
            />
          ))}
        </div>
      )}

      {/* Verbatim API Disclaimer (Section 7.3) */}
      <footer className="text-[11px] text-ink-3 leading-relaxed mt-1 px-1">
        {data.routes[0]?.disclaimer ||
          'This recommendation is based on available evidence and may not reflect current road conditions. Never enter floodwater. Check official guidance before travel.'}
      </footer>
    </div>
  );
}
