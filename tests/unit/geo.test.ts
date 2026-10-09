import { describe, it, expect } from 'vitest';
import {
  haversineDistanceM,
  splitRouteIntoSegments,
  encodeGeohash,
} from '@heatflood/shared';

describe('haversineDistanceM', () => {
  it('returns ~0 for the same point', () => {
    expect(haversineDistanceM(19.12, 72.84, 19.12, 72.84)).toBe(0);
  });

  it('returns a positive number for two distinct points', () => {
    const d = haversineDistanceM(19.112, 72.832, 19.138, 72.855);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5000); // Should be ~3.5 km
  });

  it('is symmetric', () => {
    const d1 = haversineDistanceM(19.112, 72.832, 19.138, 72.855);
    const d2 = haversineDistanceM(19.138, 72.855, 19.112, 72.832);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
  });
});

describe('splitRouteIntoSegments', () => {
  it('splits a long polyline into segments no larger than maxLengthM', () => {
    const coords: [number, number][] = [
      [72.832, 19.112],
      [72.855, 19.138],
    ];
    const segments = splitRouteIntoSegments(coords, 200);
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) {
      expect(seg.lengthM).toBeLessThanOrEqual(201); // Allow 1 m rounding
    }
  });

  it('returns an empty array for a single-point coordinate list', () => {
    const segments = splitRouteIntoSegments([[72.832, 19.112]], 200);
    expect(segments).toHaveLength(0);
  });
});


describe('encodeGeohash', () => {
  it('returns a string of the requested precision', () => {
    expect(encodeGeohash(19.12, 72.84, 5)).toHaveLength(5);
    expect(encodeGeohash(19.12, 72.84, 7)).toHaveLength(7);
  });

  it('produces the same hash for the same coordinates', () => {
    expect(encodeGeohash(19.12, 72.84)).toBe(encodeGeohash(19.12, 72.84));
  });
});
