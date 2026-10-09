/**
 * HeatFlood Guardian — ML risk types and provider interface.
 *
 * SageMaker integration is optional. The disabled provider remains the default when the endpoint flag is off, while the Lambda adapter can supply a real SageMaker provider when enabled.
 *
 * Perf note (optimised):
 *   - DisabledMlRiskProvider.predict() was async, causing a Promise
 *     microtask allocation on every call despite being a synchronous
 *     literal return. Changed to synchronous return.
 *   - MlRiskProvider interface updated to Promise<MlRiskSignal> | MlRiskSignal
 *     so real async providers (SageMaker) remain valid implementations.
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
  newest_report_age_min: number | null;

  // Temporal
  hour_of_day: number;   // 0–23 UTC
  day_of_week: number;   // 0=Monday, 6=Sunday
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

/**
 * Provider interface. Real async providers (e.g. SageMaker HTTP) return
 * Promise<MlRiskSignal>; synchronous stubs may return MlRiskSignal directly.
 */
export interface MlRiskProvider {
  predict(features: FloodSegmentFeaturesV1): Promise<MlRiskSignal> | MlRiskSignal;
}

/**
 * Hackathon-sprint stub. Always returns { available: false } synchronously.
 * Replace with SageMakerMlRiskProvider post-hackathon.
 */
export class DisabledMlRiskProvider implements MlRiskProvider {
  predict(_features: FloodSegmentFeaturesV1): MlRiskSignal {
    return {
      available: false,
      featureVersion: ML_FEATURE_VERSION,
      reasonUnavailable: 'disabled',
    };
  }
}
