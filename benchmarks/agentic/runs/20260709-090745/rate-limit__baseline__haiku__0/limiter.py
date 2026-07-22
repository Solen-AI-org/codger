import time

class RateLimiter:
    """Allow at most max_calls requests per period seconds, per key."""
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.calls = {}

    def allow(self, key):
        now = time.time()

        if key not in self.calls:
            self.calls[key] = []

        # Remove timestamps outside the period
        self.calls[key] = [ts for ts in self.calls[key] if now - ts < self.period]

        # Check if under limit
        if len(self.calls[key]) < self.max_calls:
            self.calls[key].append(now)
            return True

        return False
