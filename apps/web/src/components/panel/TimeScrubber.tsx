'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Clock, Sun, Loader2 } from 'lucide-react';

export function TimeScrubber() {
  const { analysis, setDepartureTime, analyse } = useAppStore();
  const [offsetMinutes, setOffsetMinutes] = useState(0); // 0 to 720 (12 hours)
  const baseTimeRef = useRef(new Date());
  const prevOffsetRef = useRef(0);

  // Debounce re-analysis strictly when offsetMinutes changes
  // Guarded with prevOffsetRef to completely prevent recursive re-analysis loops
  useEffect(() => {
    if (offsetMinutes === prevOffsetRef.current) return;
    prevOffsetRef.current = offsetMinutes;

    if (!analysis.data) return;

    const currentDeparture = new Date(baseTimeRef.current.getTime() + offsetMinutes * 60_000);
    setDepartureTime(currentDeparture.toISOString());

    const timer = setTimeout(() => {
      analyse();
    }, 600);

    return () => clearTimeout(timer);
  }, [offsetMinutes, analysis.data, setDepartureTime, analyse]);

  // Keep mounted as long as analysis data exists (never unmount during background re-analysis)
  if (!analysis.data) return null;

  const isUpdating = analysis.phase === 'analysing';
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
          {isUpdating && (
            <Loader2 className="w-3 h-3 text-flood animate-spin ml-1" />
          )}
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
