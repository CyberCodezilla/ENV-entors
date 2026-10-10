'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Clock, Sun } from 'lucide-react';

export function TimeScrubber() {
  const { analysis, departureTime, setDepartureTime, analyse } = useAppStore();
  const [offsetMinutes, setOffsetMinutes] = useState(0); // 0 to 720 (12 hours)
  const baseTimeRef = useRef(new Date());

  // Debounce re-analysis on slider change (600ms per M7 spec)
  // MUST be called before any conditional return to satisfy React Rules of Hooks
  useEffect(() => {
    if (analysis.phase !== 'success' || !analysis.data || offsetMinutes === 0) return;

    const currentDeparture = new Date(baseTimeRef.current.getTime() + offsetMinutes * 60_000);
    const timer = setTimeout(() => {
      setDepartureTime(currentDeparture.toISOString());
      analyse();
    }, 600);

    return () => clearTimeout(timer);
  }, [offsetMinutes, analysis.phase, analysis.data, analyse, setDepartureTime]);

  // Only render when route analysis is available
  if (analysis.phase !== 'success' || !analysis.data) return null;

  const currentDeparture = new Date(baseTimeRef.current.getTime() + offsetMinutes * 60_000);
  const formattedIST = currentDeparture.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Calculate IST diurnal heat curve value for sparkline
  const istMinutes = (currentDeparture.getUTCHours() * 60 + currentDeparture.getUTCMinutes() + 330) % 1440;
  const istHour = Math.floor(istMinutes / 60);
  const heatStressScore =
    istHour >= 11 && istHour <= 16
      ? 100
      : istHour >= 10 && istHour <= 17
      ? 60
      : istHour >= 9 && istHour <= 18
      ? 30
      : 10;

  return (
    <div
      role="region"
      aria-label="Departure time scrubber"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-lg border border-line-strong shadow-glass flex flex-col gap-2 w-96 max-w-[calc(100vw-32px)] animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-ink font-semibold">
          <Clock className="w-3.5 h-3.5 text-flood" />
          <span>Departing {formattedIST} IST</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <Sun className="w-3.5 h-3.5 text-heat" />
          <span className="text-ink-3">
            Solar Load: <strong className="text-heat">{heatStressScore}/100</strong>
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative flex items-center">
        <input
          type="range"
          min={0}
          max={720}
          step={15}
          value={offsetMinutes}
          onChange={(e) => setOffsetMinutes(Number(e.target.value))}
          className="w-full accent-flood bg-raised h-1.5 rounded-pill appearance-none cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-ink-3">
        <span>Now</span>
        <span>+3h</span>
        <span>+6h</span>
        <span>+9h</span>
        <span>+12h</span>
      </div>
    </div>
  );
}