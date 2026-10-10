'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SearchPanel } from '@/components/panel/SearchPanel';
import { MetricLens } from '@/components/map/MetricLens';
import MapSkeleton from '@/components/map/MapSkeleton';
import { IncidentFeed } from '@/components/incidents/IncidentFeed';
import { ReportModal } from '@/components/incidents/ReportModal';
import { ReplayTheater } from '@/components/replay/ReplayTheater';
import { TimeScrubber } from '@/components/panel/TimeScrubber';
import { WeatherPulse } from '@/components/status/WeatherPulse';
import { HealthChip } from '@/components/status/HealthChip';
import { ModeratorGate } from '@/components/moderation/ModeratorGate';

import { useAppStore } from '@/lib/store/useAppStore';
import { useViewportIncidents } from '@/lib/hooks/useViewportIncidents';
import { useOnline } from '@/lib/hooks/useOnline';
import { HexBadge } from '@/components/ui/HexBadge';
import { Shield, Film, WifiOff } from 'lucide-react';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function HomePage() {
  const { viewportIncidents, analysis, selectRoute, selectSegment } = useAppStore();
  const isOnline = useOnline();

  const [activeBbox, setActiveBbox] = useState<[number, number, number, number] | null>(null);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  const handleBboxChange = useCallback((bbox: [number, number, number, number]) => {
    setActiveBbox(bbox);
  }, []);

  const handleRequestReport = useCallback((lat: number, lon: number) => {
    setReportCoords({ lat, lon });
  }, []);

  // Viewport polling hook (20s interval, clamped to <= 0.25 deg)
  useViewportIncidents(activeBbox);

  // Keyboard Navigation Shortcuts per Section 12 (WCAG 2.1 AA)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // '/' focuses origin search input
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const originInput = document.querySelector('input[placeholder*="origin"]') as HTMLInputElement;
        originInput?.focus();
        return;
      }

      // 'Escape' closes modal -> drawer -> theater
      if (e.key === 'Escape') {
        if (reportCoords !== null) {
          setReportCoords(null);
          return;
        }
        if (isReplayOpen) {
          setIsReplayOpen(false);
          return;
        }
        if (analysis.selectedSegmentIndex !== null) {
          selectSegment(null);
          return;
        }
      }

      // Arrow keys cycle routes
      if (!isInput && analysis.data?.routes && analysis.data.routes.length > 1) {
        const routes = analysis.data.routes;
        const currentIdx = routes.findIndex((r) => r.routeId === analysis.selectedRouteId);

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = (currentIdx + 1) % routes.length;
          selectRoute(routes[nextIdx].routeId);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = (currentIdx - 1 + routes.length) % routes.length;
          selectRoute(routes[prevIdx].routeId);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reportCoords, isReplayOpen, analysis, selectSegment, selectRoute]);


  // Ambient skin mode calculation (M1)
  const weather = analysis.data?.weather;
  const isRain = (weather?.precipitationMm ?? 0) >= 7.5;
  const isExtremeHeat = (weather?.apparentTemperatureC ?? 0) >= 36;
  const weatherSkin = isRain ? 'flood' : isExtremeHeat ? 'hot' : 'calm';

  return (
    <main
      data-weather={weatherSkin}
      className="w-screen h-screen relative flex flex-col bg-void text-ink overflow-hidden select-none font-sans"
    >
      {/* Offline Banner (Section 9.3) */}
      {!isOnline && (
        <div
          role="alert"
          className="absolute top-0 left-0 right-0 z-50 bg-risk-4/90 text-white text-xs py-1 px-4 flex items-center justify-center gap-2 shadow-md animate-in fade-in"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline — Guardian will sync the moment you reconnect.</span>
        </div>
      )}


      {/* Visually-hidden route summary for Screen Readers per Section 12 */}
      <div className="sr-only" aria-live="polite">
        {analysis.phase === 'analysing' && 'Analyzing routes for environmental hazards...'}
        {analysis.phase === 'success' && analysis.data && (
          <div>
            Route analysis complete. Found {analysis.data.routes.length} candidate routes.
            Recommended route 1: {(analysis.data.routes[0].distanceM / 1000).toFixed(1)} km,
            Flood risk: {analysis.data.routes[0].overallFloodLevel},
            Heat risk: {analysis.data.routes[0].overallHeatLevel}.
          </div>
        )}
      </div>

      {/* Top Floating Cockpit Glass Header */}
      <header className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="pointer-events-auto glass-panel px-3.5 py-2 rounded-md flex items-center gap-2.5 shadow-glass">
          <HexBadge size="sm" variant="brand">
            <Shield className="w-3.5 h-3.5 text-void fill-void" />
          </HexBadge>
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-sm tracking-tight text-ink flex items-center gap-1.5">
              <span>HeatFlood Guardian</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-raised border border-line text-flood font-semibold">
                MUMBAI
              </span>
            </h1>
            <span className="text-[10px] font-mono text-ink-3">
              Instrumented Navigation Cockpit · v0.1.0
            </span>
          </div>
        </div>

        {/* Top-Right Cockpit Chips & Replay Shortcuts */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Replay Theater Modal Trigger (M6) */}
          <button
            onClick={() => setIsReplayOpen(true)}
            className="glass-panel px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-mono font-bold text-heat hover:border-heat/60 hover:bg-heat/10 shadow-glass transition"
          >
            <Film className="w-3.5 h-3.5 text-heat" />
            <span>Replay Theater 🎬</span>
          </button>

          {/* Real-time Weather Pulse */}
          <WeatherPulse />

          {/* Diagnostic Health Chip */}
          <HealthChip />
          <ModeratorGate />
        </div>
      </header>

      {/* Main Cockpit Layout: Floating Left SearchPanel + Full-Bleed Map */}
      <div className="w-full h-full relative flex">
        {/* Floating Search Panel */}
        <div className="absolute top-16 bottom-3 left-3 z-20 flex max-h-[calc(100vh-80px)]">
          <SearchPanel />
        </div>

        {/* Full-Bleed Mapbox Viewport */}
        <div className="w-full h-full relative z-0">
          <MapView
            onBboxChange={handleBboxChange}
            onRequestReport={handleRequestReport}
          />
          <MetricLens />
          <TimeScrubber />
          <IncidentFeed incidents={viewportIncidents.items} />
        </div>
      </div>

      {/* Disaster Replay Theater Modal (M6) */}
      <ReplayTheater
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
      />

      {/* Report Hazard Modal (M9) */}
      {reportCoords && (
        <ReportModal
          coords={reportCoords}
          onClose={() => setReportCoords(null)}
        />
      )}
    </main>
  );
}