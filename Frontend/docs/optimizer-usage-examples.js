// Example: How to send optimizer requests from frontend with proper inputs

// 1. BASIC ROUTE - Just origin and destination
export async function optimizeBasicRoute(origin, destination) {
  const response = await fetch('http://localhost:5000/api/optimizer/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: {
        lat: origin.latitude,
        lng: origin.longitude,
        name: origin.name
      },
      destination: {
        lat: destination.latitude,
        lng: destination.longitude,
        name: destination.name
      }
    })
  });
  return response.json();
}

// 2. ROUTE WITH WAYPOINTS - Include checkpoints to visit
export async function optimizeRouteWithCheckpoints(origin, destination, checkpoints) {
  const waypoints = checkpoints.map(cp => ({
    lat: cp.position.lat,
    lng: cp.position.lng,
    name: cp.name
  }));

  const response = await fetch('http://localhost:5000/api/optimizer/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      waypoints,
      constraints: {
        priority: 'BRAVO' // Higher priority for checkpoint routes
      }
    })
  });
  return response.json();
}

// 3. HIGH-PRIORITY MISSION - ALPHA priority with constraints
export async function optimizeAlphaMission(origin, destination, convoy) {
  const response = await fetch('http://localhost:5000/api/optimizer/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      constraints: {
        priority: 'ALPHA',              // Highest priority
        maxDistance: 500,               // Maximum route length
        vehicleCapacity: convoy.vehicleCount,
        avoidTerrain: ['DESERT']        // Avoid desert terrain
      }
    })
  });
  return response.json();
}

// 4. TERRAIN-AWARE ROUTING - Based on weather/conditions
export async function optimizeByWeather(origin, destination, weatherConditions) {
  // Determine terrain to avoid based on weather
  const avoidTerrain = [];
  
  if (weatherConditions.snow) {
    avoidTerrain.push('MOUNTAIN'); // Avoid mountains in snow
  }
  if (weatherConditions.rain === 'HEAVY') {
    avoidTerrain.push('FOREST'); // Avoid muddy forest roads
  }
  if (weatherConditions.sandstorm) {
    avoidTerrain.push('DESERT'); // Avoid deserts in sandstorms
  }

  const response = await fetch('http://localhost:5000/api/optimizer/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      constraints: {
        priority: 'CHARLIE',
        avoidTerrain,
        maxElevation: weatherConditions.snow ? 3000 : 4500
      }
    })
  });
  return response.json();
}

// 5. MULTI-CONVOY OPTIMIZATION - Optimize multiple convoys at once
export async function optimizeMultipleConvoys(convoysData) {
  const convoys = convoysData.map(convoy => ({
    id: convoy.id,
    origin: {
      lat: convoy.origin.lat,
      lng: convoy.origin.lng,
      name: convoy.origin.name
    },
    destination: {
      lat: convoy.destination.lat,
      lng: convoy.destination.lng,
      name: convoy.destination.name
    },
    priority: convoy.priority || 'CHARLIE',
    waypoints: convoy.checkpoints?.map(cp => ({
      lat: cp.position.lat,
      lng: cp.position.lng,
      name: cp.name
    })) || []
  }));

  const response = await fetch('http://localhost:5000/api/optimizer/multi-convoy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ convoys })
  });
  return response.json();
}

// 6. ALTERNATIVE ROUTE - When primary route has issues
export async function getAlternativeRoute(origin, destination, reason, avoidAreas) {
  // Convert avoid areas (lat/lng) to terrain types
  const avoidTerrain = determineTerrainTypes(avoidAreas);

  const response = await fetch('http://localhost:5000/api/optimizer/alternative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      reason,
      avoidTerrain
    })
  });
  return response.json();
}

// 7. FUEL-OPTIMIZED ROUTE - Minimize distance for fuel efficiency
export async function optimizeFuelEfficient(origin, destination, fuelCapacity) {
  // Calculate max range based on fuel
  const maxDistance = fuelCapacity * 0.8; // 80% of fuel capacity for safety

  const response = await fetch('http://localhost:5000/api/optimizer/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      constraints: {
        priority: 'DELTA',      // Cost-conscious priority
        maxDistance,            // Fuel range constraint
        avoidTerrain: ['MOUNTAIN'] // Mountains use more fuel
      }
    })
  });
  return response.json();
}

// Helper: Determine terrain types from GPS coordinates
function determineTerrainTypes(areas) {
  const terrainTypes = new Set();
  
  areas.forEach(area => {
    const lat = area.lat;
    const lng = area.lng;
    
    // Simple heuristics (in production, use terrain API)
    if (lat > 32 && lat < 36 && lng > 74 && lng < 78) {
      terrainTypes.add('MOUNTAIN'); // Himalayan region
    } else if (lat < 28 && lng > 70 && lng < 72) {
      terrainTypes.add('DESERT'); // Thar desert
    } else if (lat > 26 && lat < 30 && lng > 88 && lng < 92) {
      terrainTypes.add('FOREST'); // Northeast forests
    } else {
      terrainTypes.add('PLAIN');
    }
  });
  
  return Array.from(terrainTypes);
}

// Example usage in React component:
/*
const MyConvoyComponent = () => {
  const optimizeRoute = async () => {
    const result = await optimizeAlphaMission(
      { lat: 34.08, lng: 74.79, name: 'Srinagar' },
      { lat: 34.16, lng: 77.58, name: 'Leh' },
      { vehicleCount: 25, priority: 'ALPHA' }
    );
    
    console.log('Optimized Route:', result.data);
    console.log('Distance:', result.data.totalDistanceKm);
    console.log('Duration:', result.data.estimatedDurationHours);
    console.log('Optimizer:', result.data.optimizedBy);
  };
  
  return <button onClick={optimizeRoute}>Optimize Route</button>;
};
*/

// ============================================================
// WHAT INPUTS AFFECT OPTIMIZATION - QUICK REFERENCE
// ============================================================

/*
INPUT FACTORS THAT CHANGE THE ROUTE:

1. PRIORITY LEVEL (Most Impactful)
   - ALPHA: Gets premium routes (0.7x cost) - faster, safer
   - BRAVO: Balanced (0.85x cost)
   - CHARLIE: Standard (1.0x cost)
   - DELTA: Cost-conscious (1.15x cost) - shortest distance

2. TERRAIN TO AVOID
   - Automatically finds routes avoiding specified terrains
   - Options: MOUNTAIN, FOREST, DESERT, URBAN, PLAIN

3. MAX DISTANCE
   - Hard constraint - won't consider routes over this limit
   - Forces optimizer to find shorter alternatives

4. VEHICLE CAPACITY
   - Currently not heavily used, but can affect route selection
   - Future: will check road capacity vs convoy size

5. MAX ELEVATION
   - Limits routes to certain elevation ranges
   - Good for weather-based routing

6. WAYPOINTS
   - Forces route to pass through specific points
   - Changes optimization from simple A→B to A→W1→W2→B

EXAMPLE IMPACT:

Route: Srinagar → Leh

Without constraints:
- Distance: 412 km
- Route: Direct via NH-1

With priority=ALPHA, avoidTerrain=['MOUNTAIN']:
- Distance: 480 km (longer)
- Route: Takes detour via plains
- Reason: Safer route worth extra distance for ALPHA priority

With priority=DELTA, maxDistance=400:
- Distance: 398 km (shortest possible)
- Route: Most direct path regardless of terrain
- Reason: DELTA prioritizes distance over safety
*/
