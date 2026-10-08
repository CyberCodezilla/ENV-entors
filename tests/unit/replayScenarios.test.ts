/**
 * Validates that all 3 demo scenario JSON files are well-formed
 * and produce the expected _expectedOutcome fields.
 * No network calls required.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SCENARIOS_DIR = path.join(__dirname, '..', '..', 'data', 'scenarios');
const VALID_IDS = ['heat', 'flood', 'compound'];

interface Scenario {
  scenarioId: string;
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  mode: string;
  departureTime: string;
  isReplay: boolean;
  _weatherOverride: Record<string, unknown>;
  _incidentOverrides: unknown[];
  _expectedOutcome: Record<string, unknown>;
}

describe('Demo scenario fixtures', () => {
  VALID_IDS.forEach(id => {
    describe(`Scenario: ${id}`, () => {
      let scenario: Scenario;

      it('file exists and is valid JSON', () => {
        const filePath = path.join(SCENARIOS_DIR, `${id}.json`);
        expect(fs.existsSync(filePath)).toBe(true);
        const raw = fs.readFileSync(filePath, 'utf8');
        scenario = JSON.parse(raw);
        expect(scenario).toBeDefined();
      });

      it('has required routing fields', () => {
        expect(scenario.scenarioId).toBe(id);
        expect(typeof scenario.origin.lat).toBe('number');
        expect(typeof scenario.origin.lon).toBe('number');
        expect(typeof scenario.destination.lat).toBe('number');
        expect(typeof scenario.destination.lon).toBe('number');
        expect(['walking', 'driving-traffic']).toContain(scenario.mode);
        expect(new Date(scenario.departureTime).toString()).not.toBe('Invalid Date');
        expect(scenario.isReplay).toBe(true);
      });

      it('has _weatherOverride with required fields', () => {
        const w = scenario._weatherOverride;
        expect(typeof w.apparentTemperatureC).toBe('number');
        expect(typeof w.relativeHumidityPct).toBe('number');
        expect(typeof w.precipitationMm).toBe('number');
      });

      it('has _incidentOverrides array', () => {
        expect(Array.isArray(scenario._incidentOverrides)).toBe(true);
      });

      it('has _expectedOutcome', () => {
        expect(typeof scenario._expectedOutcome).toBe('object');
        expect(scenario._expectedOutcome).not.toBeNull();
      });
    });
  });

  it('compound scenario expects hasConfidentRecommendation=false', () => {
    const raw = fs.readFileSync(path.join(SCENARIOS_DIR, 'compound.json'), 'utf8');
    const s: Scenario = JSON.parse(raw);
    expect(s._expectedOutcome.hasConfidentRecommendation).toBe(false);
  });

  it('flood scenario has at least one official_closure incident', () => {
    const raw = fs.readFileSync(path.join(SCENARIOS_DIR, 'flood.json'), 'utf8');
    const s: Scenario = JSON.parse(raw);
    const officialClosure = (s._incidentOverrides as Array<Record<string, unknown>>)
      .find(inc => inc.sourceType === 'official_closure');
    expect(officialClosure).toBeDefined();
  });

  it('heat scenario has apparentTemperatureC >= 40', () => {
    const raw = fs.readFileSync(path.join(SCENARIOS_DIR, 'heat.json'), 'utf8');
    const s: Scenario = JSON.parse(raw);
    expect(s._weatherOverride.apparentTemperatureC as number).toBeGreaterThanOrEqual(40);
  });
});
