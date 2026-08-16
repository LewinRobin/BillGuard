import { apiClient } from './client';
import type { ApiResponse, AuthTokens, User } from '../types/api.types';

export const authApi = {
  requestOtp: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/api/v1/auth/request-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    apiClient.post<ApiResponse<AuthTokens & { user: User }>>('/api/v1/auth/verify-otp', {
      email,
      otp,
    }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/api/v1/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/api/v1/auth/logout'),
};
