import { describe, expect, it } from 'vitest';
import { assessScenario } from '../../lambda/src/handlers/innovationScenario';

describe('innovation scenario engine', () => {
  it('labels all scenario results as simulated and requiring human review', () => {
    const result = assessScenario({ scenarioId: 'cloudburst' });
    expect(result.simulated).toBe(true);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.provenance.length).toBeGreaterThan(0);
    expect(result.uncertainty.length).toBeGreaterThan(0);
  });

  it('bounds extreme user inputs', () => {
    const result = assessScenario({ scenarioId: 'compound', rainfallMm: 9999, apparentTempC: 999, blockedRoads: -20 });
    expect(result.inputs.rainfallMm).toBe(250);
    expect(result.inputs.apparentTempC).toBe(65);
    expect(result.inputs.blockedRoads).toBe(0);
    expect(result.indices.composite).toBeLessThanOrEqual(100);
  });

  it('marks degraded mode when the advisory dependency is unavailable', () => {
    const result = assessScenario({ scenarioId: 'heat' }, true);
    expect(result.degraded).toBe(true);
    expect(result.engine).toBe('deterministic-fallback-ml-unavailable');
  });

  it('returns a ranked response brief', () => {
    const result = assessScenario({ scenarioId: 'blocked-road' });
    expect(result.recommendations.map(x => x.priority)).toEqual([1, 2, 3]);
  });
});
