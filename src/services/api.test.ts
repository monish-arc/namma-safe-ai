import { describe, it, expect } from 'vitest';
import {
  calculateHazardScore,
  calculateVulnerabilityScore,
  calculatePriorityScore,
  apiService,
} from './api';

describe('NammaSafe AI Mathematical Risk Engine', () => {
  it('calculates composite hazard score accurately using 4-factor weights', () => {
    // 0.40 * landslide + 0.30 * flood + 0.20 * rainfall + 0.10 * past_freq
    const score = calculateHazardScore(90, 80, 70, 60);
    // 0.4*90=36 + 0.3*80=24 + 0.2*70=14 + 0.1*60=6 = 80.0
    expect(score).toBe(80.0);
  });

  it('calculates vulnerability score considering demographic dependents & medical distance', () => {
    const pop = 1000;
    const households = 200;
    const children = 250;
    const elderly = 150;
    const hospitalKm = 20; // 50% distance score
    const roadAccess = 40; // 60% poor road component

    const vuln = calculateVulnerabilityScore(pop, households, children, elderly, hospitalKm, roadAccess);
    expect(vuln).toBeGreaterThan(0);
    expect(vuln).toBeLessThanOrEqual(100);
  });

  it('determines correct Priority Level thresholds based on composite priority index', () => {
    // Score >= 75 -> Immediate Relocation
    const high = calculatePriorityScore(90, 80, 5);
    expect(high.level).toBe('Immediate Relocation');
    expect(high.score).toBeGreaterThanOrEqual(75);

    // Score < 30 -> Monitor Only
    const low = calculatePriorityScore(15, 20, 0);
    expect(low.level).toBe('Monitor Only');
    expect(low.score).toBeLessThan(30);
  });
});

describe('SafeShift Carrying Capacity Simulator', () => {
  it('detects sufficient vs exceeded carrying capacity correctly', async () => {
    // Moving 50 families to Gauchar (which has ~555 available capacity)
    const resultSufficient = await apiService.simulateRelocation(
      'hab-joshimath',
      'site-gauchar-01',
      50
    );
    expect(resultSufficient.is_capacity_sufficient).toBe(true);
    expect(resultSufficient.remaining_capacity_after_relocation).toBeGreaterThan(0);
    expect(resultSufficient.risk_reduction_percent).toBeGreaterThan(0);

    // Relocating 5000 families to Gauchar should exceed capacity
    const resultExceeded = await apiService.simulateRelocation(
      'hab-joshimath',
      'site-gauchar-01',
      5000
    );
    expect(resultExceeded.is_capacity_sufficient).toBe(false);
    expect(resultExceeded.remaining_capacity_after_relocation).toBeLessThan(0);
    expect(resultExceeded.decision_rationale).toContain('exceeds');
  });
});

describe('Resilient API Client and Seed Data', () => {
  it('loads Chamoli pilot habitations and summary with complete fields', async () => {
    const summary = await apiService.getDashboardSummary();
    expect(summary.total_habitations_monitored).toBeGreaterThanOrEqual(10);
    expect(summary.high_risk_population).toBeGreaterThan(0);
    expect(summary.top_five_critical_villages.length).toBe(5);

    const habitations = await apiService.getHabitations();
    expect(habitations.length).toBeGreaterThanOrEqual(10);
    const joshimath = habitations.find((h) => h.village_name.includes('Joshimath'));
    expect(joshimath).toBeDefined();
    expect(joshimath?.priority_level).toBe('Immediate Relocation');
  });
});
