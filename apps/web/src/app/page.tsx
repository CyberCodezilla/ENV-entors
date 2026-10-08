/**
 * Home page — Day 3: full map + sidebar layout with:
 *   - Mapbox GL map (route overlays, incident markers)
 *   - Live incident polling (every 60 s)
 *   - Bbox-driven incident fetch
 *   - Click-to-report modal
 *   - Route card sidebar
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyseRoutesResponse } from '@heatflood/shared';
import { api } from '@/lib/apiClient';
import { RouteCard } from '@/components/RouteCard';
import { WeatherBanner } from '@/components/WeatherBanner';
import { DemoBanner } from '@/components/DemoBanner';
import { NoRouteState } from '@/components/NoRouteState';
import { Map, MapIncident } from '@/components/Map';
import { ReportIncidentModal } from '@/components/ReportIncidentModal';

const POLL_INTERVAL_MS = 60_000;

export default function HomePage() {
  // Form state
  const [originLat, setOriginLat] = useState('19.1120');
  const [originLon, setOriginLon] = useState('72.8320');
  const [destLat, setDestLat] = useState('19.1380');
  const [destLon, setDestLon] = useState('72.8550');
  const [mode, setMode] = useState<'walking' | 'driving-traffic'>('walking');
  const [heatSensitive, setHeatSensitive] = useState(false);

  // Route analysis
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseRoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Map / incidents
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const bboxRef = useRef<[number, number, number, number] | null>(null);

  // Report modal
  const [reportCoords, setReportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // ---- Incident polling ----
  const fetchIncidents = useCallback(async () => {
    if (!bboxRef.current) return;
    const [lngMin, latMin, lngMax, latMax] = bboxRef.current;
    try {
      const res = await api.getIncidents(lngMin, latMin, lngMax, latMax);
      setIncidents(res.incidents);
    } catch { /* fail silently — map still usable without incidents */ }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchIncidents, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchIncidents]);

  const handleBboxChange = useCallback((bbox: [number, number, number, number]) => {
    bboxRef.current = bbox;
    fetchIncidents();
  }, [fetchIncidents]);

  // ---- Route analysis ----
  async function handleAnalyse(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.analyseRoutes({
        origin: { lat: parseFloat(originLat), lon: parseFloat(originLon) },
        destination: { lat: parseFloat(destLat), lon: parseFloat(destLon) },
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

  // ---- Report incident ----
  function handleMapClick(lat: number, lon: number) {
    setReportCoords({ lat, lon });
  }

  function handleReportSuccess(incidentId: string) {
    setReportCoords(null);
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 4000);
    fetchIncidents(); // refresh immediately
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold">\uD83C\uDF0A HeatFlood Guardian</h1>
          <p className="text-[11px] text-gray-400">Mumbai pilot — Andheri West / Versova</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 hidden sm:block">Demo scenarios:</span>
          {['heat', 'flood', 'compound'].map(id => (
            <button key={id} onClick={() => loadDemo(id)}
              className="text-xs bg-yellow-800 hover:bg-yellow-700 text-yellow-100 px-2.5 py-1 rounded-lg transition">
              {id}
            </button>
          ))}
        </div>
      </header>

      {/* Report success toast */}
      {showReportSuccess && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          \u2713 Hazard report submitted
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-88 flex-shrink-0 overflow-y-auto bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-3">
          <form onSubmit={handleAnalyse} className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">Click the map to report a hazard. Click Analyse to compare routes.</p>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-xs text-gray-500 mb-1">Origin (lat, lon)</legend>
              <div className="flex gap-2">
                <input value={originLat} onChange={e => setOriginLat(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700" />
                <input value={originLon} onChange={e => setOriginLon(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700" />
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-xs text-gray-500 mb-1">Destination (lat, lon)</legend>
              <div className="flex gap-2">
                <input value={destLat} onChange={e => setDestLat(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700" />
                <input value={destLon} onChange={e => setDestLon(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700" />
              </div>
            </fieldset>

            <div className="flex gap-4 items-center">
              <select value={mode} onChange={e => setMode(e.target.value as typeof mode)}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700">
                <option value="walking">Walking</option>
                <option value="driving-traffic">Driving</option>
              </select>
              <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={heatSensitive}
                  onChange={e => setHeatSensitive(e.target.checked)} className="rounded" />
                Heat sensitive
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition">
              {loading ? 'Analysing\u2026' : 'Analyse Routes'}
            </button>
          </form>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-200 p-3 text-sm">{error}</div>
          )}

          {result && (
            <div className="flex flex-col gap-2">
              {result.isReplay && <DemoBanner scenarioId={result.scenarioId} />}
              <WeatherBanner weather={result.weather} isReplay={result.isReplay} />
              {!result.hasConfidentRecommendation ? (
                <NoRouteState reason={result.noConfidentRouteReason} isReplay={result.isReplay} />
              ) : (
                result.routes.map(route => (
                  <RouteCard key={route.routeId} route={route}
                    isSelected={selectedRouteId === route.routeId}
                    onSelect={() => setSelectedRouteId(route.routeId)}
                    isReplay={result.isReplay} />
                ))
              )}
              <p className="text-[10px] text-gray-600">
                ID: {result.requestId} · {new Date(result.processedAt).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Incident counter */}
          {incidents.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              {incidents.length} active hazard{incidents.length !== 1 ? 's' : ''} in view
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            routes={result?.routes ?? []}
            selectedRouteId={selectedRouteId}
            incidents={incidents}
            onBboxChange={handleBboxChange}
            onRequestReport={handleMapClick}
          />
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
