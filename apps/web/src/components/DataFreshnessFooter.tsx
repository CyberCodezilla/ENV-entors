/**
 * DataFreshnessFooter — shown at the bottom of each RouteCard.
 * Displays weather age, oldest incident age and hotspot load time.
 * Colour-codes staleness so judges and users can assess data quality.
 */
'use client';

import type { AnalyseRoutesResponse } from '@heatflood/shared';

interface Props {
  freshness: AnalyseRoutesResponse['dataFreshness'];
  isReplay?: boolean;
}

function AgeBadge({ ageMinutes, label }: { ageMinutes: number | null; label: string }) {
  if (ageMinutes === null) {
    return (
      <span className="text-gray-600">{label}: <span className="text-gray-500">unavailable</span></span>
    );
  }
  const color =
    ageMinutes < 15 ? 'text-green-500' :
    ageMinutes < 30 ? 'text-yellow-400' :
    'text-red-400';
  return (
    <span className="text-gray-600">
      {label}: <span className={color}>{Math.round(ageMinutes)} min ago</span>
    </span>
  );
}

export function DataFreshnessFooter({ freshness, isReplay = false }: Props) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] mt-2 pt-2 border-t border-gray-800">
      {isReplay ? (
        <span className="text-yellow-600">⏱ Historical scenario — not live data</span>
      ) : (
        <>
          <AgeBadge ageMinutes={freshness.weatherAgeMinutes} label="Weather" />
          <AgeBadge ageMinutes={freshness.oldestIncidentAgeMinutes} label="Incidents" />
          {freshness.hotspotsLoadedAt && (
            <span className="text-gray-600">
              Hotspots: <span className="text-green-600">loaded</span>
            </span>
          )}
        </>
      )}
    </div>
  );
}
