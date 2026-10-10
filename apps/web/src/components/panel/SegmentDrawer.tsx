'use client';

import React from 'react';
import { X, Bot, CloudRain, Users, Landmark, Radio, MapPin, Zap } from 'lucide-react';
import type { Segment, SourceType } from '@/lib/api/types';
import { Chip } from '@/components/ui/Chip';

export interface SegmentDrawerProps {
  segment: Segment | null;
  onClose: () => void;
}

export function SegmentDrawer({ segment, onClose }: SegmentDrawerProps) {
  if (!segment) return null;

  const arrivalIST = new Date(segment.estimatedArrivalUtc).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const getSourceIcon = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'weather_derived':
        return <CloudRain className="w-3.5 h-3.5 text-flood" />;
      case 'community_report':
        return <Users className="w-3.5 h-3.5 text-heat" />;
      case 'official_closure':
        return <Landmark className="w-3.5 h-3.5 text-risk-4" />;
      case 'trusted_sensor':
        return <Radio className="w-3.5 h-3.5 text-conf-good" />;
      case 'historical_hotspot':
        return <MapPin className="w-3.5 h-3.5 text-conf-moderate" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-ink-2" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Segment ${segment.segmentIndex + 1} evidence details`}
      className="glass-panel border-line-strong rounded-lg p-4 flex flex-col gap-3 shadow-glass animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-ink">
              Segment #{segment.segmentIndex + 1}
            </span>
            <span className="font-mono text-xs text-ink-3">
              {Math.round(segment.segmentLengthM)} m
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-2">
            ETA {arrivalIST} IST
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close segment details"
          className="text-ink-3 hover:text-ink p-1 rounded-sm hover:bg-raised transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metric badges row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Chip
          variant="risk"
          riskLevel={segment.floodRiskLevel}
          label={`Flood: ${segment.floodRisk}`}
          mono
        />
        <Chip
          variant="risk"
          riskLevel={segment.heatRiskLevel}
          label={`Heat: ${segment.heatRisk}`}
          mono
        />
        <Chip
          variant="confidence"
          confidenceLevel={segment.confidenceLevel}
          label={`Confidence: ${segment.confidence}%`}
          mono
        />
        {segment.hardBlock && (
          <span className="px-2 py-0.5 rounded-pill bg-risk-4/20 text-risk-4 border border-risk-4/40 text-[10px] font-mono font-bold uppercase tracking-wide">
            Impassable
          </span>
        )}
      </div>

      {/* Hard Block Note */}
      {segment.hardBlock && segment.hardBlockReason && (
        <div className="p-2.5 rounded-sm bg-risk-4/15 border border-risk-4/30 text-xs text-risk-4 font-medium leading-snug">
          ⛔ {segment.hardBlockReason}
        </div>
      )}

      {/* Evidence Rows */}
      <div className="flex flex-col gap-2 mt-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3">
          Evidence Receipts ({segment.evidence.length})
        </span>

        {segment.evidence.length === 0 ? (
          <p className="text-xs text-ink-3 italic">
            Baseline environmental projection — no localized hazard records.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {segment.evidence.map((item, idx) => (
              <li
                key={idx}
                className="glass-panel bg-raised/40 p-2 rounded-sm border border-line text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    {getSourceIcon(item.sourceType)}
                    <span className="capitalize">{item.sourceType.replace('_', ' ')}</span>
                  </div>
                  {item.distanceM !== null && (
                    <span className="font-mono text-[10px] text-ink-3">
                      {Math.round(item.distanceM)}m away
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-2 leading-snug">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ML Signal Footer */}
      {segment.mlSignal?.available && (
        <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-flood">
            <Bot className="w-3.5 h-3.5" />
            <span>SageMaker ML Signal</span>
          </div>
          <span className="text-ink-2">
            Stress Prob: {Math.round((segment.mlSignal.probability ?? 0) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}