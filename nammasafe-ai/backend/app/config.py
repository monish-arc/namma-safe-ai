import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./nammasafe.db"
)
JWT_SECRET = os.getenv("JWT_SECRET", "nammasafe-super-secret-key-chamoli-2025")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24

PILOT_DISTRICT = "Chamoli"
PILOT_STATE = "Uttarakhand"
PILOT_CENTER_LAT = 30.4000
PILOT_CENTER_LNG = 79.3300

# -------------------- Evacuation Routing --------------------
# Provider stays "local" for the pilot (curated graph + risk-aware A*).
# An OSRM / GraphHopper backend can be swapped in behind RoutingProvider.
ROUTING_PROVIDER = os.getenv("ROUTING_PROVIDER", "local")
ROUTE_MAX_SEARCH_KM = float(os.getenv("ROUTE_MAX_SEARCH_KM", "120"))
ROUTE_SNAP_M = float(os.getenv("ROUTE_SNAP_M", "250"))
ROUTE_SNAP_FALLBACK_M = float(os.getenv("ROUTE_SNAP_FALLBACK_M", "6000"))
EVACUATION_CACHE_TTL_MIN = int(os.getenv("EVACUATION_CACHE_TTL_MIN", "60"))
EVACUATION_WALK_SPEED_KMH = float(os.getenv("EVACUATION_WALK_SPEED_KMH", "4.0"))
MAX_CANDIDATE_ROUTES = int(os.getenv("MAX_CANDIDATE_ROUTES", "3"))

# -------------------- Map Provider --------------------
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Per-hazard weight profile. Inf values represent impassable / closed.
RISK_WEIGHTS = {
    "slope_flat": 1.0,
    "slope_moderate": 1.3,
    "slope_steep": 1.8,
    "bridge_crossing": 1.5,
    "landslide_high": 5.0,
    "flood_moderate": 6.0,
    "wildfire_proximity": 4.0,
    "earthquake_impact": 6.0,
    "habitation_proximity": 1.5,
    "road_damage_report": 2.0,
    "restricted_condition": 2.5,
    "critical_exit": 4.0,
}
