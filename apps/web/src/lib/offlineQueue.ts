import type { CreateIncidentRequest } from '@heatflood/shared';

const OFFLINE_INCIDENTS_KEY = 'heatflood_offline_incidents_queue';

export function getOfflineIncidents(): CreateIncidentRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_INCIDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineIncident(req: CreateIncidentRequest): void {
  if (typeof window === 'undefined') return;
  const queue = getOfflineIncidents();
  queue.push(req);
  localStorage.setItem(OFFLINE_INCIDENTS_KEY, JSON.stringify(queue));
}

export function clearOfflineIncidents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_INCIDENTS_KEY);
}

export async function syncOfflineIncidents(
  createIncidentFn: (req: CreateIncidentRequest) => Promise<unknown>
): Promise<number> {
  const queue = getOfflineIncidents();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remaining: CreateIncidentRequest[] = [];

  for (const req of queue) {
    try {
      await createIncidentFn(req);
      syncedCount++;
    } catch {
      remaining.push(req);
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(OFFLINE_INCIDENTS_KEY, JSON.stringify(remaining));
  } else {
    clearOfflineIncidents();
  }

  return syncedCount;
}
