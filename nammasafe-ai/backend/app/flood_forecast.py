"""
Flood forecast data model, DEMO seed data and future Google Flood Hub adapter.

All data in this module is clearly labelled DEMO unless the GOOGLE_FLOOD_API_KEY
environment variable is set (future live integration).  Never present demo data
as live sensor telemetry.

River gauges are placed at real-world coordinates along the Alaknanda, Rishiganga,
Nandakini and Pindar rivers in the Chamoli pilot district.  Each gauge carries
current_level_m, warning_level_m, danger_level_m and a list of affected road-graph
edges that become RESTRICTED or CLOSED when the gauge level exceeds the relevant
threshold.  Simplified inundation zone polygons are provided for map rendering.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import GOOGLE_MAPS_API_KEY

GOOGLE_FLOOD_API_KEY = os.getenv("GOOGLE_FLOOD_API_KEY", "")
FLOOD_DATA_MODE = os.getenv("FLOOD_DATA_MODE", "demo")


def _risk_level(current: float, warning: float, danger: float) -> str:
    if current >= danger:
        return "EXTREME"
    if current >= warning:
        return "HIGH"
    if current >= warning * 0.75:
        return "MODERATE"
    return "LOW"


# ---------------------------------------------------------------------------
# DEMO seed data — five river gauges across Chamoli pilot corridors
# ---------------------------------------------------------------------------

_SEED_GAUGES: List[Dict[str, Any]] = [
    {
        "gauge_id": "CWC-ALN-001",
        "gauge_name": "Alaknanda at Chamoli",
        "river": "Alaknanda",
        "latitude": 30.425,
        "longitude": 79.372,
        "current_level_m": 4.85,
        "warning_level_m": 4.50,
        "danger_level_m": 5.80,
        "affected_edges": ["e-nandprayag-chamoli", "e-chamoli-pipalkoti"],
        "inundation_zone": {
            "type": "Polygon",
            "coordinates": [[
                [79.365, 30.418],
                [79.378, 30.418],
                [79.380, 30.432],
                [79.363, 30.432],
                [79.365, 30.418],
            ]],
        },
    },
    {
        "gauge_id": "CWC-RSG-001",
        "gauge_name": "Rishiganga at Tapovan",
        "river": "Rishiganga",
        "latitude": 30.495,
        "longitude": 79.630,
        "current_level_m": 2.10,
        "warning_level_m": 3.50,
        "danger_level_m": 4.80,
        "affected_edges": ["e-tapovan-raini", "e-joshimath-tapovan"],
        "inundation_zone": {
            "type": "Polygon",
            "coordinates": [[
                [79.620, 30.490],
                [79.640, 30.490],
                [79.645, 30.500],
                [79.615, 30.500],
                [79.620, 30.490],
            ]],
        },
    },
    {
        "gauge_id": "CWC-NDK-001",
        "gauge_name": "Nandakini at Nandprayag",
        "river": "Nandakini",
        "latitude": 30.335,
        "longitude": 79.315,
        "current_level_m": 3.20,
        "warning_level_m": 4.00,
        "danger_level_m": 5.20,
        "affected_edges": ["e-nandprayag-ghat", "e-karanprayag-nandprayag"],
        "inundation_zone": {
            "type": "Polygon",
            "coordinates": [[
                [79.308, 30.328],
                [79.322, 30.328],
                [79.324, 30.342],
                [79.306, 30.342],
                [79.308, 30.328],
            ]],
        },
    },
    {
        "gauge_id": "CWC-PND-001",
        "gauge_name": "Pindar at Tharali",
        "river": "Pindar",
        "latitude": 30.075,
        "longitude": 79.505,
        "current_level_m": 1.80,
        "warning_level_m": 3.20,
        "danger_level_m": 4.50,
        "affected_edges": ["e-gwaldam-tharali"],
        "inundation_zone": {
            "type": "Polygon",
            "coordinates": [[
                [79.498, 30.068],
                [79.512, 30.068],
                [79.514, 30.082],
                [79.496, 30.082],
                [79.498, 30.068],
            ]],
        },
    },
    {
        "gauge_id": "CWC-DHL-001",
        "gauge_name": "Dhauliganga at Helang",
        "river": "Dhauliganga",
        "latitude": 30.528,
        "longitude": 79.510,
        "current_level_m": 3.90,
        "warning_level_m": 3.80,
        "danger_level_m": 5.00,
        "affected_edges": ["e-helang-joshimath", "e-pipalkoti-helang"],
        "inundation_zone": {
            "type": "Polygon",
            "coordinates": [[
                [79.502, 30.522],
                [79.518, 30.522],
                [79.520, 30.534],
                [79.500, 30.534],
                [79.502, 30.522],
            ]],
        },
    },
]


def _enrich_gauge(gauge: Dict[str, Any]) -> Dict[str, Any]:
    """Add computed fields (risk_level, data_status) to a raw gauge dict."""
    risk = _risk_level(
        gauge["current_level_m"],
        gauge["warning_level_m"],
        gauge["danger_level_m"],
    )
    data_status = "DEMO" if FLOOD_DATA_MODE != "live" or not GOOGLE_FLOOD_API_KEY else "FORECAST"
    return {
        **gauge,
        "risk_level": risk,
        "data_source": "Google Flood Forecasting (demo seed)" if data_status == "DEMO" else "Google Flood Forecasting API",
        "data_status": data_status,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


def get_flood_forecasts() -> Dict[str, Any]:
    """
    Return all flood gauge readings plus zone geometries.

    In DEMO mode (default) this returns synthetic seed data.
    When GOOGLE_FLOOD_API_KEY is set and FLOOD_DATA_MODE=live the
    adapter would call the external API — not implemented yet.
    """
    gauges = [_enrich_gauge(g) for g in _SEED_GAUGES]
    zones = [
        {
            "zone_id": f"flood-zone-{g['gauge_id']}",
            "gauge_id": g["gauge_id"],
            "gauge_name": g["gauge_name"],
            "river": g["river"],
            "risk_level": _risk_level(g["current_level_m"], g["warning_level_m"], g["danger_level_m"]),
            "geometry": g["inundation_zone"],
        }
        for g in gauges
        if _risk_level(g["current_level_m"], g["warning_level_m"], g["danger_level_m"]) in ("HIGH", "EXTREME")
    ]

    overall_status = "DEMO"
    if GOOGLE_FLOOD_API_KEY and FLOOD_DATA_MODE == "live":
        overall_status = "FORECAST"

    return {
        "gauges": gauges,
        "zones": zones,
        "data_status": overall_status,
        "data_source": "Google Flood Forecasting" if overall_status == "FORECAST" else "Synthetic demo seed data",
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


def get_data_status() -> List[Dict[str, str]]:
    """
    Return the provenance and status of every data layer displayed on the map.
    This is consumed by the frontend DataSourceStatus component.
    """
    flood_status = "NOT CONFIGURED"
    if GOOGLE_FLOOD_API_KEY and FLOOD_DATA_MODE == "live":
        flood_status = "LIVE"
    elif FLOOD_DATA_MODE == "demo":
        flood_status = "DEMO"

    # Google Maps basemap tiles — LIVE when API key configured, else NOT CONFIGURED
    basemap_status = "LIVE" if GOOGLE_MAPS_API_KEY else "NOT CONFIGURED"
    basemap_source = (
        "Google Maps Platform Map Tiles API (key configured)"
        if GOOGLE_MAPS_API_KEY
        else "Esri fallback active (no key required)"
    )
    return [
        {"layer": "road_network", "status": "DEMO", "source": "Curated pilot graph (17 nodes, 16 edges)", "updated_at": "2025-09-01"},
        {"layer": "hazard_zones", "status": "DEMO", "source": "Synthetic red-zone polygons", "updated_at": "2025-09-01"},
        {"layer": "habitation_risk", "status": "DEMO", "source": "Computed risk scores", "updated_at": "2025-09-01"},
        {"layer": "relocation_sites", "status": "DEMO", "source": "Synthetic capacity data", "updated_at": "2025-09-01"},
        {"layer": "flood_forecast", "status": flood_status, "source": "Google Flood Forecasting" if flood_status == "LIVE" else ("Synthetic demo seed" if flood_status == "DEMO" else "API key not configured"), "updated_at": "2025-09-14" if flood_status != "NOT CONFIGURED" else "—"},
        {"layer": "google_map_tiles", "status": basemap_status, "source": basemap_source, "updated_at": "—"},
        {"layer": "satellite_tiles", "status": "LIVE", "source": "Esri World Imagery (free, no key)", "updated_at": "—"},
        {"layer": "road_conditions", "status": "DEMO", "source": "2 field-report-based entries", "updated_at": "2025-08-28"},
        {"layer": "evacuation_routes", "status": "DEMO", "source": "A* on curated graph", "updated_at": "—"},
    ]
