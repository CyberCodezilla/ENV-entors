import type { Incident, SegmentAssessment } from '../schemas';

export const MOCK_INCIDENT_FIXTURE: Incident = {
  incidentId: 'inc-test-1',
  latitude: 19.112,
  longitude: 72.832,
  geohash: 'te7p0',
  type: 'waterlogging',
  depthCategory: 'ankle',
  observedAt: '2026-10-10T12:00:00.000Z',
  createdAt: '2026-10-10T12:05:00.000Z',
  expiresAt: '2026-10-10T13:00:00.000Z',
  status: 'corroborated',
  sourceType: 'community_report',
  isDemo: false,
  version: 1,
  notes: 'Waterlogging near station',
  mode: 'walking',
};

export const MOCK_SEGMENT_FIXTURE: SegmentAssessment = {
  segmentIndex: 0,
  startCoord: { lat: 19.112, lon: 72.832 },
  endCoord: { lat: 19.115, lon: 72.835 },
  segmentLengthM: 350,
  estimatedArrivalUtc: '2026-10-10T12:10:00.000Z',
  floodRisk: 15,
  floodRiskLevel: 'low',
  heatRisk: 20,
  heatRiskLevel: 'low',
  confidence: 85,
  confidenceLevel: 'good',
  hardBlock: false,
  hardBlockReason: null,
  reasons: ['Mild surface runoff'],
  evidence: [],
};
