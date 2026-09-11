import os
from pathlib import Path
from typing import Dict, Any, Optional
import cv2
import logging

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_VIDEO_PATH = BACKEND_DIR / "sample_traffic.mp4"
UPLOAD_DIR = BACKEND_DIR / "uploaded_videos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class VideoSourceService:
    def __init__(self):
        self.default_video_path: Path = DEFAULT_VIDEO_PATH
        self.current_video_path: Path = DEFAULT_VIDEO_PATH if DEFAULT_VIDEO_PATH.exists() else None
        self._cached_info: Optional[Dict[str, Any]] = None

    def get_current_video_path(self) -> Optional[Path]:
        if self.current_video_path and self.current_video_path.exists():
            return self.current_video_path
        if self.default_video_path.exists():
            self.current_video_path = self.default_video_path
            return self.current_video_path
        return None

    def get_video_info(self) -> Dict[str, Any]:
        video_path = self.get_current_video_path()
        if not video_path:
            return {
                "source_type": "none",
                "filename": None,
                "total_frames": 0,
                "fps": 0,
                "duration_seconds": 0,
                "width": 0,
                "height": 0,
                "is_default": False
            }

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {
                "source_type": "recorded_video",
                "filename": video_path.name,
                "total_frames": 0,
                "fps": 0,
                "duration_seconds": 0,
                "is_default": (video_path == self.default_video_path)
            }

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = round(float(cap.get(cv2.CAP_PROP_FPS) or 25.0), 1)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = round(total_frames / fps, 1) if fps > 0 else 0
        cap.release()

        return {
            "source_type": "recorded_video",
            "filename": video_path.name,
            "total_frames": total_frames,
            "fps": fps,
            "width": width,
            "height": height,
            "duration_seconds": duration,
            "is_default": (video_path == self.default_video_path)
        }

    def set_video_path(self, path: Path) -> bool:
        if path.exists():
            self.current_video_path = path
            self._cached_info = None
            logger.info(f"Active recorded video source set to: {path}")
            return True
        logger.error(f"Cannot set video source, path does not exist: {path}")
        return False

    def reset_to_default(self) -> bool:
        if self.default_video_path.exists():
            self.current_video_path = self.default_video_path
            self._cached_info = None
            logger.info(f"Reset recorded video source to default: {self.default_video_path}")
            return True
        return False


video_source_service = VideoSourceService()
