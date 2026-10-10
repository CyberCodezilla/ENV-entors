'use client';

import React from 'react';
import { X, Film } from 'lucide-react';
import { ScenarioCard } from './ScenarioCard';
import { useAppStore } from '@/lib/store/useAppStore';

export interface ReplayTheaterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReplayTheater({ isOpen, onClose }: ReplayTheaterProps) {
  const { startReplay } = useAppStore();

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'heat' as const,
      title: 'Peak Summer Heatwave',
      badge: '42.1°C Feels-Like',
      description:
        'Tests heat-sensitive commuter routing at 13:30 IST. Extreme apparent temperature with 85% humidity prioritizes shaded pedestrian walkways.',
      metrics: {
        temp: '42.1°C',
        hazards: '0 flood reports',
      },
    },
    {
      id: 'flood' as const,
      title: 'Monsoon Cloudburst',
      badge: '28.4 mm/hr Rain',
      description:
        'Severe monsoon flooding with 3 verified waterlogging reports near Versova underpass. Demonstrates hard-blocking of flooded underpasses.',
      metrics: {
        rain: '28.4 mm/hr',
        hazards: '3 active reports',
      },
    },
    {
      id: 'compound' as const,
      title: 'Cascading Compound Disaster',
      badge: 'Emergency Corridor',
      description:
        'Compound hazard: 38.5°C residual heat + 92% humidity with all road routes either flooded or blocked. Triggers emergency elevated transit guidance.',
      metrics: {
        temp: '38.5°C',
        rain: '2.1 mm/hr',
        hazards: 'Impassable',
      },
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Disaster Replay Theater"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-panel w-full max-w-4xl p-6 rounded-lg border border-line-strong shadow-glass flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-heat/20 border border-heat/40 text-heat">
              <Film className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-display font-bold text-lg text-ink">
                Disaster Replay Theater
              </h2>
              <p className="text-xs text-ink-2">
                Step into historical disaster conditions. Real Mapbox geometries fused with
                reconstructed weather & hazard fixtures.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close replay theater"
            className="text-ink-3 hover:text-ink p-1.5 rounded-sm hover:bg-raised transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scen) => (
            <ScenarioCard
              key={scen.id}
              {...scen}
              onSelect={() => {
                startReplay(scen.id);
                onClose();
              }}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="text-[11px] font-mono text-ink-3 text-center pt-2 border-t border-line">
          Press ESC or click outside to dismiss · Replay fixtures execute real backend scoring
          algorithms
        </div>
      </div>
    </div>
  );
}