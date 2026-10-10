'use client';

import React from 'react';
import { useAppStore, type MetricLens as LensType } from '@/lib/store/useAppStore';
import { Layers, Droplets, Sun, CheckCircle2 } from 'lucide-react';

export function MetricLens() {
  const { metricLens, setMetricLens, analysis } = useAppStore();

  if (analysis.phase !== 'success' || !analysis.data) return null;

  const options: Array<{ id: LensType; label: string; icon: React.ReactNode }> = [
    { id: 'dominant', label: 'Dominant', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'flood', label: 'Flood', icon: <Droplets className="w-3.5 h-3.5 text-flood" /> },
    { id: 'heat', label: 'Heat', icon: <Sun className="w-3.5 h-3.5 text-heat" /> },
    { id: 'confidence', label: 'Confidence', icon: <CheckCircle2 className="w-3.5 h-3.5 text-conf-good" /> },
  ];

  return (
    <div
      role="group"
      aria-label="Metric map lens"
      className="absolute top-20 right-4 z-20 glass-panel p-1 rounded-md flex flex-col gap-1 border border-line shadow-glass animate-in fade-in"
    >
      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-3 px-2 py-0.5">
        Map Lens
      </span>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setMetricLens(opt.id)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs font-medium transition ${
            metricLens === opt.id
              ? 'bg-raised text-ink font-bold shadow-sm border border-line-strong'
              : 'text-ink-3 hover:text-ink hover:bg-raised/50'
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}