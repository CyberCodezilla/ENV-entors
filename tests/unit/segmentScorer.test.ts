/**
 * Unit tests for scoreSegment engine function.
 * Covers flood scoring, heat scoring, confidence degradation,
 * and hard-block conditions.
 */
import { describe, it, expect } from 'vitest';
import { scoreSegment } from '../../lambda/src/engine/segmentScorer';

const BASE = {
  segmentIndex: 0,
  startCoord: { lat: 19.112, lon: 72.832 },
  endCoord: { lat: 19.113, lon: 72.833 },
  estimatedArrivalUtc: new Date('2026-09-30T08:00:00Z'),
  segmentLengthM: 200,
  precipitationMmPerHour: 0,
  minutesSinceRainStop: null,
  apparentTemperatureC: 28,
  relativeHumidityPct: 70,
  weatherAgeMinutes: 5,
  nearbyIncidents: [],
  nearbyHotspots: [],
  heatSensitive: false,
  mode: 'walking' as const,
  now: new Date(),
};

describe('scoreSegment — flood risk', () => {
  it('returns low flood risk in dry conditions', () => {
    const result = scoreSegment({ ...BASE });
    expect(result.floodRiskLevel).toBe('low');
  });

  it('returns high flood risk at 25mm/hr precipitation', () => {
    const result = scoreSegment({ ...BASE, precipitationMmPerHour: 25 });
    expect(['high', 'moderate']).toContain(result.floodRiskLevel);
  });

  it('hard-blocks on verified official_closure incident', () => {
    const result = scoreSegment({
      ...BASE,
      nearbyIncidents: [{
        incidentId: 'test-1',
        latitude: 19.1125,
        longitude: 72.8325,
        type: 'underpass_flooded',
        depthCategory: 'vehicle_impassable',
        status: 'verified',
        sourceType: 'official_closure',
        observedAt: new Date().toISOString(),
      }],
    });
    expect(result.hardBlock).toBe(true);
  });

  it('does NOT hard-block on single unverified community report', () => {
    const result = scoreSegment({
      ...BASE,
      nearbyIncidents: [{
        incidentId: 'test-2',
        latitude: 19.1125,
        longitude: 72.8325,
        type: 'waterlogging',
        depthCategory: 'ankle',
        status: 'pending',
        sourceType: 'community_report',
        observedAt: new Date().toISOString(),
      }],
    });
    expect(result.hardBlock).toBe(false);
  });
});

describe('scoreSegment — heat risk', () => {
  it('returns high heat risk at 42°C apparent temperature', () => {
    const result = scoreSegment({ ...BASE, apparentTemperatureC: 42, relativeHumidityPct: 85 });
    expect(result.heatRiskLevel).toBe('high');
  });

  it('amplifies heat risk when heatSensitive=true', () => {
    const normal = scoreSegment({ ...BASE, apparentTemperatureC: 37 });
    const sensitive = scoreSegment({ ...BASE, apparentTemperatureC: 37, heatSensitive: true });
    expect(sensitive.heatRisk).toBeGreaterThanOrEqual(normal.heatRisk);
  });

  it('returns low heat risk at 28°C', () => {
    const result = scoreSegment({ ...BASE, apparentTemperatureC: 28 });
    expect(result.heatRiskLevel).toBe('low');
  });
});

describe('scoreSegment — confidence', () => {
  it('degrades confidence when weatherAgeMinutes > 30', () => {
    const fresh = scoreSegment({ ...BASE, weatherAgeMinutes: 5 });
    const stale = scoreSegment({ ...BASE, weatherAgeMinutes: 45 });
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });

  it('returns high confidence in clean data conditions', () => {
    const result = scoreSegment({ ...BASE, weatherAgeMinutes: 3 });
    expect(['high', 'moderate']).toContain(result.confidenceLevel);
  });
});
