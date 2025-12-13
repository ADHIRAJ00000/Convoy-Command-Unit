// Alert Service for HawkRoute
// Handles system alerts and acknowledgment

import client, { handleApiError } from '../client';
import { ALERT_ENDPOINTS } from '../endpoints';
import type { Alert, AcknowledgeAlertDTO, ApiResponse } from '../types';

// ============================================
// ALERT SERVICE
// ============================================

export const alertService = {
  /**
   * Get all alerts
   */
  getAll: async (): Promise<Alert[]> => {
    try {
      const response = await client.get<ApiResponse<Alert[]>>(
        ALERT_ENDPOINTS.GET_ALL
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get alert by ID
   */
  getById: async (alertId: string): Promise<Alert> => {
    try {
      const response = await client.get<ApiResponse<Alert>>(
        ALERT_ENDPOINTS.GET_BY_ID(alertId)
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledged: async (): Promise<Alert[]> => {
    try {
      const response = await client.get<ApiResponse<Alert[]>>(
        ALERT_ENDPOINTS.GET_UNACKNOWLEDGED
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get alerts for a specific convoy
   */
  getByConvoy: async (convoyId: string): Promise<Alert[]> => {
    try {
      const response = await client.get<ApiResponse<Alert[]>>(
        ALERT_ENDPOINTS.GET_BY_CONVOY(convoyId)
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Acknowledge an alert
   */
  acknowledge: async (payload: AcknowledgeAlertDTO): Promise<Alert> => {
    try {
      const response = await client.post<ApiResponse<Alert>>(
        ALERT_ENDPOINTS.ACKNOWLEDGE,
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default alertService;
