import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import type { FloodSegmentFeaturesV1, MlRiskProvider, MlRiskSignal } from '@heatflood/shared';
import { ML_FEATURE_VERSION } from '@heatflood/shared';

const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME ?? '';
const timeoutMs = Number(process.env.ML_TIMEOUT_MS ?? 800);
const client = new SageMakerRuntimeClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

const ORDER = [
  'rain_1h_mm','rain_3h_mm','rain_forecast_1h_mm','relative_humidity_pct','apparent_temperature_c',
  'distance_hotspot_m','hotspot_overlap','recent_report_count','verified_report_count','newest_report_age_min',
  'hour_sin','hour_cos','dow_sin','dow_cos','month_sin','month_cos',
] as const;

function v(x: number | null | undefined, defaultValue: number = -1): number { return Number.isFinite(x as number) ? Number(x) : defaultValue; }
function cyc(value: number, period: number): [number, number] { const a = 2 * Math.PI * value / period; return [Math.sin(a), Math.cos(a)]; }

function toCsv(f: FloodSegmentFeaturesV1): string {
  const hour = cyc(f.hour_of_day, 24);
  const dow = cyc(f.day_of_week, 7);
  const month = cyc(f.month, 12);
  const row: Record<string, number> = {
    rain_1h_mm: v(f.rainfall_recent_1h_mm),
    rain_3h_mm: v(f.rainfall_recent_3h_mm),
    rain_forecast_1h_mm: v(f.rainfall_forecast_1h_mm),
    relative_humidity_pct: v(f.relative_humidity_pct),
    apparent_temperature_c: v(f.apparent_temperature_c, -999),
    distance_hotspot_m: v(f.hotspot_distance_m),
    hotspot_overlap: f.hotspot_overlap,
    recent_report_count: f.recent_report_count,
    verified_report_count: f.verified_report_count,
    newest_report_age_min: v(f.newest_report_age_min),
    hour_sin: hour[0], hour_cos: hour[1], dow_sin: dow[0], dow_cos: dow[1], month_sin: month[0], month_cos: month[1],
  };
  return ORDER.map(k => {
    // The historical v1 runtime fields map into the new numeric model schema.
    return String(row[k] ?? -1);
  }).join(',');
}

export class SageMakerMlRiskProvider implements MlRiskProvider {
  predict(features: FloodSegmentFeaturesV1): Promise<MlRiskSignal> {
    const featureVersion = process.env.ML_FEATURE_VERSION ?? ML_FEATURE_VERSION;
    if (!endpointName) return Promise.resolve({ available: false, featureVersion, reasonUnavailable: 'no_model' });
    if (features.featureVersion !== featureVersion) return Promise.resolve({ available: false, featureVersion, reasonUnavailable: 'invalid' });
    return new Promise(resolve => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        resolve({ available: false, featureVersion, reasonUnavailable: 'timeout' });
      }, timeoutMs);
      client.send(
        new InvokeEndpointCommand({ EndpointName: endpointName, ContentType: 'text/csv', Body: Buffer.from(toCsv(features)) }),
        { abortSignal: controller.signal }
      )
        .then(result => {
          clearTimeout(timer);
          const text = Buffer.from(result.Body ?? new Uint8Array()).toString('utf8').trim();
          const probability = Number(text.split(/[\s,]+/)[0]);
          if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
            resolve({ available: false, featureVersion, reasonUnavailable: 'invalid' });
            return;
          }
          resolve({ available: true, probability, modelVersion: process.env.ML_MODEL_VERSION ?? 'xgb-flood-susceptibility-v2', featureVersion, predictedAt: new Date().toISOString() });
        })
        .catch(() => {
          clearTimeout(timer);
          resolve({ available: false, featureVersion, reasonUnavailable: controller.signal.aborted ? 'timeout' : 'error' });
        });
    });
  }
}
