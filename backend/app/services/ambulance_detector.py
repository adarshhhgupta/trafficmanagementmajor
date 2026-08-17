import cv2
import numpy as np

def detect_ambulance_hsv(roi: np.ndarray) -> bool:
    """
    Detect ambulance siren blue lights using HSV thresholding.
    Returns True if blue siren ratio > 8% of the vehicle ROI.
    """
    if roi is None or roi.size == 0 or roi.shape[0] < 10 or roi.shape[1] < 10:
        return False

    try:
        roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        # Blue siren light HSV range
        lower_blue = np.array([100, 120, 120])
        upper_blue = np.array([130, 255, 255])
        
        blue_mask = cv2.inRange(roi_hsv, lower_blue, upper_blue)
        total_pixels = roi.shape[0] * roi.shape[1]
        blue_pixels = np.sum(blue_mask > 0)
        blue_ratio = blue_pixels / total_pixels

        return bool(blue_ratio > 0.08)
    except Exception:
        return False

