/**
 * E2E smoke test: GET /health returns 200 with status=ok.
 * Run after `sam local start-api` or against deployed API:
 *   API_BASE_URL=https://xxx.execute-api.ap-south-1.amazonaws.com/dev npx vitest run tests/e2e
 */
import { describe, it, expect } from 'vitest';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

describe('GET /health (e2e)', () => {
  it('returns 200 with status ok', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns version field', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(body).toHaveProperty('version');
  });
});
