import os


def safe_upload_path(base_dir, filename):
    """Join an untrusted filename onto base_dir and return the path."""
    base_dir = os.path.abspath(base_dir)
    result = os.path.abspath(os.path.join(base_dir, filename))

    # Ensure result stays within base_dir (prevent path traversal)
    rel = os.path.relpath(result, base_dir)
    if rel.startswith(".."):
        raise ValueError(f"Path traversal detected: {filename}")

    return result
