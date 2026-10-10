'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Navigation, AlertTriangle, Loader2 } from 'lucide-react';
import type { Place } from '@/lib/api/types';
import { useToast } from '@/components/ui/Toast';

export interface PlaceInputProps {
  label: 'Origin' | 'Destination';
  value: Place | null;
  onChange: (place: Place | null) => void;
  onPickOnMap?: () => void;
  isPicking?: boolean;
}

const PILOT_BBOX = {
  lngMin: 72.82,
  latMin: 19.1,
  lngMax: 72.87,
  latMax: 19.145,
};

export function PlaceInput({
  label,
  value,
  onChange,
  onPickOnMap,
  isPicking = false,
}: PlaceInputProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding search
  useEffect(() => {
    if (!query || (value && query === value.name)) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token || token.startsWith('pk.YOUR_')) {
        // Fallback local suggestions if token is placeholder
        setSuggestions([
          { name: `${query} (Versova Beach)`, lat: 19.112, lon: 72.832 },
          { name: `${query} (Andheri Station West)`, lat: 19.1197, lon: 72.8465 },
          { name: `${query} (DN Nagar Metro)`, lat: 19.1305, lon: 72.8354 },
        ]);
        setIsOpen(true);
        return;
      }

      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?proximity=72.85,19.12&bbox=72.82,19.10,72.87,19.145&limit=5&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const items: Place[] = (data.features || []).map((f: { place_name: string; center: [number, number] }) => ({
            name: f.place_name,
            lon: f.center[0],
            lat: f.center[1],
          }));
          setSuggestions(items);
          setIsOpen(true);
        }
      } catch {
        /* fail silently */
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, value]);

  // Geolocation trigger
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast({
        variant: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const place: Place = {
          name: `Current Location (${lat}, ${lon})`,
          lat,
          lon,
        };
        onChange(place);
        setQuery(place.name);
        toast({
          variant: 'success',
          message: `Set ${label} to current GPS coordinates.`,
        });
      },
      () => {
        toast({
          variant: 'warn',
          message: 'Location access denied or timed out.',
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Pilot zone check
  const isOutsidePilot =
    value &&
    (value.lat < PILOT_BBOX.latMin ||
      value.lat > PILOT_BBOX.latMax ||
      value.lon < PILOT_BBOX.lngMin ||
      value.lon > PILOT_BBOX.lngMax);

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 relative w-full">
      <div className="flex items-center justify-between text-xs font-medium text-ink-2">
        <label className="flex items-center gap-1.5">
          <MapPin className={`w-3.5 h-3.5 ${label === 'Origin' ? 'text-flood' : 'text-heat'}`} />
          <span>{label}</span>
        </label>

        {value && (
          <span className="font-mono text-[11px] text-ink-3">
            {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
          </span>
        )}
      </div>

      {/* Input row */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value && e.target.value !== value.name) {
              onChange(null);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={`Search ${label.toLowerCase()} in Mumbai...`}
          className="w-full glass-panel bg-base/80 text-ink text-sm rounded-md pl-3 pr-20 py-2 border border-line focus:border-flood/60 focus:bg-base focus:ring-1 focus:ring-flood/50 transition outline-none"
        />

        {/* Action icons inside input */}
        <div className="absolute right-2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-3 mr-1" />}

          <button
            type="button"
            onClick={handleUseMyLocation}
            title="Use my location"
            aria-label={`Use my location for ${label}`}
            className="p-1 rounded text-ink-3 hover:text-flood hover:bg-raised/70 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onPickOnMap}
            title="Pick on map"
            aria-label={`Pick ${label} on map`}
            className={`p-1 rounded transition ${
              isPicking
                ? 'bg-flood text-void font-bold shadow-glow'
                : 'text-ink-3 hover:text-heat hover:bg-raised/70'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 glass-panel bg-base/95 rounded-md border border-line shadow-glass z-50 overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => {
                onChange(item);
                setQuery(item.name);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-xs text-ink hover:bg-raised/90 cursor-pointer flex flex-col gap-0.5 border-b border-line/50 last:border-0 transition"
            >
              <span className="font-medium text-ink truncate">{item.name}</span>
              <span className="font-mono text-[10px] text-ink-3">
                {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Pilot Warning Banner (verbatim per Section 7.1) */}
      {isOutsidePilot && (
        <div
          role="alert"
          className="rounded-sm bg-risk-1/10 border border-risk-1/30 text-risk-1 text-[11px] px-2.5 py-1.5 flex items-start gap-1.5 leading-snug animate-in fade-in"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            ⚠️ These coordinates are outside the Mumbai pilot zone (Andheri West / Versova). Results
            will have limited data support.
          </span>
        </div>
      )}
    </div>
  );
}