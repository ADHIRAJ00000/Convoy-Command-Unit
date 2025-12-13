"""
Quick test script for OR-Tools optimizer
"""

import requests
import json

BASE_URL = "http://localhost:5001"

def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_route_optimization():
    """Test route optimization"""
    print("\n🗺️ Testing Route Optimization...")
    
    data = {
        "origin": {"lat": 34.08, "lng": 74.79, "name": "Srinagar"},
        "destination": {"lat": 34.16, "lng": 77.58, "name": "Leh"},
        "waypoints": [
            {"lat": 34.24, "lng": 75.63, "name": "Zoji La Pass"}
        ],
        "constraints": {
            "priority": "ALPHA",
            "maxDistance": 500,
            "vehicleCapacity": 25
        }
    }
    
    response = requests.post(f"{BASE_URL}/optimize/route", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if result.get('success'):
        route_data = result['data']
        print(f"✅ Route Optimized Successfully!")
        print(f"   Total Distance: {route_data['totalDistanceKm']} km")
        print(f"   Duration: {route_data['estimatedDurationHours']} hours")
        print(f"   Segments: {len(route_data['segments'])}")
        print(f"   Checkpoints: {len(route_data['checkpoints'])}")
        print(f"   Optimization Score: {route_data['optimizationScore']}")
        print(f"   Optimized By: {route_data['optimizedBy']}")
    else:
        print(f"❌ Error: {result.get('error')}")

def test_multi_convoy():
    """Test multi-convoy optimization"""
    print("\n🚛 Testing Multi-Convoy Optimization...")
    
    data = {
        "convoys": [
            {
                "id": "1",
                "origin": {"lat": 34.08, "lng": 74.79, "name": "Srinagar"},
                "destination": {"lat": 34.16, "lng": 77.58, "name": "Leh"},
                "priority": "ALPHA"
            },
            {
                "id": "2",
                "origin": {"lat": 27.31, "lng": 88.6, "name": "Gangtok"},
                "destination": {"lat": 27.39, "lng": 88.84, "name": "Nathu La"},
                "priority": "BRAVO"
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/optimize/multi-convoy", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if result.get('success'):
        convoys = result['data']
        print(f"✅ Multi-Convoy Optimization Completed!")
        print(f"   Convoys Optimized: {len(convoys)}")
        for convoy in convoys:
            route = convoy['route']
            print(f"   - Convoy {convoy['convoyId']}: {route['totalDistanceKm']} km, {route['estimatedDurationHours']} hrs")
    else:
        print(f"❌ Error: {result.get('error')}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 OR-Tools Optimizer Service Test Suite")
    print("=" * 60)
    
    try:
        test_health()
        test_route_optimization()
        test_multi_convoy()
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to optimizer service")
        print("   Make sure the service is running on http://localhost:5001")
        print("   Run: python optimizer.py")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
