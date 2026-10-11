import type {
  AnalyseResponse,
  AnalyseRoutesRequest,
  CreateIncidentRequest,
  CreateIncidentResponse,
  DemoFixture,
  HealthResponse,
  IncidentsResponse,
  RejectResponse,
  StatusResponse,
  VerifyResponse,
} from './types';
import type { AppError } from './errors';
import { clampBbox, type Bbox } from '../geo/bbox';
import { enqueueOfflineIncident } from '../offlineQueue';
import {
  generateOfflineAnalyseResponse,
  generateOfflineDemoFixture,
  getOfflineHealth,
  getOfflineIncidents,
  getOfflineStatus,
} from './offlineFallback';

const DEFAULT_BASE = 'https://jpiub1heok.execute-api.ap-south-1.amazonaws.com/prod';
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw {
      kind: 'network',
      message: 'You appear to be offline. Reconnect to sync hazard data.',
    } as AppError;
  }

  if (res.ok) {
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const requestId = body.requestId as string | undefined;

  switch (res.status) {
    case 400:
      throw {
        kind: 'validation',
        message:
          body.error === 'VALIDATION_ERROR'
            ? 'Some fields need attention.'
            : (body.detail as string) ?? 'Invalid request.',
        fieldErrors: body.details as Array<{ path: (string | number)[]; message: string }>,
        requestId,
      } as AppError;
    case 401:
      throw { kind: 'unauthorized', message: 'Sign in required.', requestId } as AppError;
    case 403:
      throw { kind: 'forbidden', message: 'Moderator role required.', requestId } as AppError;
    case 404:
      throw {
        kind: 'not_found',
        message: (body.detail as string) ?? 'Not found.',
        requestId,
      } as AppError;
    case 429:
      throw {
        kind: 'rate_limit',
        message: 'Hold on — too many requests. Cooling down…',
        retryAfterSec: 60,
        requestId,
      } as AppError;
    case 503:
      throw {
        kind: 'routing',
        message:
          (body.detail as string) ??
          'Routing service unavailable. Try again shortly.',
        requestId,
      } as AppError;
    default:
      throw {
        kind: 'server',
        message: 'Guardian backend hiccup. Retrying may help.',
        requestId,
      } as AppError;
  }
}

export const api = {
  analyseRoutes: async (req: AnalyseRoutesRequest, signal?: AbortSignal) => {
    try {
      return await apiFetch<AnalyseResponse>('/routes/analyse', {
        method: 'POST',
        body: JSON.stringify(req),
        signal,
      });
    } catch (err) {
      if ((err as AppError).kind === 'network' || (err as AppError).kind === 'server') {
        return generateOfflineAnalyseResponse(req);
      }
      throw err;
    }
  },

  listIncidents: async (b: Bbox, signal?: AbortSignal) => {
    const clamped = clampBbox(b); // HARD LAW: span <= 0.25 deg per axis (Section 2, Rule 4)
    try {
      return await apiFetch<IncidentsResponse>(
        `/incidents?bbox=${clamped.lngMin},${clamped.latMin},${clamped.lngMax},${clamped.latMax}`,
        { signal }
      );
    } catch (err) {
      if ((err as AppError).kind === 'network' || (err as AppError).kind === 'server') {
        return getOfflineIncidents(clamped);
      }
      throw err;
    }
  },

  createIncident: (req: CreateIncidentRequest, signal?: AbortSignal) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineIncident(req as any);
      return Promise.resolve({
        incidentId: req.idempotencyKey,
        status: 'queued_offline',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      } as CreateIncidentResponse);
    }
    return apiFetch<CreateIncidentResponse>('/incidents', {
      method: 'POST',
      body: JSON.stringify(req),
      signal,
    }).catch((err) => {
      if ((err as AppError).kind === 'network' || (err as AppError).kind === 'server') {
        enqueueOfflineIncident(req as any);
        return {
          incidentId: req.idempotencyKey,
          status: 'queued_offline',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        } as CreateIncidentResponse;
      }
      throw err;
    });
  },

  getStatus: (lat: number, lon: number, signal?: AbortSignal) =>
    apiFetch<StatusResponse>(
      `/status?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`,
      { signal }
    ).catch(() => getOfflineStatus(lat, lon)),

  getDemoScenario: async (id: 'heat' | 'flood' | 'compound', signal?: AbortSignal) => {
    try {
      return await apiFetch<DemoFixture>(`/demo/scenarios/${id}`, { signal });
    } catch (err) {
      if ((err as AppError).kind === 'network' || (err as AppError).kind === 'server') {
        return generateOfflineDemoFixture(id);
      }
      throw err;
    }
  },

  getHealth: async (signal?: AbortSignal) => {
    try {
      return await apiFetch<HealthResponse>('/health', { signal });
    } catch {
      return getOfflineHealth();
    }
  },

  verifyIncident: (id: string, idToken: string, signal?: AbortSignal) =>
    apiFetch<VerifyResponse>(`/incidents/${id}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${idToken}` },
      signal,
    }),

  rejectIncident: (id: string, idToken: string, signal?: AbortSignal) =>
    apiFetch<RejectResponse>(`/incidents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
      signal,
    }),
};