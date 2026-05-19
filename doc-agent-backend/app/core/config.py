import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str = "docagent-backend-fallback-secret-key-987654321"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20
    TESSERACT_CMD: str = "tesseract"

    # ── Google Gemini API ────────────────────────────────────────────────────
    # Get your key from https://aistudio.google.com/app/apikey
    # Paste it in .env as: GEMINI_API_KEY=your-key-here
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    # ── ML / Inference settings ──────────────────────────────────────────────
    # Path to a local fine-tuned LayoutLMv3 classifier checkpoint directory.
    MODEL_DIR: str = "app/models/classifier"

    # Path to a local fine-tuned LayoutLMv3 NER checkpoint directory.
    NER_MODEL_DIR: str = "app/models/ner"

    # Path to a local QA checkpoint directory.
    QA_MODEL_DIR: str = "app/models/vqa"

    # "cpu" or "cuda" — which device to run inference on.
    INFERENCE_DEVICE: str = "cpu"

    # Documents whose top-class confidence is below this value are flagged
    # with status="review" so a human can verify the extraction results.
    CONFIDENCE_THRESHOLD: float = 0.70

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

def create_upload_dir():
    """Ensure the uploads directory exists on startup."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

create_upload_dir()
