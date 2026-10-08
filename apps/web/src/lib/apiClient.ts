/**
 * HeatFlood Guardian API Client — Day 2
 *
 * Typed wrappers around every backend endpoint.
 * All requests go to NEXT_PUBLIC_API_BASE_URL.
 */
import type {
  AnalyseRoutesRequest,
  AnalyseRoutesResponse,
  AreaStatusResponse,
  CreateIncidentRequest,
} from '@heatflood/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function apiPost<Req, Res>(path: string, body: Req): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<Res>;
}

async function apiGet<Res>(path: string, params?: Record<string, string>): Promise<Res> {
  const url = new URL(`${BASE}${path}`, 'http://placeholder');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<Res>;
}

export const api = {
  analyseRoutes: (req: AnalyseRoutesRequest) =>
    apiPost<AnalyseRoutesRequest, AnalyseRoutesResponse>('/routes/analyse', req),

  getStatus: (lat: number, lon: number) =>
    apiGet<AreaStatusResponse>('/status', {
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
    }),

  createIncident: (req: CreateIncidentRequest) =>
    apiPost<CreateIncidentRequest, { incidentId: string; status: string; expiresAt: string }>(
      '/incidents', req
    ),

  getDemoScenario: (id: string) =>
    apiGet<AnalyseRoutesRequest & { _description: string; _expectedOutcome: unknown }>(
      `/demo/scenarios/${id}`
    ),

  health: () => apiGet<{ status: string; timestamp: string }>('/health'),
};
