import hmac, hashlib
def make_token(user_id, secret):
    """Create a signed token of the form 'user_id.signature'."""
    sig = hmac.new(secret.encode(), str(user_id).encode(), hashlib.sha256).hexdigest()
    return f'{user_id}.{sig}'
def verify_token(token, secret):
    """Return the user_id if the token signature is valid, else None."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        user_id_str, provided_sig = parts

        expected_sig = hmac.new(secret.encode(), user_id_str.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected_sig, provided_sig):
            return user_id_str
        return None
    except (ValueError, AttributeError, TypeError):
        return None
