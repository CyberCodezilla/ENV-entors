/**
 * HeatFlood Guardian API Client — updated Day 3
 * Adds getIncidents endpoint.
 */
import type {
  AnalyseRoutesRequest,
  AnalyseRoutesResponse,
  AreaStatusResponse,
  CreateIncidentRequest,
} from '@heatflood/shared';
import type { MapIncident } from '@/components/Map';

const DEFAULT_API_BASE_URL = 'https://jpiub1heok.execute-api.ap-south-1.amazonaws.com/prod';
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

async function apiPost<Req, Res>(path: string, body: Req): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<Res>;
}

async function apiGet<Res>(path: string, params?: Record<string, string>): Promise<Res> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(`${BASE}${path}`, origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<Res>;
}

const MUMBAI_BBOX = { lngMin: 72.77, latMin: 18.89, lngMax: 72.98, latMax: 19.27 };

function isWithinBbox(lat: number, lon: number): boolean {
  return (
    lat >= MUMBAI_BBOX.latMin &&
    lat <= MUMBAI_BBOX.latMax &&
    lon >= MUMBAI_BBOX.lngMin &&
    lon <= MUMBAI_BBOX.lngMax
  );
}

export const api = {
  analyseRoutes: (req: AnalyseRoutesRequest) => {
    if (!isWithinBbox(req.origin.lat, req.origin.lon) || !isWithinBbox(req.destination.lat, req.destination.lon)) {
      return Promise.reject(new Error('Coordinates outside the supported Mumbai bounding box [72.77, 18.89, 72.98, 19.27]'));
    }
    return apiPost<AnalyseRoutesRequest, AnalyseRoutesResponse>('/routes/analyse', req);
  },

  getStatus: (lat: number, lon: number) =>
    apiGet<AreaStatusResponse>('/status', {
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
    }),

  createIncident: (req: CreateIncidentRequest) =>
    apiPost<CreateIncidentRequest, { incidentId: string; status: string; expiresAt: string }>(
      '/incidents', req
    ),

  getIncidents: (lngMin: number, latMin: number, lngMax: number, latMax: number) =>
    apiGet<{ incidents: MapIncident[]; count: number; fetchedAt: string }>('/incidents', {
      bbox: `${lngMin},${latMin},${lngMax},${latMax}`,
    }),

  getDemoScenario: (id: string) =>
    apiGet<AnalyseRoutesRequest & { _description: string; _expectedOutcome: unknown }>(
      `/demo/scenarios/${id}`
    ),

  health: () => apiGet<{ status: string; timestamp: string }>('/health'),
};
