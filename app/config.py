from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Workflow Automation System"
    debug: bool = False

    database_url: str
    redis_url: str = "redis://redis:6379"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    upload_dir: str = "/app/uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10MB

    confidence_threshold: float = 0.6

    ocr_max_upscale_factor: float = 2.0
    ocr_max_dimension: int = 2000

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@workflow-automation.local"
    smtp_use_tls: bool = True

    # JSON array in .env if overridden, e.g. ["https://myapp.com"]
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()