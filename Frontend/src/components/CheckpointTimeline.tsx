'use client';

import { useState } from 'react';
import type { Convoy } from '@/types/convoy';

interface CheckpointData {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'CLEARED' | 'PENDING' | 'DELAYED' | 'BLOCKED';
  eta: string;
  actualTime?: string;
  distanceFromOrigin: number;
  terrain: 'MOUNTAIN' | 'PLAIN' | 'URBAN' | 'DESERT';
  conditions: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  facilities: string[];
  notes?: string;
}

interface CheckpointTimelineProps {
  convoy: Convoy | null;
  onViewOnMap?: (checkpoint: { lat: number; lng: number; name: string }) => void;
}

// Generate comprehensive checkpoint data for the selected convoy
const generateCheckpoints = (convoy: Convoy | null): CheckpointData[] => {
  if (!convoy || !convoy.assignedRoute) return [];

  const checkpoints: CheckpointData[] = [];
  
  // Add origin as first checkpoint
  checkpoints.push({
    id: 'cp-origin',
    name: convoy.origin.name || 'Origin Point',
    location: {
      lat: convoy.origin.lat,
      lng: convoy.origin.lng,
      address: `${convoy.origin.name || 'Origin'} Base Camp`,
    },
    status: 'CLEARED',
    eta: new Date(Date.now() - 2 * 3600000).toISOString(),
    actualTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    distanceFromOrigin: 0,
    terrain: 'URBAN',
    conditions: 'Clear weather, good visibility',
    riskLevel: 'LOW',
    facilities: ['Fuel Station', 'Medical Post', 'Communication Hub'],
    notes: 'Departure point - All systems operational',
  });

  // Use actual checkpoints from the route if available
  if (convoy.assignedRoute.checkpoints && convoy.assignedRoute.checkpoints.length > 0) {
    convoy.assignedRoute.checkpoints.forEach((checkpoint, index) => {
      // Calculate distance from origin using the checkpoint's location
      const distanceFromOrigin = checkpoint.location 
        ? calculateDistance(convoy.origin, checkpoint.location)
        : (convoy.assignedRoute!.distanceKm * ((index + 1) / (convoy.assignedRoute!.checkpoints.length + 1)));

      // Determine terrain based on location (basic heuristic)
      const terrain = determineTerrainFromLocation(checkpoint.location || convoy.origin);
      
      // Calculate risk level based on distance and terrain
      const riskLevel = calculateRiskLevel(distanceFromOrigin, terrain, convoy.assignedRoute!.riskScore);

      checkpoints.push({
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location ? {
          lat: checkpoint.location.lat,
          lng: checkpoint.location.lng,
          address: checkpoint.name,
        } : {
          lat: convoy.origin.lat + (convoy.destination.lat - convoy.origin.lat) * ((index + 1) / (convoy.assignedRoute!.checkpoints.length + 1)),
          lng: convoy.origin.lng + (convoy.destination.lng - convoy.origin.lng) * ((index + 1) / (convoy.assignedRoute!.checkpoints.length + 1)),
          address: checkpoint.name,
        },
        status: checkpoint.status === 'CLEARED' ? 'CLEARED' : 'PENDING',
        eta: checkpoint.eta,
        actualTime: checkpoint.loggedAt,
        distanceFromOrigin: Math.round(distanceFromOrigin),
        terrain,
        conditions: getConditionsForTerrain(terrain),
        riskLevel,
        facilities: getFacilitiesForCheckpoint(terrain, index),
        notes: generateCheckpointNotes(checkpoint.status, terrain, index),
      });
    });
  } else {
    // Fallback: Generate checkpoints from route polyline if no checkpoints are defined
    const polyline = convoy.assignedRoute.polyline;
    const etaHours = convoy.etaHours || 8;
    const numCheckpoints = Math.min(Math.max(Math.floor(etaHours / 2), 2), 8);
    const interval = Math.floor(polyline.length / (numCheckpoints + 1));

    for (let i = 1; i <= numCheckpoints; i++) {
      const index = i * interval;
      if (index < polyline.length) {
        const [lng, lat] = polyline[index];
        const distanceFromOrigin = (convoy.assignedRoute.distanceKm * i) / (numCheckpoints + 1);
        const etaOffset = (etaHours / (numCheckpoints + 1)) * i;
        const terrain = determineTerrainFromLocation({ lat, lng });
        const riskLevel = calculateRiskLevel(distanceFromOrigin, terrain, convoy.assignedRoute.riskScore);

        checkpoints.push({
          id: `cp-${i}`,
          name: `Checkpoint ${i}`,
          location: {
            lat,
            lng,
            address: `Waypoint ${i} - ${terrain} region`,
          },
          status: 'PENDING',
          eta: new Date(Date.now() + etaOffset * 3600000).toISOString(),
          distanceFromOrigin: Math.round(distanceFromOrigin),
          terrain,
          conditions: getConditionsForTerrain(terrain),
          riskLevel,
          facilities: getFacilitiesForCheckpoint(terrain, i - 1),
          notes: generateCheckpointNotes('PENDING', terrain, i - 1),
        });
      }
    }
  }

  // Add destination as final checkpoint
  checkpoints.push({
    id: 'cp-destination',
    name: convoy.destination.name || 'Destination Point',
    location: {
      lat: convoy.destination.lat,
      lng: convoy.destination.lng,
      address: `${convoy.destination.name || 'Destination'} Base`,
    },
    status: 'PENDING',
    eta: new Date(Date.now() + (convoy.etaHours || 8) * 3600000).toISOString(),
    distanceFromOrigin: convoy.assignedRoute?.distanceKm || 0,
    terrain: 'URBAN',
    conditions: 'Destination facility ready',
    riskLevel: 'LOW',
    facilities: ['Unloading Bay', 'Storage Facility', 'Command Center', 'Medical Center'],
    notes: 'Final destination - Mission completion',
  });

  return checkpoints;
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => degrees * (Math.PI / 180);

// Helper function to determine terrain from coordinates
const determineTerrainFromLocation = (location: { lat: number; lng: number }): CheckpointData['terrain'] => {
  const { lat, lng } = location;
  
  // Mountain regions (Himalayas, etc.)
  if (lat > 28 && lat < 36 && lng > 73 && lng < 95) {
    return 'MOUNTAIN';
  }
  
  // Desert regions (Rajasthan, etc.)
  if (lat > 24 && lat < 30 && lng > 69 && lng < 76) {
    return 'DESERT';
  }
  
  // Urban/Plain regions
  return 'PLAIN';
};

// Helper function to calculate risk level
const calculateRiskLevel = (
  distanceFromOrigin: number,
  terrain: CheckpointData['terrain'],
  routeRiskScore: number
): CheckpointData['riskLevel'] => {
  let riskValue = routeRiskScore / 100;
  
  if (terrain === 'MOUNTAIN') riskValue += 0.3;
  else if (terrain === 'DESERT') riskValue += 0.2;
  
  if (distanceFromOrigin > 300) riskValue += 0.1;
  else if (distanceFromOrigin > 150) riskValue += 0.05;
  
  if (riskValue > 0.7) return 'CRITICAL';
  if (riskValue > 0.5) return 'HIGH';
  if (riskValue > 0.3) return 'MEDIUM';
  return 'LOW';
};

// Helper function to get conditions based on terrain
const getConditionsForTerrain = (terrain: CheckpointData['terrain']): string => {
  switch (terrain) {
    case 'MOUNTAIN':
      return 'Mountainous terrain, reduced visibility, icy conditions possible';
    case 'DESERT':
      return 'High temperature, sandstorm risk, limited visibility';
    case 'URBAN':
      return 'Urban area, moderate traffic, good infrastructure';
    case 'PLAIN':
      return 'Open terrain, good visibility, moderate conditions';
    default:
      return 'Standard conditions';
  }
};

// Helper function to get facilities for checkpoint
const getFacilitiesForCheckpoint = (terrain: CheckpointData['terrain'], index: number): string[] => {
  const baseFacilities = ['Communication Hub', 'Rest Area'];
  
  if (terrain === 'MOUNTAIN') {
    return [...baseFacilities, 'Emergency Shelter', 'Medical Post', 'Weather Station'];
  }
  
  if (terrain === 'DESERT') {
    return [...baseFacilities, 'Water Station', 'Fuel Depot', 'Shade Shelter'];
  }
  
  if (terrain === 'URBAN') {
    return [...baseFacilities, 'Fuel Station', 'Medical Facility', 'Security Post'];
  }
  
  return [...baseFacilities, 'Inspection Point'];
};

// Helper function to generate notes for checkpoint
const generateCheckpointNotes = (status: string, terrain: CheckpointData['terrain'], index: number): string => {
  if (status === 'CLEARED') {
    return 'Checkpoint cleared - Convoy proceeding as scheduled';
  }
  
  if (terrain === 'MOUNTAIN') {
    return 'Monitor altitude and weather conditions - Reduced speed advised';
  }
  
  if (terrain === 'DESERT') {
    return 'High temperature zone - Ensure adequate water and fuel supplies';
  }
  
  return 'Standard checkpoint - Monitor convoy progress';
};

export const CheckpointTimeline: React.FC<CheckpointTimelineProps> = ({ convoy, onViewOnMap }) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<CheckpointData | null>(null);
  const checkpoints = generateCheckpoints(convoy);

  if (!convoy) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-textNeutral/50">Select a convoy to view checkpoint timeline</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amberCommand/40 scrollbar-track-panelNight/20">
        {checkpoints.map((checkpoint, index) => (
          <button
            key={checkpoint.id}
            onClick={() => setSelectedCheckpoint(checkpoint)}
            className={`relative min-w-[180px] rounded-xl border-2 p-4 text-left transition-all hover:scale-105 hover:shadow-lg ${
              checkpoint.status === 'CLEARED'
                ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500'
                : checkpoint.status === 'BLOCKED'
                ? 'border-red-500/40 bg-red-500/10 hover:border-red-500'
                : checkpoint.status === 'DELAYED'
                ? 'border-yellow-500/40 bg-yellow-500/10 hover:border-yellow-500'
                : 'border-panelNight/40 bg-slateDepth/70 hover:border-amberCommand/60'
            }`}
          >
            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                  checkpoint.status === 'CLEARED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : checkpoint.status === 'BLOCKED'
                    ? 'bg-red-500/20 text-red-400'
                    : checkpoint.status === 'DELAYED'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {checkpoint.status}
              </span>
            </div>

            {/* Checkpoint Number */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  checkpoint.status === 'CLEARED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amberCommand/20 text-amberCommand'
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-textNeutral line-clamp-1">{checkpoint.name}</h4>
              </div>
            </div>

            {/* Location */}
            <div className="mb-2">
              <p className="text-[9px] uppercase text-textNeutral/50 mb-0.5">Location</p>
              <p className="text-xs text-textNeutral/70 font-mono">
                {checkpoint.location.lat.toFixed(4)}, {checkpoint.location.lng.toFixed(4)}
              </p>
            </div>

            {/* Distance */}
            <div className="mb-2">
              <p className="text-[9px] uppercase text-textNeutral/50 mb-0.5">Distance</p>
              <p className="text-xs font-semibold text-textNeutral">{checkpoint.distanceFromOrigin} km</p>
            </div>

            {/* Time */}
            <div>
              <p className="text-[9px] uppercase text-textNeutral/50 mb-0.5">
                {checkpoint.actualTime ? 'Passed At' : 'ETA'}
              </p>
              <p className="text-xs text-amberCommand font-semibold">
                {new Date(checkpoint.actualTime || checkpoint.eta).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Risk Indicator */}
            <div className="mt-2 pt-2 border-t border-panelNight/40">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase text-textNeutral/50">Risk</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                    checkpoint.riskLevel === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400'
                      : checkpoint.riskLevel === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-400'
                      : checkpoint.riskLevel === 'MEDIUM'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {checkpoint.riskLevel}
                </span>
              </div>
            </div>

            {/* Click indicator */}
            <div className="mt-2 text-center">
              <span className="text-[9px] text-textNeutral/40">Click for details →</span>
            </div>
          </button>
        ))}
      </div>

      {/* Checkpoint Detail Modal */}
      {selectedCheckpoint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedCheckpoint(null)}
        >
          <div
            className="relative max-w-2xl w-full mx-4 rounded-2xl border-2 border-amberCommand/40 bg-panelNight shadow-2xl shadow-amberCommand/20 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-panelNight/40 bg-panelNight/95 backdrop-blur-sm px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
                      selectedCheckpoint.status === 'CLEARED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amberCommand/20 text-amberCommand'
                    }`}
                  >
                    {checkpoints.findIndex((cp) => cp.id === selectedCheckpoint.id) + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amberCommand">{selectedCheckpoint.name}</h3>
                    <p className="text-sm text-textNeutral/60">{selectedCheckpoint.location.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCheckpoint(null)}
                  className="rounded-lg p-2 text-textNeutral/60 hover:bg-panelNight/60 hover:text-textNeutral transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div
                className={`rounded-xl border-2 p-4 ${
                  selectedCheckpoint.status === 'CLEARED'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : selectedCheckpoint.status === 'BLOCKED'
                    ? 'border-red-500/40 bg-red-500/10'
                    : selectedCheckpoint.status === 'DELAYED'
                    ? 'border-yellow-500/40 bg-yellow-500/10'
                    : 'border-blue-500/40 bg-blue-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-textNeutral/60 mb-1">Checkpoint Status</p>
                    <p className="text-2xl font-bold text-textNeutral">{selectedCheckpoint.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-textNeutral/60 mb-1">Risk Level</p>
                    <p
                      className={`text-xl font-bold ${
                        selectedCheckpoint.riskLevel === 'CRITICAL'
                          ? 'text-red-400'
                          : selectedCheckpoint.riskLevel === 'HIGH'
                          ? 'text-orange-400'
                          : selectedCheckpoint.riskLevel === 'MEDIUM'
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedCheckpoint.riskLevel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div className="rounded-xl border border-panelNight/40 bg-slateDepth/50 p-4">
                <h4 className="text-sm font-semibold text-amberCommand mb-3">📍 Location Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-textNeutral/50 mb-1">Latitude</p>
                    <p className="text-base font-mono font-semibold text-textNeutral">
                      {selectedCheckpoint.location.lat.toFixed(6)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-textNeutral/50 mb-1">Longitude</p>
                    <p className="text-base font-mono font-semibold text-textNeutral">
                      {selectedCheckpoint.location.lng.toFixed(6)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-textNeutral/50 mb-1">Distance from Origin</p>
                    <p className="text-base font-semibold text-textNeutral">
                      {selectedCheckpoint.distanceFromOrigin} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-textNeutral/50 mb-1">Terrain Type</p>
                    <p className="text-base font-semibold text-textNeutral">{selectedCheckpoint.terrain}</p>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div className="rounded-xl border border-panelNight/40 bg-slateDepth/50 p-4">
                <h4 className="text-sm font-semibold text-amberCommand mb-3">⏱️ Timing Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-textNeutral/70">Expected Arrival Time</span>
                    <span className="text-base font-semibold text-textNeutral">
                      {new Date(selectedCheckpoint.eta).toLocaleString()}
                    </span>
                  </div>
                  {selectedCheckpoint.actualTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-textNeutral/70">Actual Arrival Time</span>
                      <span className="text-base font-semibold text-emerald-400">
                        {new Date(selectedCheckpoint.actualTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedCheckpoint.actualTime && (
                    <div className="flex items-center justify-between pt-2 border-t border-panelNight/40">
                      <span className="text-sm text-textNeutral/70">Time Difference</span>
                      <span
                        className={`text-base font-semibold ${
                          new Date(selectedCheckpoint.actualTime).getTime() <
                          new Date(selectedCheckpoint.eta).getTime()
                            ? 'text-emerald-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {Math.abs(
                          Math.round(
                            (new Date(selectedCheckpoint.actualTime).getTime() -
                              new Date(selectedCheckpoint.eta).getTime()) /
                              60000,
                          ),
                        )}{' '}
                        min{' '}
                        {new Date(selectedCheckpoint.actualTime).getTime() < new Date(selectedCheckpoint.eta).getTime()
                          ? 'early'
                          : 'late'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div className="rounded-xl border border-panelNight/40 bg-slateDepth/50 p-4">
                <h4 className="text-sm font-semibold text-amberCommand mb-2">🌤️ Current Conditions</h4>
                <p className="text-sm text-textNeutral">{selectedCheckpoint.conditions}</p>
              </div>

              {/* Facilities */}
              <div className="rounded-xl border border-panelNight/40 bg-slateDepth/50 p-4">
                <h4 className="text-sm font-semibold text-amberCommand mb-3">🏢 Available Facilities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCheckpoint.facilities.map((facility, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-panelNight/40 px-3 py-2 text-xs text-textNeutral"
                    >
                      <span className="text-emerald-400">✓</span>
                      <span>{facility}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedCheckpoint.notes && (
                <div className="rounded-xl border border-amberCommand/40 bg-amberCommand/5 p-4">
                  <h4 className="text-sm font-semibold text-amberCommand mb-2">📝 Additional Notes</h4>
                  <p className="text-sm text-textNeutral/80">{selectedCheckpoint.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (onViewOnMap) {
                      onViewOnMap({
                        lat: selectedCheckpoint.location.lat,
                        lng: selectedCheckpoint.location.lng,
                        name: selectedCheckpoint.name,
                      });
                    }
                    setSelectedCheckpoint(null);
                  }}
                  className="flex-1 rounded-lg bg-amberCommand px-6 py-3 text-sm font-semibold text-black transition hover:bg-amberCommand/90"
                >
                  📍 View on Map
                </button>
                <button
                  onClick={() => setSelectedCheckpoint(null)}
                  className="rounded-lg border border-panelNight/40 px-6 py-3 text-sm text-textNeutral hover:bg-panelNight/40 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
