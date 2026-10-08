/**
 * Home page — route analysis entry point.
 * Day 2: origin/destination pickers + route result panel.
 * Map component added on Day 3.
 */
'use client';

import { useState } from 'react';
import type { AnalyseRoutesResponse } from '@heatflood/shared';
import { api } from '@/lib/apiClient';
import { RouteCard } from '@/components/RouteCard';
import { WeatherBanner } from '@/components/WeatherBanner';
import { DemoBanner } from '@/components/DemoBanner';
import { NoRouteState } from '@/components/NoRouteState';

const PILOT_CENTER = { lat: 19.1197, lon: 72.8477 }; // Andheri area

export default function HomePage() {
  const [originLat, setOriginLat] = useState('19.1120');
  const [originLon, setOriginLon] = useState('72.8320');
  const [destLat, setDestLat] = useState('19.1380');
  const [destLon, setDestLon] = useState('72.8550');
  const [mode, setMode] = useState<'walking' | 'driving-traffic'>('walking');
  const [heatSensitive, setHeatSensitive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseRoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">\uD83C\uDF0A HeatFlood Guardian</h1>
          <p className="text-xs text-gray-400">Mumbai pilot — Andheri West / Versova</p>
        </div>
        <div className="flex gap-2">
          {['heat', 'flood', 'compound'].map(id => (
            <button
              key={id}
              onClick={() => loadDemo(id)}
              className="text-xs bg-yellow-800 hover:bg-yellow-700 text-yellow-100 px-3 py-1.5 rounded-lg transition"
            >
              Demo: {id}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 flex-shrink-0 overflow-y-auto bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4">

          {/* Route form */}
          <form onSubmit={handleAnalyse} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-300">Route Analysis</h2>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-xs text-gray-500 mb-1">Origin (lat, lon)</legend>
              <div className="flex gap-2">
                <input value={originLat} onChange={e => setOriginLat(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
                  placeholder="lat" />
                <input value={originLon} onChange={e => setOriginLon(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
                  placeholder="lon" />
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-xs text-gray-500 mb-1">Destination (lat, lon)</legend>
              <div className="flex gap-2">
                <input value={destLat} onChange={e => setDestLat(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
                  placeholder="lat" />
                <input value={destLon} onChange={e => setDestLon(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
                  placeholder="lon" />
              </div>
            </fieldset>

            <div className="flex gap-4 items-center">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <select value={mode} onChange={e => setMode(e.target.value as typeof mode)}
                  className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700">
                  <option value="walking">Walking</option>
                  <option value="driving-traffic">Driving</option>
                </select>
              </label>
              <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={heatSensitive}
                  onChange={e => setHeatSensitive(e.target.checked)}
                  className="rounded" />
                Heat sensitive
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition">
              {loading ? 'Analysing\u2026' : 'Analyse Route'}
            </button>
          </form>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-200 p-3 text-sm">{error}</div>
          )}

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-3">
              {result.isReplay && <DemoBanner scenarioId={result.scenarioId} />}
              <WeatherBanner weather={result.weather} isReplay={result.isReplay} />

              {!result.hasConfidentRecommendation ? (
                <NoRouteState reason={result.noConfidentRouteReason} isReplay={result.isReplay} />
              ) : (
                <div className="flex flex-col gap-2">
                  {result.routes.map(route => (
                    <RouteCard
                      key={route.routeId}
                      route={route}
                      isSelected={selectedRouteId === route.routeId}
                      onSelect={() => setSelectedRouteId(route.routeId)}
                      isReplay={result.isReplay}
                    />
                  ))}
                </div>
              )}

              <p className="text-[10px] text-gray-600">
                Request ID: {result.requestId} · Processed: {new Date(result.processedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </aside>

        {/* Map area placeholder — Day 3 adds MapboxGL */}
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-600">
            <div className="text-5xl mb-3">\uD83D\uDDFA\uFE0F</div>
            <p className="text-sm">Mapbox map renders here — Day 3</p>
            <p className="text-xs mt-1">Route geometries will draw as coloured overlays</p>
          </div>
        </div>
      </div>
    </main>
  );
}
