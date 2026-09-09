from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Workflow Automation System"
    debug: bool = False

    database_url: str
    redis_url: str = "redis://redis:6379"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    jwt_secret_key: str = "supersecretjwtkeychangeinproduction1234567890"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()