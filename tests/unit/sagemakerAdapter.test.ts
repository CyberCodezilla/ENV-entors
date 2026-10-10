import { describe, expect, it } from 'vitest';
import { featuresToCsv, parseSageMakerProbability, FEATURE_ORDER } from '../../lambda/src/adapters/sagemaker';

const FEATURES = {
  featureVersion: 'rainfall-stress-v1' as const,
  predictionTimeUtc: '2026-10-07T00:00:00Z',
  segmentId: 'seg-0',
  rainfall_recent_1h_mm: 10,
  rainfall_recent_3h_mm: 20,
  rainfall_forecast_1h_mm: 5,
  relative_humidity_pct: 80,
  apparent_temperature_c: 34,
  hotspot_distance_m: 120,
  hotspot_overlap: 1 as const,
  recent_report_count: 2,
  verified_report_count: 1,
  newest_report_age_min: 8,
  hour_of_day: 0,
  day_of_week: 2,
  month: 10,
  location_geohash5: 'te7p0',
};

describe('SageMaker adapter contract', () => {
  it('keeps the feature order identical to the model contract', () => {
    const values = featuresToCsv(FEATURES).split(',').map(Number);
    expect(values).toHaveLength(10);
    const expected = [10, 20, 80, 34, 0, 1, 0.974927912, -0.222520934, -0.866025404, 0.5];
    values.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 8));
  });
  it('parses valid probabilities', () => {
    expect(parseSageMakerProbability(Buffer.from('0.73'))).toBeCloseTo(0.73);
    expect(parseSageMakerProbability(Buffer.from('0.73,0.27'))).toBeCloseTo(0.73);
  });
  it('rejects malformed or out-of-range probabilities', () => {
    expect(parseSageMakerProbability(Buffer.from(''))).toBeNull();
    expect(parseSageMakerProbability(Buffer.from('not-a-number'))).toBeNull();
    expect(parseSageMakerProbability(Buffer.from('1.2'))).toBeNull();
    expect(parseSageMakerProbability(Buffer.from('-0.1'))).toBeNull();
  });
  it('maintains periodic continuity across week boundaries (Sunday to Monday)', () => {
    const sundayFeatures = { ...FEATURES, day_of_week: 6 };
    const mondayFeatures = { ...FEATURES, day_of_week: 0 };
    const tuesdayFeatures = { ...FEATURES, day_of_week: 1 };

    const sundayVals = featuresToCsv(sundayFeatures).split(',').map(Number);
    const mondayVals = featuresToCsv(mondayFeatures).split(',').map(Number);
    const tuesdayVals = featuresToCsv(tuesdayFeatures).split(',').map(Number);

    const sunSin = sundayVals[6], sunCos = sundayVals[7];
    const monSin = mondayVals[6], monCos = mondayVals[7];
    const tueSin = tuesdayVals[6], tueCos = tuesdayVals[7];

    const distSunMon = Math.hypot(sunSin - monSin, sunCos - monCos);
    const distMonTue = Math.hypot(monSin - tueSin, monCos - tueCos);

    expect(distSunMon).toBeCloseTo(distMonTue, 6);
  });
});
