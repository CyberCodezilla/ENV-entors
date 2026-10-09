/**
 * HeatFlood Guardian — Geospatial utilities
 * Haversine distance + nearest-point-on-segment matching.
 * No GIS library dependency needed for MVP.
 *
 * Perf notes (optimised):
 *   - DEG_TO_RAD hoisted to module level (was inline closure per call)
 *   - BASE32 alphabet hoisted to module level (was string literal per encodeGeohash call)
 *   - haversineDistanceM: cos(lat1) computed once, reused in the `a` expression
 *   - splitRouteIntoSegments: sub-parts of a subdivided edge share the same
 *     proportional length (dist/parts) — haversineDistanceM skipped per sub-part
 */

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Haversine great-circle distance between two lat/lon points.
 */
export function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}


/**
 * Split a GeoJSON LineString into segments no longer than maxLengthM.
 * Returns an array of {startCoord, endCoord, lengthM}.
 *
 * Optimisation: sub-parts of a subdivided edge all have the same length
 * (dist / parts). We compute haversineDistanceM once per edge, not once
 * per sub-part.
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
      const parts = Math.ceil(dist / maxLengthM);
      const subLengthM = dist / parts; // all sub-parts have equal length
      for (let p = 0; p < parts; p++) {
        const t0 = p / parts;
        const t1 = (p + 1) / parts;
        const interp = (a: number, b: number, t: number) => a + (b - a) * t;
        const c0: [number, number] = [interp(lon1, lon2, t0), interp(lat1, lat2, t0)];
        const c1: [number, number] = [interp(lon1, lon2, t1), interp(lat1, lat2, t1)];
        segments.push({ startCoord: c0, endCoord: c1, lengthM: subLengthM });
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
 *
 * Optimisation: BASE32 alphabet is a module-level constant (was a string
 * literal reconstructed inside every call).
 */
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
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
