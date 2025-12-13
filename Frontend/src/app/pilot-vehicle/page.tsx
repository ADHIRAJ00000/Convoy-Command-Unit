'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePilotVehicleStore } from '@/store/pilotVehicleStore';
import { pilotVehicleService } from '@/api/services/pilotVehicleService';
import { simulatePositionUpdate } from '@/data/mock/pilotVehicleMockData';
import PilotVehicleMap from '@/components/Map/PilotVehicleMap';
import { PilotTimeline } from '@/components/PilotVehicle/PilotTimeline';
import { HazardAlertModal } from '@/components/PilotVehicle/HazardAlertModal';
import { PlaybackControls } from '@/components/PilotVehicle/PlaybackControls';
import { VehicleStatusCard } from '@/components/PilotVehicle/VehicleStatusCard';
import { EventLogPanel } from '@/components/PilotVehicle/EventLogPanel';
import { WeatherCard } from '@/components/PilotVehicle/WeatherCard';
import { Hazard, Checkpoint } from '@/types/pilotVehicle';
import { Truck, AlertTriangle, Map } from 'lucide-react';
import { fetchRouteWeather, RouteWeatherData } from '@/lib/weatherService';
import NotificationToast, { type Toast } from '@/components/NotificationToast';
import { fetchMapboxRoute, generateCheckpointsFromRoute as generateMapboxCheckpoints } from '@/lib/mapboxRouting';
import { api } from '@/lib/api';
import type { Convoy } from '@/types/convoy';

export default function PilotVehiclePage() {
  const pathname = usePathname();
  const {
    selectedConvoyId,
    pilotVehicleData,
    alerts,
    eventLog,
    simulation,
    setSelectedConvoyId,
    setPilotVehicleData,
    updatePosition,
    acknowledgeAlert,
    setSimulationPlaying,
    setSimulationSpeed,
    addEventLog,
    reset,
  } = usePilotVehicleStore();

  const [convoyList, setConvoyList] = useState<Convoy[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState<Hazard | null>(null);
  const [selectedItem, setSelectedItem] = useState<Checkpoint | Hazard | null>(null);
  const [routeWeather, setRouteWeather] = useState<RouteWeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Navigation links matching other pages
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/events', label: 'Events' },
    { href: '/pilot-vehicle', label: 'Pilot Vehicle' },
    { href: '/mobile', label: 'Mobile View' },
  ];

  // Load convoy list from database on mount
  useEffect(() => {
    loadConvoyList();
  }, []);

  const loadConvoyList = async () => {
    try {
      const data = await api.getConvoys();
      setConvoyList(data);
      addEventLog(`Loaded ${data.length} convoys from database`, 'SYSTEM');
    } catch (error) {
      console.error('Error loading convoy list:', error);
      addEventLog('Error loading convoys from database', 'SYSTEM');
      setToasts(prev => [...prev, {
        id: `error-${Date.now()}`,
        title: 'Database Error',
        description: 'Failed to load convoys. Please check backend connection.',
        tone: 'warning'
      }]);
    }
  };

  // Fetch weather for route checkpoints
  const fetchWeatherForRoute = async (checkpoints: Checkpoint[]) => {
    setWeatherLoading(true);
    addEventLog('Fetching weather data...', 'SYSTEM');

    try {
      const waypoints = checkpoints.map(cp => ({
        lat: cp.position.lat,
        lng: cp.position.lng,
        name: cp.name
      }));

      const weather = await fetchRouteWeather(waypoints);
      setRouteWeather(weather);

      // Check if using mock data
      const usingMockData = !process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

      if (usingMockData) {
        addEventLog(`Weather data loaded (MOCK DATA - Add API key for real weather)`, 'SYSTEM');
        setToasts(prev => [...prev, {
          id: `weather-mock-${Date.now()}`,
          title: 'Using Mock Weather Data',
          description: 'Add NEXT_PUBLIC_OPENWEATHER_API_KEY to .env.local for real-time weather',
          tone: 'info'
        }]);
      } else {
        addEventLog(`Weather data loaded for ${weather.length} checkpoints`, 'SYSTEM');

        // Show weather toast
        const hazardousCount = weather.filter(w => w.terrainCondition === 'HAZARDOUS').length;
        if (hazardousCount > 0) {
          setToasts(prev => [...prev, {
            id: `weather-alert-${Date.now()}`,
            title: 'Weather Alert',
            description: `${hazardousCount} checkpoint(s) have hazardous weather conditions`,
            tone: 'warning'
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      addEventLog('Using mock weather data', 'SYSTEM');
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleConvoySelect = async (convoyId: string) => {
    if (!convoyId) return;

    setLoading(true);
    setSelectedConvoyId(convoyId);
    reset();
    setRouteWeather([]);

    try {
      let data: any;

      // Find the selected convoy from our loaded list
      const convoy = convoyList.find(c => c.id === convoyId);

      if (!convoy) {
        throw new Error('Convoy not found');
      }

      addEventLog(`Selected convoy: ${convoy.name}`, 'SYSTEM');

      // Try to get pilot vehicle data from server, or generate from convoy
      try {
        data = await pilotVehicleService.getPilotVehicleData(convoyId);
        addEventLog('Loaded pilot vehicle data from server', 'SYSTEM');
      } catch (error) {
        // If server doesn't have pilot data, create it from convoy
        console.log('Generating pilot data from convoy info');
        data = {
          convoyId: convoy.id,
          convoyName: convoy.name,
          route: [],
          checkpoints: [],
          hazards: [],
          currentPosition: {
            lat: convoy.origin?.lat || 0,
            lng: convoy.origin?.lng || 0,
            distance: 0,
            speed: 0,
            heading: 0,
          },
          totalDistance: convoy.assignedRoute?.distanceKm || 100,
          metadata: {},
        };
      }

      // Fetch real Mapbox route dynamically using convoy's actual coordinates
      if (convoy.origin && convoy.destination) {
        addEventLog('Fetching real-world route from Mapbox...', 'SYSTEM');

        const mapboxRoute = await fetchMapboxRoute(
          { lat: convoy.origin.lat, lng: convoy.origin.lng },
          { lat: convoy.destination.lat, lng: convoy.destination.lng }
        );

        if (mapboxRoute) {
          // Convert Mapbox route to pilot vehicle route format
          const routeSegments = [];
          for (let i = 0; i < mapboxRoute.coordinates.length - 1; i++) {
            routeSegments.push({
              start: {
                lat: mapboxRoute.coordinates[i][1],
                lng: mapboxRoute.coordinates[i][0]
              },
              end: {
                lat: mapboxRoute.coordinates[i + 1][1],
                lng: mapboxRoute.coordinates[i + 1][0]
              },
              distance: 0.1, // Approximate per segment
              terrain: 'ROAD' as const,
              status: 'CLEAR' as const
            });
          }

          data.route = routeSegments;
          data.totalDistance = mapboxRoute.distance / 1000; // Convert meters to km
          data.metadata = {
            ...data.metadata,
            usingMapboxRoute: true,
            originName: convoy.origin.name,
            destinationName: convoy.destination.name,
          };

          // Generate checkpoints along the real route
          const numCheckpoints = convoy.assignedRoute?.checkpoints?.length || 6;
          const routeCheckpoints = generateMapboxCheckpoints(mapboxRoute, numCheckpoints);
          data.checkpoints = routeCheckpoints.map((coord, idx) => ({
            id: `checkpoint-${idx}`,
            name: idx === 0 ? convoy.origin.name :
              idx === routeCheckpoints.length - 1 ? convoy.destination.name :
                convoy.assignedRoute?.checkpoints?.[idx]?.name || `Checkpoint ${idx}`,
            position: { lat: coord.lat, lng: coord.lng },
            distance: (data.totalDistance / (routeCheckpoints.length - 1)) * idx,
            status: 'PENDING' as const,
            terrain: ['ROAD', 'BRIDGE', 'INTERSECTION', 'HIGHWAY', 'URBAN'][idx % 5] as any,
            eta: `${Math.floor((data.totalDistance / 60) * (idx / (routeCheckpoints.length - 1)) * 60)}min`
          }));

          addEventLog(`✓ Real Mapbox route loaded: ${data.totalDistance.toFixed(1)}km`, 'SYSTEM');
          addEventLog(`Route: ${convoy.origin.name} → ${convoy.destination.name}`, 'INFO');

          setToasts(prev => [...prev, {
            id: `route-loaded-${Date.now()}`,
            title: 'Real Route Loaded',
            description: `${data.totalDistance.toFixed(1)}km from ${convoy.origin.name} to ${convoy.destination.name}`,
            tone: 'success'
          }]);
        }
      } else {
        addEventLog('⚠ Convoy missing origin/destination coordinates', 'SYSTEM');
      }

      setPilotVehicleData(data);

      // Fetch weather for route
      if (data.checkpoints && data.checkpoints.length > 0) {
        await fetchWeatherForRoute(data.checkpoints);
      }

    } catch (error) {
      console.error('Error loading pilot vehicle data:', error);
      addEventLog(`Error: ${error}`, 'SYSTEM');

      setToasts(prev => [...prev, {
        id: `error-${Date.now()}`,
        title: 'Route Loading Error',
        description: 'Failed to load route for selected convoy',
        tone: 'warning'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Simulation loop
  useEffect(() => {
    if (!simulation.isPlaying || !pilotVehicleData) return;

    const interval = setInterval(() => {
      const updatedData = simulatePositionUpdate(pilotVehicleData, simulation.speed);
      setPilotVehicleData(updatedData);
      updatePosition(updatedData.currentPosition);
    }, 1000);

    return () => clearInterval(interval);
  }, [simulation.isPlaying, simulation.speed, pilotVehicleData]);

  // Show alert modal when new unacknowledged alert arrives
  useEffect(() => {
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
    if (unacknowledgedAlerts.length > 0 && !activeAlert) {
      setActiveAlert(unacknowledgedAlerts[0].hazard);
    }
  }, [alerts]);

  const handleAcknowledgeAlert = () => {
    if (activeAlert) {
      const alert = alerts.find(a => a.hazard.id === activeAlert.id);
      if (alert) {
        acknowledgeAlert(alert.id);
      }
      setActiveAlert(null);
    }
  };

  const handleCheckpointClick = (checkpoint: Checkpoint) => {
    setSelectedItem(checkpoint);
    addEventLog(`Viewing checkpoint: ${checkpoint.name}`, 'SYSTEM');
  };

  const handleHazardClick = (hazard: Hazard) => {
    setSelectedItem(hazard);
    setActiveAlert(hazard);
  };

  const handleResetSimulation = () => {
    if (selectedConvoyId) {
      handleConvoySelect(selectedConvoyId);
    }
  };

  const getCurrentTerrain = () => {
    if (!pilotVehicleData) return undefined;
    const currentCheckpoint = pilotVehicleData.checkpoints.find(
      cp => Math.abs(cp.distance - pilotVehicleData.currentPosition.distance) < 5
    );
    return currentCheckpoint?.terrain;
  };

  const getLastHazardDetected = () => {
    if (alerts.length === 0) return undefined;
    const lastAlert = alerts[alerts.length - 1];
    return lastAlert.hazard.type.replace(/_/g, ' ');
  };

  const getCurrentWeatherIndex = () => {
    if (!pilotVehicleData || routeWeather.length === 0) return 0;

    const currentDist = pilotVehicleData.currentPosition.distance;
    const totalDist = pilotVehicleData.totalDistance;
    const progressRatio = currentDist / totalDist;
    const weatherIndex = Math.floor(progressRatio * routeWeather.length);

    return Math.min(weatherIndex, routeWeather.length - 1);
  };

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="flex flex-col min-h-screen bg-slateDepth text-textNeutral">
      {/* Top Navigation Bar - Matching Dashboard */}
      <nav className="border-b border-panelNight/40 bg-panelNight/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amberCommand text-black font-bold text-lg">
              🦅
            </div>
            <div>
              <h1 className="text-lg font-bold text-amberCommand">HawkRoute</h1>
              <p className="text-[10px] uppercase tracking-wider text-textNeutral/60">Convoy Command</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm transition-all ${pathname === link.href
                  ? 'bg-amberCommand text-black font-semibold'
                  : 'text-textNeutral/70 hover:bg-panelNight hover:text-textNeutral'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-panelNight/40 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs">Commander</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header - Matching Dashboard Style */}
      <header className="border-b border-panelNight/40 bg-panelNight/40 px-6 py-4 sticky top-[57px] z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-textNeutral/60">AICC · Pilot Vehicle</p>
            <h2 className="text-2xl font-semibold text-textNeutral">Route Reconnaissance System</h2>
            <p className="text-sm text-textNeutral/70 mt-1">Real-time hazard detection with weather integration</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedConvoyId || ''}
              onChange={(e) => handleConvoySelect(e.target.value)}
              disabled={loading}
              className="rounded-lg bg-slateDepth border border-panelNight/40 text-textNeutral px-4 py-2 text-sm focus:border-amberCommand focus:outline-none min-w-[300px] disabled:opacity-50"
            >
              <option value="">Select convoy...</option>
              {convoyList.map((convoy) => (
                <option key={convoy.id} value={convoy.id}>
                  {convoy.name} - {convoy.origin?.name || 'Unknown'} → {convoy.destination?.name || 'Unknown'} ({convoy.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Convoy Info */}
        {pilotVehicleData && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-panelNight/60 border border-panelNight/40 rounded-lg">
              <Map className="w-4 h-4 text-amberCommand" />
              <span className="text-textNeutral/70">Route:</span>
              <span className="text-textNeutral font-semibold">{pilotVehicleData.convoyName}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-panelNight/60 border border-panelNight/40 rounded-lg">
              <span className="text-textNeutral/70">Checkpoints:</span>
              <span className="text-amberCommand font-semibold">{pilotVehicleData.checkpoints.length}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-panelNight/60 border border-panelNight/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-textNeutral/70">Active Hazards:</span>
              <span className="text-orange-400 font-semibold">{pilotVehicleData.hazards.filter(h => h.isActive).length}</span>
            </div>
            {weatherLoading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-700/40 rounded-lg">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-400 text-xs">Loading weather...</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      {!pilotVehicleData ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Truck className="w-16 h-16 text-textNeutral/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-textNeutral/60 mb-2">No Convoy Selected</h2>
            <p className="text-textNeutral/50">Select a convoy from the dropdown above to begin monitoring</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* MAP SECTION - Larger height for better visibility */}
          <div className="h-[800px] border-b border-panelNight/40 px-6 pt-4 pb-4">
            <div className="relative h-full">
              <div className="absolute inset-0 rounded-xl border border-panelNight/40 bg-black overflow-hidden shadow-xl">
                <PilotVehicleMap />
              </div>
            </div>
          </div>

          {/* Playback Controls - Below Map */}
          <div className="border-b border-panelNight/40 bg-panelNight/20 px-6 py-3">
            <PlaybackControls
              isPlaying={simulation.isPlaying}
              speed={simulation.speed}
              onPlayPause={() => setSimulationPlaying(!simulation.isPlaying)}
              onSpeedChange={setSimulationSpeed}
              onReset={handleResetSimulation}
            />
          </div>

          {/* Timeline - Below Controls with enhanced styling */}
          <div className="border-b border-panelNight/40 bg-gradient-to-b from-panelNight/10 to-panelNight/30">
            <PilotTimeline
              checkpoints={pilotVehicleData.checkpoints}
              hazards={pilotVehicleData.hazards}
              totalDistance={pilotVehicleData.totalDistance}
              currentDistance={pilotVehicleData.currentPosition.distance}
              onCheckpointClick={handleCheckpointClick}
              onHazardClick={handleHazardClick}
            />
          </div>

          {/* Event Log - Below Timeline, Always Fully Visible */}
          <div className="px-6 py-6 bg-gradient-to-b from-panelNight/20 to-slateDepth border-t-2 border-amberCommand/30 min-h-[400px]">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-amberCommand flex items-center gap-2">
                <div className="w-3 h-3 bg-amberCommand rounded-full animate-pulse" />
                Mission Events Log
              </h3>
              <p className="text-sm text-textNeutral/60 mt-1">Real-time operational status and system notifications</p>
            </div>
            <EventLogPanel events={eventLog} maxHeight="350px" />
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {activeAlert && (
        <HazardAlertModal
          hazard={activeAlert}
          onAcknowledge={handleAcknowledgeAlert}
          onClose={() => setActiveAlert(null)}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-xl border border-amberCommand/30 bg-panelNight/95 p-8 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amberCommand mx-auto mb-4"></div>
            <p className="text-textNeutral font-semibold">Loading Pilot Vehicle Data...</p>
          </div>
        </div>
      )}

      {/* Notification Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
