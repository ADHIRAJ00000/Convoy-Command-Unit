// Optimizer Service for HawkRoute
// Handles route optimization and alternative route generation

import client, { handleApiError } from '../client';
import { OPTIMIZER_ENDPOINTS } from '../endpoints';
import type { OptimizerRequestDTO, OptimizerResponse, ApiResponse } from '../types';

// ============================================
// OPTIMIZER SERVICE
// ============================================

export const optimizerService = {
  /**
   * Get alternative routes for a convoy
   */
  getAlternatives: async (payload: OptimizerRequestDTO): Promise<OptimizerResponse> => {
    try {
      const response = await client.post<OptimizerResponse>(
        OPTIMIZER_ENDPOINTS.GET_ALTERNATIVES,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Reroute a convoy
   */
  reroute: async (convoyId: string, routeId: string): Promise<ApiResponse> => {
    try {
      const response = await client.post<ApiResponse>(
        OPTIMIZER_ENDPOINTS.REROUTE,
        { convoyId, routeId }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Optimize route for a convoy
   */
  optimize: async (payload: OptimizerRequestDTO): Promise<OptimizerResponse> => {
    try {
      const response = await client.post<OptimizerResponse>(
        OPTIMIZER_ENDPOINTS.OPTIMIZE,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default optimizerService;
