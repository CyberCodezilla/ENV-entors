/**
 * ReportIncidentModal — Day 3
 * Shown when user clicks on the map to report a new flood/heat incident.
 * Sends POST /incidents and updates parent state.
 */
'use client';

import { useState } from 'react';
import type { CreateIncidentRequest } from '@heatflood/shared';
import { api } from '@/lib/apiClient';

interface Props {
  lat: number;
  lon: number;
  onClose: () => void;
  onSuccess: (incidentId: string, details?: { latitude: number; longitude: number; type: string; depthCategory: string; status: string }) => void;
}

const INCIDENT_TYPES = [
  { value: 'waterlogging',      label: '💧 Waterlogging' },
  { value: 'road_blocked',      label: '🚧 Road blocked by water' },
  { value: 'underpass_flooded', label: '🌊 Underpass flooded' },
  { value: 'extreme_heat',      label: '🔥 Extreme heat / no shade' },
  { value: 'other',             label: '⚠️ Other hazard' },
] as const;

const DEPTH_CATEGORIES = [
  { value: 'unknown',            label: 'Unknown' },
  { value: 'ankle',              label: 'Ankle deep' },
  { value: 'knee',               label: 'Knee deep' },
  { value: 'vehicle_impassable', label: 'Vehicle impassable' },
  { value: 'none',               label: 'No standing water' },
] as const;

export function ReportIncidentModal({ lat, lon, onClose, onSuccess }: Props) {
  const [type, setType] = useState<string>('waterlogging');
  const [depth, setDepth] = useState<string>('unknown');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const req: CreateIncidentRequest = {
        latitude: lat,
        longitude: lon,
        type: type as CreateIncidentRequest['type'],
        depthCategory: depth as CreateIncidentRequest['depthCategory'],
        observedAt: new Date().toISOString(),
        idempotencyKey,
      };
      const res = await api.createIncident(req);
      onSuccess(res.incidentId, {
        latitude: lat,
        longitude: lon,
        type,
        depthCategory: depth,
        status: res.status ?? 'queued',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full sm:max-w-sm bg-gray-900 rounded-t-2xl sm:rounded-2xl p-5 border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Report Hazard</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Location: {lat.toFixed(5)}, {lon.toFixed(5)}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Hazard type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
            >
              {INCIDENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Water depth</label>
            <select
              value={depth}
              onChange={e => setDepth(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
            >
              {DEPTH_CATEGORIES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-xs p-3">
            <strong>Note:</strong> A single community report does not block any route.
            Two or more corroborating reports in the same area raise the risk score.
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
