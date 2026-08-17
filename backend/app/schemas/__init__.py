from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime

class LaneStateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lane_id: str
    vehicles: int = 0
    ambulances: int = 0
    pedestrians: int = 0
    anomalies: int = 0
    signal: str = "red"
    duration: int = 0
    density: float = 0.0
    mode: str = "normal"
    rtsp_status: str = "connecting"  # live, reconnecting, fallback

class ProcessedFrameSchema(BaseModel):
    lane_id: str
    frame: str  # base64 encoded
    vehicles: int
    ambulances: int
    pedestrians: int
    anomalies: int
    boxes: List[Dict[str, Any]]
    signal: str
    duration: int
    density: float
    rtsp_status: str

class VipOverrideRequest(BaseModel):
    lane_id: str
    duration: int = 300  # seconds

class TrafficSummaryResponse(BaseModel):
    timestamp: str
    total_vehicles: int
    total_ambulances: int
    total_pedestrians: int
    avg_density: float
    active_green_lane: Optional[str]
    green_wave_active: bool = False
    system_mode: str = "normal"
    lanes: Dict[str, LaneStateSchema]

class UserLoginSchema(BaseModel):
    username: str
    password: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class PeakHourAnalyticsSchema(BaseModel):
    hour: int
    avg_vehicles: float
    max_density: float

class AnomalyEventSchema(BaseModel):
    id: str
    lane_id: str
    event_type: str
    triggered_at: datetime
    metadata: Optional[Dict[str, Any]] = None
