from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@db:5432/happyrobot"
    api_key: str = "dev-key-change-me"
    fmcsa_web_key: str = ""
    fmcsa_base_url: str = "https://mobile.fmcsa.dot.gov/qc/services"
    cors_origins: str = "*"

    @field_validator("database_url")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        if v.startswith("postgresql://") and "+psycopg2" not in v:
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v


settings = Settings()
