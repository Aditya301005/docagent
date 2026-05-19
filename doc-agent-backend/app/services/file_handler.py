import os
import uuid
import hashlib
import aiofiles
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024

_EXTENSION_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}

_MIME_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def infer_mime_type(
    file_bytes: bytes,
    content_type: str | None = None,
    filename: str | None = None,
) -> str:
    header = file_bytes[:16]
    hinted_type = (content_type or "").split(";")[0].strip().lower()

    if header.startswith(b"%PDF"):
        return "application/pdf"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if header[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
        return "image/webp"

    if filename:
        ext = os.path.splitext(filename)[1].lower()
        if ext in _EXTENSION_TO_MIME:
            return _EXTENSION_TO_MIME[ext]

    if hinted_type in ALLOWED_TYPES:
        return hinted_type

    return hinted_type or "application/octet-stream"

async def save_upload(file: UploadFile, user_id: str) -> dict:
    file_bytes = await file.read()
    file_size_bytes = len(file_bytes)

    if file_size_bytes > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum limit of {settings.MAX_FILE_SIZE_MB}MB."
        )

    original_filename = file.filename or "file"
    mime_type = infer_mime_type(file_bytes, file.content_type, original_filename)

    if mime_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types are: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    ext = os.path.splitext(original_filename)[1] or _MIME_TO_EXTENSION.get(mime_type, "")
    unique_filename = f"{uuid.uuid4()}{ext}"

    user_upload_dir = os.path.join(settings.UPLOAD_DIR, user_id)
    os.makedirs(user_upload_dir, exist_ok=True)

    stored_path = os.path.join(user_upload_dir, unique_filename)

    # Compute SHA256 hash for duplicate detection
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    async with aiofiles.open(stored_path, 'wb') as out_file:
        await out_file.write(file_bytes)
        
    return {
        "stored_path": stored_path,
        "filename": original_filename,
        "file_size_bytes": file_size_bytes,
        "mime_type": mime_type,
        "file_hash": file_hash,
    }

async def delete_file(stored_path: str) -> bool:
    try:
        os.remove(stored_path)
        return True
    except OSError:
        return False

def get_file_url(stored_path: str) -> str:
    # Assuming the app mounts the upload directory at "/uploads"
    # Converts a path like "./uploads/user_id/uuid.jpg" to "/uploads/user_id/uuid.jpg"
    normalized_path = stored_path.replace(os.path.sep, "/")
    if normalized_path.startswith("./"):
        normalized_path = normalized_path[2:]
    
    return f"/{normalized_path}"

async def read_file_bytes(stored_path: str) -> bytes:
    async with aiofiles.open(stored_path, 'rb') as f:
        return await f.read()
