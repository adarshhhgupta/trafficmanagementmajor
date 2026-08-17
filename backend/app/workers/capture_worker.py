import asyncio
import cv2
import base64
import numpy as np
import logging
from typing import Optional
from app.services.signal_controller import signal_controller
from app.workers.inference_worker import process_frame_inference
from app.core.websocket import ws_manager
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)

def generate_fallback_demo_frame(lane_id: str, tick: int) -> np.ndarray:
    """Generates a rich, synthetic traffic video stream for live UI demo processing."""
    height, width = 360, 640
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Asphalt road
    frame[:] = (40, 45, 50)
    cv2.rectangle(frame, (80, 0), (560, 360), (65, 70, 75), -1)
    
    # Lane divider dashes
    for y in range(0, 360, 40):
        cv2.line(frame, (320, y), (320, y + 20), (255, 255, 255), 2)
        cv2.line(frame, (200, y), (200, y + 20), (255, 255, 255), 1)
        cv2.line(frame, (440, y), (440, y + 20), (255, 255, 255), 1)

    # Simulated moving vehicles
    lane_num = int(lane_id.replace('lane', ''))
    speed = 10 + (lane_num * 3)
    y1 = (tick * speed) % 300 + 20
    
    # Draw simulated vehicle 1 (Car)
    cv2.rectangle(frame, (120, y1), (180, y1 + 50), (50, 180, 255), -1)
    cv2.putText(frame, "CAR", (130, y1 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Draw simulated vehicle 2 (Truck/Bus)
    y2 = ((tick * speed) + 140) % 300 + 20
    cv2.rectangle(frame, (350, y2), (430, y2 + 70), (0, 200, 100), -1)
    cv2.putText(frame, "BUS", (360, y2 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Occasional Ambulance on Lane 1
    if lane_id == 'lane1' and (tick // 15) % 4 == 0:
        y_amb = (tick * 15) % 280 + 30
        cv2.rectangle(frame, (230, y_amb), (300, y_amb + 60), (0, 0, 255), -1)
        # Blue siren light animation
        siren_color = (255, 0, 0) if (tick % 2 == 0) else (0, 0, 255)
        cv2.circle(frame, (265, y_amb + 10), 8, siren_color, -1)
        cv2.putText(frame, "AMBULANCE", (232, y_amb + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)

    # Crosswalk & Pedestrian
    cv2.rectangle(frame, (80, 160), (560, 190), (200, 200, 200), 1)
    if (tick // 10) % 3 == 0:
        cv2.circle(frame, (500, 175), 6, (180, 100, 255), -1)
        cv2.putText(frame, "PED", (490, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)

    # Overlay Lane Title
    cv2.putText(frame, f"URBAN PULSE STREAM — {lane_id.upper()}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 255, 240), 2)
    return frame

class RTSPCaptureWorker:
    def __init__(self, lane_id: str, rtsp_url: str):
        self.lane_id = lane_id
        self.rtsp_url = rtsp_url
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.status = "fallback"

    async def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()

    async def _run_loop(self):
        logger.info(f"Starting capture worker for {self.lane_id}")
        tick = 0

        while self.is_running:
            tick += 1
            # Instantly generate live synthetic traffic video stream
            frame = generate_fallback_demo_frame(self.lane_id, tick)
            self.status = "fallback"
            await self._process_and_broadcast(frame)
            await asyncio.sleep(0.5)  # 2 FPS stream update for fast UI responsiveness

    async def _process_and_broadcast(self, frame: np.ndarray):
        vehicles, ambulances, pedestrians, anomalies, boxes, density = process_frame_inference(frame)

        for box in boxes:
            lbl = box['label']
            color = (0, 0, 255) if lbl == 'Ambulance' else ((255, 100, 0) if lbl == 'Pedestrian' else (0, 255, 0))
            cv2.rectangle(frame, (box['x1'], box['y1']), (box['x2'], box['y2']), color, 2)
            cv2.putText(frame, f"{lbl} {box['confidence']:.2f}",
                       (box['x1'], max(15, box['y1'] - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        signal_controller.traffic_state[self.lane_id]['vehicles'] = vehicles
        signal_controller.traffic_state[self.lane_id]['ambulances'] = ambulances
        signal_controller.traffic_state[self.lane_id]['pedestrians'] = pedestrians
        signal_controller.traffic_state[self.lane_id]['anomalies'] = anomalies
        signal_controller.traffic_state[self.lane_id]['density'] = density
        signal_controller.traffic_state[self.lane_id]['rtsp_status'] = self.status

        if ambulances > 0:
            alert_service.trigger_ambulance_alert(self.lane_id, ambulances)

        signal_controller.update_signals()

        _, buffer = cv2.imencode('.jpg', frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        payload = {
            "type": "frame_update",
            "lane_id": self.lane_id,
            "frame": frame_base64,
            "vehicles": vehicles,
            "ambulances": ambulances,
            "pedestrians": pedestrians,
            "anomalies": anomalies,
            "boxes": boxes,
            "density": density,
            "signal": signal_controller.traffic_state[self.lane_id]['signal'],
            "duration": signal_controller.traffic_state[self.lane_id]['duration'],
            "mode": signal_controller.traffic_state[self.lane_id]['mode'],
            "rtsp_status": self.status
        }
        await ws_manager.broadcast(payload)
