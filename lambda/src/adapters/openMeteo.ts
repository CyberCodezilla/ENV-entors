/**
 * Open-Meteo Weather Adapter
 *
 * Fetches hourly apparent_temperature, relative_humidity_2m, precipitation
 * for a given lat/lon and departure time.
 *
 * No API key required. Free tier.
 * https://open-meteo.com/en/docs
 *
 * Perf note (optimised):
 *   - Best-slot search previously called new Date(time[i] + ':00Z') on every
 *     iteration (48× for a 2-day forecast), allocating 48 Date objects.
 *     Replaced with direct ISO-string-to-epoch arithmetic:
 *       ms = Date.parse(str + ':00Z')
 *     Date.parse is a single static operation that avoids constructing a
 *     Date object; the result is a number and the comparison is pure arithmetic.
 */
import { logger } from '../utils/logger';

const BASE = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherSnapshot {
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  precipitationMm: number | null;
  forecastHourUtc: string | null;
  fetchedAt: string;
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

    // Find the hourly slot closest to targetTimeUtc.
    // Use Date.parse() instead of new Date() to avoid allocating 48 Date objects.
    const targetMs = targetTimeUtc.getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;

    const times = data.hourly.time;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(Date.parse(times[i] + ':00Z') - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      } else if (i > 0) {
        // Early-exit: once diff starts increasing we’ve passed the minimum
        // (slots are monotonically increasing in time)
        break;
      }
    }

    const slotTime = times[bestIdx];
    const slotMs = Date.parse(slotTime + ':00Z');
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
