/**
 * Risk engine integration contract tests.
 * Validates flood risk, heat risk, confidence scoring, and route ranking.
 */
import { describe, it, expect } from 'vitest';
import { calculateFloodRisk } from '../../lambda/src/engine/floodRisk';
import { calculateHeatRisk } from '../../lambda/src/engine/heatRisk';
import { calculateConfidence } from '../../lambda/src/engine/confidence';
import { rankRoutes, RawRoute } from '../../lambda/src/engine/routeRanker';

const NOW = new Date('2026-07-18T09:00:00Z');

describe('Flood risk engine', () => {
  it('verified active impassable hazard sets hardBlock=true and floodRisk=100', () => {
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
  });

  it('single unverified report raises floodRisk but does NOT set hardBlock', () => {
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

  it('two independent recent reports within corroboration radius increase risk more than one', () => {
    const oneReport = calculateFloodRisk({
      segmentId: 'seg-3a',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: null,
      incidents: [{
        incidentId: 'inc-1',
        latitude: 19.112,
        longitude: 72.832,
        type: 'waterlogging',
        depthCategory: 'knee',
        status: 'pending',
        sourceType: 'community_report',
        observedAt: NOW.toISOString(),
        isDemo: false,
      }],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    const twoReports = calculateFloodRisk({
      segmentId: 'seg-3b',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: null,
      incidents: [
        {
          incidentId: 'inc-1',
          latitude: 19.112,
          longitude: 72.832,
          type: 'waterlogging',
          depthCategory: 'knee',
          status: 'corroborated',
          sourceType: 'community_report',
          observedAt: NOW.toISOString(),
          isDemo: false,
        },
        {
          incidentId: 'inc-2',
          latitude: 19.1121,
          longitude: 72.8321,
          type: 'waterlogging',
          depthCategory: 'knee',
          status: 'corroborated',
          sourceType: 'community_report',
          observedAt: NOW.toISOString(),
          isDemo: false,
        },
      ],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(twoReports.score).toBeGreaterThan(oneReport.score);
  });

  it('missing precipitation data calculates risk based on available signals', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-4',
      precipitationMmPerHour: null,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.hardBlock).toBe(false);
    expect(out.score).toBeLessThanOrEqual(30);
  });

  it('rain stops: flood concern is retained for recent-rain-window minutes', () => {
    const recentRain = calculateFloodRisk({
      segmentId: 'seg-5a',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: 30,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    const oldRain = calculateFloodRisk({
      segmentId: 'seg-5b',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: 180,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(recentRain.score).toBeGreaterThan(oldRain.score);
  });

  it('no rain but verified report still elevates flood risk', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-6',
      precipitationMmPerHour: 0,
      minutesSinceRainStop: null,
      incidents: [{
        incidentId: 'inc-6',
        latitude: 19.112,
        longitude: 72.832,
        type: 'waterlogging',
        depthCategory: 'knee',
        status: 'verified',
        sourceType: 'community_report',
        observedAt: NOW.toISOString(),
        isDemo: false,
      }],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.score).toBeGreaterThan(20);
  });

  it('heavy rain with no reports shows susceptibility, not confirmed flooding', () => {
    const out = calculateFloodRisk({
      segmentId: 'seg-7',
      precipitationMmPerHour: 40,
      minutesSinceRainStop: null,
      incidents: [],
      hotspotDistanceM: null,
      hotspotOverlap: false,
      now: NOW,
    });
    expect(out.hardBlock).toBe(false);
    expect(out.score).toBeGreaterThan(30);
  });
});

describe('Heat risk engine', () => {
  it('apparent temperature > 40 C returns heatRisk >= 60', () => {
    const out = calculateHeatRisk({
      apparentTemperatureC: 42,
      relativeHumidityPct: 80,
      estimatedArrivalUtc: new Date('2026-07-18T08:00:00Z'),
      segmentWalkDurationSec: 600,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(out.score).toBeGreaterThanOrEqual(60);
  });

  it('departure at 14:00 IST in July returns higher risk than 07:00', () => {
    const afternoon = calculateHeatRisk({
      apparentTemperatureC: 35,
      relativeHumidityPct: 70,
      estimatedArrivalUtc: new Date('2026-07-18T08:30:00Z'), // 14:00 IST
      segmentWalkDurationSec: 600,
      heatSensitive: false,
      mode: 'walking',
    });
    const morning = calculateHeatRisk({
      apparentTemperatureC: 35,
      relativeHumidityPct: 70,
      estimatedArrivalUtc: new Date('2026-07-18T01:30:00Z'), // 07:00 IST
      segmentWalkDurationSec: 600,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(afternoon.score).toBeGreaterThan(morning.score);
  });

  it('heatSensitive=true returns higher risk score than false', () => {
    const base = {
      apparentTemperatureC: 33,
      relativeHumidityPct: 75,
      estimatedArrivalUtc: new Date('2026-07-18T07:00:00Z'),
      segmentWalkDurationSec: 600,
      mode: 'walking' as const,
    };
    const sensitive = calculateHeatRisk({ ...base, heatSensitive: true });
    const normal = calculateHeatRisk({ ...base, heatSensitive: false });
    expect(sensitive.score).toBeGreaterThan(normal.score);
  });

  it('missing apparent temperature returns non-zero score from time of day', () => {
    const out = calculateHeatRisk({
      apparentTemperatureC: null,
      relativeHumidityPct: null,
      estimatedArrivalUtc: new Date('2026-07-18T08:00:00Z'),
      segmentWalkDurationSec: 600,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(out.score).toBeGreaterThan(0);
  });
});

describe('Confidence scoring', () => {
  it('stale weather (> 30 min) reduces confidence', () => {
    const fresh = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 0,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: 15,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    const stale = calculateConfidence({
      weatherAgeMinutes: 45,
      incidentCount: 0,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: 15,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it('verified closure gives higher confidence than single unverified report', () => {
    const verified = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 1,
      verifiedIncidentCount: 1,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    const unverified = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 1,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    expect(verified.score).toBeGreaterThanOrEqual(unverified.score);
  });

  it('conflicting reports lower confidence', () => {
    const nonConflicting = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 2,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    const conflicting = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 2,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: true,
      mlAvailable: false,
    });
    expect(nonConflicting.score).toBeGreaterThan(conflicting.score);
  });

  it('low risk with low coverage shows appropriate reason', () => {
    const out = calculateConfidence({
      weatherAgeMinutes: null,
      incidentCount: 0,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: null,
      hotspotDataAvailable: false,
      conflictingReports: false,
      mlAvailable: false,
    });
    expect(out.score).toBeLessThanOrEqual(60);
  });
});

describe('Route ranker', () => {
  function makeSeg(overrides = {}) {
    return {
      segmentIndex: 0,
      startCoord: { lat: 19.112, lon: 72.832 },
      endCoord: { lat: 19.113, lon: 72.833 },
      segmentLengthM: 200,
      floodRisk: 10,
      heatRisk: 10,
      confidence: 90,
      floodRiskLevel: 'low' as const,
      heatRiskLevel: 'low' as const,
      confidenceLevel: 'good' as const,
      hardBlock: false,
      hardBlockReason: null,
      reasons: [],
      ...overrides,
    };
  }

  function makeRte(id: string, overrides = {}): RawRoute {
    return {
      routeId: id,
      distanceM: 1000,
      durationSec: 720,
      geometry: { type: 'LineString', coordinates: [] },
      segments: [makeSeg()],
      ...overrides,
    };
  }

  it('hard-blocked route is ranked last', () => {
    const r1 = makeRte('clear', { segments: [makeSeg({ floodRisk: 20 })] });
    const r2 = makeRte('blocked', { segments: [makeSeg({ hardBlock: true })] });
    const { routes: ranked } = rankRoutes([r2, r1]);
    expect(ranked[ranked.length - 1].routeId).toBe('blocked');
  });

  it('route with lower max-segment flood risk ranks above higher max-segment route', () => {
    const low = makeRte('low-risk', { segments: [makeSeg({ floodRisk: 15 })] });
    const high = makeRte('high-risk', { segments: [makeSeg({ floodRisk: 65 })] });
    const { routes: ranked } = rankRoutes([high, low]);
    expect(ranked[0].routeId).toBe('low-risk');
  });

  it('all routes blocked returns hasConfidentRecommendation=false', () => {
    const r1 = makeRte('b1', { segments: [makeSeg({ hardBlock: true })] });
    const r2 = makeRte('b2', { segments: [makeSeg({ hardBlock: true })] });
    const { hasConfidentRecommendation } = rankRoutes([r1, r2]);
    expect(hasConfidentRecommendation).toBe(false);
  });

  it('worst-segment flood risk is used, not route average', () => {
    const r1 = makeRte('r1', { segments: [makeSeg({ floodRisk: 10 }), makeSeg({ floodRisk: 80 })] });
    const r2 = makeRte('r2', { segments: [makeSeg({ floodRisk: 30 }), makeSeg({ floodRisk: 30 })] });
    const { routes: ranked } = rankRoutes([r1, r2]);
    expect(ranked[0].routeId).toBe('r2');
  });

  it('ETA is used as final tie-breaker', () => {
    const rLong = makeRte('long', { durationSec: 1200, segments: [makeSeg({ floodRisk: 20 })] });
    const rShort = makeRte('short', { durationSec: 600, segments: [makeSeg({ floodRisk: 20 })] });
    const { routes: ranked } = rankRoutes([rLong, rShort]);
    expect(ranked[0].routeId).toBe('short');
  });
});

describe('ML adapter', () => {
  it('DisabledMlRiskProvider returns available=false synchronously', async () => {
    const { DisabledMlRiskProvider, ML_FEATURE_VERSION } = await import('@heatflood/shared');
    const provider = new DisabledMlRiskProvider();
    const signal = await provider.predict({
      featureVersion: ML_FEATURE_VERSION,
      predictionTimeUtc: new Date().toISOString(),
      segmentId: 'test-seg',
      rainfall_recent_1h_mm: null,
      rainfall_recent_3h_mm: null,
      rainfall_forecast_1h_mm: null,
      relative_humidity_pct: null,
      apparent_temperature_c: null,
      hotspot_distance_m: null,
      hotspot_overlap: 0,
      recent_report_count: 0,
      verified_report_count: 0,
      newest_report_age_min: null,
      hour_of_day: 9,
      day_of_week: 1,
      month: 7,
      location_geohash5: null,
    });
    expect(signal.available).toBe(false);
    expect(signal.reasonUnavailable).toBe('disabled');
    expect(signal.featureVersion).toBe(ML_FEATURE_VERSION);
    expect(signal.probability).toBeUndefined();
  });
});
