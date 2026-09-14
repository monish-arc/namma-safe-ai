import {
  Habitation,
  RelocationSite,
  RelocationRecommendation,
  FieldReport,
  DashboardSummary,
  SimulationResult,
  User,
  PriorityLevel,
  PriorityCalculationResult,
  EvacuationPlanResponse,
  EvacuationOriginPayload,
  RoadConditionsResponse,
  EvacuationRouteCandidate,
  FloodForecastResponse,
  DataStatusResponse,
} from '../types';
import {
  INITIAL_HABITATIONS,
  INITIAL_RELOCATION_SITES,
  INITIAL_RED_ZONES,
  INITIAL_HAZARD_EVENTS,
  INITIAL_FIELD_REPORTS,
  INITIAL_RECOMMENDATIONS,
  INFRASTRUCTURE_ITEMS,
  DEMO_USERS,
} from '../data/mockData';

// Local reactive state for browser session persistence
let habitationsState = [...INITIAL_HABITATIONS];
let relocationSitesState = [...INITIAL_RELOCATION_SITES];
let recommendationsState = [...INITIAL_RECOMMENDATIONS];
let fieldReportsState = [...INITIAL_FIELD_REPORTS];
let activeUser: User = DEMO_USERS[0]; // Admin by default

// Bearer token for the RBAC-guarded /api/evacuation/* surface (backend login).
let authToken: string | null = (() => {
  try { return localStorage.getItem('nammasafe_access_token'); } catch { return null; }
})();

export function getAuthToken(): string | null {
  return authToken;
}

const scopeOrDefault = (value?: string, fallback = 'joshimath') =>
  value && value !== '*' ? value : fallback;

async function loginToBackend(): Promise<void> {
  const user = getActiveUser();
  const creds: { username_or_email: string; password: string; state_id?: string; district_id?: string; sub_district_id?: string; area_id?: string } = {
    username_or_email: user.username,
    password: `${user.username}123`,
  };
  if (user.role !== 'admin' && user.assignment) {
    creds.state_id = scopeOrDefault(user.assignment.state_id, 'uk');
    creds.district_id = scopeOrDefault(user.assignment.district_id, 'chamoli');
    creds.sub_district_id = scopeOrDefault(user.assignment.sub_district_id, 'joshimath');
    creds.area_id = scopeOrDefault(user.assignment.area_id, 'joshimath-central');
  }

  let token: string | null = null;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (res.ok) token = (await res.json()).access_token;
  } catch {
    token = null;
  }

  if (!token && user.role !== 'admin') {
    // Fallback: demo district-officer scope keeps evacuation usable for non-admin personas.
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: 'officer',
          password: 'officer123',
          state_id: 'uk',
          district_id: 'chamoli',
          sub_district_id: 'joshimath',
          area_id: 'joshimath-central',
        }),
      });
      if (res.ok) token = (await res.json()).access_token;
    } catch {
      token = null;
    }
  }

  authToken = token;
  if (token) {
    try { localStorage.setItem('nammasafe_access_token', token); } catch { /* noop */ }
  } else {
    try { localStorage.removeItem('nammasafe_access_token'); } catch { /* noop */ }
  }
}

async function ensureAuthToken(): Promise<void> {
  if (authToken) return;
  await loginToBackend();
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  await ensureAuthToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(path, { ...options, headers });
}

export function getActiveUser(): User {
  const saved = localStorage.getItem('nammasafe_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return activeUser;
}

export function setActiveUser(user: User) {
  activeUser = user;
  localStorage.setItem('nammasafe_user', JSON.stringify(user));
}

// ==================== CALCULATION ENGINES ====================
export function calculateHazardScore(
  landslide: number,
  flood: number,
  rainfall: number,
  pastFreq: number
): number {
  const score = 0.4 * landslide + 0.3 * flood + 0.2 * rainfall + 0.1 * pastFreq;
  return Number(Math.min(100, Math.max(0, score)).toFixed(1));
}

export function calculateVulnerabilityScore(
  population: number,
  households: number,
  children: number,
  elderly: number,
  hospitalKm: number,
  roadAccessScore: number
): number {
  const popDensityScore = Math.min(100, (population / 5000) * 100);
  const dependentRatio = population > 0 ? ((children + elderly) / population) * 100 : 0;
  const poorRoadComponent = 100 - roadAccessScore;
  const hospitalDistScore = Math.min(100, (hospitalKm / 40) * 100);

  const score =
    0.35 * popDensityScore +
    0.25 * dependentRatio +
    0.2 * poorRoadComponent +
    0.2 * hospitalDistScore;
  return Number(Math.min(100, Math.max(0, score)).toFixed(1));
}

export function calculatePriorityScore(
  hazardScore: number,
  vulnScore: number,
  disasterHistCount: number
): { score: number; level: Habitation['priority_level'] } {
  const histScore = Math.min(100, disasterHistCount * 16);
  const priority = 0.5 * hazardScore + 0.3 * vulnScore + 0.2 * histScore;
  const finalScore = Number(Math.min(100, Math.max(0, priority)).toFixed(1));

  let level: Habitation['priority_level'] = 'Monitor Only';
  if (finalScore >= 75.0) {
    level = 'Immediate Relocation';
  } else if (finalScore >= 50.0) {
    level = 'Short-Term Relocation';
  } else if (finalScore >= 30.0) {
    level = 'Medium-Term Relocation';
  }

  return { score: finalScore, level };
}

// ==================== API SERVICE METHODS ====================
export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const res = await fetch('/api/dashboard-summary');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const highRiskPop = habitationsState
      .filter((h) => h.priority_level === 'Immediate Relocation' || h.priority_level === 'Short-Term Relocation')
      .reduce((sum, h) => sum + h.population, 0);

    const immCount = habitationsState.filter((h) => h.priority_level === 'Immediate Relocation').length;
    const availCap = relocationSitesState.reduce((sum, s) => sum + s.available_capacity_families, 0);

    // Hazard counts
    const hazardMap: Record<string, { hazard_type: string; count: number; affected_population: number }> = {};
    INITIAL_HAZARD_EVENTS.forEach((e) => {
      if (!hazardMap[e.hazard_type]) {
        hazardMap[e.hazard_type] = { hazard_type: e.hazard_type, count: 0, affected_population: 0 };
      }
      hazardMap[e.hazard_type].count += 1;
      hazardMap[e.hazard_type].affected_population += e.affected_people;
    });

    // Priority counts
    const priorityMap: Record<PriorityLevel, { level: PriorityLevel; count: number; population: number }> = {
      'Immediate Relocation': { level: 'Immediate Relocation', count: 0, population: 0 },
      'Short-Term Relocation': { level: 'Short-Term Relocation', count: 0, population: 0 },
      'Medium-Term Relocation': { level: 'Medium-Term Relocation', count: 0, population: 0 },
      'Monitor Only': { level: 'Monitor Only', count: 0, population: 0 },
    };

    habitationsState.forEach((h) => {
      if (priorityMap[h.priority_level]) {
        priorityMap[h.priority_level].count += 1;
        priorityMap[h.priority_level].population += h.population;
      }
    });

    const top5 = [...habitationsState].sort((a, b) => b.priority_score - a.priority_score).slice(0, 5);

    return {
      total_habitations_monitored: habitationsState.length,
      high_risk_population: highRiskPop,
      immediate_relocation_villages_count: immCount,
      available_safe_site_capacity: availCap,
      total_safe_sites: relocationSitesState.length,
      verified_field_reports_count: fieldReportsState.filter((r) => r.verified).length,
      pending_field_reports_count: fieldReportsState.filter((r) => !r.verified).length,
      hazard_distribution: Object.values(hazardMap),
      relocation_priority_distribution: Object.values(priorityMap),
      recent_field_reports: fieldReportsState.slice(0, 5),
      top_five_critical_villages: top5,
      pilot_district: 'Chamoli',
      pilot_state: 'Uttarakhand',
      is_synthetic_demo_data: true,
    };
  },

  async getMapLayers() {
    try {
      const res = await fetch('/api/map-layers');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    return {
      red_zones: INITIAL_RED_ZONES,
      habitations: habitationsState,
      relocation_sites: relocationSitesState,
      infrastructure: INFRASTRUCTURE_ITEMS,
      pilot_center: { lat: 30.4, lng: 79.33, zoom: 10 },
      is_synthetic_demo_data: true,
    };
  },

  async getHabitations(priorityLevel?: string, search?: string): Promise<Habitation[]> {
    try {
      const params = new URLSearchParams();
      if (priorityLevel) params.append('priority_level', priorityLevel);
      if (search) params.append('search', search);
      const res = await fetch(`/api/habitations?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    let list = [...habitationsState];
    if (priorityLevel && priorityLevel !== 'all') {
      list = list.filter((h) => h.priority_level.toLowerCase() === priorityLevel.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.village_name.toLowerCase().includes(q) || h.village_code.toLowerCase().includes(q));
    }
    return list;
  },

  async getHabitationById(id: string): Promise<Habitation | null> {
    try {
      const res = await fetch(`/api/habitations/${id}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return habitationsState.find((h) => h.id === id || h.village_code === id) || null;
  },

  async getHabitationRiskAnalysis(id: string) {
    try {
      const res = await fetch(`/api/habitations/${id}/risk-analysis`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const hab = habitationsState.find((h) => h.id === id || h.village_code === id);
    if (!hab) throw new Error('Habitation not found');

    const events = INITIAL_HAZARD_EVENTS.filter((e) => e.habitation_id === hab.id);
    const recs = recommendationsState.filter((r) => r.habitation_id === hab.id);
    const reports = fieldReportsState.filter((fr) => fr.habitation_id === hab.id);

    return {
      habitation: hab,
      historical_events: events,
      recommendations: recs,
      field_reports: reports,
      risk_breakdown: {
        hazard_components: {
          landslide_risk_weighted: Number((0.4 * hab.landslide_risk).toFixed(1)),
          flood_risk_weighted: Number((0.3 * hab.flood_risk).toFixed(1)),
          rainfall_risk_weighted: Number((0.2 * hab.extreme_rainfall_risk).toFixed(1)),
          past_disaster_weighted: Number((0.1 * hab.past_disaster_frequency).toFixed(1)),
          total_hazard_score: hab.hazard_score,
        },
        vulnerability_components: {
          vulnerability_score: hab.vulnerability_score,
          hospital_distance_km: hab.hospital_distance_km,
          road_access_score: hab.road_access_score,
          children_ratio_percent: Number(((hab.children_count / hab.population) * 100).toFixed(1)),
          elderly_ratio_percent: Number(((hab.elderly_count / hab.population) * 100).toFixed(1)),
        },
        priority_calculation: {
          hazard_contribution_50pct: Number((0.5 * hab.hazard_score).toFixed(1)),
          vulnerability_contribution_30pct: Number((0.3 * hab.vulnerability_score).toFixed(1)),
          disaster_history_contribution_20pct: Number(
            (0.2 * Math.min(100, hab.disaster_history_count * 16)).toFixed(1)
          ),
          final_priority_score: hab.priority_score,
          priority_level: hab.priority_level,
        },
      },
    };
  },

  async getRelocationSites(): Promise<RelocationSite[]> {
    try {
      const res = await fetch('/api/relocation-sites');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return relocationSitesState;
  },

  async getRedZones(): Promise<any[]> {
    return INITIAL_RED_ZONES;
  },

  async getInfrastructure(): Promise<any[]> {
    return INFRASTRUCTURE_ITEMS;
  },

  async getHazardEvents(): Promise<any[]> {
    return INITIAL_HAZARD_EVENTS;
  },

  async getRecommendations(): Promise<RelocationRecommendation[]> {
    return this.getRelocationRecommendations();
  },

  async getRelocationRecommendations(statusFilter?: string): Promise<RelocationRecommendation[]> {
    try {
      const params = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await fetch(`/api/relocation-recommendations${params}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    if (statusFilter && statusFilter !== 'all') {
      return recommendationsState.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return recommendationsState;
  },

  async getFieldReports(): Promise<FieldReport[]> {
    try {
      const res = await fetch('/api/field-reports');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return fieldReportsState;
  },

  async submitFieldReport(report: Partial<FieldReport>): Promise<FieldReport> {
    const user = getActiveUser();
    const hab = habitationsState.find((h) => h.id === report.habitation_id);

    const newReport: FieldReport = {
      id: `fr-${Date.now().toString().slice(-6)}`,
      habitation_id: report.habitation_id || 'hab-joshimath',
      habitation_name: hab?.village_name || 'Joshimath',
      officer_id: user.id,
      officer_name: `${user.full_name} (${user.designation || 'Officer'})`,
      report_type: report.report_type || 'Geotechnical Observation',
      description: report.description || '',
      image_url:
        report.image_url ||
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
      reported_at: new Date().toISOString(),
      verified: ['admin', 'state_officer', 'district_officer', 'sub_district_officer', 'local_office'].includes(user.role),
      severity: report.severity || 'High',
      latitude: report.latitude || hab?.latitude || 30.5574,
      longitude: report.longitude || hab?.longitude || 79.5658,
    };

    fieldReportsState = [newReport, ...fieldReportsState];
    return newReport;
  },

  async verifyFieldReport(id: string, verifierName?: string): Promise<FieldReport> {
    fieldReportsState = fieldReportsState.map((r) =>
      r.id === id
        ? {
            ...r,
            verified: true,
            officer_name: verifierName ? `${r.officer_name} [Verified by ${verifierName}]` : r.officer_name,
          }
        : r
    );
    const updated = fieldReportsState.find((r) => r.id === id);
    return updated!;
  },

  async recalculatePriority(params: any): Promise<Habitation> {
    await this.calculatePriority(params);
    const hab = habitationsState.find((h) => h.id === params.habitation_id);
    return hab!;
  },

  async calculatePriority(params: {
    habitation_id: string;
    landslide_risk?: number;
    flood_risk?: number;
    extreme_rainfall_risk?: number;
    road_access_score?: number;
  }): Promise<PriorityCalculationResult> {
    const hab = habitationsState.find((h) => h.id === params.habitation_id);
    if (!hab) throw new Error('Habitation not found');

    const l = params.landslide_risk ?? hab.landslide_risk;
    const f = params.flood_risk ?? hab.flood_risk;
    const r = params.extreme_rainfall_risk ?? hab.extreme_rainfall_risk;
    const road = params.road_access_score ?? hab.road_access_score;

    const newH = calculateHazardScore(l, f, r, hab.past_disaster_frequency);
    const newV = calculateVulnerabilityScore(
      hab.population,
      hab.households,
      hab.children_count,
      hab.elderly_count,
      hab.hospital_distance_km,
      road
    );
    const { score: newP, level: newLvl } = calculatePriorityScore(newH, newV, hab.disaster_history_count);

    // Update in state
    habitationsState = habitationsState.map((h) =>
      h.id === hab.id
        ? {
            ...h,
            hazard_score: newH,
            vulnerability_score: newV,
            priority_score: newP,
            priority_level: newLvl,
            landslide_risk: l,
            flood_risk: f,
            extreme_rainfall_risk: r,
            road_access_score: road,
          }
        : h
    );

    return {
      habitation_id: hab.id,
      village_name: hab.village_name,
      hazard_score: newH,
      vulnerability_score: newV,
      priority_score: newP,
      priority_level: newLvl,
      updated: true,
    };
  },

  async simulateRelocation(
    habitationId: string,
    siteId: string,
    familiesCount: number
  ): Promise<SimulationResult> {
    try {
      const res = await fetch('/api/simulate-relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitation_id: habitationId,
          relocation_site_id: siteId,
          families_count: familiesCount,
        }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback to client-side engine
    }

    const hab = habitationsState.find((h) => h.id === habitationId);
    const site = relocationSitesState.find((s) => s.id === siteId);

    if (!hab || !site) throw new Error('Invalid Habitation or Relocation Site');

    const availableCap = site.available_capacity_families;
    const isSufficient = familiesCount <= availableCap;
    const remainingCap = availableCap - familiesCount;

    // Risk reduction calculation
    const sourceRisk = hab.hazard_score;
    const destRisk = 100.0 - site.suitability_score;
    const delta = Math.max(0, sourceRisk - destRisk);
    const riskReduction = Number(((delta / sourceRisk) * 100).toFixed(1));

    // Pillar statuses
    const waterRatio = (familiesCount + site.current_occupancy_families) / site.water_capacity_families;
    let waterStatus = 'Sufficient';
    if (waterRatio > 1.0) waterStatus = 'Deficit - Pipeline Expansion Needed';
    else if (waterRatio > 0.8) waterStatus = 'Near Capacity (80%+)';

    const schoolRatio = (familiesCount + site.current_occupancy_families) / site.school_capacity_families;
    let schoolStatus = 'Adequate';
    if (schoolRatio > 1.0) schoolStatus = 'Overburdened - New Classrooms Needed';
    else if (schoolRatio > 0.8) schoolStatus = 'Approaching Threshold';

    const hospitalStatus =
      site.hospital_score >= 85 ? 'Optimal (Sub-district trauma access within 15 min)' : 'Moderate';
    const roadStatus = site.road_score >= 85 ? 'High Connectivity (All-weather 2-lane)' : 'Moderate';

    let altRec: string | undefined = undefined;
    if (!isSufficient) {
      const altSite = relocationSitesState
        .filter((s) => s.id !== site.id && s.available_capacity_families >= familiesCount)
        .sort((a, b) => b.suitability_score - a.suitability_score)[0];
      if (altSite) {
        altRec = `${altSite.site_name} (Available Capacity: ${altSite.available_capacity_families} families, Suitability: ${altSite.suitability_score}/100)`;
      }
    }

    let rationale = `Relocating ${familiesCount} households from ${hab.village_name} (Priority ${hab.priority_score}) to ${site.site_name} yields an estimated ${riskReduction}% drop in compound hazard exposure.`;
    if (!isSufficient) {
      rationale += ` WARNING: The requested ${familiesCount} families exceeds ${site.site_name}'s safe remaining threshold of ${availableCap} families by ${Math.abs(remainingCap)}.`;
    } else {
      rationale += ` Infrastructure carrying capacity is viable, retaining a buffer of ${remainingCap} family slots.`;
    }

    return {
      habitation_id: hab.id,
      habitation_name: hab.village_name,
      relocation_site_id: site.id,
      relocation_site_name: site.site_name,
      families_requested: familiesCount,
      is_capacity_sufficient: isSufficient,
      remaining_capacity_after_relocation: remainingCap,
      risk_reduction_percent: riskReduction,
      water_capacity_status: waterStatus,
      school_capacity_status: schoolStatus,
      hospital_access_status: hospitalStatus,
      road_access_status: roadStatus,
      decision_rationale: rationale,
      alternative_site_recommendation: altRec,
    };
  },

  async planEvacuation(
    origin: EvacuationOriginPayload,
    familiesCount?: number,
    destSiteId?: string
  ): Promise<EvacuationPlanResponse> {
    await ensureAuthToken();
    const res = await authFetch('/api/evacuation/plan', {
      method: 'POST',
      body: JSON.stringify({
        origin: { type: origin.type, id: origin.id, label: origin.label, lat: origin.lat, lng: origin.lng, latitude: origin.latitude, longitude: origin.longitude },
        families_count: familiesCount,
        dest_site_id: destSiteId,
      }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error((detail as { detail?: string }).detail ?? `Evacuation planning failed (${res.status})`);
    }
    return res.json();
  },

  async getEvacuationCandidates(
    originType: EvacuationOriginPayload['type'],
    originId: string,
    familiesCount = 50
  ): Promise<{ origin: EvacuationOriginPayload; families_count: number; candidates: EvacuationRouteCandidate[] }> {
    await ensureAuthToken();
    const params = new URLSearchParams({
      origin_type: originType,
      origin_id: originId,
      families_count: String(familiesCount),
    });
    const res = await authFetch(`/api/evacuation/candidates?${params.toString()}`);
    if (!res.ok) throw new Error(`Could not fetch evacuation candidates (${res.status})`);
    return res.json();
  },

  async getEvacuationRoute(routeId: string): Promise<EvacuationPlanResponse> {
    await ensureAuthToken();
    const res = await authFetch(`/api/evacuation/routes/${routeId}`);
    if (!res.ok) throw new Error(`Could not fetch evacuation route (${res.status})`);
    return res.json();
  },

  async confirmEvacuationRoute(routeId: string, decision = 'approved', notes?: string): Promise<EvacuationPlanResponse> {
    await ensureAuthToken();
    const res = await authFetch(`/api/evacuation/routes/${routeId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error((detail as { detail?: string }).detail ?? `Could not confirm route (${res.status})`);
    }
    return res.json();
  },

  async getRoadConditions(): Promise<RoadConditionsResponse> {
    await ensureAuthToken();
    const res = await authFetch('/api/evacuation/road-conditions');
    if (!res.ok) throw new Error(`Could not fetch road conditions (${res.status})`);
    return res.json();
  },

  async getFloodForecast(): Promise<FloodForecastResponse> {
    await ensureAuthToken();
    const res = await authFetch('/api/flood-forecast');
    if (!res.ok) throw new Error(`Could not fetch flood forecast (${res.status})`);
    return res.json();
  },

  async getDataStatus(): Promise<DataStatusResponse> {
    await ensureAuthToken();
    const res = await authFetch('/api/data-status');
    if (!res.ok) {
      return {
        layers: [
          { layer: 'flood_forecast', status: 'NOT CONFIGURED', source: 'API key not configured' },
          { layer: 'satellite_tiles', status: 'LIVE', source: 'Esri World Imagery (free, no key)' },
        ],
        checked_at: new Date().toISOString(),
      };
    }
    return res.json();
  },

  async resetSeedData() {
    return this.resetToDemoSeed();
  },

  async resetToDemoSeed() {
    habitationsState = [...INITIAL_HABITATIONS];
    relocationSitesState = [...INITIAL_RELOCATION_SITES];
    recommendationsState = [...INITIAL_RECOMMENDATIONS];
    fieldReportsState = [...INITIAL_FIELD_REPORTS];
    return true;
  },
};

export const apiService = api;
