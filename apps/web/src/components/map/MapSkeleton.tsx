'use client';

import React from 'react';
import { Compass } from 'lucide-react';

export default function MapSkeleton() {
  return (
    <div className="w-full h-full bg-void relative flex items-center justify-center overflow-hidden">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148, 184, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 184, 255, 0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radar circle pulse */}
      <div className="relative flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full border border-flood/30 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border border-flood/40 animate-ping opacity-30" />
          <Compass className="w-8 h-8 text-flood animate-spin duration-1000" />
        </div>
        <p className="text-xs font-mono text-ink-2 tracking-wide uppercase">
          Initializing Mapbox Cockpit...
        </p>
      </div>
    </div>
  );
}