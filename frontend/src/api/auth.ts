import { apiClient } from './client';
import type { ApiResponse, AuthTokens, User } from '../types/api.types';

export const authApi = {
  requestOtp: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/request-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    apiClient.post<ApiResponse<AuthTokens & { user: User }>>('/auth/verify-otp', { email, otp }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/auth/logout'),
};
