"""
Flood forecast + data-status endpoints: RBAC, DEMO labeling and schema contract.

Flood data is synthetic/demo for the pilot.  These tests assert the response is
clearly labelled (DEMO / NOT CONFIGURED) and that non-authorized callers are
rejected — the same RBAC surface as the evacuation endpoints.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict:
    res = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _citizen_headers() -> dict:
    res = client.post("/api/auth/login", json={
        "username_or_email": "citizen",
        "password": "citizen123",
        "state_id": "uk",
        "district_id": "chamoli",
        "sub_district_id": "joshimath",
        "area_id": "joshimath-central",
    })
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_flood_forecast_requires_auth():
    response = client.get("/api/flood-forecast")
    assert response.status_code == 401


def test_data_status_requires_auth():
    response = client.get("/api/data-status")
    assert response.status_code == 401


def test_data_status_accessible_to_public_map_readers():
    """normal_citizen holds map.read_public, so the status endpoint must work."""
    response = client.get("/api/data-status", headers=_citizen_headers())
    assert response.status_code == 200
    data = response.json()
    layers = {layer["layer"]: layer for layer in data["layers"]}
    assert "flood_forecast" in layers
    assert layers["flood_forecast"]["status"] in ("DEMO", "LIVE", "NOT CONFIGURED")
    assert "satellite_tiles" in layers
    assert layers["satellite_tiles"]["status"] == "LIVE"
    assert "google_map_tiles" in layers
    assert layers["google_map_tiles"]["status"] in ("LIVE", "NOT CONFIGURED")
    assert data["checked_at"]


def test_flood_forecast_returns_demo_labelled_gauges():
    response = client.get("/api/flood-forecast", headers=_admin_headers())
    assert response.status_code == 200
    data = response.json()
    assert len(data["gauges"]) == 5
    assert data["data_status"] in ("DEMO", "FORECAST")
    assert "computed_at" in data

    gauges = {g["gauge_id"]: g for g in data["gauges"]}
    assert "CWC-ALN-001" in gauges
    aln = gauges["CWC-ALN-001"]
    assert aln["river"] == "Alaknanda"
    assert aln["warning_level_m"] > 0
    assert aln["danger_level_m"] > aln["warning_level_m"]
    assert aln["risk_level"] in ("LOW", "MODERATE", "HIGH", "EXTREME")
    assert aln["data_status"] in ("DEMO", "FORECAST")
    assert aln["data_source"]
    assert aln["inundation_zone"]["type"] == "Polygon"

    # Every gauge references real graph edges from the curated corridor.
    for gauge in data["gauges"]:
        assert gauge["affected_edges"], f"{gauge['gauge_id']} must reference corridor edges"


def test_flood_forecast_zones_only_high_or_extreme():
    response = client.get("/api/flood-forecast", headers=_admin_headers())
    data = response.json()
    for zone in data["zones"]:
        assert zone["risk_level"] in ("HIGH", "EXTREME")
        assert zone["geometry"]["type"] == "Polygon"
        assert len(zone["geometry"]["coordinates"]) >= 1