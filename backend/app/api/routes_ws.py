from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import ws_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    """WebSocket endpoint pushing real-time lane state, annotated frames, and alerts to frontend clients."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & receive optional client control events
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
