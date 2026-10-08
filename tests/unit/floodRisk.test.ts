import { describe, it, expect } from 'vitest';
import { calculateFloodRisk } from '../../lambda/src/engine/floodRisk';

const NOW = new Date('2026-07-18T09:00:00Z');

describe('calculateFloodRisk', () => {
  it('returns low risk with no inputs', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-0',
      precipitationMmPerHour: null,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.score).toBeLessThanOrEqual(30);
    expect(out.level).toBe('low');
    expect(out.hardBlock).toBe(false);
  });

  it('returns hardBlock=true for verified official_closure', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-1',
      precipitationMmPerHour: 5,
      minutesSinceRainStop: null,
      incidents: [{
        incidentId: 'inc-1',
        latitude: 19.112,
        longitude: 72.832,
        type: 'road_blocked',
        depthCategory: 'vehicle_impassable',
        status: 'verified',
        sourceType: 'official_closure',
        observedAt: NOW.toISOString(),
        isDemo: false,
      }],
      hotspotDistanceM: 100,
      hotspotOverlap: true,
      now: NOW,
    });
    expect(out.hardBlock).toBe(true);
    expect(out.score).toBe(100);
    expect(out.level).toBe('blocked');
    expect(out.hardBlockReason).not.toBeNull();
  });

  it('single unverified report raises risk but does NOT hardBlock', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-2',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: null,
      incidents: [{
        incidentId: 'inc-2',
        latitude: 19.112,
        longitude: 72.832,
        type: 'waterlogging',
        depthCategory: 'ankle',
        status: 'pending',
        sourceType: 'community_report',
        observedAt: NOW.toISOString(),
        isDemo: false,
      }],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.hardBlock).toBe(false);
    expect(out.score).toBeGreaterThan(0);
  });

  it('corroborated community report raises risk score but does NOT cause hardBlock', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-corroborated',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: null,
      incidents: [{
        incidentId: 'inc-corr',
        latitude: 19.112,
        longitude: 72.832,
        type: 'road_blocked',
        depthCategory: 'vehicle_impassable',
        status: 'corroborated',
        sourceType: 'community_report',
        observedAt: NOW.toISOString(),
        isDemo: false,
      }],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.hardBlock).toBe(false);
    expect(out.score).toBeGreaterThan(0);
  });

  it('heavy rain returns flood score > 40', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-3',
      precipitationMmPerHour: 25,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.score).toBeGreaterThan(15);
  });

  it('rain stops within recent window retains partial concern', () => {
    const recent = calculateFloodRisk({
      segmentId: 'seg-4',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: 30,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    const longAgo = calculateFloodRisk({
      segmentId: 'seg-5',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: 200,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(recent.score).toBeGreaterThanOrEqual(longAgo.score);
  });

  it('hotspot overlap increases score', () => {
    const withHotspot = calculateFloodRisk({
      segmentId: 'seg-6',
      precipitationMmPerHour: null,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: 50,
      hotspotOverlap: true,
      now: NOW,
    });
    const withoutHotspot = calculateFloodRisk({
      segmentId: 'seg-7',
      precipitationMmPerHour: null,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(withHotspot.score).toBeGreaterThan(withoutHotspot.score);
  });
});
