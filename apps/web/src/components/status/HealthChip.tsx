'use client';

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { HealthResponse } from '@/lib/api/types';

export function HealthChip() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function probeHealth() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api.getHealth();
        setHealth(res);
      } catch {
        setHealth(null);
      }
    }

    probeHealth();
    timer = setInterval(probeHealth, 60_000);

    return () => clearInterval(timer);
  }, []);

  const isHealthy = health?.status === 'ok';

  return (
    <div
      title="AWS Backend Diagnostic Status (Auto-refreshes 60s)"
      className="glass-panel px-2.5 py-1.5 rounded-md flex items-center gap-2 text-xs font-mono text-ink-2 shadow-glass border border-line"
    >
      <Activity
        className={`w-3.5 h-3.5 ${
          isHealthy ? 'text-flood animate-pulse' : 'text-risk-4'
        }`}
      />

      <span className="text-ink font-semibold">
        {health ? `v${health.version}` : 'Offline'}
      </span>

      <span className="text-ink-3 hidden sm:inline">· {health?.region ?? 'ap-south-1'}</span>

      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isHealthy ? 'bg-conf-good shadow-glow' : 'bg-risk-4'
        }`}
      />

      <span className="text-[10px] text-ink-3 hidden lg:inline">
        ML: {health?.sagemakerEnabled ? 'Active' : 'Heuristic'}
      </span>
    </div>
  );
}