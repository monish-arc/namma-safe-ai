export type UserRole =
  | 'normal_citizen'
  | 'field_officer'
  | 'local_office'
  | 'sub_district_officer'
  | 'district_officer'
  | 'state_officer'
  | 'gis_analysis_officer'
  | 'admin';

export interface AdministrativeScope {
  state_id: string;
  district_id: string;
  sub_district_id: string;
  area_id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name: string;
  designation?: string;
  department?: string;
  district?: string;
  assignment?: AdministrativeScope;
}

export type PriorityLevel = 
  | 'Immediate Relocation' 
  | 'Short-Term Relocation' 
  | 'Medium-Term Relocation' 
  | 'Monitor Only';

export interface PriorityCalculationResult {
  habitation_id?: string;
  village_name?: string;
  hazard_score: number;
  vulnerability_score: number;
  disaster_history_score?: number;
  priority_score: number;
  priority_level: PriorityLevel;
  updated?: boolean;
}

export type HazardType = 
  | 'Landslide' 
  | 'Flash Flood' 
  | 'Land Subsidence' 
  | 'Cloudburst' 
  | 'Avalanche' 
  | 'Rockfall' 
  | 'Multi-Hazard'
  | 'Extreme Rainfall';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Habitation {
  id: string;
  village_code: string;
  village_name: string;
  district: string;
  state: string;
  population: number;
  households: number;
  children_count: number;
  elderly_count: number;
  hospital_distance_km: number;
  road_access_score: number; // 0 to 100 (100 = excellent, low = poor)
  vulnerability_score: number; // 0 to 100
  hazard_score: number; // 0 to 100
  priority_score: number; // 0 to 100
  priority_level: PriorityLevel;
  latitude: number;
  longitude: number;
  landslide_risk: number; // 0 to 100
  flood_risk: number; // 0 to 100
  extreme_rainfall_risk: number; // 0 to 100
  past_disaster_frequency: number; // past disaster score 0 to 100
  disaster_history_count: number;
  notes?: string;
}

export interface HazardEvent {
  id: string;
  habitation_id: string;
  habitation_name: string;
  hazard_type: HazardType;
  event_date: string;
  intensity: string;
  severity_level: SeverityLevel;
  affected_people: number;
  houses_damaged: number;
  deaths: number;
  source_url: string;
}

export interface RedZone {
  id: string;
  zone_name: string;
  hazard_type: HazardType;
  risk_level: SeverityLevel;
  hazard_score: number;
  zone_geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  data_source: string;
  last_updated: string;
}

export interface RelocationSite {
  id: string;
  site_name: string;
  district: string;
  land_area_acres: number;
  estimated_capacity: number; // total families
  current_occupancy_families: number;
  water_score: number; // 0-100
  road_score: number; // 0-100
  school_score: number; // 0-100
  hospital_score: number; // 0-100
  low_hazard_score: number; // 0-100 (100 = very low hazard)
  flat_land_score: number; // 0-100 (100 = flat)
  suitability_score: number; // 0-100
  latitude: number;
  longitude: number;
  // Specific carrying capacity factors (in families)
  land_capacity_families: number;
  water_capacity_families: number;
  school_capacity_families: number;
  health_capacity_families: number;
  road_capacity_families: number;
  final_capacity_families: number; // min of above
  available_capacity_families: number;
}

export interface RelocationRecommendation {
  id: string;
  habitation_id: string;
  habitation_name: string;
  relocation_site_id: string;
  relocation_site_name: string;
  hazard_score: number;
  vulnerability_score: number;
  disaster_history_score: number;
  final_priority_score: number;
  priority_level: PriorityLevel;
  recommended_families: number;
  risk_reduction_percent: number;
  explanation: string;
  status: 'Draft' | 'Approved' | 'Under Review' | 'In Progress' | 'Completed';
  created_at: string;
}

export interface FieldReport {
  id: string;
  habitation_id: string;
  habitation_name: string;
  officer_id: string;
  officer_name: string;
  report_type: string;
  description: string;
  image_url: string;
  reported_at: string;
  verified: boolean;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
}

export interface SimulationRequest {
  habitation_id: string;
  relocation_site_id: string;
  families_count: number;
}

export interface CapacityCheckStatus {
  status: 'Adequate' | 'Near Limit' | 'Exceeded';
  available: number;
  utilized_percent: number;
}

export interface SimulationResult {
  habitation_id?: string;
  habitation_name?: string;
  relocation_site_id?: string;
  relocation_site_name?: string;
  families_requested: number;
  families_relocated?: number;
  risk_reduction_percent: number;
  initial_site_capacity?: number;
  remaining_capacity_after?: number;
  remaining_capacity_after_relocation: number;
  water_capacity_status: string;
  school_capacity_status: string;
  hospital_access_status: string;
  road_access_status: string;
  decision_rationale: string;
  bottleneck_factor?: string;
  explanation?: string;
  is_capacity_sufficient: boolean;
  alternative_site?: RelocationSite;
  alternative_site_recommendation?: string;
}

export interface DashboardSummary {
  total_habitations_monitored: number;
  high_risk_population: number;
  immediate_relocation_villages_count: number;
  available_safe_site_capacity: number;
  total_safe_sites: number;
  verified_field_reports_count: number;
  pending_field_reports_count: number;
  hazard_distribution: {
    hazard_type: string;
    count: number;
    affected_population: number;
  }[];
  relocation_priority_distribution: {
    level: PriorityLevel;
    count: number;
    population: number;
  }[];
  recent_field_reports: FieldReport[];
  top_five_critical_villages: Habitation[];
  pilot_district?: string;
  pilot_state?: string;
  is_synthetic_demo_data?: boolean;
}

export interface MapLayerItem {
  id: string;
  name: string;
  type: 'hospital' | 'school' | 'evacuation_road';
  latitude: number;
  longitude: number;
  coordinates?: [number, number][];
  capacity_or_type: string;
}

export interface MapLayersResponse {
  red_zones: RedZone[];
  habitations: Habitation[];
  relocation_sites: RelocationSite[];
  infrastructure: MapLayerItem[];
}
