"""
Pydantic Schemas for NammaSafe AI Request/Response Validation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict, Literal
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    state_id: Optional[str] = None
    district_id: Optional[str] = None
    sub_district_id: Optional[str] = None
    area_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class RiskAlertCreate(BaseModel):
    area_id: str
    hazard_type: str
    severity: str
    description: str = Field(min_length=10)
    latitude: float
    longitude: float


class AccommodationUpdate(BaseModel):
    area_id: str
    site_name: str
    land_area_acres: float = Field(gt=0)
    estimated_capacity: int = Field(gt=0)
    current_occupancy_families: int = Field(ge=0)
    latitude: float
    longitude: float


class AssignmentCreate(BaseModel):
    user_id: str
    role: Literal[
        "field_officer", "local_office", "sub_district_officer",
        "district_officer", "state_officer", "gis_analysis_officer",
    ]
    state_id: str
    district_id: str
    sub_district_id: str
    area_id: str

# Habitation Schemas
class HabitationBase(BaseModel):
    village_code: str
    village_name: str
    district: str = "Chamoli"
    state: str = "Uttarakhand"
    population: int = Field(gt=0, description="Aggregated population count")
    households: int = Field(gt=0)
    children_count: int = Field(ge=0)
    elderly_count: int = Field(ge=0)
    hospital_distance_km: float = Field(ge=0.0)
    road_access_score: float = Field(ge=0.0, le=100.0)
    latitude: float
    longitude: float
    landslide_risk: float = Field(default=50.0, ge=0.0, le=100.0)
    flood_risk: float = Field(default=50.0, ge=0.0, le=100.0)
    extreme_rainfall_risk: float = Field(default=50.0, ge=0.0, le=100.0)
    past_disaster_frequency: float = Field(default=50.0, ge=0.0, le=100.0)
    notes: Optional[str] = None

class HabitationResponse(HabitationBase):
    id: str
    vulnerability_score: float
    hazard_score: float
    priority_score: float
    priority_level: str
    disaster_history_count: int

    class Config:
        from_attributes = True

# Hazard Event Schemas
class HazardEventBase(BaseModel):
    habitation_id: str
    hazard_type: str
    event_date: str
    intensity: str
    severity_level: str
    affected_people: int
    houses_damaged: int
    deaths: int
    source_url: Optional[str] = None

class HazardEventResponse(HazardEventBase):
    id: str
    habitation_name: Optional[str] = None

    class Config:
        from_attributes = True

# Red Zone Schemas
class RedZoneResponse(BaseModel):
    id: str
    zone_name: str
    hazard_type: str
    risk_level: str
    hazard_score: float
    zone_geometry: Dict[str, Any]
    data_source: str
    last_updated: str

    class Config:
        from_attributes = True

# Relocation Site Schemas
class RelocationSiteBase(BaseModel):
    site_name: str
    district: str = "Chamoli"
    land_area_acres: float = Field(gt=0)
    estimated_capacity: int = Field(gt=0)
    water_score: float = Field(ge=0.0, le=100.0)
    road_score: float = Field(ge=0.0, le=100.0)
    school_score: float = Field(ge=0.0, le=100.0)
    hospital_score: float = Field(ge=0.0, le=100.0)
    low_hazard_score: float = Field(ge=0.0, le=100.0)
    flat_land_score: float = Field(ge=0.0, le=100.0)
    latitude: float
    longitude: float

class RelocationSiteResponse(RelocationSiteBase):
    id: str
    suitability_score: float
    current_occupancy_families: int
    land_capacity_families: int
    water_capacity_families: int
    school_capacity_families: int
    health_capacity_families: int
    road_capacity_families: int
    final_capacity_families: int
    available_capacity_families: int

    class Config:
        from_attributes = True

# Recommendation Schemas
class RelocationRecommendationResponse(BaseModel):
    id: str
    habitation_id: str
    habitation_name: str
    relocation_site_id: str
    relocation_site_name: str
    hazard_score: float
    vulnerability_score: float
    disaster_history_score: float
    final_priority_score: float
    priority_level: str
    recommended_families: int
    risk_reduction_percent: float
    explanation: str
    status: str
    created_at: str

    class Config:
        from_attributes = True

# Field Report Schemas
class FieldReportCreate(BaseModel):
    habitation_id: str
    report_type: str
    description: str = Field(min_length=10)
    image_url: Optional[str] = None
    severity: str = "High"
    latitude: float
    longitude: float

class FieldReportResponse(BaseModel):
    id: str
    habitation_id: str
    habitation_name: str
    officer_id: str
    officer_name: str
    report_type: str
    description: str
    image_url: Optional[str] = None
    reported_at: str
    verified: bool
    severity: str
    latitude: float
    longitude: float

    class Config:
        from_attributes = True

# Simulator Schemas
class SimulationRequest(BaseModel):
    habitation_id: str
    relocation_site_id: str
    families_count: int = Field(gt=0, description="Must be a positive number of families")

class SimulationResponse(BaseModel):
    habitation_id: str
    habitation_name: str
    target_site_id: str
    target_site_name: str
    families_relocated: int
    is_capacity_sufficient: bool
    risk_reduction_percent: float
    initial_site_capacity: int
    remaining_capacity_after: int
    water_capacity_status: str
    school_capacity_status: str
    hospital_access_status: str
    road_access_status: str
    bottleneck_factor: str
    explanation: str
    alternative_site: Optional[Dict[str, Any]] = None

# Priority Recalculation Request
class PriorityCalculateRequest(BaseModel):
    habitation_id: str
    landslide_risk: Optional[float] = Field(None, ge=0, le=100)
    flood_risk: Optional[float] = Field(None, ge=0, le=100)
    extreme_rainfall_risk: Optional[float] = Field(None, ge=0, le=100)
    road_access_score: Optional[float] = Field(None, ge=0, le=100)

# Admin Upload Schema
class AdminHazardUploadRequest(BaseModel):
    source_name: str
    hazard_data_format: str # GeoJSON, CSV, Shapefile
    payload: Dict[str, Any]
    update_notes: Optional[str] = None
