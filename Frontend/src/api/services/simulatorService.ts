// Simulator Service for HawkRoute
// Handles real-time convoy simulation and event triggering

import client, { handleApiError } from '../client';
import { SIMULATOR_ENDPOINTS } from '../endpoints';
import type {
  SimulatorStartDTO,
  SimulatorStopDTO,
  SimulatorStatus,
  SimulatorEventDTO,
  ApiResponse,
} from '../types';

// ============================================
// SIMULATOR SERVICE
// ============================================

export const simulatorService = {
  /**
   * Start convoy simulation
   */
  start: async (payload: SimulatorStartDTO): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.START,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Stop convoy simulation
   */
  stop: async (payload: SimulatorStopDTO): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.STOP,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get simulator status for a convoy
   */
  getStatus: async (convoyId: string): Promise<SimulatorStatus> => {
    try {
      const response = await client.get<ApiResponse<SimulatorStatus>>(
        SIMULATOR_ENDPOINTS.STATUS(convoyId)
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger a generic event
   */
  triggerEvent: async (payload: SimulatorEventDTO): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.TRIGGER_EVENT,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger road blockage event
   */
  blockRoad: async (convoyId: string, location: any): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.BLOCK_ROAD,
        { convoyId, location }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger rain event
   */
  rain: async (convoyId: string): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.RAIN,
        { convoyId }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger congestion event
   */
  congestion: async (convoyId: string): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.CONGESTION,
        { convoyId }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger landslide event
   */
  landslide: async (convoyId: string, location: any): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.LANDSLIDE,
        { convoyId, location }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger ambush event
   */
  ambush: async (convoyId: string, location: any): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.AMBUSH,
        { convoyId, location }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Trigger mechanical failure event
   */
  mechanicalFailure: async (convoyId: string): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        SIMULATOR_ENDPOINTS.MECHANICAL_FAILURE,
        { convoyId }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default simulatorService;
