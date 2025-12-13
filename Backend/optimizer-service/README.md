# OR-Tools Route Optimization Service

Google OR-Tools powered microservice for military convoy route optimization.

## Features

- **Vehicle Routing Problem (VRP)** solving
- **Multi-objective optimization**: distance, time, terrain, risk, priority
- **Constraint handling**: max distance, vehicle capacity, terrain avoidance
- **Real calculations**: Haversine distance, elevation, terrain analysis
- **Production-grade**: Google's battle-tested algorithms

## Installation

### Option 1: Python venv

```bash
cd optimizer-service
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### Option 2: Conda

```bash
conda create -n optimizer python=3.11
conda activate optimizer
pip install -r requirements.txt
```

## Run Service

```bash
python optimizer.py
```

Service runs on: `http://localhost:5001`

## API Endpoints

### 1. Health Check

```http
GET /health
```

### 2. Optimize Single Route

```http
POST /optimize/route

{
  "origin": {"lat": 34.08, "lng": 74.79, "name": "Srinagar"},
  "destination": {"lat": 34.16, "lng": 77.58, "name": "Leh"},
  "waypoints": [
    {"lat": 34.24, "lng": 75.63, "name": "Zoji La Pass"}
  ],
  "constraints": {
    "priority": "ALPHA",
    "maxDistance": 500,
    "vehicleCapacity": 25,
    "avoidTerrain": ["DESERT"]
  }
}
```

### 3. Multi-Convoy Optimization

```http
POST /optimize/multi-convoy

{
  "convoys": [
    {
      "id": "1",
      "origin": {...},
      "destination": {...},
      "priority": "ALPHA"
    }
  ]
}
```

## Integration with Node.js Backend

The Node.js backend calls this service via HTTP for route optimization.
See `Backend/src/services/optimizerService.js` for integration code.

## Algorithms Used

- **First Solution**: Path Cheapest Arc
- **Metaheuristic**: Guided Local Search
- **Cost Function**: Multi-factor (distance × terrain × priority)
- **Solver**: Google OR-Tools CP-SAT

## Testing

```bash
# Test health
curl http://localhost:5001/health

# Test route optimization
curl -X POST http://localhost:5001/optimize/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 34.08, "lng": 74.79, "name": "Srinagar"},
    "destination": {"lat": 34.16, "lng": 77.58, "name": "Leh"}
  }'
```

## Production Deployment

For production, deploy as:

- Docker container
- Azure Container Instance
- AWS Lambda (with increased timeout)
- Google Cloud Run

## Performance

- Single route: <500ms
- 10 convoys: <2s
- 50 convoys: <10s

Scales horizontally by deploying multiple instances.
