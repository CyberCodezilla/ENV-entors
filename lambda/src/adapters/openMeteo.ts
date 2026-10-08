/**
 * Open-Meteo Weather Adapter — Day 2
 *
 * Fetches hourly apparent_temperature, relative_humidity_2m, precipitation
 * for a given lat/lon and departure time.
 *
 * No API key required. Free tier.
 * https://open-meteo.com/en/docs
 */
import { logger } from '../utils/logger';

const BASE = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherSnapshot {
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  precipitationMm: number | null;     // mm accumulated in the preceding hour
  forecastHourUtc: string | null;     // ISO UTC string for the matched hour slot
  fetchedAt: string;                  // ISO UTC
  isStale: boolean;
  staleThresholdMinutes: number;
  ageMinutes: number | null;
  error: string | null;
}

const STALE_THRESHOLD_MINUTES = 30;

export async function fetchWeather(
  lat: number,
  lon: number,
  targetTimeUtc: Date,
): Promise<WeatherSnapshot> {
  const fetchedAt = new Date().toISOString();

  const url = new URL(BASE);
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set('hourly', 'apparent_temperature,relative_humidity_2m,precipitation');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '2');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      logger.warn('Open-Meteo non-200', { status: res.status });
      return nullSnapshot(fetchedAt, `Open-Meteo ${res.status}`);
    }

    const data = await res.json() as {
      hourly: {
        time: string[];
        apparent_temperature: number[];
        relative_humidity_2m: number[];
        precipitation: number[];
      };
    };

    // Find the hourly slot closest to targetTimeUtc
    const targetMs = targetTimeUtc.getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;

    for (let i = 0; i < data.hourly.time.length; i++) {
      const diff = Math.abs(new Date(data.hourly.time[i] + ':00Z').getTime() - targetMs);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }

    const slotTime = data.hourly.time[bestIdx];
    const slotMs = new Date(slotTime + ':00Z').getTime();
    const ageMinutes = (Date.now() - slotMs) / 60_000;
    const isStale = ageMinutes > STALE_THRESHOLD_MINUTES;

    return {
      apparentTemperatureC: data.hourly.apparent_temperature[bestIdx] ?? null,
      relativeHumidityPct: data.hourly.relative_humidity_2m[bestIdx] ?? null,
      precipitationMm: data.hourly.precipitation[bestIdx] ?? null,
      forecastHourUtc: slotTime + ':00Z',
      fetchedAt,
      isStale,
      staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
      ageMinutes: Math.round(ageMinutes),
      error: null,
    };
  } catch (err) {
    logger.error('Open-Meteo fetch failed', { err });
    return nullSnapshot(fetchedAt, 'Open-Meteo fetch failed');
  }
}

function nullSnapshot(fetchedAt: string, error: string): WeatherSnapshot {
  return {
    apparentTemperatureC: null,
    relativeHumidityPct: null,
    precipitationMm: null,
    forecastHourUtc: null,
    fetchedAt,
    isStale: false,
    staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
    ageMinutes: null,
    error,
  };
}
