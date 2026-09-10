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
