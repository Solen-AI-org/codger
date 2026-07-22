import time
from limiter import RateLimiter

# Test 1: Allow requests within limit
limiter = RateLimiter(max_calls=3, period=1)
assert limiter.allow("client1") == True   # 1st request
assert limiter.allow("client1") == True   # 2nd request
assert limiter.allow("client1") == True   # 3rd request
assert limiter.allow("client1") == False  # 4th request - throttled
print("✓ Test 1 passed: throttles after max_calls")

# Test 2: Different keys are independent
limiter = RateLimiter(max_calls=2, period=1)
assert limiter.allow("client1") == True
assert limiter.allow("client2") == True
assert limiter.allow("client1") == True
assert limiter.allow("client2") == True
assert limiter.allow("client1") == False
assert limiter.allow("client2") == False
print("✓ Test 2 passed: different keys tracked independently")

# Test 3: Window expires and allows new requests
limiter = RateLimiter(max_calls=1, period=1)
assert limiter.allow("client1") == True
assert limiter.allow("client1") == False
time.sleep(1.1)
assert limiter.allow("client1") == True   # window expired, allow again
print("✓ Test 3 passed: window expiration works")

print("\nAll tests passed!")
