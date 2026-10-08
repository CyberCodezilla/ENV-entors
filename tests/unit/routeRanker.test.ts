import { describe, it, expect } from 'vitest';
import { rankRoutes } from '../../lambda/src/engine/routeRanker';
import type { RawRoute } from '../../lambda/src/engine/routeRanker';
import { ROUTE_DISCLAIMER } from '@heatflood/shared';

const NOW_ISO = '2026-07-18T09:00:00.000Z';

function makeRoute(id: string, floodRisk: number, hardBlock = false): RawRoute {
  return {
    routeId: id,
    distanceM: 2000,
    durationSec: 1500,
    geometry: { type: 'LineString', coordinates: [[72.83, 19.11], [72.85, 19.13]] },
    segments: [{
      segmentIndex: 0,
      startCoord: { lat: 19.11, lon: 72.83 },
      endCoord: { lat: 19.13, lon: 72.85 },
      estimatedArrivalUtc: NOW_ISO,
      floodRisk,
      heatRisk: 20,
      confidence: 65,
      hardBlock,
      hardBlockReason: hardBlock ? 'Verified road_blocked' : null,
      floodRiskLevel: floodRisk > 85 ? 'blocked' : floodRisk > 60 ? 'high' : floodRisk > 30 ? 'moderate' : 'low',
      heatRiskLevel: 'low',
      confidenceLevel: 'moderate',
      evidence: [],
      reasons: ['Test reason'],
    }],
  };
}

describe('rankRoutes', () => {
  it('lower flood risk route ranks first', () => {
    const { routes } = rankRoutes([
      makeRoute('b', 60),
      makeRoute('a', 20),
    ]);
    expect(routes[0].routeId).toBe('a');
    expect(routes[0].rank).toBe(1);
  });

  it('hard-blocked routes are demoted after viable routes', () => {
    const { routes, hasConfidentRecommendation } = rankRoutes([
      makeRoute('blocked-route', 100, true),
      makeRoute('ok-route', 25, false),
    ]);
    expect(routes[0].routeId).toBe('ok-route');
    expect(hasConfidentRecommendation).toBe(true);
  });

  it('all blocked returns hasConfidentRecommendation=false', () => {
    const { hasConfidentRecommendation, noConfidentRouteReason } = rankRoutes([
      makeRoute('a', 100, true),
      makeRoute('b', 100, true),
    ]);
    expect(hasConfidentRecommendation).toBe(false);
    expect(noConfidentRouteReason).not.toBeNull();
  });

  it('single viable route is still recommended', () => {
    const { routes, hasConfidentRecommendation } = rankRoutes([makeRoute('only', 15)]);
    expect(hasConfidentRecommendation).toBe(true);
    expect(routes[0].rank).toBe(1);
  });

  it('disclaimer is always present', () => {
    const { routes } = rankRoutes([makeRoute('r', 20)]);
    expect(routes[0].disclaimer).toBe(ROUTE_DISCLAIMER);
  });
});
