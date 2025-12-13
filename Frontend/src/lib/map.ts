import type mapboxgl from 'mapbox-gl';
import type { Convoy, Priority } from '@/types/convoy';
import type { Route } from '@/types/route';

export const MAP_DEFAULT_CENTER: [number, number] = [72.8777, 19.076]; // Mumbai for demo
export const MAP_DEFAULT_ZOOM = 4.4;
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

const priorityColors: Record<Priority, string> = {
  ALPHA: '#f59e0b',
  BRAVO: '#34d399',
  CHARLIE: '#60a5fa',
};

export const getPriorityColor = (priority: Priority) => priorityColors[priority];

export const segmentColor = (status: Route['segments'][number]['status'], riskLevel: number) => {
  if (status === 'BLOCKED') return '#ef4444';
  if (status === 'HIGH_RISK') return '#b58900';
  if (riskLevel > 0.5) return '#f97316';
  return '#22d3ee';
};

export const buildRouteFeature = (route: Route) => ({
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: route.polyline,
  },
  properties: {
    routeId: route.id,
    eta: route.etaHours,
    risk: route.riskScore,
  },
});

export const buildSegmentCollection = (route: Route) => ({
  type: 'FeatureCollection' as const,
  features: route.segments.map((segment) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: segment.coordinates,
    },
    properties: {
      segmentId: segment.id,
      status: segment.status,
      recommendedSpeed: segment.recommendedSpeedKmph,
      terrain: segment.terrain,
      difficulty: segment.difficulty,
      color: segmentColor(segment.status, segment.riskLevel),
    },
  })),
});

export const buildConvoyPoints = (
  convoys: Convoy[],
  positions?: Record<string, [number, number]>,
) => ({
  type: 'FeatureCollection' as const,
  features: convoys.map((convoy) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates:
        positions?.[convoy.id] ??
        convoy.assignedRoute?.polyline?.[0] ?? [convoy.origin.lng, convoy.origin.lat],
    },
    properties: {
      convoyId: convoy.id,
      priority: convoy.priority,
      status: convoy.status,
      color: getPriorityColor(convoy.priority),
    },
  })),
});

export const buildAlternativeCollection = (
  alternatives: {
    id?: string;
    label?: string;
    route: Route;
    display?: { primaryStroke?: string; secondaryStroke?: string; isFastest?: boolean; isActive?: boolean };
    comparison?: { delayMinutes?: number };
  }[],
) => ({
  type: 'FeatureCollection' as const,
  features: alternatives.map((alt, index) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: alt.route.polyline,
    },
    properties: {
      routeId: alt.id ?? alt.route.id ?? `alt-${index}`,
      label: alt.label ?? alt.route.name,
      color: alt.display?.secondaryStroke ?? '#93c5fd',
      stroke: alt.display?.primaryStroke ?? '#2563eb',
      isFastest: alt.display?.isFastest ?? false,
      isActive: alt.display?.isActive ?? false,
      delayMinutes: alt.comparison?.delayMinutes ?? 0,
    },
  })),
});

export const buildCheckpointMarkers = (route?: Route) => {
  if (!route || !route.checkpoints || route.checkpoints.length === 0) {
    return {
      type: 'FeatureCollection' as const,
      features: [],
    };
  }

  return {
    type: 'FeatureCollection' as const,
    features: route.checkpoints
      .filter(checkpoint => checkpoint.location) // Only include checkpoints with location data
      .map((checkpoint, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [checkpoint.location!.lng, checkpoint.location!.lat],
        },
        properties: {
          checkpointId: checkpoint.id,
          name: checkpoint.name,
          status: checkpoint.status,
          color: checkpoint.status === 'CLEARED' ? '#10b981' : '#3b82f6',
        },
      })),
  };
};

export const ensureBaseSources = (map: mapboxgl.Map) => {
  if (!map.getSource('convoy-routes')) {
    map.addSource('convoy-routes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('convoy-routes-line')) {
    map.addLayer({
      id: 'convoy-routes-line',
      type: 'line',
      source: 'convoy-routes',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 4,
        'line-opacity': 0.95,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }
  if (!map.getSource('convoy-markers')) {
    map.addSource('convoy-markers', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('convoy-markers-circle')) {
    map.addLayer({
      id: 'convoy-markers-circle',
      type: 'circle',
      source: 'convoy-markers',
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0f1724',
      },
    });
  }
  
  // Add checkpoint markers source and layers
  if (!map.getSource('checkpoint-markers')) {
    map.addSource('checkpoint-markers', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('checkpoint-markers-circle')) {
    map.addLayer({
      id: 'checkpoint-markers-circle',
      type: 'circle',
      source: 'checkpoint-markers',
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }
  if (!map.getLayer('checkpoint-markers-label')) {
    map.addLayer({
      id: 'checkpoint-markers-label',
      type: 'symbol',
      source: 'checkpoint-markers',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#fbbf24',
        'text-halo-color': '#0f1724',
        'text-halo-width': 2,
      },
    });
  }

  if (!map.getSource('optimizer-alternatives')) {
    map.addSource('optimizer-alternatives', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('optimizer-alt-line')) {
    map.addLayer({
      id: 'optimizer-alt-line',
      type: 'line',
      source: 'optimizer-alternatives',
      paint: {
        'line-color': ['coalesce', ['get', 'stroke'], ['get', 'color']],
        'line-width': [
          'case',
          ['==', ['get', 'isActive'], true],
          4.6,
          ['==', ['get', 'isFastest'], true],
          4,
          3,
        ],
        'line-opacity': [
          'case',
          ['==', ['get', 'isActive'], true],
          0.85,
          0.55,
        ],
        'line-dasharray': [
          'case',
          ['==', ['get', 'isFastest'], true],
          ['literal', [0.1, 1.2]],
          ['literal', [2, 2]],
        ],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }
};

export const updateConvoyDataOnMap = (
  map: mapboxgl.Map,
  convoys: Convoy[],
  selected?: Route,
  positions?: Record<string, [number, number]>,
  alternatives?: {
    id?: string;
    label?: string;
    route: Route;
    display?: { primaryStroke?: string; secondaryStroke?: string; isFastest?: boolean; isActive?: boolean };
    comparison?: { delayMinutes?: number };
  }[],
) => {
  ensureBaseSources(map);

  const routeCollection = {
    type: 'FeatureCollection' as const,
    features: selected ? buildSegmentCollection(selected).features : [],
  };

  (map.getSource('convoy-routes') as mapboxgl.GeoJSONSource)?.setData(routeCollection);
  (map.getSource('convoy-markers') as mapboxgl.GeoJSONSource)?.setData(
    buildConvoyPoints(convoys, positions),
  );
  
  // Update checkpoint markers
  const checkpointCollection = buildCheckpointMarkers(selected);
  (map.getSource('checkpoint-markers') as mapboxgl.GeoJSONSource)?.setData(checkpointCollection);

  const alternativeCollection = buildAlternativeCollection(alternatives || []);
  (map.getSource('optimizer-alternatives') as mapboxgl.GeoJSONSource)?.setData(alternativeCollection);
};
