// Convoy Service for HawkRoute
// Handles convoy CRUD operations and route management

import client, { handleApiError } from '../client';
import { CONVOY_ENDPOINTS } from '../endpoints';
import type {
  Convoy,
  ConvoyDTO,
  ApiResponse,
  PaginatedResponse,
} from '../types';

// ============================================
// CONVOY SERVICE
// ============================================

export const convoyService = {
  /**
   * Get all convoys
   */
  getAll: async (): Promise<Convoy[]> => {
    try {
      const response = await client.get<ApiResponse<Convoy[]>>(
        CONVOY_ENDPOINTS.GET_ALL
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get active convoys only
   */
  getActive: async (): Promise<Convoy[]> => {
    try {
      const response = await client.get<ApiResponse<Convoy[]>>(
        CONVOY_ENDPOINTS.GET_ACTIVE
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get convoy by ID
   */
  getById: async (id: string): Promise<Convoy> => {
    try {
      const response = await client.get<ApiResponse<Convoy>>(
        CONVOY_ENDPOINTS.GET_BY_ID(id)
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get convoys by status
   */
  getByStatus: async (status: string): Promise<Convoy[]> => {
    try {
      const response = await client.get<ApiResponse<Convoy[]>>(
        CONVOY_ENDPOINTS.GET_BY_STATUS(status)
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new convoy
   */
  create: async (payload: ConvoyDTO): Promise<Convoy> => {
    try {
      const response = await client.post<ApiResponse<Convoy>>(
        CONVOY_ENDPOINTS.CREATE,
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update convoy
   */
  update: async (id: string, payload: Partial<ConvoyDTO>): Promise<Convoy> => {
    try {
      const response = await client.put<ApiResponse<Convoy>>(
        CONVOY_ENDPOINTS.UPDATE(id),
        payload
      );
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete convoy
   */
  delete: async (id: string): Promise<void> => {
    try {
      await client.delete(CONVOY_ENDPOINTS.DELETE(id));
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default convoyService;
