from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.database import create_tables
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.api.routes import auth, documents, process, qa, export
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print("DocAgent backend started.")
    yield
    # Shutdown
    print("DocAgent backend shutting down.")

app = FastAPI(
    title="DocAgent API",
    description="Autonomous Document Processing Agent Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow mobile app and web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

# Serve uploaded files as static (for image preview in app)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register all routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(process.router)
app.include_router(qa.router)
app.include_router(export.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "DocAgent", "version": "1.0.0"}
