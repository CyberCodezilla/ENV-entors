'use client';

import React from 'react';
import { Sun, CloudRain, Flame, ArrowRight } from 'lucide-react';

export interface ScenarioCardProps {
  id: 'heat' | 'flood' | 'compound';
  title: string;
  badge: string;
  description: string;
  metrics: {
    temp?: string;
    rain?: string;
    hazards: string;
  };
  onSelect: () => void;
}

export function ScenarioCard({
  id,
  title,
  badge,
  description,
  metrics,
  onSelect,
}: ScenarioCardProps) {
  const getTheme = () => {
    switch (id) {
      case 'heat':
        return {
          border: 'border-heat/40 hover:border-heat',
          glow: 'hover:shadow-glowHeat',
          badgeBg: 'bg-heat/20 text-heat border-heat/40',
          icon: <Sun className="w-5 h-5 text-heat animate-spin duration-1000" />,
        };
      case 'flood':
        return {
          border: 'border-flood/40 hover:border-flood',
          glow: 'hover:shadow-glow',
          badgeBg: 'bg-flood/20 text-flood border-flood/40',
          icon: <CloudRain className="w-5 h-5 text-flood animate-bounce duration-1000" />,
        };
      case 'compound':
        return {
          border: 'border-risk-4/40 hover:border-risk-4',
          glow: 'hover:shadow-glass',
          badgeBg: 'bg-risk-4/20 text-risk-4 border-risk-4/40',
          icon: <Flame className="w-5 h-5 text-risk-4 animate-pulse" />,
        };
    }
  };

  const theme = getTheme();

  return (
    <article
      onClick={onSelect}
      className={`glass-panel p-5 rounded-lg border ${theme.border} ${theme.glow} cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 bg-raised/70 group hover:-translate-y-1`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-md bg-void/60 border border-line">
            {theme.icon}
          </div>
          <span
            className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-pill border ${theme.badgeBg}`}
          >
            {badge}
          </span>
        </div>

        <h3 className="font-display font-bold text-base text-ink group-hover:text-white transition">
          {title}
        </h3>

        <p className="text-xs text-ink-2 leading-relaxed">{description}</p>
      </div>

      <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3 text-ink-3">
          {metrics.temp && <span className="text-heat">{metrics.temp}</span>}
          {metrics.rain && <span className="text-flood">{metrics.rain}</span>}
          <span>{metrics.hazards}</span>
        </div>

        <span className="flex items-center gap-1 text-ink font-semibold group-hover:translate-x-1 transition text-xs">
          <span>Run Replay</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}