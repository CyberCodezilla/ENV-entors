/**
 * Mapbox Directions Adapter — Day 2
 *
 * Fetches up to 3 route alternatives from Mapbox Directions API.
 * Returns raw route geometry + duration + distance.
 * Never exposes the Mapbox token to the frontend.
 */
import { AnalyseRoutesRequest } from '@heatflood/shared';
import { logger } from '../utils/logger';

const MAPBOX_BASE = 'https://api.mapbox.com/directions/v5/mapbox';

export interface MapboxRoute {
  routeId: string;
  distanceM: number;
  durationSec: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface MapboxRoutesResult {
  routes: MapboxRoute[];
  error: string | null;
}

export async function fetchMapboxRoutes(
  request: AnalyseRoutesRequest,
  mapboxToken: string,
): Promise<MapboxRoutesResult> {
  const { origin, destination, mode } = request;
  const profile = mode === 'walking' ? 'walking' : 'driving-traffic';
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

  const url = new URL(`${MAPBOX_BASE}/${profile}/${coords}`);
  url.searchParams.set('alternatives', 'true');  // request up to 2 alternatives
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('access_token', mapboxToken);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      logger.warn('Mapbox API non-200', { status: res.status });
      return { routes: [], error: `Mapbox returned ${res.status}` };
    }

    const data = await res.json() as {
      code: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { type: 'LineString'; coordinates: [number, number][] };
      }>;
    };

    if (data.code !== 'Ok' || !data.routes?.length) {
      return { routes: [], error: `Mapbox code: ${data.code}` };
    }

    const routes: MapboxRoute[] = data.routes.map((r, i) => ({
      routeId: `mapbox-route-${i}`,
      distanceM: r.distance,
      durationSec: r.duration,
      geometry: r.geometry,
    }));

    return { routes, error: null };
  } catch (err) {
    logger.error('Mapbox fetch failed', { err });
    return { routes: [], error: 'Mapbox fetch failed' };
  }
}
