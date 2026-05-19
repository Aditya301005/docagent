#!/bin/bash
set -e

echo "==> Running Alembic Database Migrations..."
alembic upgrade head || echo "WARNING: Alembic migrations failed. Proceeding anyway..."

echo "==> Starting Celery Background Worker..."
celery -A app.tasks.celery_app worker --loglevel=info &

echo "==> Starting Uvicorn API Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
