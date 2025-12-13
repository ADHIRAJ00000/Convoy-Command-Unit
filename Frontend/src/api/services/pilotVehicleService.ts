// Pilot Vehicle API Service
// Handles all API calls related to pilot vehicle monitoring

import client, { handleApiError } from '../client';
import { PILOT_VEHICLE_ENDPOINTS, CONVOY_ENDPOINTS } from '../endpoints';
import { PilotVehicleData } from '@/types/pilotVehicle';

export interface ConvoyListItem {
  _id: string;
  name: string;
  status: string;
  route: any;
}

/**
 * Get list of all convoys for selection
 */
export const getConvoyList = async (): Promise<ConvoyListItem[]> => {
  try {
    const response = await client.get(CONVOY_ENDPOINTS.GET_ALL);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching convoy list:', error);
    throw new Error(handleApiError(error));
  }
};

/**
 * Get complete pilot vehicle data for a convoy
 */
export const getPilotVehicleData = async (convoyId: string): Promise<PilotVehicleData> => {
  try {
    const response = await client.get(PILOT_VEHICLE_ENDPOINTS.GET_DATA(convoyId));
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching pilot vehicle data:', error);
    throw new Error(handleApiError(error));
  }
};

/**
 * Get route segments for pilot vehicle
 */
export const getPilotVehicleRoute = async (convoyId: string) => {
  try {
    const response = await client.get(PILOT_VEHICLE_ENDPOINTS.GET_ROUTE(convoyId));
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching pilot vehicle route:', error);
    throw new Error(handleApiError(error));
  }
};

/**
 * Get hazards detected along the route
 */
export const getPilotVehicleHazards = async (convoyId: string) => {
  try {
    const response = await client.get(PILOT_VEHICLE_ENDPOINTS.GET_HAZARDS(convoyId));
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching pilot vehicle hazards:', error);
    throw new Error(handleApiError(error));
  }
};

/**
 * Get checkpoints along the route
 */
export const getPilotVehicleCheckpoints = async (convoyId: string) => {
  try {
    const response = await client.get(PILOT_VEHICLE_ENDPOINTS.GET_CHECKPOINTS(convoyId));
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching pilot vehicle checkpoints:', error);
    throw new Error(handleApiError(error));
  }
};

/**
 * Get current progress/position of pilot vehicle
 */
export const getPilotVehicleProgress = async (convoyId: string) => {
  try {
    const response = await client.get(PILOT_VEHICLE_ENDPOINTS.GET_PROGRESS(convoyId));
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching pilot vehicle progress:', error);
    throw new Error(handleApiError(error));
  }
};

// Export all services
export const pilotVehicleService = {
  getConvoyList,
  getPilotVehicleData,
  getPilotVehicleRoute,
  getPilotVehicleHazards,
  getPilotVehicleCheckpoints,
  getPilotVehicleProgress,
};
