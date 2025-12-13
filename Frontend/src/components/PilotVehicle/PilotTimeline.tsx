// Army-Style Timeline Component for Pilot Vehicle
// Displays checkpoints, hazards, and terrain markers in a military-themed horizontal timeline

import React, { useRef, useEffect, useState } from 'react';
import { Checkpoint, Hazard, TerrainType, HazardSeverity } from '@/types/pilotVehicle';
import { 
  MapPin, 
  Flag, 
  AlertTriangle, 
  Mountain, 
  Trees, 
  Waves, 
  Building2, 
  Snowflake,
  Network, // Replace Bridge with Network (represents connections/bridges)
  Skull,
  CloudRain,
  Bomb,
  Construction
} from 'lucide-react';

interface PilotTimelineProps {
  checkpoints: Checkpoint[];
  hazards: Hazard[];
  totalDistance: number;
  currentDistance: number;
  onCheckpointClick: (checkpoint: Checkpoint) => void;
  onHazardClick: (hazard: Hazard) => void;
}

export const PilotTimeline: React.FC<PilotTimelineProps> = ({
  checkpoints,
  hazards,
  totalDistance = 0,
  currentDistance = 0,
  onCheckpointClick,
  onHazardClick,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [animateProgress, setAnimateProgress] = useState(false);

  // Auto-scroll to current position
  useEffect(() => {
    if (timelineRef.current && totalDistance > 0) {
      const scrollPosition = (currentDistance / totalDistance) * timelineRef.current.scrollWidth;
      timelineRef.current.scrollTo({ left: scrollPosition - 300, behavior: 'smooth' });
    }
  }, [currentDistance, totalDistance]);

  // Trigger animation on distance change
  useEffect(() => {
    setAnimateProgress(true);
    const timer = setTimeout(() => setAnimateProgress(false), 600);
    return () => clearTimeout(timer);
  }, [currentDistance]);

  const getPositionPercent = (distance: number) => {
    if (totalDistance === 0) return 0;
    return (distance / totalDistance) * 100;
  };

  const getTerrainIcon = (terrain: TerrainType) => {
    const iconClass = "w-4 h-4";
    switch (terrain) {
      case 'MOUNTAIN': return <Mountain className={iconClass} />;
      case 'FOREST': return <Trees className={iconClass} />;
      case 'SNOW': return <Snowflake className={iconClass} />;
      case 'BRIDGE': return <Network className={iconClass} />;
      case 'URBAN': return <Building2 className={iconClass} />;
      case 'WATER': return <Waves className={iconClass} />;
      default: return <MapPin className={iconClass} />;
    }
  };

  const getHazardIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'LANDSLIDE': return <Mountain className={iconClass} />;
      case 'WEATHER_HAZARD': return <CloudRain className={iconClass} />;
      case 'HOSTILE_ZONE': return <Skull className={iconClass} />;
      case 'IED_DETECTION': return <Bomb className={iconClass} />;
      case 'BLOCKED_ROAD': return <Construction className={iconClass} />;
      default: return <AlertTriangle className={iconClass} />;
    }
  };

  const getSeverityColor = (severity: HazardSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 border-red-400 text-red-100';
      case 'HIGH': return 'bg-orange-600 border-orange-400 text-orange-100';
      case 'MEDIUM': return 'bg-yellow-600 border-yellow-400 text-yellow-100';
      case 'LOW': return 'bg-blue-600 border-blue-400 text-blue-100';
    }
  };

  const getCheckpointColor = (status: string) => {
    switch (status) {
      case 'PASSED': return 'bg-green-600 border-green-400';
      case 'REACHED': return 'bg-yellow-500 border-yellow-300';
      case 'PENDING': return 'bg-gray-600 border-gray-400';
      default: return 'bg-gray-600 border-gray-400';
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y border-slate-700 py-6 px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Flag className="w-5 h-5 text-green-400 animate-pulse" />
          Mission Timeline
        </h2>
        <div className="text-sm text-slate-400">
          Progress: <span className="font-bold text-amberCommand">{currentDistance.toFixed(1)}</span> / {totalDistance.toFixed(1)} km
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative overflow-x-auto overflow-y-hidden"
        style={{ height: '180px' }}
      >
        <div className="relative" style={{ minWidth: '2000px', height: '100%' }}>
          {/* Main Timeline Bar */}
          <div className="absolute top-1/2 left-0 right-0 h-3 -translate-y-1/2">
            {/* Background track with animated pattern */}
            <div className="absolute inset-0 bg-slate-700 rounded-full shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600 to-transparent animate-shimmer" 
                   style={{ backgroundSize: '200% 100%' }} />
            </div>
            
            {/* Progress bar with animated gradient and glow */}
            <div 
              className={`absolute left-0 h-full bg-gradient-to-r from-green-600 via-green-400 to-green-500 rounded-full transition-all shadow-2xl ${animateProgress ? 'scale-y-125 shadow-green-500/80' : 'scale-y-100 shadow-green-500/50'}`}
              style={{ 
                width: `${getPositionPercent(currentDistance)}%`,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                backgroundSize: '200% 100%',
                animation: 'gradient-shift 3s ease infinite',
                boxShadow: `0 0 20px ${animateProgress ? '8px' : '5px'} rgba(34, 197, 94, 0.6)`
              }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-shine" style={{ backgroundSize: '200% 100%' }} />
            </div>

            {/* Segment coloring based on hazards */}
            {checkpoints.map((checkpoint, idx) => {
              if (idx === 0) return null;
              const prevCheckpoint = checkpoints[idx - 1];
              const startPercent = getPositionPercent(prevCheckpoint.distance);
              const endPercent = getPositionPercent(checkpoint.distance);
              
              const hazardsInSegment = hazards.filter(h => 
                h.distance >= prevCheckpoint.distance && h.distance <= checkpoint.distance && h.isActive
              );
              const maxSeverity = hazardsInSegment.reduce((max, h) => {
                const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
                return Math.max(max, severityLevels[h.severity]);
              }, 0);

              let segmentColor = 'transparent';
              if (maxSeverity >= 4) segmentColor = 'rgba(239, 68, 68, 0.4)';
              else if (maxSeverity >= 3) segmentColor = 'rgba(249, 115, 22, 0.4)';
              else if (maxSeverity >= 2) segmentColor = 'rgba(234, 179, 8, 0.4)';

              return (
                <div
                  key={`segment-${idx}`}
                  className="absolute h-full top-0 rounded-full transition-all duration-500"
                  style={{
                    left: `${startPercent}%`,
                    width: `${endPercent - startPercent}%`,
                    backgroundColor: segmentColor,
                  }}
                />
              );
            })}
          </div>

          {/* Current Position Marker with enhanced animation */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 z-30"
            style={{ left: `${getPositionPercent(currentDistance)}%` }}
          >
            <div className="relative">
              {/* Triple pulsing rings with stagger */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-300/40 rounded-full animate-pulse" />
              </div>
              {/* Main marker with enhanced glow */}
              <div className="relative w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center" style={{ animation: 'bounce-gentle 2s ease-in-out infinite' }}>
                <div className="w-5 h-5 bg-white rounded-full shadow-inner" />
              </div>
              {/* Enhanced Label with animation */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-2xl border-2 border-blue-300 animate-float"
                   style={{ backgroundSize: '200% 100%', animation: 'float 3s ease-in-out infinite, gradient-shift 3s ease infinite' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                  PILOT VEHICLE
                  <div className="text-[10px] bg-blue-700 px-2 py-0.5 rounded">{currentDistance.toFixed(1)}km</div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoints with enhanced hover effects and animations */}
          {checkpoints.map((checkpoint, index) => (
            <div
              key={checkpoint.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all duration-300 z-20 ${
                hoveredItem === checkpoint.id ? 'scale-150 z-30' : 'scale-100 hover:scale-125'
              }`}
              style={{ 
                left: `${getPositionPercent(checkpoint.distance)}%`,
                animation: `checkpoint-appear 0.5s ease-out ${index * 0.1}s backwards`
              }}
              onClick={() => onCheckpointClick(checkpoint)}
              onMouseEnter={() => setHoveredItem(checkpoint.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="relative">
                {/* Glow effect for reached checkpoints */}
                {checkpoint.status === 'REACHED' && (
                  <div className="absolute inset-0 bg-yellow-500/30 rounded-lg blur-xl animate-pulse" style={{ width: '60px', height: '60px', top: '-12px', left: '-12px' }} />
                )}
                
                <div className={`w-12 h-12 ${getCheckpointColor(checkpoint.status)} border-4 rounded-lg rotate-45 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                  checkpoint.status === 'REACHED' ? 'animate-pulse scale-110' : hoveredItem === checkpoint.id ? 'animate-bounce-gentle' : ''
                }`}>
                  <div className="-rotate-45 transform scale-110">
                    <Flag className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                </div>
                
                {/* Enhanced checkpoint label with slide-in animation */}
                <div className={`absolute ${checkpoint.distance < currentDistance ? 'top-16' : '-top-20'} left-1/2 -translate-x-1/2 transition-all duration-300 ${
                  hoveredItem === checkpoint.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                }`}>
                  <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-slate-600 text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-2xl whitespace-nowrap animate-slide-in">
                    <div className="font-bold text-sm mb-1 text-green-400">{checkpoint.name}</div>
                    <div className="flex items-center gap-2 text-slate-400">
                      {getTerrainIcon(checkpoint.terrain)}
                      <span>{checkpoint.distance.toFixed(1)} km</span>
                      <span>•</span>
                      <span className="text-amberCommand font-bold">{checkpoint.status}</span>
                    </div>
                    {checkpoint.eta && (
                      <div className="mt-1 text-[10px] text-blue-400 border-t border-slate-700 pt-1">
                        ETA: {checkpoint.eta}
                      </div>
                    )}
                  </div>
                  {/* Arrow pointer */}
                  <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
                    checkpoint.distance < currentDistance 
                      ? '-top-2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900'
                      : '-bottom-2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-slate-900'
                  }`} />
                </div>
              </div>
            </div>
          ))}

          {/* Hazards with enhanced animations */}
          {hazards.filter(h => h.isActive).map((hazard) => (
            <div
              key={hazard.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all z-25 ${
                hoveredItem === hazard.id ? 'scale-125 z-30' : 'scale-100 hover:scale-110'
              }`}
              style={{ left: `${getPositionPercent(hazard.distance)}%` }}
              onClick={() => onHazardClick(hazard)}
              onMouseEnter={() => setHoveredItem(hazard.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="relative">
                {/* Hazard ring pulse effect */}
                <div className={`absolute inset-0 ${getSeverityColor(hazard.severity)} opacity-30 rounded-full animate-ping`} style={{ width: '48px', height: '48px', top: '-8px', left: '-8px' }} />
                
                <div className={`w-10 h-10 ${getSeverityColor(hazard.severity)} border-4 border-white rounded-full shadow-2xl flex items-center justify-center animate-pulse-slow`}>
                  {getHazardIcon(hazard.type)}
                </div>
                
                {/* Enhanced hazard popup */}
                {hoveredItem === hazard.id && (
                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-72 z-50 animate-fade-in">
                    <div className={`${getSeverityColor(hazard.severity)} border-3 p-4 rounded-xl shadow-2xl`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <div className="font-bold text-sm">{hazard.type.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="text-xs opacity-90 mb-2 leading-relaxed">{hazard.description}</div>
                      <div className="flex items-center justify-between text-xs font-semibold border-t border-white/20 pt-2">
                        <span>{hazard.distance.toFixed(1)} km ahead</span>
                        <span className="bg-white/20 px-2 py-1 rounded">{hazard.severity}</span>
                      </div>
                    </div>
                    {/* Arrow pointer */}
                    <div className={`absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-${hazard.severity === 'CRITICAL' ? 'red-600' : 'orange-600'}`} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced distance markers */}
      <div className="mt-4 flex justify-between text-xs text-slate-400 px-2">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
          <div key={idx} className="flex flex-col items-center group cursor-pointer">
            <div className="w-px h-3 bg-slate-600 mb-1 group-hover:bg-green-400 group-hover:h-4 transition-all" />
            <span className="font-semibold group-hover:text-green-400 transition-colors">{(totalDistance * ratio).toFixed(0)} km</span>
          </div>
        ))}
      </div>
    </div>
  );
};
