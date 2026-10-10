'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Shield, Clock, SunMedium, Footprints, Car } from 'lucide-react';

export function AnalyzeBar() {
  const {
    origin,
    destination,
    mode,
    setMode,
    heatSensitive,
    setHeatSensitive,
    departureTime,
    setDepartureTime,
    analyse,
    analysis,
  } = useAppStore();

  const isAnalyzing = analysis.phase === 'analysing';
  const canAnalyze = origin !== null && destination !== null;

  // Format departure ISO string to local input value (YYYY-MM-DDTHH:mm)
  const localDateTimeValue = new Date(departureTime).toISOString().slice(0, 16);

  function handleDepartureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const localVal = e.target.value;
    if (localVal) {
      setDepartureTime(new Date(localVal).toISOString());
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mode & Heat Sensitive Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
        {/* Mode Segmented Control */}
        <div className="glass-panel p-0.5 rounded-md flex items-center bg-base border border-line">
          <button
            type="button"
            onClick={() => setMode('walking')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition ${
              mode === 'walking'
                ? 'bg-raised text-flood font-bold shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walking</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('driving-traffic')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition ${
              mode === 'driving-traffic'
                ? 'bg-raised text-heat font-bold shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driving</span>
          </button>
        </div>

        {/* Heat Sensitive Switch */}
        <label
          title="For elderly, pregnancy, children, or heart conditions — routes favor shade and shorter exposure."
          className="flex items-center gap-2 cursor-pointer text-xs text-ink-2 select-none"
        >
          <input
            type="checkbox"
            checked={heatSensitive}
            onChange={(e) => setHeatSensitive(e.target.checked)}
            className="w-3.5 h-3.5 accent-heat rounded cursor-pointer"
          />
          <span className="flex items-center gap-1">
            <SunMedium className="w-3.5 h-3.5 text-heat" />
            <span>Heat sensitive</span>
          </span>
        </label>
      </div>

      {/* Departure Time Input */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-ink-3 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>Departure (IST)</span>
        </label>

        <input
          type="datetime-local"
          value={localDateTimeValue}
          onChange={handleDepartureChange}
          className="glass-panel bg-base/80 text-ink text-xs font-mono rounded-md px-2 py-1 border border-line focus:border-flood/60 focus:bg-base outline-none"
        />
      </div>

      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="lg"
        loading={isAnalyzing}
        disabled={!canAnalyze}
        onClick={() => analyse()}
        className="w-full mt-1 font-display tracking-wide uppercase text-xs"
        icon={<Shield className="w-4 h-4 fill-void text-void" />}
      >
        {isAnalyzing ? 'Fusing weather · community reports · ML…' : 'Analyze Route'}
      </Button>
    </div>
  );
}