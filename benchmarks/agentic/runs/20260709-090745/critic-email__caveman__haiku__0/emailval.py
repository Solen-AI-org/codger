import re

def is_valid_email(s):
    """Return True if s is a valid email address, else False."""
    if not isinstance(s, str):
        return False

    s = s.strip()

    if not s or len(s) > 254:
        return False

    pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'

    return re.match(pattern, s) is not None
