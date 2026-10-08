import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '../../lambda/src/engine/confidence';

describe('calculateConfidence', () => {
  it('returns limited confidence when no weather data', () => {
    const out = calculateConfidence({
      weatherAgeMinutes: null,
      incidentCount: 0,
      verifiedIncidentCount: 0,
      oldestIncidentAgeMinutes: null,
      hotspotDataAvailable: false,
      conflictingReports: false,
      mlAvailable: false,
    });
    expect(out.level).toBe('limited');
    expect(out.score).toBeLessThanOrEqual(40);
  });

  it('stale weather reduces confidence', () => {
    const fresh = calculateConfidence({
      weatherAgeMinutes: 5,
      incidentCount: 1,
      verifiedIncidentCount: 1,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    const stale = calculateConfidence({
      weatherAgeMinutes: 60,
      incidentCount: 1,
      verifiedIncidentCount: 1,
      oldestIncidentAgeMinutes: 10,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    expect(fresh.score).toBeGreaterThan(stale.score);
    expect(stale.isStaleWeather).toBe(true);
  });

  it('conflicting reports lower confidence', () => {
    const normal = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 2,
      verifiedIncidentCount: 2,
      oldestIncidentAgeMinutes: 15,
      hotspotDataAvailable: true,
      conflictingReports: false,
      mlAvailable: false,
    });
    const conflicting = calculateConfidence({
      weatherAgeMinutes: 10,
      incidentCount: 2,
      verifiedIncidentCount: 2,
      oldestIncidentAgeMinutes: 15,
      hotspotDataAvailable: true,
      conflictingReports: true,
      mlAvailable: false,
    });
    expect(conflicting.score).toBeLessThan(normal.score);
  });

  it('verified reports improve confidence', () => {
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
});
