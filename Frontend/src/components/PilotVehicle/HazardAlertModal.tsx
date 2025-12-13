// Alert Modal Component for Critical Hazards
// Military-style alert system with sound and visual effects

import React from 'react';
import { Hazard } from '@/types/pilotVehicle';
import { AlertTriangle, X, MapPin, Clock, Shield } from 'lucide-react';

interface HazardAlertModalProps {
  hazard: Hazard;
  onAcknowledge: () => void;
  onClose: () => void;
}

export const HazardAlertModal: React.FC<HazardAlertModalProps> = ({
  hazard,
  onAcknowledge,
  onClose,
}) => {
  const getSeverityStyles = () => {
    switch (hazard.severity) {
      case 'CRITICAL':
        return 'bg-red-950 border-red-500 text-red-100';
      case 'HIGH':
        return 'bg-orange-950 border-orange-500 text-orange-100';
      case 'MEDIUM':
        return 'bg-yellow-950 border-yellow-500 text-yellow-100';
      case 'LOW':
        return 'bg-blue-950 border-blue-500 text-blue-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className={`relative w-full max-w-2xl mx-4 border-4 rounded-lg shadow-2xl ${getSeverityStyles()} animate-in zoom-in-95`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-current">
          <div className="flex items-center gap-3">
            <div className="animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                ⚠️ HAZARD DETECTED
              </h2>
              <p className="text-sm opacity-80 mt-1">
                {hazard.severity} SEVERITY - IMMEDIATE ATTENTION REQUIRED
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Hazard Type */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm opacity-70 mb-1">HAZARD TYPE</div>
            <div className="text-2xl font-bold uppercase tracking-wide">
              {hazard.type.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Description */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm opacity-70 mb-2">DESCRIPTION</div>
            <p className="text-base leading-relaxed">{hazard.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm opacity-70 mb-1">
                <MapPin className="w-4 h-4" />
                DISTANCE AHEAD
              </div>
              <div className="text-xl font-bold">{hazard.distance.toFixed(1)} km</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm opacity-70 mb-1">
                <Clock className="w-4 h-4" />
                DETECTED AT
              </div>
              <div className="text-xl font-bold">
                {new Date(hazard.detectedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="bg-black/30 rounded-lg p-4 border-l-4 border-current">
            <div className="flex items-center gap-2 text-sm opacity-70 mb-2">
              <Shield className="w-4 h-4" />
              RECOMMENDED ACTION
            </div>
            <p className="text-base font-semibold leading-relaxed">
              {hazard.recommendedAction}
            </p>
          </div>

          {/* Coordinates */}
          <div className="flex items-center justify-between text-sm opacity-60">
            <span>COORDINATES</span>
            <span className="font-mono">
              {hazard.position.lat.toFixed(4)}°N, {hazard.position.lng.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 p-6 border-t border-current">
          <button
            onClick={onAcknowledge}
            className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-bold uppercase tracking-wider transition-colors"
          >
            Acknowledge Alert
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
