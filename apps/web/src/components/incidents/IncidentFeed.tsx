'use client';

import React, { useState } from 'react';
import type { Incident } from '@/lib/api/types';
import { IncidentCard } from './IncidentCard';
import { ShieldCheck, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

export interface IncidentFeedProps {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}

export function IncidentFeed({ incidents, onSelectIncident }: IncidentFeedProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out rejected incidents
  const activeIncidents = incidents.filter((i) => i.status !== 'rejected');

  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass-panel px-3 py-1.5 rounded-pill flex items-center gap-2 border border-line-strong shadow-glass text-xs font-mono font-semibold text-ink hover:text-white transition"
      >
        <span className={`w-2 h-2 rounded-full ${activeIncidents.length > 0 ? 'bg-heat animate-pulse' : 'bg-conf-good'}`} />
        <span>Hazards in View ({activeIncidents.length})</span>
        {isExpanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded feed drawer */}
      {isExpanded && (
        <aside
          aria-label="Active community hazards feed"
          className="glass-panel w-80 max-h-96 overflow-y-auto mt-2 p-3 rounded-lg border border-line shadow-glass flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between pb-1 border-b border-line">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3">
              Active Viewport Hazards
            </span>
            <span className="text-[10px] font-mono text-ink-3">
              Refreshes 20s
            </span>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <ShieldCheck className="w-8 h-8 text-conf-good opacity-70" />
              <p className="text-xs text-ink-2 font-medium">
                All clear in view — last checked just now.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeIncidents.map((inc) => (
                <IncidentCard
                  key={inc.incidentId}
                  incident={inc}
                  onClick={() => onSelectIncident?.(inc)}
                />
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}