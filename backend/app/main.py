from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import settings
from app.core.database import engine, Base
from app.core.redis import close_redis_client
from app.workers.worker_manager import worker_manager
from app.api import routes_traffic, routes_vip, routes_analytics, routes_ws, routes_auth

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables
    logger.info("Initializing Database Tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning(f"Database connection skipped during offline startup: {e}")

    # Startup: Launch per-lane RTSP capture workers
    try:
        await worker_manager.start_all_workers()
    except Exception as e:
        logger.error(f"Error starting background workers: {e}")

    yield

    # Shutdown: Stop capture workers & close connections
    logger.info("Shutting down Urban Pulse backend...")
    try:
        await worker_manager.stop_all_workers()
        await close_redis_client()
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router setup
api_router = APIRouter(prefix=settings.API_V1_STR)

@api_router.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "healthy"
    }

api_router.include_router(routes_traffic.router, tags=["Traffic"])
api_router.include_router(routes_vip.router, tags=["VIP & Green Wave"])
api_router.include_router(routes_analytics.router, tags=["Analytics"])
api_router.include_router(routes_auth.router, tags=["Auth"])

app.include_router(api_router)
app.include_router(routes_ws.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
