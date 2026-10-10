/**
 * SkeletonCard — animated placeholder shown while route analysis is in progress.
 * Matches the dimensions of RouteCard to prevent layout shift.
 */
'use client';

export function SkeletonCard() {
  return (
    <div className="w-full rounded-xl p-4 border-2 border-gray-800 bg-gray-900 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-20 bg-gray-700 rounded" />
        <div className="h-3 w-28 bg-gray-800 rounded" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-6 w-24 bg-gray-700 rounded-full" />
        <div className="h-6 w-24 bg-gray-700 rounded-full" />
        <div className="h-6 w-28 bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-800 rounded" />
        <div className="h-3 w-4/5 bg-gray-800 rounded" />
      </div>
      <div className="h-2 w-full bg-gray-800 rounded mt-4" />
    </div>
  );
}

export function SkeletonWeatherBanner() {
  return (
    <div className="flex gap-3 rounded-lg bg-gray-800 px-4 py-2 animate-pulse">
      <div className="h-4 w-36 bg-gray-700 rounded" />
      <div className="h-4 w-28 bg-gray-700 rounded" />
      <div className="h-4 w-24 bg-gray-700 rounded" />
    </div>
  );
}
