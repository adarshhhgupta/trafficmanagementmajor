import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

model = None

def get_yolo_model():
    global model
    if model is None:
        try:
            import torch
            from ultralytics import YOLO
            original_torch_load = torch.load
            def patched_torch_load(f, *args, **kwargs):
                kwargs.setdefault('weights_only', False)
                return original_torch_load(f, *args, **kwargs)
            torch.load = patched_torch_load
            try:
                model = YOLO('yolov8n.pt')
            finally:
                torch.load = original_torch_load
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            model = None
    return model

VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck
PEDESTRIAN_CLASSES = [0]        # person
MIN_BOX_AREA = 400

from app.services.ambulance_detector import detect_ambulance_hsv
from app.services.anomaly_detector import anomaly_detector

def process_frame_inference(frame: np.ndarray) -> Tuple[int, int, int, int, List[Dict[str, Any]], float]:
    """
    Runs YOLOv8 object detection + HSV siren analysis + Pedestrian/Anomaly detection.
    Returns (vehicles, ambulances, pedestrians, anomalies, boxes, density_percentage)
    """
    if frame is None:
        return 0, 0, 0, 0, [], 0.0

    yolo = get_yolo_model()
    vehicles = 0
    ambulances = 0
    pedestrians = 0
    boxes = []

    if yolo is not None:
        try:
            results = yolo.predict(frame, conf=0.35, iou=0.45, imgsz=512, max_det=20, verbose=False)
            for result in results:
                for box in result.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)

                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)

                    if (x2 - x1) * (y2 - y1) < MIN_BOX_AREA:
                        continue

                    if cls in VEHICLE_CLASSES:
                        vehicles += 1
                        roi = frame[y1:y2, x1:x2]
                        is_amb = detect_ambulance_hsv(roi)

                        if is_amb:
                            ambulances += 1
                            label = "Ambulance"
                        else:
                            label = "Vehicle"

                        boxes.append({
                            'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                            'confidence': conf,
                            'label': label
                        })

                    elif cls in PEDESTRIAN_CLASSES:
                        pedestrians += 1
                        boxes.append({
                            'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                            'confidence': conf,
                            'label': "Pedestrian"
                        })
        except Exception as e:
            logger.error(f"Error in YOLO inference: {e}")

    total_pixels = frame.shape[0] * frame.shape[1]
    occupied_pixels = sum((b['x2'] - b['x1']) * (b['y2'] - b['y1']) for b in boxes if b['label'] in ['Vehicle', 'Ambulance'])
    density = (occupied_pixels / total_pixels) * 100.0 if total_pixels > 0 else 0.0

    anomalies = anomaly_detector.detect_anomalies(boxes, frame.shape[:2])

    return vehicles, ambulances, pedestrians, anomalies, boxes, round(density, 2)
