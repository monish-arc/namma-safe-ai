"""
SQLAlchemy ORM Models for NammaSafe AI (PostgreSQL / PostGIS Compatible)
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="normal_citizen", nullable=False)
    full_name = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    field_reports = relationship("FieldReport", back_populates="officer")


class Habitation(Base):
    __tablename__ = "habitations"

    id = Column(String, primary_key=True, index=True)
    village_code = Column(String, unique=True, index=True, nullable=False)
    village_name = Column(String, nullable=False)
    district = Column(String, default="Chamoli", nullable=False)
    state = Column(String, default="Uttarakhand", nullable=False)
    population = Column(Integer, nullable=False)
    households = Column(Integer, nullable=False)
    children_count = Column(Integer, default=0)
    elderly_count = Column(Integer, default=0)
    hospital_distance_km = Column(Float, nullable=False)
    road_access_score = Column(Float, default=50.0) # 0-100
    vulnerability_score = Column(Float, default=50.0) # 0-100
    hazard_score = Column(Float, default=50.0) # 0-100
    priority_score = Column(Float, default=50.0) # 0-100
    priority_level = Column(String, default="Medium-Term Relocation")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # GeoJSON or WKT location representation
    location_geojson = Column(JSON, nullable=True)
    landslide_risk = Column(Float, default=50.0)
    flood_risk = Column(Float, default=50.0)
    extreme_rainfall_risk = Column(Float, default=50.0)
    past_disaster_frequency = Column(Float, default=50.0)
    disaster_history_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    hazard_events = relationship("HazardEvent", back_populates="habitation")
    recommendations = relationship("RelocationRecommendation", back_populates="habitation")
    field_reports = relationship("FieldReport", back_populates="habitation")


class HazardEvent(Base):
    __tablename__ = "hazard_events"

    id = Column(String, primary_key=True, index=True)
    habitation_id = Column(String, ForeignKey("habitations.id"), nullable=False)
    hazard_type = Column(String, nullable=False) # Landslide, Flash Flood, Subsidence, etc.
    event_date = Column(String, nullable=False)
    intensity = Column(String, nullable=False)
    severity_level = Column(String, default="High")
    affected_people = Column(Integer, default=0)
    houses_damaged = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    source_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    habitation = relationship("Habitation", back_populates="hazard_events")


class RedZone(Base):
    __tablename__ = "red_zones"

    id = Column(String, primary_key=True, index=True)
    zone_name = Column(String, nullable=False)
    hazard_type = Column(String, nullable=False)
    risk_level = Column(String, default="Critical") # Critical, High, Medium, Low
    hazard_score = Column(Float, default=85.0)
    zone_geometry = Column(JSON, nullable=False) # MultiPolygon GeoJSON
    data_source = Column(String, default="Bhuvan ISRO / State Disaster Management")
    last_updated = Column(String, nullable=False)


class RelocationSite(Base):
    __tablename__ = "relocation_sites"

    id = Column(String, primary_key=True, index=True)
    site_name = Column(String, nullable=False)
    district = Column(String, default="Chamoli", nullable=False)
    land_area_acres = Column(Float, nullable=False)
    estimated_capacity = Column(Integer, nullable=False) # in families
    current_occupancy_families = Column(Integer, default=0)
    water_score = Column(Float, default=80.0)
    road_score = Column(Float, default=80.0)
    school_score = Column(Float, default=80.0)
    hospital_score = Column(Float, default=80.0)
    low_hazard_score = Column(Float, default=90.0)
    flat_land_score = Column(Float, default=85.0)
    suitability_score = Column(Float, default=85.0)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_geojson = Column(JSON, nullable=True)
    # Carrying capacity dimensions (families)
    land_capacity_families = Column(Integer, default=500)
    water_capacity_families = Column(Integer, default=500)
    school_capacity_families = Column(Integer, default=400)
    health_capacity_families = Column(Integer, default=450)
    road_capacity_families = Column(Integer, default=600)
    final_capacity_families = Column(Integer, default=400) # min of factors
    available_capacity_families = Column(Integer, default=400)

    recommendations = relationship("RelocationRecommendation", back_populates="relocation_site")


class RelocationRecommendation(Base):
    __tablename__ = "relocation_recommendations"

    id = Column(String, primary_key=True, index=True)
    habitation_id = Column(String, ForeignKey("habitations.id"), nullable=False)
    relocation_site_id = Column(String, ForeignKey("relocation_sites.id"), nullable=False)
    hazard_score = Column(Float, nullable=False)
    vulnerability_score = Column(Float, nullable=False)
    disaster_history_score = Column(Float, nullable=False)
    final_priority_score = Column(Float, nullable=False)
    priority_level = Column(String, nullable=False)
    recommended_families = Column(Integer, default=100)
    risk_reduction_percent = Column(Float, default=80.0)
    explanation = Column(Text, nullable=False)
    status = Column(String, default="Draft") # Draft, Approved, Under Review, In Progress, Completed
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    habitation = relationship("Habitation", back_populates="recommendations")
    relocation_site = relationship("RelocationSite", back_populates="recommendations")


class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(String, primary_key=True, index=True)
    habitation_id = Column(String, ForeignKey("habitations.id"), nullable=False)
    officer_id = Column(String, ForeignKey("users.id"), nullable=False)
    report_type = Column(String, nullable=False) # Crack Formation, Landslide, Flash Flood, etc.
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    reported_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    verified = Column(Boolean, default=False)
    severity = Column(String, default="High")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    habitation = relationship("Habitation", back_populates="field_reports")
    officer = relationship("User", back_populates="field_reports")
