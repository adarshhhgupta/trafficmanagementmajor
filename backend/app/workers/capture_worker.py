import asyncio
import cv2
import base64
import numpy as np
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from app.services.signal_controller import signal_controller
from app.workers.inference_worker import process_frame_inference
from app.core.websocket import ws_manager
from app.services.alert_service import alert_service
from app.services.video_source_service import video_source_service

logger = logging.getLogger(__name__)


class RTSPCaptureWorker:
    def __init__(self, lane_id: str, rtsp_url: str):
        self.lane_id = lane_id
        self.rtsp_url = rtsp_url
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.status = "recorded_live"

    async def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

    async def _run_loop(self):
        logger.info(f"Starting Recorded Video traffic detection worker for {self.lane_id}")
        lane_num = int(self.lane_id.replace('lane', '')) if 'lane' in self.lane_id and self.lane_id.replace('lane', '').isdigit() else 1

        while self.is_running:
            video_path = video_source_service.get_current_video_path()
            video_source = str(video_path) if video_path else self.rtsp_url

            cap = await asyncio.to_thread(cv2.VideoCapture, video_source)
            if not cap.isOpened():
                logger.warning(f"Could not open video source '{video_source}' for {self.lane_id}, retrying in 2s...")
                await asyncio.sleep(2.0)
                continue

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 360
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)

            # Stagger starting frame per lane across video duration
            stagger_interval = max(1, total_frames // 4)
            start_frame = ((lane_num - 1) * stagger_interval) % total_frames

            await asyncio.to_thread(cap.set, cv2.CAP_PROP_POS_FRAMES, start_frame)

            while self.is_running and cap.isOpened():
                current_pos = await asyncio.to_thread(cap.get, cv2.CAP_PROP_POS_FRAMES)
                # Loop video when reaching end
                if current_pos >= (total_frames - 2):
                    await asyncio.to_thread(cap.set, cv2.CAP_PROP_POS_FRAMES, start_frame)

                ret, frame = await asyncio.to_thread(cap.read)
                if not ret or frame is None:
                    # Reset to start position
                    await asyncio.to_thread(cap.set, cv2.CAP_PROP_POS_FRAMES, start_frame)
                    ret, frame = await asyncio.to_thread(cap.read)
                    if not ret or frame is None:
                        break

                await self._process_and_broadcast(frame, video_path)
                await asyncio.sleep(0.35)  # ~2.8 FPS responsive CCTV AI detection stream

            await asyncio.to_thread(cap.release)
            await asyncio.sleep(0.5)

    async def _process_and_broadcast(self, frame: np.ndarray, video_path: Optional[Path]):
        # Run YOLOv8 Object Detection + HSV Siren Priority + Anomaly Detection
        vehicles, ambulances, pedestrians, anomalies, boxes, density = process_frame_inference(frame)

        # Draw YOLO AI Bounding Boxes with Labels & Confidence
        for box in boxes:
            lbl = box['label']
            color = (0, 0, 255) if lbl == 'Ambulance' else ((255, 100, 0) if lbl == 'Pedestrian' else (0, 255, 0))
            cv2.rectangle(frame, (box['x1'], box['y1']), (box['x2'], box['y2']), color, 2)
            cv2.putText(
                frame,
                f"{lbl} {box['confidence']:.2f}",
                (box['x1'], max(18, box['y1'] - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                2
            )

        # Add CCTV Camera OSD (On-Screen Display) Overlays
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        lane_num = self.lane_id.replace('lane', '')
        video_filename = video_path.name if video_path else "CCTV RECORDING"

        # OSD Header: CAM ID, RECORDED VIDEO SOURCE, & TIMESTAMP
        cv2.putText(
            frame,
            f"CCTV CAM-0{lane_num} [RECORDED FOOTAGE: {video_filename}]",
            (15, 28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 255),
            2
        )
        cv2.putText(
            frame,
            f"YOLOv8 AI DETECT | {now_str} | DENSITY: {density:.1f}%",
            (15, 52),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (255, 255, 255),
            1
        )

        # Update global traffic state
        signal_controller.traffic_state[self.lane_id]['vehicles'] = vehicles
        signal_controller.traffic_state[self.lane_id]['ambulances'] = ambulances
        signal_controller.traffic_state[self.lane_id]['pedestrians'] = pedestrians
        signal_controller.traffic_state[self.lane_id]['anomalies'] = anomalies
        signal_controller.traffic_state[self.lane_id]['density'] = density
        signal_controller.traffic_state[self.lane_id]['rtsp_status'] = "recorded_live"

        if ambulances > 0:
            alert_service.trigger_ambulance_alert(self.lane_id, ambulances)

        signal_controller.update_signals()

        # Encode annotated frame to Base64 JPEG
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
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
            "rtsp_status": "recorded_live",
            "source_type": "recorded_video",
            "video_name": video_filename
        }
        await ws_manager.broadcast(payload)
