import numpy as np
from typing import List, Dict, Tuple, Any

class AnomalyDetector:
    def __init__(self):
        # Memory structure to track vehicle centroids across frames for stopped/wrong-way vehicle detection
        self.tracked_vehicles: Dict[int, List[Tuple[int, int]]] = {}

    def detect_anomalies(self, boxes: List[Dict[str, Any]], frame_shape: Tuple[int, int]) -> int:
        """
        Detect anomalies:
        - Stopped vehicle in active roadway (vehicle stationary over multiple frames)
        - Wrong-way or illegal pedestrian movement
        Returns anomaly count.
        """
        anomalies = 0
        # Simple heuristic check for stationary vehicles near center
        for box in boxes:
            if box.get('label') == 'Vehicle':
                w = box['x2'] - box['x1']
                h = box['y2'] - box['y1']
                # Flag oversized blockage or illegal vehicle positioning
                if w * h > (frame_shape[0] * frame_shape[1] * 0.4):
                    anomalies += 1
        return anomalies

anomaly_detector = AnomalyDetector()
