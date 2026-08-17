from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
import base64
from app.services.signal_controller import signal_controller
from app.workers.inference_worker import process_frame_inference
from app.schemas import ProcessedFrameSchema, LaneStateSchema

router = APIRouter()

@router.get("/traffic-state")
async def get_traffic_state():
    """Get current traffic state for all 4 lanes."""
    return signal_controller.traffic_state

@router.get("/lane-status/{lane_id}")
async def get_lane_status(lane_id: str):
    """Get status for a specific lane."""
    if lane_id not in signal_controller.traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")
    return signal_controller.traffic_state[lane_id]

@router.post("/process-frame/{lane_id}")
async def process_frame_upload(lane_id: str, file: UploadFile = File(...)):
    """Manual fallback endpoint to upload and process a single video frame."""
    if lane_id not in signal_controller.traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    frame_bytes = await file.read()
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image format")

    vehicles, ambulances, pedestrians, anomalies, boxes, density = process_frame_inference(frame)

    for box in boxes:
        color = (0, 0, 255) if box['label'] == 'Ambulance' else (0, 255, 0)
        cv2.rectangle(frame, (box['x1'], box['y1']), (box['x2'], box['y2']), color, 2)
        cv2.putText(frame, f"{box['label']} {box['confidence']:.2f}",
                   (box['x1'], box['y1'] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    signal_controller.traffic_state[lane_id]['vehicles'] = vehicles
    signal_controller.traffic_state[lane_id]['ambulances'] = ambulances
    signal_controller.traffic_state[lane_id]['pedestrians'] = pedestrians
    signal_controller.traffic_state[lane_id]['anomalies'] = anomalies
    signal_controller.traffic_state[lane_id]['density'] = density
    signal_controller.traffic_state[lane_id]['rtsp_status'] = "fallback"

    signal_controller.update_signals()

    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')

    return ProcessedFrameSchema(
        lane_id=lane_id,
        frame=frame_base64,
        vehicles=vehicles,
        ambulances=ambulances,
        pedestrians=pedestrians,
        anomalies=anomalies,
        boxes=boxes,
        signal=signal_controller.traffic_state[lane_id]['signal'],
        duration=signal_controller.traffic_state[lane_id]['duration'],
        density=density,
        rtsp_status="fallback"
    )

@router.post("/reset")
async def reset_system():
    """Reset the system traffic state."""
    for lane in signal_controller.traffic_state:
        signal_controller.traffic_state[lane] = {
            'vehicles': 0, 'ambulances': 0, 'pedestrians': 0, 'anomalies': 0,
            'signal': 'red', 'duration': 0, 'density': 0.0, 'mode': 'normal', 'rtsp_status': 'connecting'
        }
    signal_controller.disable_vip_mode()
    return {"message": "Urban Pulse System reset successfully"}
