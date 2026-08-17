from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.core.database import get_db
from app.services.signal_controller import signal_controller
from app.services.analytics_service import get_traffic_analytics_summary

router = APIRouter()

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Get real-time and historical TimescaleDB analytics."""
    total_vehicles = sum(lane['vehicles'] for lane in signal_controller.traffic_state.values())
    total_ambulances = sum(lane['ambulances'] for lane in signal_controller.traffic_state.values())
    total_pedestrians = sum(lane['pedestrians'] for lane in signal_controller.traffic_state.values())
    avg_density = sum(lane['density'] for lane in signal_controller.traffic_state.values()) / 4.0

    timescale_summary = await get_traffic_analytics_summary(db)

    lane_analytics = []
    for lane_id, lane in signal_controller.traffic_state.items():
        lane_analytics.append({
            "lane_id": lane_id,
            "lane_number": lane_id.replace('lane', ''),
            "vehicles": lane['vehicles'],
            "ambulances": lane['ambulances'],
            "pedestrians": lane['pedestrians'],
            "anomalies": lane['anomalies'],
            "density": lane['density'],
            "signal": lane['signal'],
            "duration": lane['duration'],
            "mode": lane['mode'],
            "rtsp_status": lane['rtsp_status']
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_vehicles": total_vehicles,
            "total_ambulances": total_ambulances,
            "total_pedestrians": total_pedestrians,
            "avg_density": round(avg_density, 2),
            "green_lane": signal_controller.current_green_lane,
            "green_wave_active": signal_controller.green_wave_active,
            "mode": "vip" if signal_controller.vip_mode else ("green_wave" if signal_controller.green_wave_active else "normal")
        },
        "timescale_insights": timescale_summary,
        "lanes": lane_analytics
    }
