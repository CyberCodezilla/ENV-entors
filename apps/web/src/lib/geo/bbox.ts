export interface Bbox {
  lngMin: number;
  latMin: number;
  lngMax: number;
  latMax: number;
}

export const MAX_BBOX_SPAN = 0.25;

/**
 * Hard rule from Section 2, Rule 4:
 * Clamps bounding box span to <= 0.25 degrees on both axes.
 * Prevents 400 INVALID_BBOX errors from API Gateway.
 */
export function clampBbox(b: Bbox): Bbox {
  let { lngMin, latMin, lngMax, latMax } = b;

  // Ensure min <= max
  if (lngMin > lngMax) [lngMin, lngMax] = [lngMax, lngMin];
  if (latMin > latMax) [latMin, latMax] = [latMax, latMin];

  // Global bounds
  lngMin = Math.max(-180, lngMin);
  latMin = Math.max(-90, latMin);
  lngMax = Math.min(180, lngMax);
  latMax = Math.min(90, latMax);

  const lngSpan = lngMax - lngMin;
  const latSpan = latMax - latMin;

  if (lngSpan > MAX_BBOX_SPAN) {
    const centerLng = (lngMin + lngMax) / 2;
    lngMin = centerLng - MAX_BBOX_SPAN / 2;
    lngMax = centerLng + MAX_BBOX_SPAN / 2;
  }

  if (latSpan > MAX_BBOX_SPAN) {
    const centerLat = (latMin + latMax) / 2;
    latMin = centerLat - MAX_BBOX_SPAN / 2;
    latMax = centerLat + MAX_BBOX_SPAN / 2;
  }

  return {
    lngMin: Number(lngMin.toFixed(4)),
    latMin: Number(latMin.toFixed(4)),
    lngMax: Number(lngMax.toFixed(4)),
    latMax: Number(latMax.toFixed(4)),
  };
}