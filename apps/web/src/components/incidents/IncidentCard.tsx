'use client';

import React, { useState, useEffect } from 'react';
import type { Incident, IncidentType, DepthCategory } from '@/lib/api/types';
import {
  Droplets,
  Waves,
  Cone,
  ThermometerSun,
  Sun,
  Zap,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';

export interface IncidentCardProps {
  incident: Incident;
  onClick?: () => void;
}

export function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const [timeAgo, setTimeAgo] = useState('');
  const { auth, viewportIncidents, setViewportIncidents } = useAppStore();
  const { toast } = useToast();

  // Update timeAgo every 30s
  useEffect(() => {
    function calcTimeAgo() {
      const diffMs = Date.now() - new Date(incident.observedAt).getTime();
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ago`;
    }

    setTimeAgo(calcTimeAgo());
    const id = setInterval(() => setTimeAgo(calcTimeAgo()), 30_000);
    return () => clearInterval(id);
  }, [incident.observedAt]);

  const getIncidentIcon = (type: IncidentType) => {
    switch (type) {
      case 'waterlogging':
        return <Droplets className="w-4 h-4 text-flood" />;
      case 'underpass_flooded':
        return <Waves className="w-4 h-4 text-flood" />;
      case 'road_blocked':
        return <Cone className="w-4 h-4 text-risk-4" />;
      case 'extreme_heat':
        return <ThermometerSun className="w-4 h-4 text-heat" />;
      case 'heat_exposure':
        return <Sun className="w-4 h-4 text-heat" />;
      case 'electrical_hazard':
        return <Zap className="w-4 h-4 text-risk-1" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-ink-2" />;
    }
  };

  const getDepthBadge = (depth: DepthCategory) => {
    if (depth === 'none' || depth === 'unknown') return null;
    return (
      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-raised border border-line text-ink-2 uppercase">
        {depth.replace('_', ' ')}
      </span>
    );
  };

  // Moderator Verify Action (Optimistic with rollback per Phase 5 spec)
  async function handleVerify(e: React.MouseEvent) {
    e.stopPropagation();
    if (!auth.idToken) return;

    const originalItems = viewportIncidents.items;
    // Optimistic update (<200ms)
    setViewportIncidents(
      originalItems.map((i) =>
        i.incidentId === incident.incidentId ? { ...i, status: 'verified' as const } : i
      ),
      viewportIncidents.bbox ?? { lngMin: 72.82, latMin: 19.1, lngMax: 72.87, latMax: 19.145 }
    );

    try {
      await api.verifyIncident(incident.incidentId, auth.idToken);
      toast({
        variant: 'success',
        message: `Verified hazard #${incident.incidentId.slice(0, 8)}`,
      });
    } catch {
      // Rollback on failure (Section 15, Phase 5 Checkpoint)
      setViewportIncidents(
        originalItems,
        viewportIncidents.bbox ?? { lngMin: 72.82, latMin: 19.1, lngMax: 72.87, latMax: 19.145 }
      );
      toast({
        variant: 'error',
        message: 'Moderator role required. Verification denied.',
      });
    }
  }

  // Moderator Reject Action (Optimistic with rollback per Phase 5 spec)
  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    if (!auth.idToken) return;

    const originalItems = viewportIncidents.items;
    // Optimistic removal (<200ms)
    setViewportIncidents(
      originalItems.filter((i) => i.incidentId !== incident.incidentId),
      viewportIncidents.bbox ?? { lngMin: 72.82, latMin: 19.1, lngMax: 72.87, latMax: 19.145 }
    );

    try {
      await api.rejectIncident(incident.incidentId, auth.idToken);
      toast({
        variant: 'info',
        message: `Removed false hazard #${incident.incidentId.slice(0, 8)}`,
      });
    } catch {
      // Rollback on failure
      setViewportIncidents(
        originalItems,
        viewportIncidents.bbox ?? { lngMin: 72.82, latMin: 19.1, lngMax: 72.87, latMax: 19.145 }
      );
      toast({
        variant: 'error',
        message: 'Moderator role required. Rejection denied.',
      });
    }
  }

  const statusRing = {
    verified: 'border-conf-good text-conf-good bg-conf-good/10',
    corroborated: 'border-flood text-flood bg-flood/10',
    pending: 'border-dashed border-conf-moderate text-conf-moderate bg-conf-moderate/10',
    queued: 'border-dashed border-heat text-heat bg-heat/10 animate-pulse',
    rejected: 'border-risk-4 text-risk-4',
    resolved: 'border-line text-ink-3',
    expired: 'border-line text-ink-3',
  }[incident.status] || 'border-line text-ink-2';

  return (
    <div
      onClick={onClick}
      className="glass-panel p-2.5 rounded-md border border-line hover:border-line-strong cursor-pointer transition flex items-start gap-2.5 text-xs bg-base/80 group"
    >
      {/* Type & Status Icon Ring */}
      <div className={`p-1.5 rounded-full border ${statusRing} shrink-0 mt-0.5`}>
        {getIncidentIcon(incident.type)}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink capitalize truncate">
            {incident.type.replace('_', ' ')}
          </span>
          <span className="font-mono text-[10px] text-ink-3 shrink-0 ml-1">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {getDepthBadge(incident.depthCategory)}
          <span className="font-mono text-[10px] text-ink-3">
            {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
          </span>
        </div>

        {incident.notes && (
          <p className="text-[11px] text-ink-2 mt-0.5 line-clamp-2 leading-tight">
            {incident.notes}
          </p>
        )}

        {/* Moderator Actions (Only visible to moderators) */}
        {auth.isModerator && incident.status !== 'rejected' && (
          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-line">
            <button
              onClick={handleVerify}
              title="Verify hazard"
              className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-conf-good/20 text-conf-good border border-conf-good/40 hover:bg-conf-good/30 text-[10px] font-mono font-bold transition"
            >
              <Check className="w-3 h-3" />
              <span>Verify</span>
            </button>
            <button
              onClick={handleReject}
              title="Reject hazard"
              className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-risk-4/20 text-risk-4 border border-risk-4/40 hover:bg-risk-4/30 text-[10px] font-mono font-bold transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reject</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}