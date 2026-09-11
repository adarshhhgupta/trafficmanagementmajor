from typing import Dict
from pathlib import Path
from app.workers.capture_worker import RTSPCaptureWorker
from app.config import settings
from app.services.video_source_service import video_source_service
import logging

logger = logging.getLogger(__name__)


class WorkerManager:
    def __init__(self):
        self.workers: Dict[str, RTSPCaptureWorker] = {}

    async def start_all_workers(self):
        video_path = video_source_service.get_current_video_path()
        logger.info(f"Initializing Recorded Video Detection Workers (active source: {video_path}) for all 4 lanes...")
        for lane_id, rtsp_url in settings.DEFAULT_RTSP_STREAMS.items():
            worker = RTSPCaptureWorker(lane_id, rtsp_url)
            self.workers[lane_id] = worker
            await worker.start()

    async def stop_all_workers(self):
        logger.info("Stopping Video Detection Workers...")
        for worker in self.workers.values():
            await worker.stop()
        self.workers.clear()

    async def reload_video_source(self, new_video_path: Path) -> bool:
        """Sets the new recorded video path and restarts capture workers to immediately process the new video."""
        logger.info(f"Reloading video detection workers with new recorded video: {new_video_path}")
        success = video_source_service.set_video_path(new_video_path)
        if not success:
            return False

        await self.stop_all_workers()
        await self.start_all_workers()
        return True

    async def reset_to_default_video(self) -> bool:
        """Resets video source to default sample_traffic.mp4 and restarts workers."""
        logger.info("Resetting video detection workers to default sample_traffic.mp4")
        success = video_source_service.reset_to_default()
        if not success:
            return False

        await self.stop_all_workers()
        await self.start_all_workers()
        return True


worker_manager = WorkerManager()
