/**
 * DemoBanner — always shown when isReplay=true.
 * Required: prevents judges from mistaking demo scenarios for live data.
 */
'use client';

export function DemoBanner({ scenarioId }: { scenarioId?: string | null }) {
  return (
    <div className="w-full rounded-lg bg-yellow-900/40 border border-yellow-600 text-yellow-200 text-xs px-4 py-2 flex items-center gap-2">
      <span className="text-base">⏱️</span>
      <span>
        <strong>HISTORICAL / DEMO SCENARIO</strong>
        {scenarioId ? ` — ${scenarioId}` : ''}
        {' '}— This is not live data. Results are pre-set for demonstration purposes.
      </span>
    </div>
  );
}
