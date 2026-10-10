/**
 * MapLegend — Day 4
 * Floating bottom-right overlay on the Mapbox map.
 * Shows route colour → risk level mapping and incident icons.
 */
'use client';

const ROUTE_LEGEND = [
  { color: '#22c55e', label: 'Low flood risk' },
  { color: '#f59e0b', label: 'Moderate risk' },
  { color: '#ef4444', label: 'High risk' },
  { color: '#7f1d1d', label: 'Blocked / impassable' },
];

const INCIDENT_LEGEND = [
  { bg: '#ef4444', icon: '💧', label: 'Verified incident' },
  { bg: '#f59e0b', icon: '⚠️', label: 'Unverified report' },
];

export function MapLegend() {
  return (
    <div className="absolute bottom-8 right-3 z-10 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl p-3 text-xs shadow-xl w-44">
      <p className="font-semibold text-gray-300 mb-2">Route risk</p>
      {ROUTE_LEGEND.map(item => (
        <div key={item.label} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-5 h-2 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-gray-400">{item.label}</span>
        </div>
      ))}
      <p className="font-semibold text-gray-300 mt-3 mb-2">Hazard reports</p>
      {INCIDENT_LEGEND.map(item => (
        <div key={item.label} className="flex items-center gap-2 mb-1">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] flex-shrink-0"
            style={{ background: item.bg }}
          >{item.icon}</span>
          <span className="text-gray-400">{item.label}</span>
        </div>
      ))}
      <p className="text-gray-600 mt-2 leading-tight">
        Click anywhere to report a hazard
      </p>
    </div>
  );
}
