from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Workflow Automation System"
    debug: bool = False

    database_url: str
    redis_url: str = "redis://redis:6379"

    # JSON array in .env if overridden, e.g. ["https://myapp.com"]
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()