import { describe, it, expect } from 'vitest';
import {
  AnalyseRoutesRequestSchema,
  CreateIncidentRequestSchema,
  PILOT_BBOX,
  isInsidePilotZone,
} from '@heatflood/shared';

describe('AnalyseRoutesRequestSchema', () => {
  it('accepts a valid walking request', () => {
    const req = AnalyseRoutesRequestSchema.parse({
      origin: { lat: 19.112, lon: 72.832 },
      destination: { lat: 19.138, lon: 72.855 },
      mode: 'walking',
      departureTime: '2026-07-15T08:00:00+05:30',
    });
    expect(req.mode).toBe('walking');
    expect(req.heatSensitive).toBe(false);
  });

  it('rejects invalid lat/lon', () => {
    expect(() =>
      AnalyseRoutesRequestSchema.parse({
        origin: { lat: 200, lon: 72 },
        destination: { lat: 19, lon: 72 },
        mode: 'walking',
        departureTime: '2026-07-15T08:00:00+05:30',
      })
    ).toThrow();
  });

  it('rejects missing departureTime', () => {
    expect(() =>
      AnalyseRoutesRequestSchema.parse({
        origin: { lat: 19.112, lon: 72.832 },
        destination: { lat: 19.138, lon: 72.855 },
        mode: 'walking',
      })
    ).toThrow();
  });

  it('defaults isReplay to false', () => {
    const req = AnalyseRoutesRequestSchema.parse({
      origin: { lat: 19.112, lon: 72.832 },
      destination: { lat: 19.138, lon: 72.855 },
      mode: 'walking',
      departureTime: '2026-07-15T08:00:00+05:30',
    });
    expect(req.isReplay).toBe(false);
  });
});

describe('CreateIncidentRequestSchema', () => {
  it('accepts a valid waterlogging report', () => {
    const req = CreateIncidentRequestSchema.parse({
      latitude: 19.112,
      longitude: 72.832,
      type: 'waterlogging',
      observedAt: '2026-07-15T08:00:00+05:30',
      idempotencyKey: 'test-key-abc123',
    });
    expect(req.depthCategory).toBe('unknown');
  });

  it('rejects coordinates outside pilot zone', () => {
    expect(() =>
      CreateIncidentRequestSchema.parse({
        latitude: 18.9,  // Outside pilot bbox
        longitude: 72.8,
        type: 'waterlogging',
        observedAt: '2026-07-15T08:00:00+05:30',
        idempotencyKey: 'test-key-abc123',
      })
    ).toThrow();
  });

  it('rejects notes longer than 280 characters', () => {
    expect(() =>
      CreateIncidentRequestSchema.parse({
        latitude: 19.112,
        longitude: 72.832,
        type: 'waterlogging',
        observedAt: '2026-07-15T08:00:00+05:30',
        idempotencyKey: 'test-key-abc123',
        notes: 'x'.repeat(281),
      })
    ).toThrow();
  });
});

describe('isInsidePilotZone', () => {
  it('returns inside for a pilot-area coordinate', () => {
    expect(isInsidePilotZone(19.12, 72.84, PILOT_BBOX)).toBe(true);
  });

  it('returns outside for a coordinate south of bbox', () => {
    expect(isInsidePilotZone(18.9, 72.84, PILOT_BBOX)).toBe(false);
  });

  it('returns outside for a coordinate east of bbox', () => {
    expect(isInsidePilotZone(19.12, 73.1, PILOT_BBOX)).toBe(false);
  });
});
