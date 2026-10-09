import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import type { FloodSegmentFeaturesV1, MlRiskProvider, MlRiskSignal } from '@heatflood/shared';
import { ML_FEATURE_VERSION } from '@heatflood/shared';

const timeoutMs = Number(process.env.ML_TIMEOUT_MS ?? 800);
const region = process.env.AWS_REGION ?? 'ap-south-1';
const client = new SageMakerRuntimeClient({ region });

export const FEATURE_ORDER = [
  'rain_1h_mm', 'rain_3h_mm', 'relative_humidity_pct', 'apparent_temperature_c',
  'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos', 'month_sin', 'month_cos',
] as const;

function numeric(value: number | null | undefined): number {
  return Number.isFinite(value as number) ? Number(value) : -1;
}
function cyc(value: number, period: number): [number, number] {
  const angle = 2 * Math.PI * value / period;
  return [Math.sin(angle), Math.cos(angle)];
}
export function featuresToCsv(features: FloodSegmentFeaturesV1): string {
  const hour = cyc(features.hour_of_day, 24);
  const dow = cyc(features.day_of_week, 7);
  const month = cyc(features.month, 12);
  const row: Record<(typeof FEATURE_ORDER)[number], number> = {
    rain_1h_mm: numeric(features.rainfall_recent_1h_mm),
    rain_3h_mm: numeric(features.rainfall_recent_3h_mm),
    relative_humidity_pct: numeric(features.relative_humidity_pct),
    apparent_temperature_c: numeric(features.apparent_temperature_c),
    hour_sin: hour[0], hour_cos: hour[1], dow_sin: dow[0], dow_cos: dow[1],
    month_sin: month[0], month_cos: month[1],
  };
  return FEATURE_ORDER.map(key => String(row[key])).join(',');
}
export function parseSageMakerProbability(body: Uint8Array | Buffer): number | null {
  const text = Buffer.from(body).toString('utf8').trim();
  if (!text) return null;
  const probability = Number(text.split(/[\s,]+/)[0]);
  return Number.isFinite(probability) && probability >= 0 && probability <= 1 ? probability : null;
}
export class SageMakerMlRiskProvider implements MlRiskProvider {
  predict(features: FloodSegmentFeaturesV1): Promise<MlRiskSignal> {
    const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME ?? '';
    if (!endpointName) return Promise.resolve({ available: false, featureVersion: ML_FEATURE_VERSION, reasonUnavailable: 'no_model' });
    if (features.featureVersion !== ML_FEATURE_VERSION) return Promise.resolve({ available: false, featureVersion: ML_FEATURE_VERSION, reasonUnavailable: 'invalid' });
    return new Promise(resolve => {
      let settled = false;
      const finish = (signal: MlRiskSignal) => { if (settled) return; settled = true; resolve(signal); };
      const timer = setTimeout(() => finish({ available: false, featureVersion: ML_FEATURE_VERSION, reasonUnavailable: 'timeout' }), timeoutMs);
      client.send(new InvokeEndpointCommand({
        EndpointName: endpointName, ContentType: 'text/csv', Body: Buffer.from(featuresToCsv(features)),
      })).then(result => {
        clearTimeout(timer);
        const probability = parseSageMakerProbability(result.Body ?? new Uint8Array());
        if (probability === null) {
          finish({ available: false, featureVersion: ML_FEATURE_VERSION, reasonUnavailable: 'invalid' });
          return;
        }
        finish({ available: true, probability, modelVersion: process.env.ML_MODEL_VERSION ?? 'xgb-rainfall-stress-v1', featureVersion: ML_FEATURE_VERSION, predictedAt: new Date().toISOString() });
      }).catch(() => {
        clearTimeout(timer);
        finish({ available: false, featureVersion: ML_FEATURE_VERSION, reasonUnavailable: 'error' });
      });
    });
  }

  predictBatch(featuresList: FloodSegmentFeaturesV1[]): Promise<MlRiskSignal[]> {
    const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME ?? '';
    const fallbackSignal = (reason: 'no_model' | 'invalid' | 'timeout' | 'error'): MlRiskSignal => ({
      available: false,
      featureVersion: ML_FEATURE_VERSION,
      reasonUnavailable: reason,
    });

    if (!endpointName) {
      return Promise.resolve(featuresList.map(() => fallbackSignal('no_model')));
    }

    if (featuresList.some(f => f.featureVersion !== ML_FEATURE_VERSION)) {
      return Promise.resolve(featuresList.map(() => fallbackSignal('invalid')));
    }

    if (featuresList.length === 0) {
      return Promise.resolve([]);
    }

    const csvPayload = featuresList.map(featuresToCsv).join('\n');

    return new Promise(resolve => {
      let settled = false;
      const finish = (signals: MlRiskSignal[]) => {
        if (settled) return;
        settled = true;
        resolve(signals);
      };

      const timer = setTimeout(() => {
        finish(featuresList.map(() => fallbackSignal('timeout')));
      }, timeoutMs);

      client.send(new InvokeEndpointCommand({
        EndpointName: endpointName,
        ContentType: 'text/csv',
        Body: Buffer.from(csvPayload),
      })).then(result => {
        clearTimeout(timer);
        const text = Buffer.from(result.Body ?? new Uint8Array()).toString('utf8').trim();
        if (!text) {
          finish(featuresList.map(() => fallbackSignal('invalid')));
          return;
        }
        const lines = text.split(/\r?\n/);
        const nowIso = new Date().toISOString();
        const modelVer = process.env.ML_MODEL_VERSION ?? 'xgb-rainfall-stress-v1';

        const signals: MlRiskSignal[] = featuresList.map((_, idx) => {
          const line = lines[idx] ?? '';
          const probability = Number(line.trim().split(/[\s,]+/)[0]);
          if (Number.isFinite(probability) && probability >= 0 && probability <= 1) {
            return {
              available: true,
              probability,
              modelVersion: modelVer,
              featureVersion: ML_FEATURE_VERSION,
              predictedAt: nowIso,
            };
          }
          return fallbackSignal('invalid');
        });

        finish(signals);
      }).catch(() => {
        clearTimeout(timer);
        finish(featuresList.map(() => fallbackSignal('error')));
      });
    });
  }
}
