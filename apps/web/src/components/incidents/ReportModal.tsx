'use client';

import React, { useState } from 'react';
import { X, Droplets, Waves, Cone, ThermometerSun, Sun, Zap, AlertTriangle, Send } from 'lucide-react';
import type { IncidentType, DepthCategory } from '@/lib/api/types';
import { useAppStore } from '@/lib/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

export interface ReportModalProps {
  coords: { lat: number; lon: number } | null;
  onClose: () => void;
}

const PILOT_BBOX = {
  lngMin: 72.82,
  latMin: 19.1,
  lngMax: 72.87,
  latMax: 19.145,
};

export function ReportModal({ coords, onClose }: ReportModalProps) {
  const [type, setType] = useState<IncidentType>('waterlogging');
  const [depthCategory, setDepthCategory] = useState<DepthCategory>('knee');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { mode, addOptimisticReport, confirmOptimisticReport } = useAppStore();
  const { toast } = useToast();

  if (!coords) return null;

  const isOutsidePilot =
    coords.lat < PILOT_BBOX.latMin ||
    coords.lat > PILOT_BBOX.latMax ||
    coords.lon < PILOT_BBOX.lngMin ||
    coords.lon > PILOT_BBOX.lngMax;

  const typeOptions: Array<{ id: IncidentType; label: string; icon: React.ReactNode }> = [
    { id: 'waterlogging', label: 'Waterlogging', icon: <Droplets className="w-4 h-4 text-flood" /> },
    { id: 'underpass_flooded', label: 'Underpass Flooded', icon: <Waves className="w-4 h-4 text-flood" /> },
    { id: 'road_blocked', label: 'Road Blocked', icon: <Cone className="w-4 h-4 text-risk-4" /> },
    { id: 'extreme_heat', label: 'Extreme Heat', icon: <ThermometerSun className="w-4 h-4 text-heat" /> },
    { id: 'heat_exposure', label: 'Sun Exposure', icon: <Sun className="w-4 h-4 text-heat" /> },
    { id: 'electrical_hazard', label: 'Electrical Hazard', icon: <Zap className="w-4 h-4 text-risk-1" /> },
    { id: 'other', label: 'Other Hazard', icon: <AlertTriangle className="w-4 h-4 text-ink-2" /> },
  ];

  const depthOptions: Array<{ id: DepthCategory; label: string }> = [
    { id: 'ankle', label: 'Ankle (~15cm)' },
    { id: 'knee', label: 'Knee (~45cm)' },
    { id: 'vehicle_impassable', label: 'Impassable (>60cm)' },
    { id: 'none', label: 'None / Dry' },
  ];

  const showDepth = ['waterlogging', 'underpass_flooded', 'road_blocked'].includes(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) return;

    if (isOutsidePilot) {
      toast({
        variant: 'warn',
        message: 'Reports must be within the Mumbai pilot zone (Andheri West / Versova).',
      });
      return;
    }

    setSubmitting(true);

    // Rule 5: Generate single idempotency key per report attempt
    const idempotencyKey = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const payload = {
      latitude: coords.lat,
      longitude: coords.lon,
      type,
      depthCategory: showDepth ? depthCategory : 'none',
      observedAt: new Date().toISOString(),
      mode,
      notes: notes.trim() || undefined,
      idempotencyKey,
    };

    // M9 Lifecycle: Add optimistic pin to local store immediately
    addOptimisticReport({
      tempId: idempotencyKey,
      idempotencyKey,
      payload,
      state: 'pending',
      latitude: coords.lat,
      longitude: coords.lon,
    });

    // Close modal instantly!
    onClose();

    // Async submit with SAME idempotency key (Rule 5)
    try {
      const res = await api.createIncident(payload);

      confirmOptimisticReport(idempotencyKey);

      if (res.duplicate) {
        toast({
          variant: 'info',
          message: "Already reported — you're fast.",
        });
      } else if (res.status === 'corroborated') {
        toast({
          variant: 'success',
          message: 'Corroborated! Nearby reports agree — elevated weight in route scoring.',
        });
      } else {
        toast({
          variant: 'info',
          message: 'Report received! Awaiting corroboration.',
        });
      }
    } catch (err) {
      toast({
        variant: 'error',
        message: 'Failed to record report. Retrying will use original key.',
      });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report hazard"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="glass-panel w-full max-w-md p-5 rounded-lg border border-line-strong shadow-glass flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-base text-ink flex items-center gap-1.5">
              <span>Report Hazard</span>
            </h2>
            <span className="font-mono text-xs text-ink-3">
              Pin at {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-ink-3 hover:text-ink p-1 rounded-sm hover:bg-raised transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pilot warning guard */}
        {isOutsidePilot && (
          <div className="p-2.5 rounded-sm bg-risk-1/15 border border-risk-1/30 text-xs text-risk-1 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              ⚠️ These coordinates are outside the Mumbai pilot zone (Andheri West / Versova).
              Hazard reporting is restricted to the pilot area.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Hazard Type Grid */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-2">Hazard Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {typeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`flex items-center gap-2 p-2 rounded-sm text-xs font-medium border text-left transition ${
                    type === opt.id
                      ? 'border-flood bg-flood/10 text-ink shadow-sm'
                      : 'border-line bg-raised/50 text-ink-2 hover:bg-raised hover:text-ink'
                  }`}
                >
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Depth Category (if water/flooding) */}
          {showDepth && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-2">Water Depth</label>
              <div className="grid grid-cols-2 gap-1.5">
                {depthOptions.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDepthCategory(d.id)}
                    className={`p-2 rounded-sm text-xs font-medium border text-left transition ${
                      depthCategory === d.id
                        ? 'border-flood bg-flood/10 text-ink shadow-sm'
                        : 'border-line bg-raised/50 text-ink-2 hover:bg-raised hover:text-ink'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes (280 characters limit) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-ink-2">Observation Notes</label>
              <span className="font-mono text-[10px] text-ink-3">{notes.length}/280</span>
            </div>
            <textarea
              value={notes}
              maxLength={280}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Water accumulation near metro pillar 42, traffic diverted..."
              rows={2}
              className="glass-panel bg-base/80 text-ink text-xs rounded-md p-2.5 border border-line focus:border-flood/60 focus:bg-base outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm text-xs font-medium text-ink-3 hover:text-ink transition"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={isOutsidePilot}
              icon={<Send className="w-3.5 h-3.5 fill-void text-void" />}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}