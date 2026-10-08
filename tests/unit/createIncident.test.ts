/**
 * Unit tests for createIncident handler logic.
 * Uses local DynamoDB (SAM local / DynamoDB local) or mocked SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Lightweight validation-only tests — no DynamoDB required
import { CreateIncidentRequestSchema } from '../../shared/src/schemas/incident';
import { ZodError } from 'zod';

describe('CreateIncidentRequestSchema validation', () => {
  it('accepts a valid waterlogging report', () => {
    const valid = {
      latitude: 19.1120,
      longitude: 72.8320,
      type: 'waterlogging',
      depthCategory: 'ankle',
      observedAt: new Date().toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing latitude', () => {
    const invalid = {
      longitude: 72.8320,
      type: 'waterlogging',
      observedAt: new Date().toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects coordinates outside valid range', () => {
    const invalid = {
      latitude: 999,
      longitude: 72.8320,
      type: 'waterlogging',
      observedAt: new Date().toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects unknown incident type', () => {
    const invalid = {
      latitude: 19.112,
      longitude: 72.832,
      type: 'earthquake',
      observedAt: new Date().toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(invalid)).toThrow(ZodError);
  });

  it('accepts optional depthCategory being omitted', () => {
    const minimal = {
      latitude: 19.112,
      longitude: 72.832,
      type: 'road_blocked',
      observedAt: new Date().toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(minimal)).not.toThrow();
  });

  it('rejects future observedAt more than 1 hour ahead', () => {
    const future = {
      latitude: 19.112,
      longitude: 72.832,
      type: 'waterlogging',
      observedAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    };
    expect(() => CreateIncidentRequestSchema.parse(future)).toThrow(ZodError);
  });
});
