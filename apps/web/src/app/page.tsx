/**
 * Home page — Day 5 FINAL
 *
 * Changes from Day 4:
 *   - MobileDrawer wraps sidebar (FAB on mobile, permanent on desktop)
 *   - Skeleton cards shown while loading
 *   - DataFreshnessFooter passed to RouteCard
 *   - ErrorBoundary wraps Map and sidebar separately
 *   - Accessible form labels and ARIA live region for results
 *   - Outside-pilot-zone warning banner
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyseRoutesResponse } from '@heatflood/shared';
import { PILOT_BBOX, isInsidePilotZone } from '@heatflood/shared';
import { api } from '@/lib/apiClient';
import { RouteCard } from '@/components/RouteCard';
import { WeatherBanner } from '@/components/WeatherBanner';
import { DemoBanner } from '@/components/DemoBanner';
import { NoRouteState } from '@/components/NoRouteState';
import { Map, MapIncident } from '@/components/Map';
import { ReportIncidentModal } from '@/components/ReportIncidentModal';
import { SkeletonCard, SkeletonWeatherBanner } from '@/components/SkeletonCard';
import { MobileDrawer } from '@/components/MobileDrawer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const POLL_INTERVAL_MS = 60_000;

export default function HomePage() {
  const [originLat, setOriginLat]   = useState('19.1120');
  const [originLon, setOriginLon]   = useState('72.8320');
  const [destLat, setDestLat]       = useState('19.1380');
  const [destLon, setDestLon]       = useState('72.8550');
  const [mode, setMode]             = useState<'walking' | 'driving-traffic'>('walking');
  const [heatSensitive, setHeatSensitive] = useState(false);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [result, setResult]             = useState<AnalyseRoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [outsidePilot, setOutsidePilot] = useState(false);

  const [incidents, setIncidents]       = useState<MapIncident[]>([]);
  const bboxRef                         = useRef<[number, number, number, number] | null>(null);

  const [reportCoords, setReportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // ---- Incident polling ----
  const fetchIncidents = useCallback(async () => {
    if (!bboxRef.current) return;
    const [lngMin, latMin, lngMax, latMax] = bboxRef.current;
    try {
      const res = await api.getIncidents(lngMin, latMin, lngMax, latMax);
      setIncidents(res.incidents);
    } catch { /* fail silently */ }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchIncidents, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchIncidents]);

  const handleBboxChange = useCallback((bbox: [number, number, number, number]) => {
    bboxRef.current = bbox;
    fetchIncidents();
  }, [fetchIncidents]);

  // ---- Pilot zone check ----
  useEffect(() => {
    const oLat = parseFloat(originLat), oLon = parseFloat(originLon);
    const dLat = parseFloat(destLat),   dLon = parseFloat(destLon);
    if (!isNaN(oLat) && !isNaN(dLat)) {
      const originIn = isInsidePilotZone(oLat, oLon, PILOT_BBOX);
      const destIn   = isInsidePilotZone(dLat, dLon, PILOT_BBOX);
      setOutsidePilot(!originIn && !destIn);
    }
  }, [originLat, originLon, destLat, destLon]);

  // ---- Route analysis ----
  async function handleAnalyse(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.analyseRoutes({
        origin:      { lat: parseFloat(originLat), lon: parseFloat(originLon) },
        destination: { lat: parseFloat(destLat),   lon: parseFloat(destLon) },
        mode,
        departureTime: new Date().toISOString(),
        heatSensitive,
        isReplay: false,
      });
      setResult(res);
      setSelectedRouteId(res.routes[0]?.routeId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function loadDemo(scenarioId: string) {
    setLoading(true);
    setError(null);
    try {
      const scenario = await api.getDemoScenario(scenarioId);
      const res = await api.analyseRoutes({ ...scenario, isReplay: true, scenarioId });
      setResult(res);
      setSelectedRouteId(res.routes[0]?.routeId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleReportSuccess(_incidentId: string) {
    setReportCoords(null);
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 4000);
    fetchIncidents();
  }

  // ---- Sidebar content (shared between desktop + mobile drawer) ----
  const sidebarContent = (
    <div className="flex flex-col gap-3">
      {/* Route form */}
      <form onSubmit={handleAnalyse} className="flex flex-col gap-3">
        <p className="text-xs text-gray-500">Click map to report a hazard · Analyse to compare routes</p>

        {outsidePilot && (
          <div className="rounded-lg bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-xs px-3 py-2">
            ⚠️ These coordinates are outside the Mumbai pilot zone (Andheri West / Versova).
            Results will have limited data support.
          </div>
        )}

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-gray-500 mb-1">Origin (lat, lon)</legend>
          <div className="flex gap-2">
            <input
              aria-label="Origin latitude"
              value={originLat} onChange={e => setOriginLat(e.target.value)}
              className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
              placeholder="lat"
            />
            <input
              aria-label="Origin longitude"
              value={originLon} onChange={e => setOriginLon(e.target.value)}
              className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
              placeholder="lon"
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-gray-500 mb-1">Destination (lat, lon)</legend>
          <div className="flex gap-2">
            <input
              aria-label="Destination latitude"
              value={destLat} onChange={e => setDestLat(e.target.value)}
              className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
              placeholder="lat"
            />
            <input
              aria-label="Destination longitude"
              value={destLon} onChange={e => setDestLon(e.target.value)}
              className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
              placeholder="lon"
            />
          </div>
        </fieldset>

        <div className="flex gap-4 items-center">
          <label htmlFor="mode" className="sr-only">Travel mode</label>
          <select
            id="mode"
            value={mode} onChange={e => setMode(e.target.value as typeof mode)}
            className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
          >
            <option value="walking">Walking</option>
            <option value="driving-traffic">Driving</option>
          </select>
          <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={heatSensitive}
              onChange={e => setHeatSensitive(e.target.checked)}
              className="rounded"
            />
            Heat sensitive
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition"
        >
          {loading ? 'Analysing…' : 'Analyse Routes'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 text-red-200 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <SkeletonWeatherBanner />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div aria-live="polite" className="flex flex-col gap-2">
          {result.isReplay && <DemoBanner scenarioId={result.scenarioId} />}
          <WeatherBanner weather={result.weather} isReplay={result.isReplay} />

          {!result.hasConfidentRecommendation ? (
            <NoRouteState reason={result.noConfidentRouteReason} isReplay={result.isReplay} />
          ) : (
            result.routes.map(route => (
              <RouteCard
                key={route.routeId}
                route={route}
                isSelected={selectedRouteId === route.routeId}
                onSelect={() => setSelectedRouteId(route.routeId)}
                isReplay={result.isReplay}
                freshness={result.dataFreshness}
              />
            ))
          )}

          <p className="text-[10px] text-gray-600">
            ID: {result.requestId} · {new Date(result.processedAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      {incidents.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {incidents.length} active hazard{incidents.length !== 1 ? 's' : ''} in map view
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base md:text-lg font-bold">🌊 HeatFlood Guardian</h1>
          <p className="text-[11px] text-gray-400 hidden sm:block">Mumbai pilot — Andheri West / Versova</p>
        </div>
        <div className="flex gap-1.5 md:gap-2 items-center">
          <span className="text-xs text-gray-500 hidden lg:block">Demo:</span>
          {['heat', 'flood', 'compound'].map(id => (
            <button
              key={id}
              onClick={() => loadDemo(id)}
              disabled={loading}
              className="text-xs bg-yellow-800 hover:bg-yellow-700 disabled:opacity-50 text-yellow-100 px-2 py-1 rounded-lg transition"
            >
              {id}
            </button>
          ))}
        </div>
      </header>

      {/* Toast */}
      {showReportSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-800 text-white text-sm px-4 py-2 rounded-full shadow-lg"
        >
          ✓ Hazard report submitted
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">

        {/* MobileDrawer wraps sidebar — shows FAB on mobile, permanent column on desktop */}
        <MobileDrawer routeCount={result?.routes?.length}>
          {sidebarContent}
        </MobileDrawer>

        {/* Map */}
        <div className="flex-1 relative">
          <ErrorBoundary label="Map">
            <Map
              routes={result?.routes ?? []}
              selectedRouteId={selectedRouteId}
              incidents={incidents}
              onBboxChange={handleBboxChange}
              onRequestReport={(lat, lon) => setReportCoords({ lat, lon })}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Report modal */}
      {reportCoords && (
        <ReportIncidentModal
          lat={reportCoords.lat}
          lon={reportCoords.lon}
          onClose={() => setReportCoords(null)}
          onSuccess={handleReportSuccess}
        />
      )}
    </main>
  );
}
