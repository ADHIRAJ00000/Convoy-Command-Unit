// Pilot Vehicle State Management using Zustand

import { create } from 'zustand';
import {
  PilotVehicleData,
  SimulationControl,
  Alert,
  Hazard,
  PilotVehiclePosition,
  Checkpoint
} from '@/types/pilotVehicle';

interface PilotVehicleStore {
  // Data
  selectedConvoyId: string | null;
  pilotVehicleData: PilotVehicleData | null;
  alerts: Alert[];
  eventLog: Array<{ id: string; message: string; timestamp: string; type: string }>;
  
  // Simulation
  simulation: SimulationControl;
  
  // UI State
  selectedHazard: Hazard | null;
  isDrawerOpen: boolean;
  cameraMode: 'FOLLOW' | 'FREE';
  
  // Actions
  setSelectedConvoyId: (id: string) => void;
  setPilotVehicleData: (data: PilotVehicleData) => void;
  updatePosition: (position: PilotVehiclePosition) => void;
  addAlert: (hazard: Hazard) => void;
  acknowledgeAlert: (alertId: string) => void;
  addEventLog: (message: string, type: string) => void;
  setSimulationPlaying: (isPlaying: boolean) => void;
  setSimulationSpeed: (speed: 0.5 | 1 | 2 | 4) => void;
  setSelectedHazard: (hazard: Hazard | null) => void;
  setDrawerOpen: (isOpen: boolean) => void;
  toggleCameraMode: () => void;
  updateCheckpointStatus: (checkpointId: string, status: 'PENDING' | 'REACHED' | 'PASSED') => void;
  reset: () => void;
}

export const usePilotVehicleStore = create<PilotVehicleStore>((set, get) => ({
  // Initial State
  selectedConvoyId: null,
  pilotVehicleData: null,
  alerts: [],
  eventLog: [],
  simulation: {
    isPlaying: false,
    speed: 1,
    currentTime: 0,
  },
  selectedHazard: null,
  isDrawerOpen: false,
  cameraMode: 'FOLLOW',

  // Actions
  setSelectedConvoyId: (id) => set({ selectedConvoyId: id }),

  setPilotVehicleData: (data) => set({ pilotVehicleData: data }),

  updatePosition: (position) => {
    const state = get();
    if (!state.pilotVehicleData) return;

    set({
      pilotVehicleData: {
        ...state.pilotVehicleData,
        currentPosition: position,
      },
    });

    // Check for hazard proximity
    state.pilotVehicleData.hazards.forEach((hazard) => {
      if (hazard.isActive && Math.abs(hazard.distance - position.distance) < 0.5) {
        // Within 500m of hazard
        const existingAlert = state.alerts.find((a) => a.hazard.id === hazard.id);
        if (!existingAlert) {
          get().addAlert(hazard);
        }
      }
    });

    // Check for checkpoint proximity
    state.pilotVehicleData.checkpoints.forEach((checkpoint) => {
      if (checkpoint.status === 'PENDING' && Math.abs(checkpoint.distance - position.distance) < 0.1) {
        get().updateCheckpointStatus(checkpoint.id, 'REACHED');
        get().addEventLog(`Pilot Vehicle reached ${checkpoint.name}`, 'CHECKPOINT');
      }
    });
  },

  addAlert: (hazard) => {
    const alert: Alert = {
      id: `alert-${Date.now()}`,
      hazard,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    set((state) => ({ alerts: [...state.alerts, alert] }));
    get().addEventLog(
      `⚠️ ${hazard.type.replace(/_/g, ' ')} detected at ${hazard.distance.toFixed(1)}km - ${hazard.severity}`,
      'HAZARD'
    );
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    }));
  },

  addEventLog: (message, type) => {
    const event = {
      id: `event-${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date().toISOString(),
      type,
    };
    set((state) => ({
      eventLog: [event, ...state.eventLog].slice(0, 100), // Keep last 100 events
    }));
  },

  setSimulationPlaying: (isPlaying) => {
    set((state) => ({
      simulation: { ...state.simulation, isPlaying },
    }));
    if (isPlaying) {
      get().addEventLog('Simulation started', 'SYSTEM');
    } else {
      get().addEventLog('Simulation paused', 'SYSTEM');
    }
  },

  setSimulationSpeed: (speed) => {
    set((state) => ({
      simulation: { ...state.simulation, speed },
    }));
    get().addEventLog(`Simulation speed set to ${speed}x`, 'SYSTEM');
  },

  setSelectedHazard: (hazard) => set({ selectedHazard: hazard }),

  setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

  toggleCameraMode: () => {
    set((state) => ({
      cameraMode: state.cameraMode === 'FOLLOW' ? 'FREE' : 'FOLLOW',
    }));
    const newMode = get().cameraMode;
    get().addEventLog(`Camera mode: ${newMode}`, 'SYSTEM');
  },

  updateCheckpointStatus: (checkpointId, status) => {
    set((state) => {
      if (!state.pilotVehicleData) return state;
      return {
        pilotVehicleData: {
          ...state.pilotVehicleData,
          checkpoints: state.pilotVehicleData.checkpoints.map((cp) =>
            cp.id === checkpointId ? { ...cp, status } : cp
          ),
        },
      };
    });
  },

  reset: () => {
    set({
      selectedConvoyId: null,
      pilotVehicleData: null,
      alerts: [],
      eventLog: [],
      simulation: { isPlaying: false, speed: 1, currentTime: 0 },
      selectedHazard: null,
      isDrawerOpen: false,
      cameraMode: 'FOLLOW',
    });
  },
}));
