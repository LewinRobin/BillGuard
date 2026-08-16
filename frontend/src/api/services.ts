import { apiClient } from './client';
import type { ApiResponse } from '../types/api.types';

export interface ServiceItem {
  id: string;
  canonicalName: string;
  category: string;
}

export const servicesApi = {
  search: (q: string) =>
    apiClient.get<ApiResponse<{ items: ServiceItem[]; total: number }>>('/api/v1/services', {
      params: { q },
    }),
};
