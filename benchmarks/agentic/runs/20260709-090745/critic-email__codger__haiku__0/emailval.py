import re

def is_valid_email(s):
    """Return True if s is a valid email address, else False."""
    if not s or not isinstance(s, str):
        return False

    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, s))
