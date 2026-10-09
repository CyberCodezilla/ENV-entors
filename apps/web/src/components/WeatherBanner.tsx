/**
 * WeatherBanner — shows current weather snapshot.
 * Renders a stale warning when data is older than the threshold.
 */
'use client';

import type { AnalyseRoutesResponse } from '@heatflood/shared';

interface Props {
  weather: AnalyseRoutesResponse['weather'];
  isReplay?: boolean;
}

export function WeatherBanner({ weather, isReplay = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-800 px-4 py-2 text-sm">
      {isReplay && (
        <span className="text-yellow-400 font-semibold text-xs">[DEMO DATA]</span>
      )}
      {weather.apparentTemperatureC !== null ? (
        <span className="text-orange-300">\uD83C\uDF21\uFE0F {weather.apparentTemperatureC.toFixed(1)} \u00b0C feels-like</span>
      ) : (
        <span className="text-gray-500">\uD83C\uDF21\uFE0F temp unavailable</span>
      )}
      {weather.relativeHumidityPct !== null && (
        <span className="text-blue-300">\uD83D\uDCA7 {weather.relativeHumidityPct}% humidity</span>
      )}
      {weather.precipitationMm !== null ? (
        <span className="text-blue-200">\uD83C\uDF27\uFE0F {weather.precipitationMm.toFixed(1)} mm/h</span>
      ) : (
        <span className="text-gray-500">\uD83C\uDF27\uFE0F rain data unavailable</span>
      )}
      {weather.isStale && (
        <span className="text-yellow-400 font-medium text-xs">
          \u26A0\uFE0F Weather data may be stale (&gt;{weather.staleThresholdMinutes} min old)
        </span>
      )}
    </div>
  );
}
