import time
from collections import defaultdict


class RateLimiter:
    """Allow at most max_calls requests per period seconds, per key."""
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.requests = defaultdict(list)

    def allow(self, key):
        now = time.time()
        # Remove requests outside the window
        self.requests[key] = [req_time for req_time in self.requests[key]
                              if now - req_time < self.period]
        # Allow if under limit
        if len(self.requests[key]) < self.max_calls:
            self.requests[key].append(now)
            return True
        return False
