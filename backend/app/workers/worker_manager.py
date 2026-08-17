from typing import Dict
from app.workers.capture_worker import RTSPCaptureWorker
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class WorkerManager:
    def __init__(self):
        self.workers: Dict[str, RTSPCaptureWorker] = {}

    async def start_all_workers(self):
        logger.info("Initializing RTSP Capture Workers for all 4 lanes...")
        for lane_id, rtsp_url in settings.DEFAULT_RTSP_STREAMS.items():
            worker = RTSPCaptureWorker(lane_id, rtsp_url)
            self.workers[lane_id] = worker
            await worker.start()

    async def stop_all_workers(self):
        logger.info("Stopping RTSP Capture Workers...")
        for worker in self.workers.values():
            await worker.stop()
        self.workers.clear()

worker_manager = WorkerManager()
