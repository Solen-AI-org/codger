import time

class RateLimiter:
    """Allow at most max_calls requests per period seconds, per key."""
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        # ponytail: key dict grows unbounded, add cleanup if needed
        self.calls = {}

    def allow(self, key):
        now = time.time()
        if key not in self.calls:
            self.calls[key] = []

        # Remove timestamps outside the rolling window
        self.calls[key] = [t for t in self.calls[key] if now - t < self.period]

        # Allow if under limit
        if len(self.calls[key]) < self.max_calls:
            self.calls[key].append(now)
            return True
        return False


if __name__ == "__main__":
    limiter = RateLimiter(max_calls=3, period=1)
    key = "client1"

    # First 3 requests allowed
    assert limiter.allow(key) == True
    assert limiter.allow(key) == True
    assert limiter.allow(key) == True

    # 4th request blocked
    assert limiter.allow(key) == False

    # After period elapses, requests allowed again
    time.sleep(1.1)
    assert limiter.allow(key) == True

    # Different key has its own limit
    assert limiter.allow("client2") == True
    assert limiter.allow("client2") == True
    assert limiter.allow("client2") == True
    assert limiter.allow("client2") == False

    print("✓ all checks passed")
