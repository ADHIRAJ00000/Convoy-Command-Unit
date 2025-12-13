// Event Service for HawkRoute
// Handles event logs and activity tracking

import client, { handleApiError } from '../client';
import { EVENT_ENDPOINTS } from '../endpoints';
import type { EventLog, EventLogQuery, ApiResponse } from '../types';

// ============================================
// EVENT SERVICE
// ============================================

export const eventService = {
  /**
   * Get all events with optional filters
   */
  getAll: async (query?: EventLogQuery): Promise<EventLog[]> => {
    try {
      const response = await client.get<ApiResponse<EventLog[]>>(
        EVENT_ENDPOINTS.GET_ALL,
        { params: query }
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get events for a specific convoy
   */
  getByConvoy: async (convoyId: string): Promise<EventLog[]> => {
    try {
      const response = await client.get<ApiResponse<EventLog[]>>(
        EVENT_ENDPOINTS.GET_BY_CONVOY(convoyId)
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get event by ID
   */
  getById: async (eventId: string): Promise<EventLog> => {
    try {
      const response = await client.get<ApiResponse<EventLog>>(
        EVENT_ENDPOINTS.GET_BY_ID(eventId)
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get recent events (last 50)
   */
  getRecent: async (): Promise<EventLog[]> => {
    try {
      const response = await client.get<ApiResponse<EventLog[]>>(
        EVENT_ENDPOINTS.GET_RECENT
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new event log
   */
  create: async (payload: Partial<EventLog>): Promise<EventLog> => {
    try {
      const response = await client.post<ApiResponse<EventLog>>(
        EVENT_ENDPOINTS.CREATE,
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default eventService;
