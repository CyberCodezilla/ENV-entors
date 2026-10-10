'use client';

import React from 'react';
import { HexBadge } from '@/components/ui/HexBadge';
import { Shield } from 'lucide-react';

export interface GuardianAdvisoryProps {
  topReasons: string[];
}

export function GuardianAdvisory({ topReasons }: GuardianAdvisoryProps) {
  if (!topReasons || topReasons.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 mt-2.5 pt-2.5 border-t border-line/60">
      <HexBadge size="sm" variant="brand" className="mt-0.5 shrink-0">
        <Shield className="w-3.5 h-3.5 text-void fill-void" />
      </HexBadge>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-flood">
          Guardian Advisory
        </span>
        <ul className="flex flex-col gap-1">
          {topReasons.map((reason, idx) => (
            <li
              key={idx}
              className="text-xs text-ink-2 bg-raised/50 border border-line/40 rounded-md px-2 py-1 leading-snug"
            >
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}