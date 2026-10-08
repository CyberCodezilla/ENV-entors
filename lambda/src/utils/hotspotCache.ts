/**
 * In-memory hotspot cache for Lambda.
 *
 * Hotspots are static — seeded once and rarely change.
 * Cache is populated on first invocation and reused across warm Lambda invocations.
 * Cache expires after 15 minutes to pick up any re-seeds.
 */
import { fetchAllHotspots } from '../adapters/dynamodb';
import type { FloodHotspot } from '../engine/floodRisk';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let cachedHotspots: FloodHotspot[] = [];
let cacheLoadedAt: number | null = null;

export async function getHotspots(): Promise<FloodHotspot[]> {
  const now = Date.now();
  if (cacheLoadedAt === null || now - cacheLoadedAt > CACHE_TTL_MS) {
    cachedHotspots = await fetchAllHotspots();
    cacheLoadedAt = now;
  }
  return cachedHotspots;
}

/** Force-refresh the cache (call after re-seeding hotspots). */
export function invalidateHotspotCache(): void {
  cacheLoadedAt = null;
  cachedHotspots = [];
}
