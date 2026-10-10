'use client';

import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Droplets, MapPin, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { StatusResponse } from '@/lib/api/types';

export function WeatherPulse() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function fetchStatus() {
      if (document.visibilityState !== 'visible') return;
      try {
        // Pilot center coordinates: Andheri West (19.1197, 72.8477)
        const res = await api.getStatus(19.1197, 72.8477);
        setStatus(res);
      } catch {
        /* fail silently */
      }
    }

    fetchStatus();
    timer = setInterval(fetchStatus, 60_000); // 60s polling per Section 7.7

    function onVisible() {
      if (document.visibilityState === 'visible') fetchStatus();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!status) return null;

  const temp = status.weather.apparentTemperatureC;
  const isRain = (status.weather.precipitationMm ?? 0) > 0;
  const isStale = status.weather.isStale;

  return (
    <div className="relative">
      {/* Pulse Chip Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Live Mumbai Weather Pulse"
        className="glass-panel px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-mono border border-line-strong hover:border-flood/40 shadow-glass transition group"
      >
        {isRain ? (
          <CloudRain className="w-3.5 h-3.5 text-flood animate-bounce duration-1000" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-heat group-hover:rotate-45 transition-transform" />
        )}

        <span className="font-bold text-ink">
          {temp !== null ? `${temp.toFixed(1)}°C` : '--°C'}
        </span>

        {/* Freshness dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isStale ? 'bg-conf-moderate' : 'bg-conf-good shadow-glow'
          }`}
          title={isStale ? 'Weather data >30 min old' : 'Fresh weather observations'}
        />
      </button>

      {/* Popover on click */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Meteorological and hazard status popover"
          className="absolute top-full right-0 mt-2 z-50 glass-panel bg-base/95 p-3.5 rounded-lg border border-line-strong shadow-glass w-64 flex flex-col gap-2.5 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="font-display font-bold text-xs text-ink">
              Mumbai Weather Pulse
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-ink-3 hover:text-ink p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="glass-panel bg-raised/50 p-2 rounded-sm border border-line">
              <span className="text-[10px] text-ink-3 block">Feels-Like</span>
              <strong className="text-heat">{temp?.toFixed(1) ?? '--'} °C</strong>
            </div>
            <div className="glass-panel bg-raised/50 p-2 rounded-sm border border-line">
              <span className="text-[10px] text-ink-3 block">Precipitation</span>
              <strong className="text-flood">{status.weather.precipitationMm ?? 0} mm/h</strong>
            </div>
            <div className="glass-panel bg-raised/50 p-2 rounded-sm border border-line">
              <span className="text-[10px] text-ink-3 block">Humidity</span>
              <span className="text-ink">{status.weather.relativeHumidityPct ?? '--'}%</span>
            </div>
            <div className="glass-panel bg-raised/50 p-2 rounded-sm border border-line">
              <span className="text-[10px] text-ink-3 block">Active Hazards</span>
              <span className="text-ink">{status.activeIncidentCount} in area</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-line flex items-center justify-between text-[11px] font-mono text-ink-3">
            <span>Pilot Zone:</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-flood/10 text-flood font-bold uppercase">
              {status.pilotZoneStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}