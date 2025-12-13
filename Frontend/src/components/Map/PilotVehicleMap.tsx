'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { usePilotVehicleStore } from '@/store/pilotVehicleStore';
import { Hazard } from '@/types/pilotVehicle';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function PilotVehicleMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pilotMarker = useRef<mapboxgl.Marker | null>(null);
  const hazardMarkers = useRef<mapboxgl.Marker[]>([]);
  const checkpointMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { pilotVehicleData, cameraMode, setSelectedHazard } = usePilotVehicleStore();

  // Initialize Map with 3D terrain
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // 3D satellite view
      center: [77.5946, 12.9716], // Default: Bangalore
      zoom: 12,
      pitch: 60, // 3D angle
      bearing: 0,
      antialias: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D terrain with exaggeration for dramatic effect
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add atmospheric sky layer for realism
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Add 3D buildings layer
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
      )?.id;

      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update route and markers when data changes
  useEffect(() => {
    if (!map.current || !pilotVehicleData || !mapLoaded) return;

    const currentMap = map.current;
    if (!currentMap) return;

    // Clear existing markers
    hazardMarkers.current.forEach((m) => m.remove());
    checkpointMarkers.current.forEach((m) => m.remove());
    hazardMarkers.current = [];
    checkpointMarkers.current = [];

    // Draw route with 3D effect
    const routeCoordinates = pilotVehicleData.route?.flatMap((seg) => [
      [seg.start.lng, seg.start.lat],
      [seg.end.lng, seg.end.lat],
    ]) || [];

    if (routeCoordinates.length === 0) return;

    try {
      if (!currentMap || !currentMap.getSource) return;

      // Remove existing route layers
      if (currentMap.getLayer('route-outline')) currentMap.removeLayer('route-outline');
      if (currentMap.getLayer('route-main')) currentMap.removeLayer('route-main');
      if (currentMap.getSource('route')) currentMap.removeSource('route');

      // Add route source
      currentMap.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        },
      });

      // Add route outline for depth effect
      currentMap.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#000',
          'line-width': 8,
          'line-opacity': 0.4,
          'line-blur': 2,
        },
      });

      // Add main route line with gradient effect
      currentMap.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#00FF00',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });

      // Add hazard markers with 3D effect
      if (pilotVehicleData.hazards && Array.isArray(pilotVehicleData.hazards)) {
        pilotVehicleData.hazards.forEach((hazard) => {
          if (!hazard.position || !currentMap) return;

          const el = createHazardElement(hazard);
          el.addEventListener('click', () => setSelectedHazard(hazard));

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([hazard.position.lng, hazard.position.lat])
            .addTo(currentMap);

          hazardMarkers.current.push(marker);
        });
      }

      // Add checkpoint markers
      if (pilotVehicleData.checkpoints && Array.isArray(pilotVehicleData.checkpoints)) {
        pilotVehicleData.checkpoints.forEach((checkpoint) => {
          if (!checkpoint.position || !currentMap) return;

          const el = createCheckpointElement(checkpoint.status);

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([checkpoint.position.lng, checkpoint.position.lat])
            .addTo(currentMap);

          checkpointMarkers.current.push(marker);
        });
      }

      // Fit bounds to route with cinematic animation
      if (currentMap && routeCoordinates.length > 0) {
        try {
          const validCoords = routeCoordinates.every(coord =>
            Array.isArray(coord) && coord.length === 2 &&
            typeof coord[0] === 'number' && typeof coord[1] === 'number'
          );

          if (!validCoords) {
            console.warn('Invalid route coordinates, skipping fitBounds');
            return;
          }

          const bounds = new mapboxgl.LngLatBounds();
          routeCoordinates.forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });

          setTimeout(() => {
            try {
              if (currentMap && typeof currentMap.fitBounds === 'function' && !currentMap._removed) {
                currentMap.fitBounds(bounds, {
                  padding: 100,
                  duration: 1200, // Faster initial transition
                  maxZoom: 14,
                  pitch: 60, // Maintain 3D view
                  bearing: 0
                });
              }
            } catch (err) {
              console.debug('Could not fit bounds (non-critical):', err);
            }
          }, 200);
        } catch (error) {
          console.debug('Error preparing bounds (non-critical):', error);
        }
      }
    } catch (error) {
      console.error('Error updating map route:', error);
    }
  }, [pilotVehicleData, setSelectedHazard, mapLoaded]);

  // Update pilot vehicle position with smooth 3D movement
  const lastCameraUpdate = useRef<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!map.current || !pilotVehicleData || !mapLoaded) return;

    const { currentPosition } = pilotVehicleData;

    if (!pilotMarker.current) {
      const el = createPilotVehicleElement();
      pilotMarker.current = new mapboxgl.Marker({
        element: el,
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(map.current);
    } else {
      // Smoothly update position
      pilotMarker.current.setLngLat([currentPosition.lng, currentPosition.lat]);

      // Rotate the entire marker to show direction of travel
      const el = pilotMarker.current.getElement();
      if (el) {
        // Apply rotation to the marker element
        el.style.transform = `rotate(${currentPosition.heading}deg)`;
        el.style.transition = 'transform 0.3s ease-out';
      }
    }

    // Follow camera with smooth movement - only update if position changed significantly
    if (cameraMode === 'FOLLOW' && map.current) {
      const lastPos = lastCameraUpdate.current;
      const distanceMoved = lastPos
        ? Math.sqrt(
          Math.pow(currentPosition.lng - lastPos.lng, 2) +
          Math.pow(currentPosition.lat - lastPos.lat, 2)
        )
        : 1; // Force first update

      // Only update camera if moved more than ~10 meters (0.0001 degrees ≈ 11m)
      if (distanceMoved > 0.0001) {
        lastCameraUpdate.current = { lng: currentPosition.lng, lat: currentPosition.lat };

        // Use flyTo with smooth easing for professional camera movement
        map.current.flyTo({
          center: [currentPosition.lng, currentPosition.lat],
          duration: 800, // Shorter duration for smoother updates
          pitch: 60, // Maintain 3D view
          bearing: currentPosition.heading, // Rotate map to match direction of travel
          essential: true,
          easing: (t) => t * (2 - t), // Smooth ease-out
        });
      }
    }
  }, [pilotVehicleData?.currentPosition, cameraMode, pilotVehicleData, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-slateDepth">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slateDepth">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amberCommand mx-auto mb-4"></div>
            <p className="text-textNeutral text-sm">Loading 3D Map...</p>
            <p className="text-textNeutral/50 text-xs mt-2">
              {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && '⚠️ Mapbox token not configured'}
            </p>
          </div>
        </div>
      )}

      {/* No Data Warning */}
      {!pilotVehicleData && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slateDepth/90">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-textNeutral text-lg mb-2">No Route Data</p>
            <p className="text-textNeutral/50 text-sm">Select a convoy to display the route</p>
          </div>
        </div>
      )}

      {/* Speed & Heading Display */}
      {pilotVehicleData && mapLoaded && pilotVehicleData.currentPosition && (
        <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-amberCommand/30 shadow-xl z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase">Speed</div>
              <div className="text-2xl font-bold">
                {(pilotVehicleData.currentPosition.speed ?? 0).toFixed(0)}
                <span className="text-sm ml-1">km/h</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div>
              <div className="text-xs text-gray-400 uppercase">Heading</div>
              <div className="text-2xl font-bold">
                {(pilotVehicleData.currentPosition.heading ?? 0).toFixed(0)}°
              </div>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div>
              <div className="text-xs text-gray-400 uppercase">Distance</div>
              <div className="text-2xl font-bold">
                {(pilotVehicleData.currentPosition.distance ?? 0).toFixed(1)}
                <span className="text-sm ml-1">km</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D View Indicator */}
      {mapLoaded && pilotVehicleData && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-2 rounded-lg backdrop-blur-sm text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              3D MAP ACTIVE
            </div>
          </div>
          {pilotVehicleData.metadata?.usingMapboxRoute && (
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-400 px-3 py-2 rounded-lg backdrop-blur-sm text-xs font-semibold">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                REAL MAPBOX ROUTE
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Mode Toggle */}
      {mapLoaded && pilotVehicleData && (
        <div className="absolute top-4 right-20 z-10">
          <div className="bg-black/80 border border-panelNight/40 rounded-lg px-3 py-2 text-xs text-textNeutral/70">
            {cameraMode === 'FOLLOW' ? '📹 Following' : '🔓 Free View'}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function createPilotVehicleElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'pilot-vehicle-marker';
  el.style.width = '60px';
  el.style.height = '60px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.transition = 'transform 0.3s ease-out';

  // Google Maps style location cursor
  el.innerHTML = `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));">
      <!-- Outer pulsing circle (accuracy indicator) -->
      <circle cx="30" cy="30" r="26" fill="#4285F4" opacity="0.15">
        <animate attributeName="r" values="26;28;26" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.15;0.08;0.15" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      <!-- Middle glow circle -->
      <circle cx="30" cy="30" r="18" fill="#4285F4" opacity="0.25"/>
      
      <!-- Main blue dot -->
      <circle cx="30" cy="30" r="12" fill="#4285F4"/>
      
      <!-- White border for contrast -->
      <circle cx="30" cy="30" r="12" fill="none" stroke="white" stroke-width="2.5"/>
      
      <!-- Directional arrow/cone (points upward, will rotate with heading) -->
      <g transform="translate(30, 30)">
        <!-- Shadow for depth -->
        <path d="M 0,-14 L 6,2 L 0,-2 L -6,2 Z" fill="rgba(0,0,0,0.2)" transform="translate(1, 1)"/>
        
        <!-- White directional arrow -->
        <path d="M 0,-14 L 6,2 L 0,-2 L -6,2 Z" fill="white" stroke="#4285F4" stroke-width="1.5"/>
        
        <!-- Inner blue accent -->
        <path d="M 0,-12 L 4,0 L 0,-1 L -4,0 Z" fill="#4285F4"/>
      </g>
      
      <!-- Center white dot for precision -->
      <circle cx="30" cy="30" r="3" fill="white"/>
    </svg>
  `;
  return el;
}

function createHazardElement(hazard: Hazard): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'hazard-marker cursor-pointer';
  el.style.width = '40px';
  el.style.height = '40px';

  const colors = {
    LOW: '#FFA500',
    MEDIUM: '#FF6B00',
    HIGH: '#FF0000',
    CRITICAL: '#8B0000',
  };

  const color = colors[hazard.severity];

  el.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.3" class="animate-pulse"/>
      <circle cx="20" cy="20" r="14" fill="${color}" opacity="0.8"/>
      <path d="M20 12 L20 22 M20 26 L20 27" stroke="white" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
  return el;
}

function createCheckpointElement(status: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'checkpoint-marker';
  el.style.width = '36px';
  el.style.height = '36px';

  const colors = {
    PENDING: '#9CA3AF',
    REACHED: '#FBBF24',
    PASSED: '#10B981',
  };

  const color = colors[status as keyof typeof colors] || colors.PENDING;

  // Flag SVG icon instead of circle
  el.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Flag pole -->
      <line x1="8" y1="6" x2="8" y2="32" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Flag -->
      <path d="M8 6 L28 6 Q30 6 30 8 L30 16 Q30 18 28 18 L8 18 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
      ${status === 'PASSED' ? '<path d="M13 11 L16 14 L23 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
      ${status === 'REACHED' ? '<circle cx="18" cy="12" r="2" fill="white"/>' : ''}
      <!-- Base -->
      <ellipse cx="8" cy="32" rx="4" ry="1.5" fill="${color}" opacity="0.5"/>
    </svg>
  `;
  return el;
}
