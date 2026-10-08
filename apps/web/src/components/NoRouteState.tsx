/**
 * NoRouteState — shown when hasConfidentRecommendation=false.
 * Critical: must be explicit, actionable and not dismissible.
 */
'use client';

interface Props {
  reason: string | null;
  isReplay?: boolean;
}

export function NoRouteState({ reason, isReplay = false }: Props) {
  return (
    <div className="rounded-xl border-2 border-red-800 bg-red-950/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">\u26D4</span>
        <h3 className="text-lg font-bold text-red-300">No safe route can be recommended</h3>
      </div>
      {reason && (
        <p className="text-sm text-red-200 mb-4">{reason}</p>
      )}
      <ul className="text-sm text-gray-300 space-y-1">
        <li>\u2022 Do not enter floodwater. Even ankle-deep water can be dangerous.</li>
        <li>\u2022 Check MCGM / IMD official alerts before travelling.</li>
        <li>\u2022 Wait for conditions to improve and try again.</li>
      </ul>
      {isReplay && (
        <p className="text-xs text-yellow-400 mt-3">[DEMO SCENARIO — not live conditions]</p>
      )}
    </div>
  );
}
