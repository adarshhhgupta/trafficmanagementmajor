import numpy as np
from app.services.ambulance_detector import detect_ambulance_hsv

def test_detect_ambulance_hsv_empty():
    roi = np.array([])
    assert detect_ambulance_hsv(roi) is False

def test_detect_ambulance_hsv_blue_siren():
    # Synthetic blue ROI image
    roi = np.zeros((50, 50, 3), dtype=np.uint8)
    roi[:, :] = (255, 0, 0)  # BGR blue
    assert detect_ambulance_hsv(roi) is True
