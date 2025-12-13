'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import type { Convoy } from '@/types/convoy';

// ==================== TYPES ====================

interface ProgressDataPoint {
  time: number;
  progress: number;
  speed: number;
  eventMarker?: 'rain' | 'blockRoad' | 'congestion' | 'landslide' | null;
}

interface SimulationConditions {
  rain: boolean;
  blockRoad: boolean;
  congestion: boolean;
  landslide: boolean;
}

interface EventLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

interface ConvoySimulatorProps {
  convoys: Convoy[];
  selectedConvoyId: string | null;
  onConvoyChange: (convoyId: string) => void;
}

// ==================== COMPONENT ====================

export const ConvoySimulator: React.FC<ConvoySimulatorProps> = ({
  convoys,
  selectedConvoyId,
  onConvoyChange,
}) => {
  // State Management
  const [isRunning, setIsRunning] = useState(false);
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([{ time: 0, progress: 0, speed: 0, eventMarker: null }]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [conditions, setConditions] = useState<SimulationConditions>({
    rain: false,
    blockRoad: false,
    congestion: false,
    landslide: false,
  });
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [checkpointsPassed, setCheckpointsPassed] = useState(0);
  const [convoyHealth, setConvoyHealth] = useState(100);
  const [timelinePosition, setTimelinePosition] = useState(0);

  // Refs
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const simulationTimeRef = useRef<number>(0);
  const updateCounterRef = useRef<number>(0);
  const previousConditionsRef = useRef<SimulationConditions>(conditions);

  // Get selected convoy
  const selectedConvoy = convoys.find((c) => c.id === selectedConvoyId) || convoys[0];

  // ==================== HELPER FUNCTIONS ====================

  const addEventLog = useCallback((message: string, type: EventLogEntry['type'] = 'info') => {
    const newEvent: EventLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      message,
      type,
    };
    setEventLog((prev) => [newEvent, ...prev].slice(0, 20)); // Keep last 20 events
  }, []);

  const calculateSpeed = useCallback(() => {
    if (!selectedConvoy) return 0;

    let baseSpeed = selectedConvoy.speedKmph;

    // Apply condition effects - EXACT percentages as specified
    if (conditions.blockRoad) {
      // Full stop - speed = 0
      return 0;
    }

    if (conditions.landslide) {
      // Severe impact - only 10% speed
      baseSpeed *= 0.1;
    } else if (conditions.rain) {
      // Rain reduces efficiency to exactly 40% (meaning 60% speed reduction)
      baseSpeed *= 0.4;
    } else if (conditions.congestion) {
      // Congestion - oscillating between 30-60% for realistic traffic
      const oscillation = Math.sin(Date.now() / 500) * 0.15;
      baseSpeed *= 0.45 + oscillation;
    }

    // Add small natural variations only in normal conditions
    if (!conditions.rain && !conditions.congestion && !conditions.blockRoad && !conditions.landslide) {
      baseSpeed *= 0.95 + Math.random() * 0.1; // 95-105% natural variation
    }

    return baseSpeed * speedMultiplier;
  }, [selectedConvoy, conditions, speedMultiplier]);

  const checkCheckpoints = useCallback((progress: number) => {
    if (!selectedConvoy?.assignedRoute?.checkpoints) return;

    const checkpoints = selectedConvoy.assignedRoute.checkpoints;
    const totalCheckpoints = checkpoints.length;

    const expectedCheckpointsPassed = Math.floor((progress / 100) * totalCheckpoints);

    if (expectedCheckpointsPassed > checkpointsPassed) {
      const checkpoint = checkpoints[expectedCheckpointsPassed - 1];
      setCheckpointsPassed(expectedCheckpointsPassed);
      addEventLog(`✓ Checkpoint cleared: ${checkpoint?.name || `CP-${expectedCheckpointsPassed}`}`, 'success');
    }
  }, [selectedConvoy, checkpointsPassed, addEventLog]);

  // ==================== SIMULATION LOOP ====================

  const simulationLoop = useCallback(() => {
    if (!isRunning || !selectedConvoy) return;

    const now = Date.now();
    const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
    lastUpdateTimeRef.current = now;

    // Update simulation time
    simulationTimeRef.current += deltaTime;
    updateCounterRef.current += 1;

    // Calculate progress increment
    const totalDistance = selectedConvoy.assignedRoute?.distanceKm || 100;
    const currentSpeed = calculateSpeed();
    const progressIncrement = (currentSpeed / totalDistance) * deltaTime * 2; // Adjusted for visibility

    setCurrentProgress((prev) => {
      const newProgress = Math.min(100, prev + progressIncrement);

      // Check for checkpoint completion
      checkCheckpoints(newProgress);

      // Update progress data for graph MORE FREQUENTLY for smoother line
      // Update every frame instead of every second
      setProgressData((prevData) => {
        // Detect if any condition just changed
        let eventMarker: ProgressDataPoint['eventMarker'] = null;

        if (conditions.rain && !previousConditionsRef.current.rain) {
          eventMarker = 'rain';
        } else if (conditions.blockRoad && !previousConditionsRef.current.blockRoad) {
          eventMarker = 'blockRoad';
        } else if (conditions.congestion && !previousConditionsRef.current.congestion) {
          eventMarker = 'congestion';
        } else if (conditions.landslide && !previousConditionsRef.current.landslide) {
          eventMarker = 'landslide';
        }

        // Create spike effect when condition is activated
        let displayProgress = newProgress;
        if (eventMarker === 'blockRoad' || eventMarker === 'landslide') {
          // Sharp drop for severe conditions
          displayProgress = Math.max(0, newProgress - 5);
        } else if (eventMarker === 'rain' || eventMarker === 'congestion') {
          // Moderate drop for moderate conditions
          displayProgress = Math.max(0, newProgress - 2);
        }

        const newDataPoint: ProgressDataPoint = {
          time: Math.round(simulationTimeRef.current * 10) / 10, // One decimal place
          progress: Math.round(displayProgress * 100) / 100,
          speed: Math.round(currentSpeed * 10) / 10,
          eventMarker,
        };

        // Keep last 100 data points for smoother visualization
        const newData = [...prevData, newDataPoint];

        // Only keep points if we have too many
        if (newData.length > 150) {
          return newData.slice(-150);
        }

        return newData;
      });

      // Check if completed
      if (newProgress >= 100) {
        setIsRunning(false);
        addEventLog(`🎯 Convoy ${selectedConvoy.name} reached destination!`, 'success');
        return 100;
      }

      return newProgress;
    });

    // Apply health damage from conditions - INCREASED for visibility
    // Rain: moderate damage from poor visibility & slippery conditions  
    if (conditions.rain && Math.random() < 0.08) {
      setConvoyHealth((prev) => {
        const damage = Math.floor(Math.random() * 3) + 2; // 2-4 damage
        return Math.max(0, prev - damage);
      });
    }

    // Congestion: stress damage from stop-and-go traffic
    if (conditions.congestion && Math.random() < 0.1) {
      setConvoyHealth((prev) => {
        const damage = Math.floor(Math.random() * 4) + 3; // 3-6 damage
        return Math.max(0, prev - damage);
      });
    }

    // Landslide: severe damage from debris and difficult terrain
    if (conditions.landslide && Math.random() < 0.12) {
      setConvoyHealth((prev) => {
        const damage = Math.floor(Math.random() * 8) + 8; // 8-15 damage
        return Math.max(0, prev - damage);
      });
    }

    // Road Block: damage from prolonged idling & stress
    if (conditions.blockRoad && Math.random() < 0.06) {
      setConvoyHealth((prev) => {
        const damage = Math.floor(Math.random() * 2) + 1; // 1-2 damage
        return Math.max(0, prev - damage);
      });
    }

    // Update previous conditions reference
    previousConditionsRef.current = { ...conditions };

    animationFrameRef.current = requestAnimationFrame(simulationLoop);
  }, [isRunning, selectedConvoy, calculateSpeed, checkCheckpoints, conditions, addEventLog]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (isRunning) {
      lastUpdateTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(simulationLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, simulationLoop]);

  // Reset simulation when convoy changes
  useEffect(() => {
    setIsRunning(false);
    setCurrentProgress(0);
    setProgressData([{ time: 0, progress: 0, speed: 0, eventMarker: null }]);
    setCheckpointsPassed(0);
    setConvoyHealth(100);
    simulationTimeRef.current = 0;
    updateCounterRef.current = 0;
    setEventLog([]);
    setConditions({ rain: false, blockRoad: false, congestion: false, landslide: false });
    previousConditionsRef.current = { rain: false, blockRoad: false, congestion: false, landslide: false };
    addEventLog(`Simulator loaded for ${selectedConvoy?.name || 'convoy'}`, 'info');
  }, [selectedConvoyId, selectedConvoy?.name, addEventLog]);

  // ==================== CONDITION HANDLERS ====================

  const toggleCondition = (condition: keyof SimulationConditions) => {
    setConditions((prev) => {
      const newValue = !prev[condition];
      const conditionNames = {
        rain: '🌧️ Rain',
        blockRoad: '🚧 Road Block',
        congestion: '🚗 Congestion',
        landslide: '⛰️ Landslide',
      };

      addEventLog(
        `${conditionNames[condition]} ${newValue ? 'ACTIVATED' : 'CLEARED'}`,
        newValue ? 'warning' : 'info'
      );

      return { ...prev, [condition]: newValue };
    });
  };

  // ==================== CONTROL HANDLERS ====================

  const handleStartStop = () => {
    if (!isRunning && currentProgress >= 100) {
      // Reset if completed
      setCurrentProgress(0);
      setProgressData([{ time: 0, progress: 0, speed: 0, eventMarker: null }]);
      setCheckpointsPassed(0);
      setConvoyHealth(100);
      simulationTimeRef.current = 0;
      updateCounterRef.current = 0;
      previousConditionsRef.current = conditions;
      addEventLog('Simulation reset and started', 'info');
    } else {
      addEventLog(isRunning ? 'Simulation paused' : 'Simulation resumed', 'info');
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentProgress(0);
    setProgressData([{ time: 0, progress: 0, speed: 0, eventMarker: null }]);
    setCheckpointsPassed(0);
    setConvoyHealth(100);
    simulationTimeRef.current = 0;
    updateCounterRef.current = 0;
    setConditions({ rain: false, blockRoad: false, congestion: false, landslide: false });
    previousConditionsRef.current = { rain: false, blockRoad: false, congestion: false, landslide: false };
    addEventLog('Simulation reset', 'info');
  };

  // Custom dot renderer for event markers
  const renderEventDot = (props: any) => {
    const { cx, cy, payload } = props;

    if (payload.eventMarker) {
      const colors = {
        rain: '#3b82f6',
        blockRoad: '#ef4444',
        congestion: '#eab308',
        landslide: '#f97316',
      };

      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={colors[payload.eventMarker as keyof typeof colors]}
          stroke="#fff"
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  // ==================== RENDER ====================

  const totalDistance = selectedConvoy?.assignedRoute?.distanceKm || 0;
  const remainingDistance = Math.round(totalDistance * (1 - currentProgress / 100));
  const currentSpeed = calculateSpeed();

  return (
    <div className="space-y-6">
      {/* Main Simulator Panel */}
      <div className="rounded-3xl border-2 border-amberCommand/30 bg-gradient-to-br from-panelNight/90 to-slateDepth/90 p-8 shadow-2xl shadow-amberCommand/10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-amberCommand">Convoy Real-Time Simulator</h2>
            <p className="text-sm text-textNeutral/60 mt-1">Live route progress simulation with terrain conditions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${isRunning ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-500/20 border border-slate-500/40'
              }`}>
              <div className={`h-3 w-3 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-sm font-semibold">{isRunning ? 'RUNNING' : 'STOPPED'}</span>
            </div>
          </div>
        </div>

        {/* Convoy Selection */}
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wider text-textNeutral/60 mb-2">
            Select Convoy Under Test
          </label>
          <select
            value={selectedConvoyId || ''}
            onChange={(e) => onConvoyChange(e.target.value)}
            className="w-full rounded-xl border border-panelNight/60 bg-slateDepth px-4 py-3 text-base text-textNeutral focus:border-amberCommand focus:outline-none transition-all"
            disabled={isRunning}
          >
            {convoys.map((convoy) => (
              <option key={convoy.id} value={convoy.id}>
                {convoy.name} - {convoy.origin.name} → {convoy.destination.name} ({convoy.status})
              </option>
            ))}
          </select>
        </div>

        {/* Convoy Metadata Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-slateDepth/80 border border-panelNight/40 p-4">
            <p className="text-xs uppercase text-textNeutral/50 mb-1">Total Distance</p>
            <p className="text-2xl font-bold text-amberCommand">{totalDistance} km</p>
          </div>
          <div className="rounded-xl bg-slateDepth/80 border border-panelNight/40 p-4">
            <p className="text-xs uppercase text-textNeutral/50 mb-1">Current Speed</p>
            <p className="text-2xl font-bold text-textNeutral">{Math.round(currentSpeed)} km/h</p>
          </div>
          <div className="rounded-xl bg-slateDepth/80 border border-panelNight/40 p-4">
            <p className="text-xs uppercase text-textNeutral/50 mb-1">Checkpoints Passed</p>
            <p className="text-2xl font-bold text-emerald-400">
              {checkpointsPassed} / {selectedConvoy?.assignedRoute?.checkpoints?.length || 0}
            </p>
          </div>
          <div className="rounded-xl bg-slateDepth/80 border border-panelNight/40 p-4">
            <p className="text-xs uppercase text-textNeutral/50 mb-1">Remaining Distance</p>
            <p className="text-2xl font-bold text-textNeutral">{remainingDistance} km</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-textNeutral">Route Progress</span>
            <span className="text-2xl font-bold text-amberCommand">{Math.round(currentProgress)}%</span>
          </div>
          <div className="h-4 rounded-full bg-slateDepth border border-panelNight/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amberCommand to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={handleStartStop}
            className={`rounded-xl px-8 py-3 text-base font-bold transition-all ${isRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-amberCommand hover:bg-amberCommand/90 text-black'
              }`}
          >
            {isRunning ? '⏸ Stop Simulator' : currentProgress >= 100 ? '🔄 Restart Simulator' : '▶ Start Simulator'}
          </button>
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="rounded-xl border-2 border-panelNight/60 px-6 py-3 text-base font-semibold text-textNeutral hover:bg-panelNight/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            🔄 Reset
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-textNeutral/60">Speed:</span>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  setSpeedMultiplier(speed);
                  addEventLog(`Speed multiplier set to ${speed}x`, 'info');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${speedMultiplier === speed
                  ? 'bg-amberCommand text-black'
                  : 'bg-slateDepth border border-panelNight/40 text-textNeutral hover:bg-panelNight/60'
                  }`}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Graph */}
        <div className="rounded-xl bg-slateDepth/50 border border-panelNight/40 p-6 mb-6">
          <h3 className="text-lg font-bold text-textNeutral mb-4">Live Progress Tracking</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis
                dataKey="time"
                stroke="#9ca3af"
                label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#9ca3af"
                label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1d25',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f59e0b' }}
              />
              {/* Checkpoint markers */}
              {selectedConvoy?.assignedRoute?.checkpoints?.map((_, index) => {
                const checkpointProgress = ((index + 1) / (selectedConvoy.assignedRoute?.checkpoints?.length || 1)) * 100;
                return (
                  <ReferenceLine
                    key={index}
                    y={checkpointProgress}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    label={{ value: `CP${index + 1}`, fill: '#10b981', fontSize: 12 }}
                  />
                );
              })}
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={renderEventDot}
                animationDuration={0}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
              <span className="text-textNeutral/60">Rain Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
              <span className="text-textNeutral/60">Road Block</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white" />
              <span className="text-textNeutral/60">Congestion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white" />
              <span className="text-textNeutral/60">Landslide</span>
            </div>
          </div>
        </div>

        {/* Terrain Condition Buttons */}
        <div>
          <h3 className="text-lg font-bold text-textNeutral mb-3">Terrain Conditions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => toggleCondition('rain')}
              className={`rounded-xl p-4 text-left transition-all ${conditions.rain
                ? 'bg-blue-500/30 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-slateDepth border-2 border-panelNight/40 hover:border-blue-500/50'
                }`}
            >
              <div className="text-3xl mb-2">🌧️</div>
              <div className="text-sm font-bold text-textNeutral">Rain</div>
              <div className="text-xs text-textNeutral/60">-60% speed</div>
            </button>

            <button
              onClick={() => toggleCondition('blockRoad')}
              className={`rounded-xl p-4 text-left transition-all ${conditions.blockRoad
                ? 'bg-red-500/30 border-2 border-red-500 shadow-lg shadow-red-500/20'
                : 'bg-slateDepth border-2 border-panelNight/40 hover:border-red-500/50'
                }`}
            >
              <div className="text-3xl mb-2">🚧</div>
              <div className="text-sm font-bold text-textNeutral">Block Road</div>
              <div className="text-xs text-textNeutral/60">Full stop</div>
            </button>

            <button
              onClick={() => toggleCondition('congestion')}
              className={`rounded-xl p-4 text-left transition-all ${conditions.congestion
                ? 'bg-yellow-500/30 border-2 border-yellow-500 shadow-lg shadow-yellow-500/20'
                : 'bg-slateDepth border-2 border-panelNight/40 hover:border-yellow-500/50'
                }`}
            >
              <div className="text-3xl mb-2">🚗</div>
              <div className="text-sm font-bold text-textNeutral">Congestion</div>
              <div className="text-xs text-textNeutral/60">-60% speed</div>
            </button>

            <button
              onClick={() => toggleCondition('landslide')}
              className={`rounded-xl p-4 text-left transition-all ${conditions.landslide
                ? 'bg-orange-500/30 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                : 'bg-slateDepth border-2 border-panelNight/40 hover:border-orange-500/50'
                }`}
            >
              <div className="text-3xl mb-2">⛰️</div>
              <div className="text-sm font-bold text-textNeutral">Landslide</div>
              <div className="text-xs text-textNeutral/60">-90% speed</div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Health Indicator + Event Log */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Convoy Health Indicator */}
        <div className="rounded-2xl border border-panelNight/40 bg-panelNight/60 p-6">
          <h3 className="text-lg font-bold text-textNeutral mb-4">Convoy Health</h3>
          <div className="flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#2a2f3a"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={convoyHealth > 60 ? '#10b981' : convoyHealth > 30 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(convoyHealth / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-textNeutral">{Math.round(convoyHealth)}%</span>
              </div>
            </div>
            <div className={`text-sm font-semibold ${convoyHealth > 60 ? 'text-emerald-400' : convoyHealth > 30 ? 'text-yellow-400' : 'text-red-400'
              }`}>
              {convoyHealth > 60 ? '✓ Excellent' : convoyHealth > 30 ? '⚠ Moderate' : '✗ Critical'}
            </div>
            <p className="text-xs text-textNeutral/60 mt-2 text-center">
              Health degrades with adverse conditions
            </p>
          </div>
        </div>

        {/* Event Log Panel */}
        <div className="lg:col-span-2 rounded-2xl border border-panelNight/40 bg-panelNight/60 p-6">
          <h3 className="text-lg font-bold text-textNeutral mb-4">Event Log</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {eventLog.length === 0 && (
              <p className="text-sm text-textNeutral/50 text-center py-8">
                No events yet. Start the simulator to see live updates.
              </p>
            )}
            {eventLog.map((event) => (
              <div
                key={event.id}
                className={`rounded-lg border p-3 text-sm ${event.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : event.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                    : event.type === 'danger'
                      ? 'bg-red-500/10 border-red-500/40 text-red-400'
                      : 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{event.message}</span>
                  <span className="text-xs opacity-70">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
