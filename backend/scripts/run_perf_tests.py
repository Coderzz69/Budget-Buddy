import os
import sys
import django
import time
import concurrent.futures

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.cache import cache
from rest_framework.test import APIClient
from api.models import User

# Use the MockAuthUser from the testing module if we want local drf client auth
class MockAuthUser:
    is_authenticated = True
    def __init__(self, db_user):
        self.db_user = db_user
        self.id = str(db_user.id)

def make_request(client, path):
    # Pass SERVER_NAME explicitly to bypass DisallowedHost exception via local testing client
    start = time.perf_counter()
    res = client.get(path, SERVER_NAME="localhost")
    end = time.perf_counter()
    return end - start

def run_performance_test(concurrent_requests=100):
    user = User.objects.filter(clerkId="perf_test_user").first()
    if not user:
        print("Performance test user 'perf_test_user' not found. Run seed_test_data.py first.")
        return
        
    client = APIClient()
    client.force_authenticate(user=MockAuthUser(user))
    path = '/api/insights/'
    
    # Pre-flight request to warm up ORM / initial cache setup
    # Wait, the point is to test DB load, so we MUST clear cache before load testing.
    cache.clear()
    
    latencies = []
    
    print(f"Triggering {concurrent_requests} concurrent requests to {path}...")
    
    # We use ThreadPoolExecutor because the DRF testing client resolves locally via python
    # threads without GIL heavy CPU work, simulating concurrent incoming WSGI requests.
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        # We must clear cache sequentially for each future start to force it to hit DB
        # But clearing inside threads might clear it while another is calculating, 
        # so just having them hit simultaneously is enough; the first one locks or they all compute
        futures = [executor.submit(make_request, client, path) for _ in range(concurrent_requests)]
        for future in concurrent.futures.as_completed(futures):
            try:
                latency = future.result()
                latencies.append(latency)
            except Exception as e:
                print("Request failed:", e)

    if not latencies:
        print("No successful requests recorded.")
        return

    # To seconds -> Ms
    latencies = [l * 1000 for l in latencies]
    latencies.sort()
    
    avg_ping = sum(latencies) / len(latencies)
    
    # Calculate P95 index
    idx = int(0.95 * len(latencies))
    p95_ping = latencies[idx]
    
    print("=== PERFORMANCE RESULTS ===")
    print(f"Concurrent Requests: {concurrent_requests}")
    print(f"Average Latency: {avg_ping:.2f} ms")
    print(f"P95 Latency:     {p95_ping:.2f} ms")
    
    if p95_ping < 300:
        print("✅ P95 Latency < 300ms (SLA Excellent)")
    elif p95_ping < 1000:
        print("⚠️ P95 Latency < 1s (SLA Passable for large sets)")
    else:
        print("❌ P95 Latency > 1s (SLA Failed)")

if __name__ == "__main__":
    import sys
    reqs = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    run_performance_test(reqs)
