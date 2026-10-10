'use client';

import React from 'react';
import { AlertOctagon } from 'lucide-react';

export interface EmergencyAdvisoryProps {
  reason: string | null;
}

export function EmergencyAdvisory({ reason }: EmergencyAdvisoryProps) {
  return (
    <div
      role="alert"
      className="glass-panel border-risk-4/50 bg-risk-4/10 rounded-md p-4 flex flex-col gap-3 shadow-glass animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2.5 text-risk-4">
        <AlertOctagon className="w-5 h-5 shrink-0 animate-pulse" />
        <h3 className="font-display font-bold text-sm tracking-wide uppercase">
          No Safe Route Recommended
        </h3>
      </div>

      <p className="text-xs text-ink-2 leading-relaxed">
        {reason ||
          'All available pedestrian and road routes intersect documented hazard evidence or have limited data confidence.'}
      </p>

      <div className="rounded-sm bg-base/80 border border-risk-4/30 p-2.5 text-xs text-ink font-medium leading-snug">
        <span className="text-heat font-bold mr-1.5">⚡ Emergency corridor:</span>
        Prefer elevated transit corridors (e.g. Mumbai Metro Line 1 / Line 2A) and official civic
        shelters. Never enter floodwater.
      </div>
    </div>
  );
}