/**
 * Three deterministic demo scenarios.
 * These are static fixtures — they never call external APIs.
 * Always display the 'HISTORICAL / DEMO SCENARIO' banner when using these.
 */
import { AnalyseRoutesRequest } from '@heatflood/shared';

type DemoScenario = AnalyseRoutesRequest & {
  _description: string;
  _expectedOutcome: string;
};

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  heat: {
    _description: 'Heat-dominant scenario: afternoon peak heat, no flooding reported.',
    _expectedOutcome: 'Route A recommended with HIGH heat concern, LOW flood concern. Delay or choose shaded route advised.',
    origin: { lat: 19.1120, lon: 72.8320 },
    destination: { lat: 19.1380, lon: 72.8550 },
    mode: 'walking',
    departureTime: '2026-07-15T13:30:00+05:30',
    heatSensitive: true,
    isReplay: true,
    scenarioId: 'heat',
  },

  flood: {
    _description: 'Flood-dominant scenario: heavy rain, two verified waterlogging reports on Route A.',
    _expectedOutcome: 'Route A is hard-blocked. Route B recommended with MODERATE flood concern and MEDIUM confidence.',
    origin: { lat: 19.1050, lon: 72.8260 },
    destination: { lat: 19.1350, lon: 72.8480 },
    mode: 'walking',
    departureTime: '2026-07-18T09:00:00+05:30',
    heatSensitive: false,
    isReplay: true,
    scenarioId: 'flood',
  },

  compound: {
    _description: 'Compound risk: heavy rain AND extreme heat AND verified closures on all routes.',
    _expectedOutcome: 'NO_CONFIDENT_ROUTE returned. User advised to delay travel and check official guidance.',
    origin: { lat: 19.1080, lon: 72.8290 },
    destination: { lat: 19.1400, lon: 72.8600 },
    mode: 'walking',
    departureTime: '2026-07-20T11:00:00+05:30',
    heatSensitive: true,
    isReplay: true,
    scenarioId: 'compound',
  },
};
