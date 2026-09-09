import uuid
from pathlib import Path

from fastapi import UploadFile

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}
CHUNK_SIZE = 1024 * 1024 


class UploadValidationError(Exception):
    pass


async def save_upload(
    file: UploadFile, upload_dir: Path, max_size_bytes: int
) -> tuple[str, int]:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(f"Unsupported file extension: {ext or '(none)'}")

    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4()}{ext}"
    dest_path = upload_dir / stored_filename

    size = 0
    with open(dest_path, "wb") as out:
        while chunk := await file.read(CHUNK_SIZE):
            size += len(chunk)
            if size > max_size_bytes:
                out.close()
                dest_path.unlink(missing_ok=True)
                raise UploadValidationError(
                    f"File exceeds maximum allowed size of {max_size_bytes} bytes"
                )
            out.write(chunk)

    return stored_filename, size