'use client';

import React, { useState } from 'react';
import {
  X,
  Play,
  Sliders,
  MapPin,
  Navigation,
  ShieldAlert,
  Sparkles,
  CloudRain,
  Sun,
  Flame,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { ScenarioCard } from './ScenarioCard';
import { useAppStore } from '@/lib/store/useAppStore';
import type { Place } from '@/lib/api/types';

export interface ReplayTheaterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MUMBAI_SIMULATION_LANDMARKS: Array<{
  name: string;
  lat: number;
  lon: number;
  area: string;
}> = [
  { name: 'Versova Metro Terminal', lat: 19.135, lon: 72.818, area: 'Versova' },
  { name: 'Andheri Railway Station (SV Road)', lat: 19.1197, lon: 72.8465, area: 'Andheri West' },
  { name: 'DN Nagar Metro Interchange', lat: 19.1245, lon: 72.8354, area: 'DN Nagar' },
  { name: 'Lokhandwala Complex Market', lat: 19.138, lon: 72.828, area: 'Lokhandwala' },
  { name: 'Kokilaben Dhirubhai Ambani Hospital', lat: 19.131, lon: 72.825, area: 'Four Bungalows' },
  { name: 'Seven Bungalows Bus Terminal', lat: 19.1285, lon: 72.821, area: 'Seven Bungalows' },
  { name: 'Four Bungalows Market', lat: 19.126, lon: 72.828, area: 'Four Bungalows' },
  { name: 'Azad Nagar Metro (Bhavans College)', lat: 19.125, lon: 72.8385, area: 'Azad Nagar' },
  { name: 'Oshiwara River Bridge Crossing', lat: 19.143, lon: 72.833, area: 'Oshiwara' },
  { name: 'Versova Fishing Village & Koliwada', lat: 19.1315, lon: 72.815, area: 'Versova Beach' },
  { name: 'Juhu Circle (Kaifi Azmi Park)', lat: 19.114, lon: 72.83, area: 'Juhu' },
];

export function ReplayTheater({ isOpen: propsIsOpen, onClose: propsOnClose }: ReplayTheaterProps) {
  const {
    isSimulationOpen,
    setSimulationOpen,
    startReplay,
    origin,
    destination,
  } = useAppStore();

  const isOpen = propsIsOpen ?? isSimulationOpen;
  const handleClose = () => {
    if (propsOnClose) propsOnClose();
    setSimulationOpen(false);
  };

  const [filterType, setFilterType] = useState<'all' | 'flood' | 'heat' | 'compound'>('all');
  const [selectedOriginIdx, setSelectedOriginIdx] = useState(0);
  const [selectedDestIdx, setSelectedDestIdx] = useState(1);
  const [customScenarioId, setCustomScenarioId] = useState<'flood' | 'heat' | 'compound'>('flood');

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'flood' as const,
      title: 'Monsoon Flash Flood — Andheri Subway Inundation',
      badge: '32.5 mm/h Downpour',
      corridor: {
        originName: 'Versova Metro Terminal',
        destinationName: 'Andheri Station (SV Road)',
      },
      locations: {
        origin: { name: 'Versova Metro Terminal', lat: 19.135, lon: 72.818 },
        destination: { name: 'Andheri Station (SV Road)', lat: 19.1197, lon: 72.8465 },
      },
      description:
        'Torrential monsoon cloudburst with 3 verified waterlogging closures near Andheri subway. Demonstrates hard-blocking of submerged underpasses and diversion onto elevated arterial flyovers.',
      metrics: {
        rain: '32.5 mm/h',
        hazards: '3 Submerged Underpasses',
      },
    },
    {
      id: 'heat' as const,
      title: 'Peak Summer Heatwave — Lokhandwala Corridor',
      badge: '43.2°C Feels-Like',
      corridor: {
        originName: 'DN Nagar Metro Interchange',
        destinationName: 'Lokhandwala Market',
      },
      locations: {
        origin: { name: 'DN Nagar Metro Interchange', lat: 19.1245, lon: 72.8354 },
        destination: { name: 'Lokhandwala Complex Market', lat: 19.138, lon: 72.828 },
      },
      description:
        'Extreme dry heatwave with 88% humidity and severe direct solar radiation on Link Road. Demonstrates heat-sensitive pedestrian routing favoring shaded residential streets and tree canopy cover.',
      metrics: {
        temp: '43.2°C',
        hazards: 'Direct Solar UV 11+',
      },
    },
    {
      id: 'compound' as const,
      title: 'Cascading Disaster — Coastal Surge & Hospital Access',
      badge: 'Emergency Corridor',
      corridor: {
        originName: 'Versova Beach & Village',
        destinationName: 'Kokilaben Hospital',
      },
      locations: {
        origin: { name: 'Versova Fishing Village & Koliwada', lat: 19.1315, lon: 72.815 },
        destination: { name: 'Kokilaben Dhirubhai Ambani Hospital', lat: 19.131, lon: 72.825 },
      },
      description:
        'High-tide coastal surge fused with 38.5°C residual heat and impassable ground roads. Triggers the safety guarantee: "No route can be recommended confidently", advising elevated Metro Line 2A.',
      metrics: {
        temp: '38.5°C',
        rain: '24.0 mm/h',
        hazards: 'Critical Hospital Access',
      },
    },
    {
      id: 'heat' as const,
      title: 'Midday Concrete Heat Trap — Seven Bungalows to Azad Nagar',
      badge: '41.5°C Heat Island',
      corridor: {
        originName: 'Seven Bungalows Terminal',
        destinationName: 'Azad Nagar Metro / Bhavans',
      },
      locations: {
        origin: { name: 'Seven Bungalows Bus Terminal', lat: 19.1285, lon: 72.821 },
        destination: { name: 'Azad Nagar Metro (Bhavans College)', lat: 19.125, lon: 72.8385 },
      },
      description:
        'Afternoon rush-hour heat exposure along major unshaded asphalt thoroughfares. Tests pedestrian thermal comfort scoring and exposure-time minimization for vulnerable populations.',
      metrics: {
        temp: '41.5°C',
        hazards: 'High Concrete Thermal Mass',
      },
    },
    {
      id: 'flood' as const,
      title: 'Oshiwara River Overflow — Link Road Flash Inundation',
      badge: '36.8 mm/h Cloudburst',
      corridor: {
        originName: 'Four Bungalows Market',
        destinationName: 'Oshiwara Bridge Crossing',
      },
      locations: {
        origin: { name: 'Four Bungalows Market', lat: 19.126, lon: 72.828 },
        destination: { name: 'Oshiwara River Bridge Crossing', lat: 19.143, lon: 72.833 },
      },
      description:
        'Storm runoff exceeds Oshiwara river channel capacity, causing reverse backflow onto New Link Road intersections. Guardian dynamic routing forces diversions around flood polygons.',
      metrics: {
        rain: '36.8 mm/h',
        hazards: 'Drain Surcharge & 0.85m Water',
      },
    },
    {
      id: 'compound' as const,
      title: 'Pre-Monsoon Squall & Peak Traffic — Juhu Coastal Fringe',
      badge: 'Compound Gridlock',
      corridor: {
        originName: 'Juhu Circle (Kaifi Azmi)',
        destinationName: 'Andheri Station (West)',
      },
      locations: {
        origin: { name: 'Juhu Circle (Kaifi Azmi Park)', lat: 19.114, lon: 72.83 },
        destination: { name: 'Andheri Railway Station (SV Road)', lat: 19.1197, lon: 72.8465 },
      },
      description:
        'Pre-monsoon squall meets high humidity and surface water accumulation along arterial roads, testing multi-hazard composite scoring under peak evening traffic conditions.',
      metrics: {
        temp: '39.8°C',
        rain: '18.2 mm/h',
        hazards: 'Compound Risk 88/100',
      },
    },
  ];

  const filteredScenarios = scenarios.filter((s) => {
    if (filterType === 'all') return true;
    return s.id === filterType;
  });

  const handleLaunchSimulation = (
    scenarioId: 'heat' | 'flood' | 'compound',
    locations?: { origin: Place; destination: Place }
  ) => {
    startReplay(scenarioId, locations);
    handleClose();
  };

  const handleLaunchCustomPreset = () => {
    const o = MUMBAI_SIMULATION_LANDMARKS[selectedOriginIdx];
    const d = MUMBAI_SIMULATION_LANDMARKS[selectedDestIdx];
    handleLaunchSimulation(customScenarioId, {
      origin: { name: o.name, lat: o.lat, lon: o.lon },
      destination: { name: d.name, lat: d.lat, lon: d.lon },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Disaster Simulation Suite"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-void/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-panel w-full max-w-5xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-xl border border-line-strong shadow-glass flex flex-col gap-6 animate-in zoom-in-95 duration-200 bg-void/90">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-heat/20 border border-heat/40 text-heat shadow-glowHeat">
              <Play className="w-5 h-5 fill-heat" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display font-bold text-lg sm:text-xl text-ink tracking-tight">
                  Disaster & Extreme Weather Simulation Suite
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-heat/20 text-heat border border-heat/40 font-bold uppercase tracking-wide">
                  6 Mumbai Corridors
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Stress-test HeatFlood Guardian against reconstructed disaster fixtures across Mumbai's urban pilot corridors.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close simulation suite"
            className="text-ink-3 hover:text-ink p-1.5 rounded-md hover:bg-raised transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Interactive Corridor Simulator Box */}
        <div className="p-4 rounded-lg bg-raised/50 border border-line flex flex-col gap-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
              <Compass className="w-4 h-4 text-flood" />
              <span>TEST ANY MUMBAI CORRIDOR WITH DISASTER SCENARIOS</span>
            </div>
            <span className="text-[11px] font-mono text-ink-3">
              Fuses real Mapbox road graphs with live backend hazard models
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Origin Landmark Selector */}
            <div className="sm:col-span-4 flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-ink-3 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-flood" /> Origin Landmark
              </label>
              <select
                value={selectedOriginIdx}
                onChange={(e) => setSelectedOriginIdx(Number(e.target.value))}
                className="bg-base border border-line text-ink text-xs font-sans rounded-md p-2 outline-none focus:border-flood"
              >
                {MUMBAI_SIMULATION_LANDMARKS.map((item, idx) => (
                  <option key={`origin-${idx}`} value={idx}>
                    {item.name} ({item.area})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Landmark Selector */}
            <div className="sm:col-span-4 flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-ink-3 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-heat" /> Destination Landmark
              </label>
              <select
                value={selectedDestIdx}
                onChange={(e) => setSelectedDestIdx(Number(e.target.value))}
                className="bg-base border border-line text-ink text-xs font-sans rounded-md p-2 outline-none focus:border-heat"
              >
                {MUMBAI_SIMULATION_LANDMARKS.map((item, idx) => (
                  <option key={`dest-${idx}`} value={idx}>
                    {item.name} ({item.area})
                  </option>
                ))}
              </select>
            </div>

            {/* Hazard Simulation Type */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-ink-3">Hazard Event</label>
              <select
                value={customScenarioId}
                onChange={(e) =>
                  setCustomScenarioId(e.target.value as 'flood' | 'heat' | 'compound')
                }
                className="bg-base border border-line text-ink text-xs font-sans rounded-md p-2 outline-none focus:border-risk-4"
              >
                <option value="flood">🌧️ Flash Flood</option>
                <option value="heat">☀️ Heatwave</option>
                <option value="compound">⚡ Compound</option>
              </select>
            </div>

            {/* Run Button */}
            <div className="sm:col-span-2 flex flex-col gap-1 sm:pt-4">
              <button
                type="button"
                onClick={handleLaunchCustomPreset}
                className="w-full py-2 px-3 rounded-md bg-heat hover:bg-heat/90 text-void font-display font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Play className="w-3.5 h-3.5 fill-void" />
                <span>Run Simulation</span>
              </button>
            </div>
          </div>

          {/* Quick Action if User Has Custom Active Route */}
          {origin && destination && (
            <div className="pt-2 border-t border-line/60 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-ink-2 truncate max-w-lg">
                <span className="text-ink-3">Your Map Route:</span>
                <span className="font-semibold text-ink truncate">{origin.name}</span>
                <span className="text-ink-3">➔</span>
                <span className="font-semibold text-ink truncate">{destination.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLaunchSimulation('flood', { origin, destination })}
                  className="px-2.5 py-1 rounded bg-flood/15 border border-flood/40 text-flood font-bold hover:bg-flood/25 transition text-[11px] flex items-center gap-1"
                >
                  <CloudRain className="w-3 h-3" />
                  <span>Simulate Flood on My Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchSimulation('heat', { origin, destination })}
                  className="px-2.5 py-1 rounded bg-heat/15 border border-heat/40 text-heat font-bold hover:bg-heat/25 transition text-[11px] flex items-center gap-1"
                >
                  <Sun className="w-3 h-3" />
                  <span>Simulate Heat on My Route</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-md bg-base border border-line text-xs font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-sm transition ${
                filterType === 'all'
                  ? 'bg-raised text-white font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              All Mumbai Corridors ({scenarios.length})
            </button>
            <button
              onClick={() => setFilterType('flood')}
              className={`px-3 py-1 rounded-sm transition ${
                filterType === 'flood'
                  ? 'bg-raised text-flood font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Monsoon Floods
            </button>
            <button
              onClick={() => setFilterType('heat')}
              className={`px-3 py-1 rounded-sm transition ${
                filterType === 'heat'
                  ? 'bg-raised text-heat font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Extreme Heatwaves
            </button>
            <button
              onClick={() => setFilterType('compound')}
              className={`px-3 py-1 rounded-sm transition ${
                filterType === 'compound'
                  ? 'bg-raised text-risk-4 font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Compound Disasters
            </button>
          </div>

          <span className="text-[11px] font-mono text-ink-3">
            Click any scenario to simulate routes & telemetry
          </span>
        </div>

        {/* Realistic Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((scen, idx) => (
            <ScenarioCard
              key={`${scen.id}-${idx}`}
              {...scen}
              onSelect={() => handleLaunchSimulation(scen.id, scen.locations)}
            />
          ))}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 pt-3 border-t border-line flex-wrap gap-2">
          <span>Press ESC or click ✕ to dismiss</span>
          <span>⚡ Fuses real Mapbox geometries with live backend ML scoring models</span>
        </div>
      </div>
    </div>
  );
}
