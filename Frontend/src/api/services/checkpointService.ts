// Checkpoint Service for HawkRoute
// Handles checkpoint management and status updates

import client, { handleApiError } from '../client';
import { CHECKPOINT_ENDPOINTS } from '../endpoints';
import type { Checkpoint, ApiResponse } from '../types';

// ============================================
// CHECKPOINT SERVICE
// ============================================

export const checkpointService = {
  /**
   * Get checkpoints for a specific convoy
   */
  getByConvoy: async (convoyId: string): Promise<Checkpoint[]> => {
    try {
      const response = await client.get<ApiResponse<Checkpoint[]>>(
        CHECKPOINT_ENDPOINTS.GET_BY_CONVOY(convoyId)
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new checkpoint
   */
  create: async (payload: Partial<Checkpoint>): Promise<Checkpoint> => {
    try {
      const response = await client.post<ApiResponse<Checkpoint>>(
        CHECKPOINT_ENDPOINTS.CREATE,
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update checkpoint
   */
  update: async (
    checkpointId: string,
    payload: Partial<Checkpoint>
  ): Promise<Checkpoint> => {
    try {
      const response = await client.put<ApiResponse<Checkpoint>>(
        CHECKPOINT_ENDPOINTS.UPDATE(checkpointId),
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Mark checkpoint as cleared
   */
  markCleared: async (checkpointId: string): Promise<Checkpoint> => {
    try {
      const response = await client.post<ApiResponse<Checkpoint>>(
        CHECKPOINT_ENDPOINTS.MARK_CLEARED(checkpointId)
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default checkpointService;
