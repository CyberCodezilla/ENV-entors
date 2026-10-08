/**
 * HeatFlood Guardian — ML risk types and provider interface.
 *
 * SageMaker integration is out of scope for the 5-day sprint.
 * The DisabledMlRiskProvider is the sole implementation and always
 * returns { available: false }. The interface is retained so a
 * SageMakerMlRiskProvider can be dropped in post-hackathon without
 * changing any calling code in segmentScorer.
 */
import { ML_FEATURE_VERSION } from './constants';

export interface FloodSegmentFeaturesV1 {
  featureVersion: typeof ML_FEATURE_VERSION;
  predictionTimeUtc: string;
  segmentId: string;

  // Weather — use -1 for missing float values, not 0
  rainfall_recent_1h_mm: number | null;
  rainfall_recent_3h_mm: number | null;
  rainfall_forecast_1h_mm: number | null;
  relative_humidity_pct: number | null;
  apparent_temperature_c: number | null;

  // Spatial
  hotspot_distance_m: number | null;
  hotspot_overlap: 0 | 1;

  // Reports — use 0 if no reports (0 is genuine here)
  recent_report_count: number;
  verified_report_count: number;
  newest_report_age_min: number | null; // null = no reports

  // Temporal
  hour_of_day: number;   // 0–23 IST
  day_of_week: number;   // 0=Monday
  month: number;         // 1–12

  // Location (categorical)
  location_geohash5: string | null;
}

export interface MlRiskSignal {
  available: boolean;
  probability?: number;        // 0–1; present only if available
  modelVersion?: string;
  featureVersion: string;
  predictedAt?: string;        // ISO UTC
  reasonUnavailable?: 'disabled' | 'timeout' | 'error' | 'invalid' | 'no_model';
}

export interface MlRiskProvider {
  predict(features: FloodSegmentFeaturesV1): Promise<MlRiskSignal>;
}

/**
 * Final implementation for the hackathon sprint.
 * Always returns { available: false, reasonUnavailable: 'disabled' }.
 * Replace with a SageMakerMlRiskProvider post-hackathon.
 */
export class DisabledMlRiskProvider implements MlRiskProvider {
  async predict(_features: FloodSegmentFeaturesV1): Promise<MlRiskSignal> {
    return {
      available: false,
      featureVersion: ML_FEATURE_VERSION,
      reasonUnavailable: 'disabled',
    };
  }
}
