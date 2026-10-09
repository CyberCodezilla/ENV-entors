import { describe, it, expect, vi } from 'vitest';
import { getGeohashesForBbox, handler } from '../../lambda/src/handlers/listIncidents';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('listIncidents handler and geohash helper', () => {
  describe('getGeohashesForBbox', () => {
    it('returns geohashes within a small bounding box', () => {
      const hashes = getGeohashesForBbox(72.83, 19.11, 72.85, 19.13);
      expect(hashes.length).toBeGreaterThan(0);
      expect(hashes.length).toBeLessThanOrEqual(25);
    });

    it('caps output at maxGeohashes even if bbox step produces more', () => {
      const hashes = getGeohashesForBbox(70.0, 18.0, 75.0, 22.0, 25);
      expect(hashes.length).toBeLessThanOrEqual(25);
    });
  });

  describe('handler validation (Bug 2 fix)', () => {
    it('returns 400 INVALID_BBOX for invalid bbox format', async () => {
      const event = {
        queryStringParameters: { bbox: 'invalid,bbox' },
      } as unknown as APIGatewayProxyEventV2;

      const res = await handler(event, {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('INVALID_BBOX');
    });

    it('returns 400 INVALID_BBOX when lat/lng are out of range', async () => {
      const event = {
        queryStringParameters: { bbox: '72.8,100,72.9,101' },
      } as unknown as APIGatewayProxyEventV2;

      const res = await handler(event, {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('INVALID_BBOX');
    });

    it('returns 400 INVALID_BBOX when bounding box span exceeds 0.25 degrees', async () => {
      const event = {
        queryStringParameters: { bbox: '72.0,19.0,73.0,20.0' },
      } as unknown as APIGatewayProxyEventV2;

      const res = await handler(event, {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('INVALID_BBOX');
      expect(body.detail).toContain('span exceeds maximum allowed limit');
    });
  });
});
