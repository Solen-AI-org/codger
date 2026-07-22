import re


def is_valid_email(s):
    """Return True if s is a valid email address, else False."""
    if not isinstance(s, str) or not s:
        return False

    # Pattern: local@domain.tld
    # Local part: alphanumeric, dots, underscores, hyphens, plus signs
    # Domain: labels with alphanumeric/hyphens, separated by dots, TLD is letters only
    pattern = r'^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, s):
        return False

    local, domain = s.split('@')

    # Local part: no leading/trailing dots, no consecutive dots
    if local.startswith('.') or local.endswith('.') or '..' in local:
        return False

    # Domain: no leading/trailing dots, no consecutive dots
    if domain.startswith('.') or domain.endswith('.') or '..' in domain:
        return False

    return True
