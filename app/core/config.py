from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import AnyUrl, Field


class Settings(BaseSettings):
    API_V1_STR: str = "/v1"
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # one week
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "scheduler"
    POSTGRES_USER: str = "scheduler"
    POSTGRES_PASSWORD: str = Field(..., env="POSTGRES_PASSWORD")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()