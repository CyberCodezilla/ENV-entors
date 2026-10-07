/**
 * HeatFlood Guardian — Geospatial utilities
 * Haversine distance + nearest-point-on-segment matching.
 * No GIS library dependency needed for MVP.
 */

const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine great-circle distance between two lat/lon points.
 */
export function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Returns the minimum distance (in metres) from point P to the line segment AB.
 * Used for incident-to-segment matching after Haversine pre-filter.
 */
export function pointToSegmentDistanceM(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number,
): number {
  // Project onto the segment using planar approximation (valid for short segments < 500 m).
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistanceM(pLat, pLon, aLat, aLon);

  const t = Math.max(0, Math.min(1, ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq));
  const closestLat = aLat + t * dy;
  const closestLon = aLon + t * dx;
  return haversineDistanceM(pLat, pLon, closestLat, closestLon);
}

/**
 * Split a GeoJSON LineString into segments no longer than maxLengthM.
 * Returns an array of {startCoord, endCoord, lengthM}.
 */
export function splitRouteIntoSegments(
  coordinates: [number, number][],
  maxLengthM: number,
): Array<{ startCoord: [number, number]; endCoord: [number, number]; lengthM: number }> {
  const segments: Array<{ startCoord: [number, number]; endCoord: [number, number]; lengthM: number }> = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    const dist = haversineDistanceM(lat1, lon1, lat2, lon2);

    if (dist <= maxLengthM) {
      segments.push({ startCoord: coordinates[i], endCoord: coordinates[i + 1], lengthM: dist });
    } else {
      // Subdivide long edges
      const parts = Math.ceil(dist / maxLengthM);
      for (let p = 0; p < parts; p++) {
        const t0 = p / parts;
        const t1 = (p + 1) / parts;
        const interp = (a: number, b: number, t: number) => a + (b - a) * t;
        const c0: [number, number] = [interp(lon1, lon2, t0), interp(lat1, lat2, t0)];
        const c1: [number, number] = [interp(lon1, lon2, t1), interp(lat1, lat2, t1)];
        segments.push({
          startCoord: c0,
          endCoord: c1,
          lengthM: haversineDistanceM(c0[1], c0[0], c1[1], c1[0]),
        });
      }
    }
  }

  return segments;
}

/**
 * Check if a point is within the pilot bounding box.
 */
export function isInsidePilotZone(
  lat: number, lon: number,
  bbox: readonly [number, number, number, number],
): boolean {
  const [lngMin, latMin, lngMax, latMax] = bbox;
  return lon >= lngMin && lon <= lngMax && lat >= latMin && lat <= latMax;
}

/**
 * Encode a lat/lon to a geohash string of the given precision.
 * Precision 5 = ~5 km² cells.
 */
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';
  let minLat = -90, maxLat = 90;
  let minLon = -180, maxLon = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (minLon + maxLon) / 2;
      if (lon >= mid) { idx = idx * 2 + 1; minLon = mid; }
      else { idx = idx * 2; maxLon = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { idx = idx * 2 + 1; minLat = mid; }
      else { idx = idx * 2; maxLat = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
}
