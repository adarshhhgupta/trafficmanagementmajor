from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import asyncio
from contextlib import asynccontextmanager
from collections import defaultdict
import io
import uvicorn

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Lifespan handler to manage startup and shutdown (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize YOLO model (may be slow)
    try:
        get_yolo_model()
    except Exception:
        pass
    yield
    # Shutdown: close MongoDB client
    try:
        client.close()
    except Exception:
        pass

# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize YOLO model
model = None

def get_yolo_model():
    global model
    if model is None:
        import torch
        # Monkey-patch torch.load to use weights_only=False for YOLO model loading
        original_torch_load = torch.load
        def patched_torch_load(f, *args, **kwargs):
            kwargs.setdefault('weights_only', False)
            return original_torch_load(f, *args, **kwargs)
        torch.load = patched_torch_load
        
        try:
            model = YOLO('yolov8n.pt')  # Using nano model for speed
        finally:
            torch.load = original_torch_load
    return model

# Traffic light state management
traffic_state = {
    'lane1': {'vehicles': 0, 'ambulances': 0, 'signal': 'red', 'duration': 0, 'density': 0},
    'lane2': {'vehicles': 0, 'ambulances': 0, 'signal': 'red', 'duration': 0, 'density': 0},
    'lane3': {'vehicles': 0, 'ambulances': 0, 'signal': 'red', 'duration': 0, 'density': 0},
    'lane4': {'vehicles': 0, 'ambulances': 0, 'signal': 'red', 'duration': 0, 'density': 0}
}

current_green_lane = None
green_start_time = None

# VIP mode - manual control
vip_mode = False
vip_override_lane = None
vip_override_start = None

# Store uploaded videos
uploaded_videos = {}
system_generation = 0

# Define Models
class LaneStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lane_id: str
    vehicles: int
    ambulances: int
    signal: str
    duration: int
    density: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProcessedFrame(BaseModel):
    lane_id: str
    frame: str  # base64 encoded
    vehicles: int
    ambulances: int
    boxes: List[Dict]

# YOLO vehicle classes
VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck
AMBULANCE_LABEL = "ambulance"
MIN_BOX_AREA = 400


def detect_vehicles(frame):
    """Detect vehicles and ambulances in frame with IMPROVED detection"""
    if frame is None:
        return 0, 0, []

    model = get_yolo_model()
    results = model.predict(frame, conf=0.4, iou=0.5, imgsz=512, max_det=20, verbose=False)

    vehicles = 0
    ambulances = 0
    boxes = []

    for result in results:
        for box in result.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            if cls in VEHICLE_CLASSES:
                vehicles += 1
                xyxy = box.xyxy[0].cpu().numpy()

                x1, y1, x2, y2 = map(int, xyxy)

                # Ensure coordinates are within frame bounds
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)

                if (x2 - x1) * (y2 - y1) < MIN_BOX_AREA:
                    continue

                roi = frame[y1:y2, x1:x2]

                is_ambulance = False
                if roi.size > 0 and roi.shape[0] > 10 and roi.shape[1] > 10:
                    roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

                    # Blue siren light detection only.
                    lower_blue = np.array([100, 120, 120])
                    upper_blue = np.array([130, 255, 255])
                    blue_mask = cv2.inRange(roi_hsv, lower_blue, upper_blue)
                    blue_ratio = np.sum(blue_mask > 0) / (roi.shape[0] * roi.shape[1])

                    if blue_ratio > 0.08:
                        is_ambulance = True

                if is_ambulance:
                    ambulances += 1
                    label = "Ambulance"
                else:
                    label = "Vehicle"

                boxes.append({
                    'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                    'confidence': conf,
                    'label': label
                })

    return vehicles, ambulances, boxes


def calculate_green_duration(vehicles, ambulances):
    """Calculate green light duration based on density"""
    if ambulances > 0:
        return 60  # 60 seconds for ambulance

    base_duration = 10
    max_duration = 40

    if vehicles == 0:
        return base_duration

    duration = base_duration + (vehicles / 20) * (max_duration - base_duration)
    return min(int(duration), max_duration)


def update_traffic_signals():
    """Update traffic signals based on current state"""
    global current_green_lane, green_start_time, vip_mode, vip_override_lane, vip_override_start

    # Check VIP mode override
    if vip_mode and vip_override_lane:
        current_time = datetime.now(timezone.utc)
        if vip_override_start:
            elapsed = (current_time - vip_override_start).total_seconds()
            if elapsed > 300:  # 5 minutes max for VIP override
                vip_mode = False
                vip_override_lane = None
                vip_override_start = None
            else:
                # Keep VIP lane green, others red
                for lane in traffic_state:
                    if lane == vip_override_lane:
                        traffic_state[lane]['signal'] = 'green'
                        traffic_state[lane]['duration'] = 300 - int(elapsed)
                    else:
                        traffic_state[lane]['signal'] = 'red'
                        traffic_state[lane]['duration'] = 0
                return

    ambulance_lanes = [lane for lane, state in traffic_state.items() if state['ambulances'] > 0]

    if ambulance_lanes:
        priority_lane = ambulance_lanes[0]
        if current_green_lane != priority_lane:
            if current_green_lane:
                traffic_state[current_green_lane]['signal'] = 'red'
                traffic_state[current_green_lane]['duration'] = 0

            current_green_lane = priority_lane
            traffic_state[priority_lane]['signal'] = 'green'
            traffic_state[priority_lane]['duration'] = calculate_green_duration(
                traffic_state[priority_lane]['vehicles'],
                traffic_state[priority_lane]['ambulances']
            )
            green_start_time = datetime.now(timezone.utc)
    else:
        current_time = datetime.now(timezone.utc)

        if current_green_lane and green_start_time:
            elapsed = (current_time - green_start_time).total_seconds()
            remaining = traffic_state[current_green_lane]['duration'] - int(elapsed)

            if remaining <= 0:
                traffic_state[current_green_lane]['signal'] = 'red'
                traffic_state[current_green_lane]['duration'] = 0

                lanes_by_density = sorted(
                    traffic_state.items(),
                    key=lambda x: x[1]['vehicles'],
                    reverse=True
                )

                next_lane = lanes_by_density[0][0]
                current_green_lane = next_lane
                traffic_state[next_lane]['signal'] = 'green'
                traffic_state[next_lane]['duration'] = calculate_green_duration(
                    traffic_state[next_lane]['vehicles'],
                    traffic_state[next_lane]['ambulances']
                )
                green_start_time = current_time
            else:
                traffic_state[current_green_lane]['duration'] = remaining
        else:
            lanes_by_density = sorted(
                traffic_state.items(),
                key=lambda x: x[1]['vehicles'],
                reverse=True
            )
            first_lane = lanes_by_density[0][0]
            current_green_lane = first_lane
            traffic_state[first_lane]['signal'] = 'green'
            traffic_state[first_lane]['duration'] = calculate_green_duration(
                traffic_state[first_lane]['vehicles'],
                traffic_state[first_lane]['ambulances']
            )
            green_start_time = current_time


@api_router.get("/")
async def root():
    return {"message": "Traffic Management System API"}


@api_router.post("/upload-video/{lane_id}")
async def upload_video(lane_id: str, file: UploadFile = File(...)):
    """Upload video for a specific lane"""
    if lane_id not in traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    video_bytes = await file.read()
    uploaded_videos[lane_id] = video_bytes

    return {
        "message": f"Video uploaded for {lane_id}",
        "filename": file.filename,
        "size": len(video_bytes)
    }


@api_router.post("/process-frame/{lane_id}")
async def process_frame(lane_id: str, file: UploadFile = File(...), generation: int = 0):
    """Process a single frame from video"""
    if lane_id not in traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    if generation != system_generation:
        return {
            "lane_id": lane_id,
            "frame": "",
            "vehicles": 0,
            "ambulances": 0,
            "boxes": [],
            "signal": "red",
            "duration": 0,
            "density": 0,
            "generation": system_generation,
        }

    frame_bytes = await file.read()
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image format - could not decode frame")

    vehicles, ambulances, boxes = detect_vehicles(frame)

    traffic_state[lane_id]['vehicles'] = vehicles
    traffic_state[lane_id]['ambulances'] = ambulances
    total_pixels = frame.shape[0] * frame.shape[1]
    occupied_pixels = sum((box['x2'] - box['x1']) * (box['y2'] - box['y1']) for box in boxes)
    traffic_state[lane_id]['density'] = (occupied_pixels / total_pixels) * 100 if total_pixels > 0 else 0

    for box in boxes:
        color = (0, 0, 255) if box['label'] == 'Ambulance' else (0, 255, 0)
        cv2.rectangle(frame, (box['x1'], box['y1']), (box['x2'], box['y2']), color, 2)
        cv2.putText(frame, f"{box['label']} {box['confidence']:.2f}",
                   (box['x1'], box['y1'] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    update_traffic_signals()

    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "lane_id": lane_id,
        "frame": frame_base64,
        "vehicles": vehicles,
        "ambulances": ambulances,
        "boxes": boxes,
        "signal": traffic_state[lane_id]['signal'],
        "duration": traffic_state[lane_id]['duration'],
        "density": round(traffic_state[lane_id]['density'], 2)
    }


@api_router.get("/traffic-state")
async def get_traffic_state():
    """Get current traffic state for all lanes"""
    return traffic_state


@api_router.get("/lane-status/{lane_id}")
async def get_lane_status(lane_id: str):
    """Get status for a specific lane"""
    if lane_id not in traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    return traffic_state[lane_id]


@api_router.post("/reset")
async def reset_system():
    """Reset the entire system"""
    global current_green_lane, green_start_time, vip_mode, vip_override_lane, vip_override_start, system_generation

    for lane in traffic_state:
        traffic_state[lane] = {
            'vehicles': 0,
            'ambulances': 0,
            'signal': 'red',
            'duration': 0,
            'density': 0
        }

    current_green_lane = None
    green_start_time = None
    vip_mode = False
    vip_override_lane = None
    vip_override_start = None
    uploaded_videos.clear()
    system_generation += 1

    return {"message": "System reset successfully", "generation": system_generation}


@api_router.post("/vip-mode")
async def set_vip_mode(lane_id: str, duration: int = 300):
    """Set VIP mode for manual traffic control"""
    global vip_mode, vip_override_lane, vip_override_start, current_green_lane, green_start_time

    if lane_id not in traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    # Reset all signals to red first
    for lane in traffic_state:
        traffic_state[lane]['signal'] = 'red'
        traffic_state[lane]['duration'] = 0

    # Set VIP lane to green
    vip_mode = True
    vip_override_lane = lane_id
    vip_override_start = datetime.now(timezone.utc)
    current_green_lane = lane_id
    green_start_time = vip_override_start

    traffic_state[lane_id]['signal'] = 'green'
    traffic_state[lane_id]['duration'] = duration

    return {
        "message": f"VIP mode activated for {lane_id}",
        "lane_id": lane_id,
        "duration": duration,
        "mode": "vip"
    }


@api_router.post("/vip-mode/disable")
async def disable_vip_mode():
    """Disable VIP mode and return to automatic control"""
    global vip_mode, vip_override_lane, vip_override_start

    vip_mode = False
    vip_override_lane = None
    vip_override_start = None

    return {"message": "VIP mode disabled", "mode": "auto"}


@api_router.get("/vip-status")
async def get_vip_status():
    """Get current VIP mode status"""
    return {
        "vip_mode": vip_mode,
        "vip_override_lane": vip_override_lane,
        "remaining_time": 0 if not vip_mode or not vip_override_start else max(0, 300 - int((datetime.now(timezone.utc) - vip_override_start).total_seconds()))
    }


@api_router.get("/analytics")
async def get_analytics():
    """Get analytics data for graphs"""
    total_vehicles = sum(lane['vehicles'] for lane in traffic_state.values())
    total_ambulances = sum(lane['ambulances'] for lane in traffic_state.values())
    avg_density = sum(lane['density'] for lane in traffic_state.values()) / 4

    # Lane-wise breakdown
    lane_analytics = []
    for lane_id, lane in traffic_state.items():
        lane_analytics.append({
            "lane_id": lane_id,
            "lane_number": lane_id.replace('lane', ''),
            "vehicles": lane['vehicles'],
            "ambulances": lane['ambulances'],
            "density": lane['density'],
            "signal": lane['signal'],
            "duration": lane['duration']
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_vehicles": total_vehicles,
            "total_ambulances": total_ambulances,
            "avg_density": round(avg_density, 2),
            "green_lane": current_green_lane,
            "mode": "vip" if vip_mode else "auto"
        },
        "lanes": lane_analytics
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)




if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
        reload=os.environ.get("RELOAD", "false").lower() == "true",
    )
