from pathlib import Path


def safe_upload_path(base_dir, filename):
    """Join an untrusted filename onto base_dir and return the path."""
    base = Path(base_dir).resolve()
    upload_path = (base / filename).resolve()

    try:
        upload_path.relative_to(base)
    except ValueError:
        raise ValueError(f"Path traversal attack detected: {filename}")

    return str(upload_path)
