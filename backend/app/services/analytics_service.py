from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.vehicle_log import VehicleLog
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

async def get_traffic_analytics_summary(db: AsyncSession) -> Dict[str, Any]:
    """Queries TimescaleDB vehicle_logs for aggregate historical analytics."""
    try:
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)

        stmt = select(
            func.avg(VehicleLog.vehicle_count).label("avg_vehicles"),
            func.avg(VehicleLog.density_percentage).label("avg_density"),
            func.sum(VehicleLog.pedestrian_count).label("total_pedestrians")
        ).where(VehicleLog.time >= one_hour_ago)

        result = await db.execute(stmt)
        row = result.first()

        avg_vehicles = float(row.avg_vehicles or 0) if row else 0.0
        avg_density = float(row.avg_density or 0) if row else 0.0
        total_pedestrians = int(row.total_pedestrians or 0) if row else 0

        # Peak hours prediction heuristic based on time of day
        current_hour = now.hour
        peak_prediction = "High" if current_hour in [8, 9, 17, 18, 19] else ("Moderate" if current_hour in [10, 11, 12, 13, 14, 15, 16] else "Low")

        return {
            "window": "Last 1 Hour",
            "avg_vehicles_per_min": round(avg_vehicles, 2),
            "avg_density_percentage": round(avg_density, 2),
            "total_pedestrians": total_pedestrians,
            "predicted_peak_status": peak_prediction,
        }
    except Exception:
        return {
            "window": "Last 1 Hour",
            "avg_vehicles_per_min": 0.0,
            "avg_density_percentage": 0.0,
            "total_pedestrians": 0,
            "predicted_peak_status": "Low",
        }
