from fastapi import APIRouter, HTTPException
from app.services.signal_controller import signal_controller
from app.schemas import VipOverrideRequest

router = APIRouter()

@router.post("/vip-mode")
async def set_vip_mode(req: VipOverrideRequest):
    """Set VIP mode for manual traffic control."""
    if req.lane_id not in signal_controller.traffic_state:
        raise HTTPException(status_code=400, detail="Invalid lane ID")

    signal_controller.set_vip_mode(req.lane_id, req.duration)
    return {
        "message": f"VIP mode activated for {req.lane_id}",
        "lane_id": req.lane_id,
        "duration": req.duration,
        "mode": "vip"
    }

@router.post("/vip-mode/disable")
async def disable_vip_mode():
    """Disable VIP mode and return to automatic control."""
    signal_controller.disable_vip_mode()
    return {"message": "VIP mode disabled", "mode": "normal"}

@router.get("/vip-status")
async def get_vip_status():
    """Get current VIP mode status."""
    return {
        "vip_mode": signal_controller.vip_mode,
        "vip_override_lane": signal_controller.vip_override_lane,
        "mode": "vip" if signal_controller.vip_mode else "normal"
    }

@router.post("/green-wave")
async def set_green_wave(active: bool = True):
    """Enable or disable multi-intersection Green Wave coordination corridor."""
    signal_controller.set_green_wave(active)
    return {
        "message": f"Green Wave coordination {'enabled' if active else 'disabled'}",
        "green_wave_active": signal_controller.green_wave_active,
        "corridor": signal_controller.green_wave_corridor
    }
