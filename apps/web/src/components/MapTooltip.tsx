/**
 * MapTooltip — Day 4
 * Floating tooltip shown when user hovers a route segment on the map.
 * Renders flood score, heat score, confidence and hard-block reason.
 */
'use client';

interface SegmentInfo {
  floodScore: number;
  heatScore: number;
  confidenceScore: number;
  floodLevel: string;
  heatLevel: string;
  confidenceLevel: string;
  hardBlock: boolean;
  hardBlockReason: string | null;
  segmentLengthM: number;
  reasons: string[];
}

interface Props {
  segment: SegmentInfo;
  x: number;
  y: number;
}

const LEVEL_EMOJI: Record<string, string> = {
  low: '\uD83D\uDFE2',
  moderate: '\uD83D\uDFE1',
  high: '\uD83D\uDD34',
  blocked: '\u26D4',
};

export function MapTooltip({ segment, x, y }: Props) {
  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 text-xs w-56 pointer-events-none"
      style={{ left: x + 12, top: y - 8 }}
    >
      {segment.hardBlock && (
        <div className="text-red-400 font-semibold mb-2">
          \u26D4 {segment.hardBlockReason ?? 'Route blocked'}
        </div>
      )}
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">\uD83D\uDCA7 Flood</span>
        <span>{LEVEL_EMOJI[segment.floodLevel]} {segment.floodLevel} ({segment.floodScore})</span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">\uD83C\uDF21\uFE0F Heat</span>
        <span>{LEVEL_EMOJI[segment.heatLevel]} {segment.heatLevel} ({segment.heatScore})</span>
      </div>
      <div className="flex justify-between mb-2">
        <span className="text-gray-400">\uD83D\uDCCA Confidence</span>
        <span className="text-blue-300">{segment.confidenceLevel} ({segment.confidenceScore})</span>
      </div>
      {segment.reasons.length > 0 && (
        <ul className="text-gray-500 space-y-0.5 border-t border-gray-700 pt-2">
          {segment.reasons.slice(0, 3).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <div className="text-gray-600 mt-2">
        Segment length: {Math.round(segment.segmentLengthM)} m
      </div>
    </div>
  );
}
