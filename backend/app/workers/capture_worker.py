import asyncio
import cv2
import base64
import numpy as np
import logging
from pathlib import Path
from typing import Optional
from app.services.signal_controller import signal_controller
from app.workers.inference_worker import process_frame_inference
from app.core.websocket import ws_manager
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)

SAMPLE_VIDEO_PATH = Path(__file__).resolve().parent.parent.parent / "sample_traffic.mp4"

class RTSPCaptureWorker:
    def __init__(self, lane_id: str, rtsp_url: str):
        self.lane_id = lane_id
        self.rtsp_url = rtsp_url
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.status = "live"

    async def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()

    async def _run_loop(self):
        logger.info(f"Starting real traffic video capture worker for {self.lane_id}")
        lane_num = int(self.lane_id.replace('lane', ''))
        offset_frames = (lane_num - 1) * 30  # Stagger initial frame per lane for visual variety

        while self.is_running:
            video_source = str(SAMPLE_VIDEO_PATH) if SAMPLE_VIDEO_PATH.exists() else self.rtsp_url
            cap = await asyncio.to_thread(cv2.VideoCapture, video_source)

            if offset_frames > 0 and cap.isOpened():
                await asyncio.to_thread(cap.set, cv2.CAP_PROP_POS_FRAMES, offset_frames)

            while self.is_running and cap.isOpened():
                ret, frame = await asyncio.to_thread(cap.read)
                if not ret:
                    # Loop video seamlessly when it reaches the end
                    await asyncio.to_thread(cap.set, cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = await asyncio.to_thread(cap.read)
                    if not ret:
                        break

                await self._process_and_broadcast(frame)
                await asyncio.sleep(0.5)  # Smooth 2 FPS inference stream

            await asyncio.to_thread(cap.release)
            await asyncio.sleep(1.0)

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
        signal_controller.traffic_state[self.lane_id]['rtsp_status'] = "live"

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
            "rtsp_status": "live"
        }
        await ws_manager.broadcast(payload)
