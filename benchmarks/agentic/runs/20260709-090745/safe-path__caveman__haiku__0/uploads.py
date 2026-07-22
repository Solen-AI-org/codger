import os


def safe_upload_path(base_dir, filename):
    """Join an untrusted filename onto base_dir and return the path."""
    base_dir = os.path.abspath(base_dir)
    result = os.path.abspath(os.path.join(base_dir, filename))

    base_normalized = os.path.normpath(base_dir)

    # Verify result is within base_dir (child or equal)
    if result != base_normalized and not result.startswith(base_normalized + os.sep):
        raise ValueError(f"Path traversal detected: {filename}")

    return result
