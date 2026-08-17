from sqlalchemy import Column, String, DateTime, Integer, Float, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Intersection(Base):
    __tablename__ = "intersections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    green_wave_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Lane(Base):
    __tablename__ = "lanes"

    id = Column(String, primary_key=True, index=True)  # e.g., lane1, lane2, lane3, lane4
    name = Column(String, nullable=False)
    intersection_id = Column(String, ForeignKey("intersections.id"), nullable=True)
    rtsp_url = Column(String, nullable=True)
    backup_video_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SignalState(Base):
    __tablename__ = "signal_states"

    lane_id = Column(String, ForeignKey("lanes.id"), primary_key=True)
    current_color = Column(String, default="red")  # red, yellow, green
    duration_seconds = Column(Integer, default=0)
    mode = Column(String, default="normal")  # normal, emergency, vip, green_wave
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class VehicleLog(Base):
    __tablename__ = "vehicle_logs"

    # Composite primary key for TimescaleDB hypertable
    time = Column(DateTime(timezone=True), primary_key=True, server_default=func.now(), index=True)
    lane_id = Column(String, primary_key=True, index=True)
    vehicle_count = Column(Integer, default=0)
    ambulance_detected = Column(Boolean, default=False)
    pedestrian_count = Column(Integer, default=0)
    anomaly_detected = Column(Boolean, default=False)
    vehicle_types = Column(JSON, nullable=True)  # {"car": 5, "bus": 1, "truck": 0, "motorcycle": 2}
    density_percentage = Column(Float, default=0.0)

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    lane_id = Column(String, ForeignKey("lanes.id"), index=True)
    event_type = Column(String, nullable=False)  # ambulance_override, vip_override, anomaly_detected, green_wave_sync
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    metadata_info = Column(JSON, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="operator")  # admin, operator, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
