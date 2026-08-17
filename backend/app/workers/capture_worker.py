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
    """Generates a synthetic fallback traffic frame when RTSP stream is unavailable."""
    height, width = 360, 640
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Dark asphalt background
    frame[:] = (35, 40, 45)

    # Road lanes
    cv2.rectangle(frame, (100, 0), (540, 360), (60, 65, 70), -1)
    cv2.line(frame, (320, 0), (320, 360), (255, 255, 255), 2)

    # Moving vehicle indicator
    x_pos = (tick * 15) % (width - 100) + 50
    y_pos = 180
    cv2.rectangle(frame, (x_pos, y_pos), (x_pos + 60, y_pos + 30), (0, 200, 255), -1)
    cv2.putText(frame, "SIMULATED TRAFFIC", (x_pos, y_pos - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Lane Overlay Text
    cv2.putText(frame, f"LANE: {lane_id.upper()} (FALLBACK DEMO MODE)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    return frame

class RTSPCaptureWorker:
    def __init__(self, lane_id: str, rtsp_url: str):
        self.lane_id = lane_id
        self.rtsp_url = rtsp_url
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.status = "connecting"  # live, reconnecting, fallback

    async def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()

    async def _run_loop(self):
        logger.info(f"Starting RTSP capture worker for {self.lane_id} -> {self.rtsp_url}")
        retry_count = 0
        tick = 0

        while self.is_running:
            tick += 1
            cap = cv2.VideoCapture(self.rtsp_url)
            
            if not cap.isOpened():
                retry_count += 1
                logger.warning(f"RTSP stream connection failed for {self.lane_id}. Attempt {retry_count}")
                self.status = "fallback" if retry_count >= 3 else "reconnecting"

                # Fallback to simulated/pre-recorded frame
                frame = generate_fallback_demo_frame(self.lane_id, tick)
                await self._process_and_broadcast(frame)
                cap.release()
                await asyncio.sleep(1.0)
                continue

            retry_count = 0
            self.status = "live"
            logger.info(f"RTSP stream connected for {self.lane_id}")

            while self.is_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"Frame read failure on RTSP {self.lane_id}. Triggering watchdog reconnect.")
                    break

                await self._process_and_broadcast(frame)
                await asyncio.sleep(1.0)  # Throttled to 1 fps for eco inference

            cap.release()
            await asyncio.sleep(2.0)

    async def _process_and_broadcast(self, frame: np.ndarray):
        vehicles, ambulances, pedestrians, anomalies, boxes, density = process_frame_inference(frame)

        # Draw bounding boxes
        for box in boxes:
            lbl = box['label']
            color = (0, 0, 255) if lbl == 'Ambulance' else ((255, 100, 0) if lbl == 'Pedestrian' else (0, 255, 0))
            cv2.rectangle(frame, (box['x1'], box['y1']), (box['x2'], box['y2']), color, 2)
            cv2.putText(frame, f"{lbl} {box['confidence']:.2f}",
                       (box['x1'], max(15, box['y1'] - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Update global state
        signal_controller.traffic_state[self.lane_id]['vehicles'] = vehicles
        signal_controller.traffic_state[self.lane_id]['ambulances'] = ambulances
        signal_controller.traffic_state[self.lane_id]['pedestrians'] = pedestrians
        signal_controller.traffic_state[self.lane_id]['anomalies'] = anomalies
        signal_controller.traffic_state[self.lane_id]['density'] = density
        signal_controller.traffic_state[self.lane_id]['rtsp_status'] = self.status

        # Trigger Alerts if ambulance detected
        if ambulances > 0:
            alert_service.trigger_ambulance_alert(self.lane_id, ambulances)

        # Trigger signal timing update
        signal_controller.update_signals()

        # Encode frame to base64
        _, buffer = cv2.imencode('.jpg', frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        # Broadcast via WebSocket
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
