import { describe, it, expect } from 'vitest';
import { SageMakerMlRiskProvider } from '../../lambda/src/adapters/sagemaker';
import { ML_FEATURE_VERSION, MlRiskProvider } from '@heatflood/shared';
import featureOrder from '../../ml/feature_order.json';
import { scoreSegment } from '../../lambda/src/engine/segmentScorer';

describe('SageMaker Adapter & Feature Schema', () => {
  it('feature_order.json matches expected 16 features', () => {
    const expectedFeatures = [
      'rain_1h_mm','rain_3h_mm','rain_forecast_1h_mm','relative_humidity_pct','apparent_temperature_c',
      'distance_hotspot_m','hotspot_overlap','recent_report_count','verified_report_count','newest_report_age_min',
      'hour_sin','hour_cos','dow_sin','dow_cos','month_sin','month_cos'
    ];
    expect(featureOrder).toEqual(expectedFeatures);
    expect(featureOrder.length).toBe(16);
    expect(featureOrder).toContain('apparent_temperature_c');
    expect(featureOrder).not.toContain('rain_6h_mm');
  });

  it('returns no_model when endpoint is not configured', async () => {
    const provider = new SageMakerMlRiskProvider();
    const result = await provider.predict({
      featureVersion: ML_FEATURE_VERSION,
      predictionTimeUtc: new Date().toISOString(),
      segmentId: 'seg-1',
      rainfall_recent_1h_mm: null,
      rainfall_recent_3h_mm: null,
      rainfall_forecast_1h_mm: null,
      relative_humidity_pct: null,
      apparent_temperature_c: null,
      hotspot_distance_m: null,
      hotspot_overlap: 0,
      recent_report_count: 0,
      verified_report_count: 0,
      newest_report_age_min: null,
      hour_of_day: 12,
      day_of_week: 2,
      month: 7,
      location_geohash5: null,
    });

    expect(result.available).toBe(false);
    expect(result.reasonUnavailable).toBe('no_model');
    expect(result.featureVersion).toBe(ML_FEATURE_VERSION);
  });

  it('scoreSegment accepts custom mlProvider and reflects mlSignal in confidence', async () => {
    const mockProvider: MlRiskProvider = {
      predict: () => ({
        available: true,
        probability: 0.85,
        modelVersion: 'xgb-test',
        featureVersion: ML_FEATURE_VERSION,
      }),
    };

    const result = await scoreSegment({
      segmentIndex: 0,
      startCoord: { lat: 19.112, lon: 72.832 },
      endCoord: { lat: 19.113, lon: 72.833 },
      estimatedArrivalUtc: new Date(),
      segmentLengthM: 100,
      precipitationMmPerHour: 10,
      minutesSinceRainStop: null,
      apparentTemperatureC: 30,
      relativeHumidityPct: 80,
      weatherAgeMinutes: 5,
      nearbyIncidents: [],
      nearbyHotspots: [],
      heatSensitive: false,
      mode: 'walking',
      now: new Date(),
      mlProvider: mockProvider,
    });

    expect(result.mlSignal.available).toBe(true);
    expect(result.mlSignal.probability).toBe(0.85);
  });

  it('predictBatch returns array of signals for multiple feature inputs', async () => {
    const provider = new SageMakerMlRiskProvider();
    const sampleFeature = {
      featureVersion: ML_FEATURE_VERSION,
      predictionTimeUtc: new Date().toISOString(),
      segmentId: 'seg-1',
      rainfall_recent_1h_mm: null,
      rainfall_recent_3h_mm: null,
      rainfall_forecast_1h_mm: null,
      relative_humidity_pct: null,
      apparent_temperature_c: null,
      hotspot_distance_m: null,
      hotspot_overlap: 0 as const,
      recent_report_count: 0,
      verified_report_count: 0,
      newest_report_age_min: null,
      hour_of_day: 12,
      day_of_week: 2,
      month: 7,
      location_geohash5: null,
    };

    const results = await provider.predictBatch([sampleFeature, sampleFeature]);
    expect(results).toHaveLength(2);
    expect(results[0].available).toBe(false);
    expect(results[0].reasonUnavailable).toBe('no_model');
  });
});
