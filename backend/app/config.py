import os
from pathlib import Path
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Urban Pulse"
    PROJECT_VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    # Postgres / TimescaleDB
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "urbanpulse")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "urbanpulse_password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "urbanpulse_db")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def SYNC_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "urbanpulse_secret_key_super_secure_12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

    # RTSP Feeds Default Configuration
    DEFAULT_RTSP_STREAMS: dict = {
        "lane1": os.getenv("RTSP_LANE1", "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov"),
        "lane2": os.getenv("RTSP_LANE2", "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov"),
        "lane3": os.getenv("RTSP_LANE3", "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov"),
        "lane4": os.getenv("RTSP_LANE4", "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov"),
    }

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
