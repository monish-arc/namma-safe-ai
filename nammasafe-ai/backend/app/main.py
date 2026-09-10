"""
NammaSafe AI - FastAPI Backend Server
Decision-Support Platform for Chamoli District, Uttarakhand
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.config import PILOT_DISTRICT, PILOT_STATE
from app.auth import create_access_token, require_roles, require_permissions, get_current_user
from app.access_control import can_manage_role, scope_contains
from app.schemas import (
    LoginRequest,
    TokenResponse,
    HabitationResponse,
    RelocationSiteResponse,
    RelocationRecommendationResponse,
    FieldReportResponse,
    FieldReportCreate,
    SimulationRequest,
    SimulationResponse,
    PriorityCalculateRequest,
    AdminHazardUploadRequest,
    RiskAlertCreate,
    AccommodationUpdate,
    AssignmentCreate,
)
from app.risk_engine import (
    calculate_hazard_score,
    calculate_vulnerability_score,
    calculate_relocation_priority,
    calculate_site_suitability,
    calculate_carrying_capacity,
    simulate_safeshift,
)
from app.seed_data import get_processed_seed_data
from app.database import engine
from app.models import Base

app = FastAPI(
    title="NammaSafe AI API",
    description="Proactive Red-Zone and Relocation Planning Platform for Disaster-Prone Regions (Chamoli, Uttarakhand Pilot).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store initialized from seed data
DATA = get_processed_seed_data()


@app.on_event("startup")
def initialise_local_database() -> None:
    """Create the local SQLite schema when the stack runs without Docker."""
    Base.metadata.create_all(bind=engine)


def get_area_scope(area_id: str) -> Dict[str, str]:
    area = next((item for item in DATA["administrative_areas"]["areas"] if item["id"] == area_id), None)
    if not area:
        raise HTTPException(status_code=404, detail="Administrative area not found")
    sub_district = next(
        (item for item in DATA["administrative_areas"]["sub_districts"] if item["id"] == area["sub_district_id"]),
        None,
    )
    district = next(
        (item for item in DATA["administrative_areas"]["districts"] if item["id"] == sub_district["district_id"]),
        None,
    )
    return {
        "state_id": district["state_id"],
        "district_id": district["id"],
        "sub_district_id": sub_district["id"],
        "area_id": area["id"],
    }


def require_scope(user: Dict[str, Any], area_id: str) -> Dict[str, str]:
    requested_scope = get_area_scope(area_id)
    if not scope_contains(user.get("assignment", {}), requested_scope):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Area is outside your assigned jurisdiction")
    return requested_scope


def record_audit_event(action: str, user: Dict[str, Any], detail: Dict[str, Any]) -> None:
    DATA["audit_events"].insert(0, {
        "id": f"audit-{uuid.uuid4().hex[:10]}",
        "action": action,
        "actor_id": user.get("sub", user.get("id")),
        "actor_name": user.get("full_name"),
        "detail": detail,
        "recorded_at": datetime.utcnow().isoformat(),
    })

@app.get("/")
def root():
    return {
        "platform": "NammaSafe AI",
        "tagline": "Proactive Red-Zone and Relocation Planning Platform",
        "pilot": f"{PILOT_DISTRICT}, {PILOT_STATE}",
        "status": "Operational",
        "api_docs": "/docs",
    }

# ==================== AUTHENTICATION ====================
@app.post("/api/auth/login", response_model=TokenResponse)
def login(creds: LoginRequest):
    username_or_email = creds.username_or_email.strip().lower()
    
    user = None
    for u in DATA["users"]:
        if u["username"].lower() == username_or_email or u["email"].lower() == username_or_email:
            user = u
            break
            
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please use demo account credentials.",
        )
        
    # Check the demonstration password for this identity.
    expected_pass = user["hashed_password"].split(":")[-1]
    if creds.password != expected_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password for this user.",
        )
        
    selected_scope = {
        "state_id": creds.state_id,
        "district_id": creds.district_id,
        "sub_district_id": creds.sub_district_id,
        "area_id": creds.area_id,
    }
    if user["role"] != "admin":
        if not all(selected_scope.values()):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="State, district, sub-district and area are required before login")
        if not scope_contains(user["assignment"], selected_scope):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Selected area is outside this user's assignment")
    else:
        selected_scope = user["assignment"]

    token = create_access_token(
        data={
            "sub": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"],
            "assignment": user["assignment"],
            "selected_scope": selected_scope,
        }
    )
    DATA["user_sessions"].insert(0, {
        "id": f"session-{uuid.uuid4().hex[:10]}",
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "selected_scope": selected_scope,
        "logged_in_at": datetime.utcnow().isoformat(),
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"],
            "designation": user.get("designation", ""),
            "department": user.get("department", ""),
            "assignment": user["assignment"],
            "selected_scope": selected_scope,
        },
    }


# ==================== GEOGRAPHY AND SCOPED OPERATIONS ====================
@app.get("/api/geography/states")
def list_states():
    return DATA["administrative_areas"]["states"]


@app.get("/api/geography/districts")
def list_districts(state_id: str = Query(...)):
    return [item for item in DATA["administrative_areas"]["districts"] if item["state_id"] == state_id]


@app.get("/api/geography/sub-districts")
def list_sub_districts(district_id: str = Query(...)):
    return [item for item in DATA["administrative_areas"]["sub_districts"] if item["district_id"] == district_id]


@app.get("/api/geography/areas")
def list_areas(sub_district_id: str = Query(...)):
    return [item for item in DATA["administrative_areas"]["areas"] if item["sub_district_id"] == sub_district_id]


@app.get("/api/risk-alerts")
def list_risk_alerts(area_id: Optional[str] = None):
    alerts = DATA["risk_alerts"]
    if area_id:
        alerts = [alert for alert in alerts if alert["area_id"] == area_id]
    return [alert for alert in alerts if alert["status"] == "published"]


@app.post("/api/risk-alerts")
def create_risk_alert(
    payload: RiskAlertCreate,
    user: dict = Depends(require_permissions("alert.raise")),
):
    require_scope(user, payload.area_id)
    alert = {
        "id": f"alert-{uuid.uuid4().hex[:8]}",
        **payload.model_dump(),
        "status": "pending_review",
        "reported_by": user["sub"],
        "reported_by_name": user["full_name"],
        "reported_at": datetime.utcnow().isoformat(),
    }
    DATA["risk_alerts"].insert(0, alert)
    record_audit_event("risk_alert.created", user, {"alert_id": alert["id"], "area_id": payload.area_id})
    return alert


@app.post("/api/risk-alerts/{alert_id}/publish")
def publish_risk_alert(
    alert_id: str,
    user: dict = Depends(require_permissions("accommodation.manage")),
):
    alert = next((item for item in DATA["risk_alerts"] if item["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")
    require_scope(user, alert["area_id"])
    alert["status"] = "published"
    alert["published_by"] = user["sub"]
    alert["published_at"] = datetime.utcnow().isoformat()
    record_audit_event("risk_alert.published", user, {"alert_id": alert_id})
    return alert


@app.post("/api/accommodations")
def create_accommodation(
    payload: AccommodationUpdate,
    user: dict = Depends(require_permissions("accommodation.manage")),
):
    require_scope(user, payload.area_id)
    if payload.current_occupancy_families > payload.estimated_capacity:
        raise HTTPException(status_code=422, detail="Occupancy cannot exceed total capacity")
    accommodation = {
        "id": f"site-{uuid.uuid4().hex[:8]}",
        "site_name": payload.site_name,
        "district": PILOT_DISTRICT,
        "area_id": payload.area_id,
        "land_area_acres": payload.land_area_acres,
        "estimated_capacity": payload.estimated_capacity,
        "current_occupancy_families": payload.current_occupancy_families,
        "available_capacity_families": payload.estimated_capacity - payload.current_occupancy_families,
        "water_score": 80.0,
        "road_score": 80.0,
        "school_score": 80.0,
        "hospital_score": 80.0,
        "low_hazard_score": 80.0,
        "flat_land_score": 80.0,
        "suitability_score": 80.0,
        "land_capacity_families": payload.estimated_capacity,
        "water_capacity_families": payload.estimated_capacity,
        "school_capacity_families": payload.estimated_capacity,
        "health_capacity_families": payload.estimated_capacity,
        "road_capacity_families": payload.estimated_capacity,
        "final_capacity_families": payload.estimated_capacity,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "status": "published",
        "updated_at": datetime.utcnow().isoformat(),
    }
    DATA["relocation_sites"].append(accommodation)
    record_audit_event("accommodation.created", user, {"accommodation_id": accommodation["id"], "area_id": payload.area_id})
    return accommodation


@app.get("/api/assignments")
def list_assignments(user: dict = Depends(require_permissions("assignment.read"))):
    return [
        {"user_id": item["id"], "username": item["username"], "role": item["role"], "assignment": item["assignment"]}
        for item in DATA["users"]
        if scope_contains(user["assignment"], item["assignment"])
    ]


@app.post("/api/assignments")
def assign_user(payload: AssignmentCreate, user: dict = Depends(require_permissions("assignment.manage"))):
    target = next((item for item in DATA["users"] if item["id"] == payload.user_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    requested_scope = payload.model_dump(exclude={"user_id", "role"})
    if not can_manage_role(user["role"], payload.role) or not scope_contains(user["assignment"], requested_scope):
        raise HTTPException(status_code=403, detail="You cannot manage this role or jurisdiction")
    target["role"] = payload.role
    target["assignment"] = requested_scope
    record_audit_event("assignment.updated", user, {"target_user_id": target["id"], "role": payload.role, "scope": requested_scope})
    return {"user_id": target["id"], "role": target["role"], "assignment": target["assignment"]}


@app.get("/api/analytics/hazards")
def hazard_analytics(user: dict = Depends(require_permissions("analytics.read"))):
    events = DATA["hazard_events"]
    by_type: Dict[str, int] = {}
    by_year: Dict[str, int] = {}
    for event in events:
        by_type[event["hazard_type"]] = by_type.get(event["hazard_type"], 0) + 1
        year = event["event_date"][:4]
        by_year[year] = by_year.get(year, 0) + 1
    return {"events_by_type": by_type, "events_by_year": by_year, "events": events}


@app.get("/api/admin/sessions")
def list_sessions(user: dict = Depends(require_permissions("session-log.read"))):
    return DATA["user_sessions"]


@app.get("/api/admin/system-health")
def system_health(user: dict = Depends(require_permissions("system-health.read"))):
    return {"status": "operational", "data_mode": "synthetic_demo", "checked_at": datetime.utcnow().isoformat()}

# ==================== DASHBOARD SUMMARY ====================
@app.get("/api/dashboard-summary")
def get_dashboard_summary():
    habs = DATA["habitations"]
    sites = DATA["relocation_sites"]
    reports = DATA["field_reports"]
    
    total_monitored = len(habs)
    
    # High risk population: population in Immediate or Short-Term relocation
    high_risk_population = sum(
        h["population"] for h in habs 
        if h["priority_level"] in ["Immediate Relocation", "Short-Term Relocation"]
    )
    
    immediate_relocation_count = sum(
        1 for h in habs if h["priority_level"] == "Immediate Relocation"
    )
    
    available_safe_capacity = sum(
        s.get("available_capacity_families", s["final_capacity_families"]) for s in sites
    )
    
    # Hazard distribution
    hazard_counts: Dict[str, Dict[str, Any]] = {}
    for h in DATA["hazard_events"]:
        ht = h["hazard_type"]
        if ht not in hazard_counts:
            hazard_counts[ht] = {"hazard_type": ht, "count": 0, "affected_population": 0}
        hazard_counts[ht]["count"] += 1
        hazard_counts[ht]["affected_population"] += h["affected_people"]
        
    # Relocation priority distribution
    priority_counts: Dict[str, Dict[str, Any]] = {
        "Immediate Relocation": {"level": "Immediate Relocation", "count": 0, "population": 0},
        "Short-Term Relocation": {"level": "Short-Term Relocation", "count": 0, "population": 0},
        "Medium-Term Relocation": {"level": "Medium-Term Relocation", "count": 0, "population": 0},
        "Monitor Only": {"level": "Monitor Only", "count": 0, "population": 0},
    }
    for h in habs:
        lvl = h["priority_level"]
        if lvl in priority_counts:
            priority_counts[lvl]["count"] += 1
            priority_counts[lvl]["population"] += h["population"]
            
    # Top 5 critical villages
    top_5 = sorted(habs, key=lambda x: x["priority_score"], reverse=True)[:5]
    
    # Recent field reports
    recent_reports = sorted(reports, key=lambda x: x["reported_at"], reverse=True)[:5]
    
    return {
        "total_habitations_monitored": total_monitored,
        "high_risk_population": high_risk_population,
        "immediate_relocation_villages_count": immediate_relocation_count,
        "available_safe_site_capacity": available_safe_capacity,
        "total_safe_sites": len(sites),
        "verified_field_reports_count": sum(1 for r in reports if r["verified"]),
        "pending_field_reports_count": sum(1 for r in reports if not r["verified"]),
        "hazard_distribution": list(hazard_counts.values()),
        "relocation_priority_distribution": list(priority_counts.values()),
        "recent_field_reports": recent_reports,
        "top_five_critical_villages": top_5,
        "pilot_district": PILOT_DISTRICT,
        "pilot_state": PILOT_STATE,
        "is_synthetic_demo_data": True,
    }

# ==================== MAP LAYERS ====================
@app.get("/api/map-layers")
def get_map_layers():
    return {
        "red_zones": DATA["red_zones"],
        "habitations": DATA["habitations"],
        "relocation_sites": DATA["relocation_sites"],
        "infrastructure": DATA["infrastructure"],
        "pilot_center": {"lat": 30.4000, "lng": 79.3300, "zoom": 10},
        "is_synthetic_demo_data": True,
    }

# ==================== HABITATIONS ====================
@app.get("/api/habitations")
def list_habitations(
    priority_level: Optional[str] = None,
    search: Optional[str] = None,
):
    habs = DATA["habitations"]
    if priority_level:
        habs = [h for h in habs if h["priority_level"].lower() == priority_level.lower()]
    if search:
        s = search.lower()
        habs = [h for h in habs if s in h["village_name"].lower() or s in h["village_code"].lower()]
    return habs

@app.get("/api/habitations/{id}")
def get_habitation(id: str):
    for h in DATA["habitations"]:
        if h["id"] == id or h["village_code"] == id:
            return h
    raise HTTPException(status_code=404, detail="Habitation not found")

@app.get("/api/habitations/{id}/risk-analysis")
def get_habitation_risk_analysis(id: str):
    hab = None
    for h in DATA["habitations"]:
        if h["id"] == id or h["village_code"] == id:
            hab = h
            break
    if not hab:
        raise HTTPException(status_code=404, detail="Habitation not found")
        
    events = [e for e in DATA["hazard_events"] if e["habitation_id"] == hab["id"]]
    recs = [r for r in DATA["recommendations"] if r["habitation_id"] == hab["id"]]
    reports = [fr for fr in DATA["field_reports"] if fr["habitation_id"] == hab["id"]]
    
    return {
        "habitation": hab,
        "historical_events": events,
        "recommendations": recs,
        "field_reports": reports,
        "risk_breakdown": {
            "hazard_components": {
                "landslide_risk_weighted": round(0.40 * hab["landslide_risk"], 2),
                "flood_risk_weighted": round(0.30 * hab["flood_risk"], 2),
                "rainfall_risk_weighted": round(0.20 * hab["extreme_rainfall_risk"], 2),
                "past_disaster_weighted": round(0.10 * hab["past_disaster_frequency"], 2),
                "total_hazard_score": hab["hazard_score"],
            },
            "vulnerability_components": {
                "vulnerability_score": hab["vulnerability_score"],
                "hospital_distance_km": hab["hospital_distance_km"],
                "road_access_score": hab["road_access_score"],
                "children_ratio_percent": round((hab["children_count"] / hab["population"]) * 100, 1),
                "elderly_ratio_percent": round((hab["elderly_count"] / hab["population"]) * 100, 1),
            },
            "priority_calculation": {
                "hazard_contribution_50pct": round(0.50 * hab["hazard_score"], 2),
                "vulnerability_contribution_30pct": round(0.30 * hab["vulnerability_score"], 2),
                "disaster_history_contribution_20pct": round(0.20 * min(100.0, hab["disaster_history_count"] * 16.0), 2),
                "final_priority_score": hab["priority_score"],
                "priority_level": hab["priority_level"],
            },
        },
    }

# ==================== RELOCATION SITES ====================
@app.get("/api/relocation-sites")
def list_relocation_sites():
    return DATA["relocation_sites"]

@app.get("/api/relocation-sites/{id}")
def get_relocation_site(id: str):
    for s in DATA["relocation_sites"]:
        if s["id"] == id:
            return s
    raise HTTPException(status_code=404, detail="Relocation site not found")

# ==================== RECOMMENDATIONS ====================
@app.get("/api/relocation-recommendations")
def list_recommendations(status_filter: Optional[str] = None):
    recs = DATA["recommendations"]
    if status_filter:
        recs = [r for r in recs if r["status"].lower() == status_filter.lower()]
    return recs

# ==================== FIELD REPORTS ====================
@app.get("/api/field-reports")
def list_field_reports():
    return DATA["field_reports"]

@app.post("/api/field-reports", response_model=FieldReportResponse)
def submit_field_report(
    report: FieldReportCreate,
    user: dict = Depends(require_roles(["field_officer", "local_office", "sub_district_officer", "district_officer", "state_officer", "admin"])),
):
    # Verify habitation exists
    hab = next((h for h in DATA["habitations"] if h["id"] == report.habitation_id), None)
    if not hab:
        raise HTTPException(status_code=400, detail="Invalid habitation ID")
        
    new_report = {
        "id": f"fr-{uuid.uuid4().hex[:6]}",
        "habitation_id": hab["id"],
        "habitation_name": hab["village_name"],
        "officer_id": user.get("sub", "usr-field-003"),
        "officer_name": user.get("full_name", "Field Officer"),
        "report_type": report.report_type,
        "description": report.description,
        "image_url": report.image_url or "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
        "reported_at": datetime.utcnow().isoformat(),
        "verified": user.get("role") in ["admin", "state_officer", "district_officer", "sub_district_officer", "local_office"],
        "severity": report.severity,
        "latitude": report.latitude,
        "longitude": report.longitude,
    }
    DATA["field_reports"].insert(0, new_report)
    return new_report

# ==================== CALCULATE PRIORITY ====================
@app.post("/api/calculate-priority")
def calculate_priority(
    payload: PriorityCalculateRequest,
    user: dict = Depends(require_roles(["local_office", "sub_district_officer", "district_officer", "state_officer", "admin"])),
):
    hab = next((h for h in DATA["habitations"] if h["id"] == payload.habitation_id), None)
    if not hab:
        raise HTTPException(status_code=404, detail="Habitation not found")
        
    landslide = payload.landslide_risk if payload.landslide_risk is not None else hab["landslide_risk"]
    flood = payload.flood_risk if payload.flood_risk is not None else hab["flood_risk"]
    rainfall = payload.extreme_rainfall_risk if payload.extreme_rainfall_risk is not None else hab["extreme_rainfall_risk"]
    road = payload.road_access_score if payload.road_access_score is not None else hab["road_access_score"]
    
    new_h_score = calculate_hazard_score(landslide, flood, rainfall, hab["past_disaster_frequency"])
    new_v_score = calculate_vulnerability_score(
        hab["population"],
        hab["households"],
        hab["children_count"],
        hab["elderly_count"],
        hab["hospital_distance_km"],
        road,
    )
    disaster_hist_score = min(100.0, hab["disaster_history_count"] * 16.0)
    new_p_score, new_level = calculate_relocation_priority(new_h_score, new_v_score, disaster_hist_score)
    
    # Update habitation in state
    hab["hazard_score"] = new_h_score
    hab["vulnerability_score"] = new_v_score
    hab["priority_score"] = new_p_score
    hab["priority_level"] = new_level
    hab["landslide_risk"] = landslide
    hab["flood_risk"] = flood
    hab["extreme_rainfall_risk"] = rainfall
    hab["road_access_score"] = road
    
    return {
        "habitation_id": hab["id"],
        "village_name": hab["village_name"],
        "hazard_score": new_h_score,
        "vulnerability_score": new_v_score,
        "priority_score": new_p_score,
        "priority_level": new_level,
        "updated": True,
    }

# ==================== SIMULATE RELOCATION ====================
@app.post("/api/simulate-relocation")
def simulate_relocation_api(payload: SimulationRequest):
    hab = next((h for h in DATA["habitations"] if h["id"] == payload.habitation_id), None)
    if not hab:
        raise HTTPException(status_code=404, detail="Habitation not found")
        
    site = next((s for s in DATA["relocation_sites"] if s["id"] == payload.relocation_site_id), None)
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
        
    if payload.families_count <= 0:
        raise HTTPException(status_code=400, detail="Family count must be greater than zero")
        
    res = simulate_safeshift(hab, site, payload.families_count, DATA["relocation_sites"])
    return res

# ==================== ADMIN DATA MANAGEMENT ====================
@app.post("/api/admin/upload-hazard-data")
def upload_hazard_data(
    payload: AdminHazardUploadRequest,
    user: dict = Depends(require_roles(["admin"])),
):
    # Simulated ingestion and parsing
    return {
        "status": "success",
        "message": f"Successfully ingested {payload.source_name} hazard dataset in {payload.hazard_data_format} format.",
        "features_processed": len(payload.payload.get("features", [])) if "features" in payload.payload else 1,
        "processed_by": user.get("full_name", "Admin"),
        "timestamp": datetime.utcnow().isoformat(),
    }
