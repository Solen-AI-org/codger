import time

class RateLimiter:
    """Allow at most max_calls requests per period seconds, per key."""
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.requests = {}

    def allow(self, key):
        now = time.time()

        if key not in self.requests:
            self.requests[key] = []

        self.requests[key] = [ts for ts in self.requests[key] if now - ts < self.period]

        if len(self.requests[key]) < self.max_calls:
            self.requests[key].append(now)
            return True

        return False
