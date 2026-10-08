import { describe, it, expect } from 'vitest';
import { calculateHeatRisk } from '../../lambda/src/engine/heatRisk';

describe('calculateHeatRisk', () => {
  it('extreme apparent temperature returns high score', () => {
    const out = calculateHeatRisk({
      apparentTemperatureC: 41,
      relativeHumidityPct: 90,
      estimatedArrivalUtc: new Date('2026-07-20T08:00:00Z'), // 13:30 IST
      segmentWalkDurationSec: 900,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(out.score).toBeGreaterThanOrEqual(75);
    expect(['high', 'blocked']).toContain(out.level);
  });

  it('comfortable temperature returns low score', () => {
    const out = calculateHeatRisk({
      apparentTemperatureC: 25,
      relativeHumidityPct: 55,
      estimatedArrivalUtc: new Date('2026-07-20T02:00:00Z'), // 07:30 IST
      segmentWalkDurationSec: 300,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(out.score).toBeLessThanOrEqual(40);
  });

  it('heatSensitive=true returns higher score than false for same conditions', () => {
    const base = {
      apparentTemperatureC: 34,
      relativeHumidityPct: 80,
      estimatedArrivalUtc: new Date('2026-07-20T07:00:00Z'), // 12:30 IST
      segmentWalkDurationSec: 600,
      mode: 'walking' as const,
    };
    const sensitive = calculateHeatRisk({ ...base, heatSensitive: true });
    const normal = calculateHeatRisk({ ...base, heatSensitive: false });
    expect(sensitive.score).toBeGreaterThan(normal.score);
  });

  it('driving mode ignores walk duration contribution', () => {
    const walking = calculateHeatRisk({
      apparentTemperatureC: 33,
      relativeHumidityPct: 75,
      estimatedArrivalUtc: new Date('2026-07-20T07:30:00Z'),
      segmentWalkDurationSec: 1800,
      heatSensitive: false,
      mode: 'walking',
    });
    const driving = calculateHeatRisk({
      apparentTemperatureC: 33,
      relativeHumidityPct: 75,
      estimatedArrivalUtc: new Date('2026-07-20T07:30:00Z'),
      segmentWalkDurationSec: 1800,
      heatSensitive: false,
      mode: 'driving-traffic',
    });
    expect(driving.score).toBeLessThanOrEqual(walking.score);
  });

  it('null temperature returns non-zero score from time-of-day signal', () => {
    const out = calculateHeatRisk({
      apparentTemperatureC: null,
      relativeHumidityPct: null,
      estimatedArrivalUtc: new Date('2026-07-20T08:00:00Z'), // 13:30 IST peak heat
      segmentWalkDurationSec: 600,
      heatSensitive: false,
      mode: 'walking',
    });
    expect(out.score).toBeGreaterThan(0);
  });
});
