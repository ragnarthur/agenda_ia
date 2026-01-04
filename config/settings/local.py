"""
Django settings for local development.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Use SQLite for local development if Postgres is not available
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# CORS - allow all in development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
