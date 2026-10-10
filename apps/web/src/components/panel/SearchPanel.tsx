'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { PlaceInput } from './PlaceInput';
import { AnalyzeBar } from './AnalyzeBar';
import { ResultsStack } from './ResultsStack';
import { X, Film } from 'lucide-react';

export function SearchPanel() {
  const {
    origin,
    setOrigin,
    destination,
    setDestination,
    mapPickingTarget,
    setMapPickingTarget,
    replay,
    exitReplay,
  } = useAppStore();

  return (
    <aside
      aria-label="Route analysis panel"
      className="glass-panel w-full md:w-[408px] h-full max-h-screen overflow-y-auto p-4 flex flex-col gap-4 border-r border-line shadow-glass z-20 shrink-0"
    >
      {/* Replay Theater Active Badge (M6) */}
      {replay.active && (
        <div className="flex items-center justify-between p-2 rounded-md bg-risk-1/20 border border-risk-1/50 text-risk-1 text-xs font-mono font-bold animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>REPLAY: {replay.scenarioId?.toUpperCase()}</span>
          </div>
          <button
            onClick={exitReplay}
            title="Exit disaster replay"
            aria-label="Exit disaster replay"
            className="text-risk-1 hover:text-white p-0.5 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Origin / Destination Search */}
      <div className="flex flex-col gap-2.5">
        <PlaceInput
          label="Origin"
          value={origin}
          onChange={setOrigin}
          onPickOnMap={() =>
            setMapPickingTarget(mapPickingTarget === 'origin' ? null : 'origin')
          }
          isPicking={mapPickingTarget === 'origin'}
        />

        <PlaceInput
          label="Destination"
          value={destination}
          onChange={setDestination}
          onPickOnMap={() =>
            setMapPickingTarget(
              mapPickingTarget === 'destination' ? null : 'destination'
            )
          }
          isPicking={mapPickingTarget === 'destination'}
        />
      </div>

      {/* Analyze Bar Controls */}
      <AnalyzeBar />

      {/* Results Stack */}
      <ResultsStack />
    </aside>
  );
}