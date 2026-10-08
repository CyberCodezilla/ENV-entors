/**
 * Unit tests for rankRoutes engine function.
 * Validates: ranking order, hard-blocked route handling,
 * and hasConfidentRecommendation=false for all-blocked scenarios.
 */
import { describe, it, expect } from 'vitest';
import { rankRoutes, RawRoute } from '../../lambda/src/engine/routeRanker';

function makeSegment(overrides = {}) {
  return {
    segmentIndex: 0,
    startCoord: { lat: 19.112, lon: 72.832 },
    endCoord: { lat: 19.113, lon: 72.833 },
    segmentLengthM: 200,
    floodRisk: 10,
    heatRisk: 10,
    confidence: 90,
    floodRiskLevel: 'low',
    heatRiskLevel: 'low',
    confidenceLevel: 'high',
    hardBlock: false,
    hardBlockReason: null,
    reasons: [],
    ...overrides,
  };
}

function makeRoute(id: string, overrides = {}): RawRoute {
  return {
    routeId: id,
    distanceM: 1000,
    durationSec: 720,
    geometry: { type: 'LineString', coordinates: [] },
    segments: [makeSegment()],
    ...overrides,
  };
}

describe('rankRoutes', () => {
  it('ranks lower-risk route first', () => {
    const routes = [
      makeRoute('b', { segments: [makeSegment({ floodRisk: 60, heatRisk: 40 })] }),
      makeRoute('a', { segments: [makeSegment({ floodRisk: 10, heatRisk: 10 })] }),
    ];
    const { routes: ranked } = rankRoutes(routes);
    expect(ranked[0].routeId).toBe('a');
  });

  it('hasConfidentRecommendation=false when all routes hard-blocked', () => {
    const routes = [
      makeRoute('x', { segments: [makeSegment({ hardBlock: true })] }),
      makeRoute('y', { segments: [makeSegment({ hardBlock: true })] }),
    ];
    const { hasConfidentRecommendation } = rankRoutes(routes);
    expect(hasConfidentRecommendation).toBe(false);
  });

  it('hasConfidentRecommendation=true when at least one route is clear', () => {
    const routes = [
      makeRoute('x', { segments: [makeSegment({ hardBlock: true })] }),
      makeRoute('y', { segments: [makeSegment({ hardBlock: false, floodRisk: 15 })] }),
    ];
    const { hasConfidentRecommendation } = rankRoutes(routes);
    expect(hasConfidentRecommendation).toBe(true);
  });

  it('places hard-blocked routes last in ranking', () => {
    const routes = [
      makeRoute('blocked', { segments: [makeSegment({ hardBlock: true })] }),
      makeRoute('clear', { segments: [makeSegment({ floodRisk: 50 })] }),
    ];
    const { routes: ranked } = rankRoutes(routes);
    expect(ranked[ranked.length - 1].routeId).toBe('blocked');
  });

  it('returns noConfidentRouteReason when blocked', () => {
    const routes = [
      makeRoute('x', { segments: [makeSegment({ hardBlock: true, hardBlockReason: 'Verified flood closure' })] }),
    ];
    const { noConfidentRouteReason } = rankRoutes(routes);
    expect(typeof noConfidentRouteReason).toBe('string');
    expect(noConfidentRouteReason!.length).toBeGreaterThan(0);
  });
});
