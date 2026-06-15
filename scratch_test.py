import sys
from pathlib import Path

# Add backend to path so we can import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

try:
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    
    # 1. Test /health
    print("Testing /health...")
    res = client.get("/health")
    print(f"/health status: {res.status_code}, content: {res.json()}")
    
    # 2. Test /health/ready
    print("Testing /health/ready...")
    res = client.get("/health/ready")
    print(f"/health/ready status: {res.status_code}, content: {res.json()}")

except Exception as e:
    print(f"Error testing: {e}")
    import traceback
    traceback.print_exc()
