import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api.types';
import type { Bill, UploadBillPayload } from '../types/bill.types';

export const billsApi = {
  upload: (payload: UploadBillPayload) => {
    const form = new FormData();
    form.append('file', {
      uri: payload.uri,
      name: payload.name,
      type: payload.mimeType,
    } as any);
    form.append('city', payload.city);
    form.append('state', payload.state);

    return apiClient.post<ApiResponse<{ billId: string }>>('/api/v1/bills/upload-bill', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  processBill: (billId: string) =>
    apiClient.post<ApiResponse<{ taskId: string }>>(`/api/v1/bills/process-bill`, { billId }),

  getBill: (billId: string) =>
    apiClient.get<ApiResponse<Bill>>(`/api/v1/bills/bill/${billId}`),

  getBillAnalysis: (billId: string) =>
    apiClient.get<ApiResponse<Bill>>(`/api/v1/bills/bill/${billId}/analysis`),

  getUserBills: (page = 1, limit = 10) =>
    apiClient.get<ApiResponse<PaginatedResponse<Bill>>>('/api/v1/bills', {
      params: { page, limit },
    }),

  deleteBill: (billId: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/bills/bill/${billId}`),
};
