"""
API Unit Tests for NammaSafe AI FastAPI Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "NammaSafe AI"
    assert "Chamoli" in data["pilot"]

def test_login_demo_users():
    # Admin login
    res_admin = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "admin123"
    })
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

    # Invalid login
    res_invalid = client.post("/api/auth/login", json={
        "username_or_email": "unknown_user",
        "password": "wrongpassword"
    })
    assert res_invalid.status_code == 401


def test_non_admin_login_requires_and_validates_geographic_context():
    no_scope = client.post("/api/auth/login", json={
        "username_or_email": "field",
        "password": "field123",
    })
    assert no_scope.status_code == 422

    scoped_login = client.post("/api/auth/login", json={
        "username_or_email": "field",
        "password": "field123",
        "state_id": "uk",
        "district_id": "chamoli",
        "sub_district_id": "joshimath",
        "area_id": "joshimath-central",
    })
    assert scoped_login.status_code == 200
    assert scoped_login.json()["user"]["role"] == "field_officer"

def test_dashboard_summary():
    res = client.get("/api/dashboard-summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_habitations_monitored"] == 10
    assert data["high_risk_population"] > 0
    assert data["immediate_relocation_villages_count"] > 0
    assert data["available_safe_site_capacity"] > 0
    assert len(data["hazard_distribution"]) > 0
    assert len(data["top_five_critical_villages"]) == 5

def test_map_layers():
    res = client.get("/api/map-layers")
    assert res.status_code == 200
    data = res.json()
    assert len(data["habitations"]) == 10
    assert len(data["relocation_sites"]) == 4
    assert len(data["red_zones"]) == 5
    assert len(data["infrastructure"]) > 0

def test_habitations_and_risk_analysis():
    res = client.get("/api/habitations")
    assert res.status_code == 200
    habs = res.json()
    assert len(habs) == 10
    first_hab = habs[0]

    # Test individual risk analysis
    res_analysis = client.get(f"/api/habitations/{first_hab['id']}/risk-analysis")
    assert res_analysis.status_code == 200
    analysis = res_analysis.json()
    assert "risk_breakdown" in analysis
    assert "hazard_components" in analysis["risk_breakdown"]
    assert "vulnerability_components" in analysis["risk_breakdown"]

def test_relocation_sites_and_recommendations():
    res_sites = client.get("/api/relocation-sites")
    assert res_sites.status_code == 200
    sites = res_sites.json()
    assert len(sites) == 4

    res_recs = client.get("/api/relocation-recommendations")
    assert res_recs.status_code == 200
    recs = res_recs.json()
    assert len(recs) >= 5

def test_safeshift_simulator_endpoint():
    # Valid simulation
    res = client.post("/api/simulate-relocation", json={
        "habitation_id": "hab-joshimath",
        "relocation_site_id": "site-gauchar-01",
        "families_count": 100,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_capacity_sufficient"] is True
    assert data["risk_reduction_percent"] > 50.0
    assert "water_capacity_status" in data

    # Invalid simulation with negative or 0 families
    res_zero = client.post("/api/simulate-relocation", json={
        "habitation_id": "hab-joshimath",
        "relocation_site_id": "site-gauchar-01",
        "families_count": 0,
    })
    assert res_zero.status_code == 422 # Pydantic validation error gt=0
