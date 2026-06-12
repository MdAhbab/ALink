from __future__ import annotations

import warnings
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_INSECURE_SECRETS = {"dev-only-secret-change-me", "", "change-me", "secret"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Runtime ──────────────────────────────────────────────────────────────
    # "development" keeps the convenient local defaults; "production" enforces
    # security invariants (strong JWT secret, explicit CORS).
    environment: str = "development"

    # ── Database ─────────────────────────────────────────────────────────────
    # SQLite is the zero-config local default. On the VM this is overridden with
    # a PostgreSQL URL (postgresql+psycopg2://user:pass@host/db).
    database_url: str = "sqlite:///./alink.db"

    # ── JWT Auth ─────────────────────────────────────────────────────────────
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # ── Uploads ──────────────────────────────────────────────────────────────
    upload_dir: str = str(Path(__file__).resolve().parent.parent / "uploads")
    id_card_upload_limit_mb: int = 5
    resume_upload_limit_mb: int = 10

    # ── Messaging (RabbitMQ) ─────────────────────────────────────────────────
    # When unset/unreachable, the event bus degrades gracefully to in-process
    # synchronous handling so `python run.py` works without a broker.
    rabbitmq_url: str | None = None
    events_exchange: str = "alink.events"

    # ── AI assistant (chat ai_worker) ────────────────────────────────────────
    # Optional. When absent the worker uses the local ML intent classifier only.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-haiku-4-5"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.is_production:
            return None
        return r"^https?://(localhost|127\.0\.0\.1):\d+$"

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def validate_runtime(self) -> None:
        """Fail fast in production on insecure configuration."""
        if self.is_production and self.jwt_secret in _INSECURE_SECRETS:
            raise RuntimeError(
                "Refusing to start in production with the default JWT secret. "
                "Set a strong `jwt_secret` (e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`)."
            )
        if not self.is_production and self.jwt_secret in _INSECURE_SECRETS:
            warnings.warn(
                "Using the insecure default JWT secret — fine for local dev, never for production.",
                stacklevel=2,
            )


def _build_settings() -> Settings:
    cfg = Settings()
    cfg.validate_runtime()
    return cfg


settings = _build_settings()
