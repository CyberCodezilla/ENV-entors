/**
 * MobileDrawer — Day 5
 * On mobile (<768px) the sidebar collapses into a bottom drawer.
 * Toggled by the floating FAB button on the map.
 * Desktop layout is unchanged (sidebar always visible).
 */
'use client';

import { useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  routeCount?: number;
}

export function MobileDrawer({ children, routeCount }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB — mobile only */}
      <button
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm"
        onClick={() => setOpen(o => !o)}
      >
        <span>{open ? '✕ Close' : '🗺 Routes'}</span>
        {routeCount !== undefined && routeCount > 0 && (
          <span className="bg-white text-blue-700 rounded-full text-xs font-bold w-5 h-5 flex items-center justify-center">
            {routeCount}
          </span>
        )}
      </button>

      {/* Bottom drawer — mobile */}
      <div
        className={[
          'md:hidden fixed inset-x-0 bottom-0 z-30 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl transition-transform duration-300',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-88 flex-shrink-0 overflow-y-auto bg-gray-900 border-r border-gray-800 flex-col">
        <div className="p-4 flex flex-col gap-3 h-full">{children}</div>
      </aside>
    </>
  );
}
