// Vehicle Status Card Component
// Displays current pilot vehicle status and metrics

import React from 'react';
import { PilotVehiclePosition, TerrainType } from '@/types/pilotVehicle';
import { Gauge, Navigation, MapPin, Clock, Mountain } from 'lucide-react';

interface VehicleStatusCardProps {
  position: PilotVehiclePosition;
  totalDistance: number;
  currentTerrain?: TerrainType;
  lastHazardDetected?: string;
}

export const VehicleStatusCard: React.FC<VehicleStatusCardProps> = ({
  position,
  totalDistance = 0,
  currentTerrain,
  lastHazardDetected,
}) => {
  // Provide safe defaults for position properties
  const speed = position?.speed ?? 0;
  const distance = position?.distance ?? 0;
  const heading = position?.heading ?? 0;
  const lat = position?.lat ?? 0;
  const lng = position?.lng ?? 0;
  const timestamp = position?.timestamp ?? Date.now();

  const distanceRemaining = totalDistance - distance;
  const progressPercent = totalDistance > 0 ? (distance / totalDistance) * 100 : 0;

  return (
    <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 px-4 py-3 border-b border-blue-500/40">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
          <Navigation className="w-4 h-4" />
          Pilot Vehicle Status
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Speed Gauge */}
        <div className="rounded-lg bg-slateDepth/50 p-4 border border-panelNight/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-textNeutral/60 text-xs uppercase">
              <Gauge className="w-3 h-3" />
              Current Speed
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {speed} <span className="text-base text-textNeutral/60">km/h</span>
            </div>
          </div>
          <div className="w-full bg-slateDepth rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((speed / 100) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Distance Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slateDepth/50 border border-panelNight/40 p-3">
            <div className="text-[10px] uppercase text-textNeutral/50 mb-1">Distance Covered</div>
            <div className="text-xl font-bold text-textNeutral">
              {distance.toFixed(1)} <span className="text-xs text-textNeutral/60">km</span>
            </div>
          </div>
          <div className="rounded-lg bg-slateDepth/50 border border-panelNight/40 p-3">
            <div className="text-[10px] uppercase text-textNeutral/50 mb-1">Remaining</div>
            <div className="text-xl font-bold text-textNeutral">
              {distanceRemaining.toFixed(1)} <span className="text-xs text-textNeutral/60">km</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-textNeutral/60 mb-2 uppercase">
            <span>Route Progress</span>
            <span className="text-amberCommand font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slateDepth rounded-full h-3 overflow-hidden border border-panelNight/40">
            <div
              className="bg-gradient-to-r from-blue-500 via-amberCommand to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 pt-2 border-t border-panelNight/40">
          <div className="flex items-center justify-between text-sm">
            <span className="text-textNeutral/60 flex items-center gap-2 text-xs uppercase">
              <Navigation className="w-3 h-3" />
              Heading
            </span>
            <span className="text-textNeutral font-semibold">{heading}°</span>
          </div>
          {currentTerrain && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-textNeutral/60 flex items-center gap-2 text-xs uppercase">
                <Mountain className="w-3 h-3" />
                Terrain
              </span>
              <span className="text-textNeutral font-semibold">{currentTerrain}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-textNeutral/60 flex items-center gap-2 text-xs uppercase">
              <MapPin className="w-3 h-3" />
              Coordinates
            </span>
            <span className="text-textNeutral font-mono text-xs">
              {lat.toFixed(4)}°, {lng.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Last Hazard */}
        {lastHazardDetected && (
          <div className="rounded-lg bg-orange-950/30 border border-orange-800/40 p-3">
            <div className="text-[10px] text-orange-400 uppercase mb-1">Last Hazard Detected</div>
            <div className="text-sm text-orange-200 font-semibold">
              {lastHazardDetected}
            </div>
          </div>
        )}

        {/* Live Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-textNeutral/50 pt-2 border-t border-panelNight/40">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>LIVE DATA • Updated {new Date(timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
