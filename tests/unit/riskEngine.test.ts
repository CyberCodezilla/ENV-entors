/**
 * Day 1 risk engine contract tests.
 * These tests define EXPECTED behaviour for Day 2 implementation.
 * They will fail until the real engine is wired in on Day 2.
 * Mark with .todo or .skip until Day 2 if you want green CI on Day 1.
 */
import { describe, it, expect } from 'vitest';

// These imports will resolve once the risk engine module is created on Day 2.
// Uncomment as each module is implemented.

// import { calculateFloodRisk } from '../../lambda/src/engine/floodRisk';
// import { calculateHeatRisk } from '../../lambda/src/engine/heatRisk';
// import { calculateConfidence } from '../../lambda/src/engine/confidence';
// import { rankRoutes } from '../../lambda/src/engine/routeRanker';

describe('Flood risk engine (Day 2)', () => {
  it.todo('verified active impassable hazard sets hardBlock=true and floodRisk=100');
  it.todo('single unverified report raises floodRisk but does NOT set hardBlock');
  it.todo('two independent recent reports within corroboration radius increase risk more than one');
  it.todo('missing precipitation data returns -1 sentinel and reduces confidence');
  it.todo('rain stops: flood concern is retained for recent-rain-window minutes');
  it.todo('no rain but verified report still elevates flood risk');
  it.todo('heavy rain with no reports shows susceptibility, not confirmed flooding');
});

describe('Heat risk engine (Day 2)', () => {
  it.todo('apparent temperature > 40 C returns heatRisk >= 75');
  it.todo('departure at 14:00 IST in July returns higher risk than 07:00');
  it.todo('heatSensitive=true returns more conservative advice band');
  it.todo('missing apparent temperature returns null and reduces confidence');
});

describe('Confidence scoring (Day 2)', () => {
  it.todo('stale weather (> 30 min) reduces confidence');
  it.todo('verified closure gives higher confidence than single unverified report');
  it.todo('conflicting reports lower confidence');
  it.todo('low risk with low coverage says "No elevated risk detected from limited data" not "clear"');
});

describe('Route ranker (Day 2)', () => {
  it.todo('hard-blocked route is excluded before ranking');
  it.todo('route with lower max-segment flood risk ranks above higher max-segment route');
  it.todo('all routes blocked returns hasConfidentRecommendation=false');
  it.todo('worst-segment flood risk is used, not route average');
  it.todo('ETA is used only as final tie-breaker');
});

describe('ML adapter (Day 1 — must pass)', () => {
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
