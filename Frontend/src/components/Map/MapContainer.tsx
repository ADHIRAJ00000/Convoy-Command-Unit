'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Convoy } from '@/types/convoy';
import type { OperationEvent } from '@/types/event';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_STYLE,
  buildSegmentCollection,
  ensureBaseSources,
  updateConvoyDataOnMap,
} from '@/lib/map';
import type { Route } from '@/types/route';

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
mapboxgl.accessToken = mapboxToken;

// Map style options
const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  terrain: 'mapbox://styles/mapbox/satellite-v9',
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

export type MapContainerProps = {
  convoys: Convoy[];
  selectedConvoy?: Convoy | null;
  livePositions?: Record<string, [number, number]>;
  activeEvents?: OperationEvent[];
  highContrast?: boolean;
  onRouteClick?: (segmentId: string) => void;
  alternatives?: {
    id?: string;
    label?: string;
    route: Route;
    display?: { primaryStroke?: string; secondaryStroke?: string; isFastest?: boolean; isActive?: boolean };
    comparison?: { delayMinutes?: number };
  }[];
  focusCheckpoint?: {
    lat: number;
    lng: number;
    name: string;
  } | null;
};

const MissingTokenNotice = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-amberCommand/60 bg-panelNight/70 p-6 text-center text-sm">
    <p className="font-semibold text-amberCommand">Map token not configured.</p>
    <ol className="list-decimal text-left text-xs leading-relaxed text-textNeutral/80">
      <li>Create a Mapbox account (free tier is fine).</li>
      <li>Generate a public token and copy it.</li>
      <li>
        Create <code>.env.local</code> in project root and add:
        <br />
        <code>NEXT_PUBLIC_MAPBOX_TOKEN=YOUR_TOKEN</code>
      </li>
      <li>Restart <code>npm run dev</code>.</li>
    </ol>
  </div>
);

const BusySpinner = () => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-amberCommand border-t-transparent" aria-label="Loading map tiles" />
  </div>
);

export const MapContainer = ({
  convoys,
  selectedConvoy,
  livePositions,
  activeEvents,
  highContrast,
  onRouteClick,
  alternatives,
  focusCheckpoint,
}: MapContainerProps) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(() =>
    mapboxToken ? null : 'Missing NEXT_PUBLIC_MAPBOX_TOKEN',
  );
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleKey>('satellite');
  const checkpointMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const currentRoute: Route | undefined = selectedConvoy?.assignedRoute;

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxToken) {
      return;
    }

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAP_STYLES[currentMapStyle],
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
        attributionControl: false,
      });

      mapRef.current = map;
      map.on('load', () => {
        setIsLoaded(true);
        ensureBaseSources(map);
        map.resize();
      });
    } catch (error) {
      console.error('Mapbox init error', error);
      requestAnimationFrame(() => setMapError('Unable to initialize Mapbox.'));
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [currentMapStyle]);

  // Handle map style changes
  const handleStyleChange = (styleKey: MapStyleKey) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    setIsLoaded(false);
    setCurrentMapStyle(styleKey);
    map.setStyle(MAP_STYLES[styleKey]);
    
    map.once('style.load', () => {
      setIsLoaded(true);
      ensureBaseSources(map);
      updateConvoyDataOnMap(map, convoys, currentRoute, livePositions, alternatives);
    });
  };

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;
    const route = currentRoute;
    updateConvoyDataOnMap(map, convoys, route, livePositions, alternatives);

    if (route && route.polyline.length) {
      const focusCoordinate = route.polyline[Math.floor(route.polyline.length / 2)];
      map.flyTo({ center: focusCoordinate, zoom: 5.3, speed: 0.6 });
    }
  }, [alternatives, convoys, currentRoute, livePositions, isLoaded]);

  useEffect(() => {
    if (!mapRef.current || !currentRoute || !onRouteClick) return;
    const map = mapRef.current;
    const layerId = 'convoy-routes-line';

    const handleClick = (event: mapboxgl.MapLayerMouseEvent) => {
      const segmentId = event.features?.[0]?.properties?.segmentId as string | undefined;
      if (!segmentId) return;
      const segment = currentRoute.segments.find((seg) => seg.id === segmentId);
      if (!segment) return;

      new mapboxgl.Popup()
        .setLngLat(event.lngLat)
        .setHTML(
          `<div>
            <p class="text-sm font-semibold">${segment.terrain} terrain</p>
            <p class="text-xs">Recommended ${segment.recommendedSpeedKmph} km/h</p>
            <p class="text-xs">Difficulty: ${segment.difficulty}</p>
          </div>`,
        )
        .addTo(map);

      onRouteClick(segmentId);
    };

    map.on('click', layerId, handleClick);
    return () => {
      map.off('click', layerId, handleClick);
    };
  }, [currentRoute, onRouteClick]);

  useEffect(() => {
    if (!mapRef.current || !currentRoute || !isLoaded) return;
    const map = mapRef.current;
    const layerId = 'convoy-routes-line';
    const source = map.getSource('convoy-routes') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const data = buildSegmentCollection(currentRoute);
    source.setData(data);

    if (highContrast) {
      map.setPaintProperty(layerId, 'line-color', '#fcd34d');
    } else {
      map.setPaintProperty(layerId, 'line-color', ['get', 'color']);
    }
  }, [currentRoute, highContrast, isLoaded]);

  // Handle checkpoint focus
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !focusCheckpoint) return;
    
    const map = mapRef.current;
    
    // Remove existing checkpoint marker if any
    if (checkpointMarkerRef.current) {
      checkpointMarkerRef.current.remove();
    }
    
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'checkpoint-marker';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.borderRadius = '50%';
    el.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    el.style.border = '3px solid #fff';
    el.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.6)';
    el.style.cursor = 'pointer';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '20px';
    el.innerHTML = '📍';
    
    // Add pulsing animation
    el.style.animation = 'pulse 2s infinite';
    
    // Add CSS animation if not already present
    if (!document.getElementById('checkpoint-marker-styles')) {
      const style = document.createElement('style');
      style.id = 'checkpoint-marker-styles';
      style.innerHTML = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create and add the marker
    const marker = new mapboxgl.Marker(el)
      .setLngLat([focusCheckpoint.lng, focusCheckpoint.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(
            `<div style="padding: 8px;">
              <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #fbbf24;">📍 ${focusCheckpoint.name}</h3>
              <p style="font-size: 12px; color: #94a3b8;">Lat: ${focusCheckpoint.lat.toFixed(6)}</p>
              <p style="font-size: 12px; color: #94a3b8;">Lng: ${focusCheckpoint.lng.toFixed(6)}</p>
            </div>`
          )
      )
      .addTo(map);
    
    checkpointMarkerRef.current = marker;
    
    // Fly to the checkpoint location with smooth animation
    map.flyTo({
      center: [focusCheckpoint.lng, focusCheckpoint.lat],
      zoom: 12,
      speed: 1.2,
      curve: 1.5,
      essential: true,
    });
    
    // Show the popup automatically after a short delay
    setTimeout(() => {
      marker.togglePopup();
    }, 800);
    
  }, [focusCheckpoint, isLoaded]);

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      if (checkpointMarkerRef.current) {
        checkpointMarkerRef.current.remove();
      }
    };
  }, []);

  if (mapError) {
    return <MissingTokenNotice />;
  }

  return (
    <div className="relative h-full w-full rounded-2xl border border-oliveAux/30 bg-panelNight shadow-command">
      {!isLoaded && <BusySpinner />}
      
      {/* Map Style Switcher */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <div className="rounded-xl border border-panelNight/40 bg-panelNight/90 backdrop-blur-sm p-2 shadow-lg">
          <p className="text-[10px] uppercase tracking-wider text-textNeutral/60 mb-2 px-2">Map Style</p>
          <div className="flex flex-col gap-1">
            {Object.entries(MAP_STYLES).map(([key, _]) => (
              <button
                key={key}
                onClick={() => handleStyleChange(key as MapStyleKey)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                  currentMapStyle === key
                    ? 'bg-amberCommand text-black font-semibold'
                    : 'bg-slateDepth/50 text-textNeutral/70 hover:bg-slateDepth hover:text-textNeutral'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="map-container h-full w-full rounded-2xl"
        aria-label="Operational map"
        role="img"
      />
      
      {activeEvents && activeEvents.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 text-xs">
          {activeEvents.slice(0, 3).map((event) => (
            <span
              key={event.id}
              className="rounded-full bg-dangerAlert/20 px-3 py-1 text-dangerAlert"
            >
              ⚠ {event.type} · {event.payload.severity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapContainer;
