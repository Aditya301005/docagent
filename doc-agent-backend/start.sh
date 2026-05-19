#!/bin/bash
set -e

echo "==> Running Alembic Database Migrations..."
alembic upgrade head || echo "WARNING: Alembic migrations failed. Proceeding anyway..."

echo "==> Starting Celery Background Worker (Solo Pool to save RAM)..."
celery -A app.tasks.celery_app worker --pool=solo --loglevel=info &

echo "==> Starting Uvicorn API Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
