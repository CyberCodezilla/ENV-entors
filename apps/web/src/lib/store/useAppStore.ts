import { create } from 'zustand';
import type {
  Place,
  AnalyseResponse,
  Incident,
  CreateIncidentRequest,
} from '../api/types';
import type { AppError } from '../api/errors';
import type { Bbox } from '../geo/bbox';
import { api } from '../api/client';

export type AnalysisPhase = 'idle' | 'validating' | 'analysing' | 'success' | 'error';

export interface PendingReport {
  tempId: string;
  idempotencyKey: string;
  payload: CreateIncidentRequest;
  state: 'pending' | 'failed' | 'confirmed';
  latitude: number;
  longitude: number;
}

export type MetricLens = 'dominant' | 'flood' | 'heat' | 'confidence';

export interface AppState {
  origin: Place | null;
  destination: Place | null;
  mode: 'walking' | 'driving-traffic';
  departureTime: string; // ISO-8601
  heatSensitive: boolean;
  metricLens: MetricLens;
  mapPickingTarget: 'origin' | 'destination' | null;

  analysis: {
    phase: AnalysisPhase;
    data: AnalyseResponse | null;
    error: AppError | null;
    selectedRouteId: string | null;
    selectedSegmentIndex: number | null;
  };

  replay: {
    active: boolean;
    scenarioId: 'heat' | 'flood' | 'compound' | null;
  };

  viewportIncidents: {
    items: Incident[];
    phase: 'idle' | 'loading' | 'success' | 'error';
    bbox: Bbox | null;
    lastFetchedAt: number | null;
  };

  pendingReports: PendingReport[];
  auth: {
    idToken: string | null;
    isModerator: boolean;
  };

  // Actions
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setMode: (mode: 'walking' | 'driving-traffic') => void;
  setDepartureTime: (time: string) => void;
  setHeatSensitive: (val: boolean) => void;
  setMetricLens: (lens: MetricLens) => void;
  setMapPickingTarget: (target: 'origin' | 'destination' | null) => void;

  selectRoute: (routeId: string) => void;
  selectSegment: (segmentIndex: number | null) => void;

  analyse: (signal?: AbortSignal) => Promise<void>;
  startReplay: (scenarioId: 'heat' | 'flood' | 'compound', signal?: AbortSignal) => Promise<void>;
  exitReplay: () => void;

  setViewportIncidents: (items: Incident[], bbox: Bbox) => void;
  addOptimisticReport: (report: PendingReport) => void;
  confirmOptimisticReport: (idempotencyKey: string) => void;
  setAuth: (idToken: string | null, isModerator: boolean) => void;
}

// Module-level abort controller to cancel in-flight analysis
let activeAnalyseController: AbortController | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  origin: {
    name: 'Versova Beach, Andheri West',
    lat: 19.112,
    lon: 72.832,
  },
  destination: {
    name: 'Andheri Metro Station, SV Road',
    lat: 19.138,
    lon: 72.855,
  },
  mode: 'walking',
  departureTime: new Date().toISOString(),
  heatSensitive: false,
  metricLens: 'dominant',
  mapPickingTarget: null,

  analysis: {
    phase: 'idle',
    data: null,
    error: null,
    selectedRouteId: null,
    selectedSegmentIndex: null,
  },

  replay: {
    active: false,
    scenarioId: null,
  },

  viewportIncidents: {
    items: [],
    phase: 'idle',
    bbox: null,
    lastFetchedAt: null,
  },

  pendingReports: [],
  auth: {
    idToken: null,
    isModerator: false,
  },

  setOrigin: (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),
  setMode: (mode) => set({ mode }),
  setDepartureTime: (time) => set({ departureTime: time }),
  setHeatSensitive: (val) => set({ heatSensitive: val }),
  setMetricLens: (lens) => set({ metricLens: lens }),
  setMapPickingTarget: (target) => set({ mapPickingTarget: target }),

  selectRoute: (routeId) =>
    set((state) => ({
      analysis: {
        ...state.analysis,
        selectedRouteId: routeId,
        selectedSegmentIndex: null,
      },
    })),

  selectSegment: (segmentIndex) =>
    set((state) => ({
      analysis: {
        ...state.analysis,
        selectedSegmentIndex: segmentIndex,
      },
    })),

  analyse: async (externalSignal) => {
    const { origin, destination, mode, departureTime, heatSensitive } = get();
    if (!origin || !destination) return;

    if (activeAnalyseController) {
      activeAnalyseController.abort();
    }
    activeAnalyseController = new AbortController();
    const signal = externalSignal || activeAnalyseController.signal;

    set((state) => ({
      analysis: {
        ...state.analysis,
        phase: 'analysing',
        error: null,
      },
    }));

    try {
      const data = await api.analyseRoutes(
        {
          origin: { lat: origin.lat, lon: origin.lon },
          destination: { lat: destination.lat, lon: destination.lon },
          mode,
          departureTime,
          heatSensitive,
          isReplay: false,
        },
        signal
      );

      set({
        analysis: {
          phase: 'success',
          data,
          error: null,
          selectedRouteId: data.routes[0]?.routeId ?? null,
          selectedSegmentIndex: null,
        },
        replay: { active: false, scenarioId: null },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const appErr = err as AppError;
      set((state) => ({
        analysis: {
          ...state.analysis,
          phase: 'error',
          error: appErr,
        },
      }));
    } finally {
      activeAnalyseController = null;
    }
  },

  startReplay: async (scenarioId, externalSignal) => {
    if (activeAnalyseController) {
      activeAnalyseController.abort();
    }
    activeAnalyseController = new AbortController();
    const signal = externalSignal || activeAnalyseController.signal;

    set((state) => ({
      analysis: { ...state.analysis, phase: 'analysing', error: null },
      replay: { active: true, scenarioId },
    }));

    try {
      const fixture = await api.getDemoScenario(scenarioId, signal);
      // Update form inputs to match scenario
      set({
        origin: { name: 'Scenario Origin', ...fixture.origin },
        destination: { name: 'Scenario Destination', ...fixture.destination },
        mode: fixture.mode,
        departureTime: fixture.departureTime,
        heatSensitive: fixture.heatSensitive ?? false,
      });

      // Submit fixture verbatim per Appendix B.3
      const data = await api.analyseRoutes(
        {
          ...fixture,
          isReplay: true,
          scenarioId,
        },
        signal
      );

      set({
        analysis: {
          phase: 'success',
          data,
          error: null,
          selectedRouteId: data.routes[0]?.routeId ?? null,
          selectedSegmentIndex: null,
        },
        replay: { active: true, scenarioId },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      set((state) => ({
        analysis: {
          ...state.analysis,
          phase: 'error',
          error: err as AppError,
        },
      }));
    } finally {
      activeAnalyseController = null;
    }
  },

  exitReplay: () => {
    set({
      replay: { active: false, scenarioId: null },
      analysis: {
        phase: 'idle',
        data: null,
        error: null,
        selectedRouteId: null,
        selectedSegmentIndex: null,
      },
    });
  },

  setViewportIncidents: (items, bbox) =>
    set({
      viewportIncidents: {
        items,
        phase: 'success',
        bbox,
        lastFetchedAt: Date.now(),
      },
    }),

  addOptimisticReport: (report) =>
    set((state) => ({
      pendingReports: [report, ...state.pendingReports],
    })),

  confirmOptimisticReport: (idempotencyKey) =>
    set((state) => ({
      pendingReports: state.pendingReports.filter((r) => r.idempotencyKey !== idempotencyKey),
    })),

  setAuth: (idToken, isModerator) =>
    set({
      auth: { idToken, isModerator },
    }),
}));