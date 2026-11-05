import axios from 'axios';
import {
  User,
  Sender,
  Campaign,
  Email,
  QueueMetrics,
  RateLimitUsage,
  SlackStatus,
  RecipientParseResult,
  Pagination
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized and not on login page, redirect
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Don't auto-redirect on check me
      if (!error.config.url.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getGoogleAuthStatus: () => api.get<{ success: boolean; data: { configured: boolean; authUrl: string | null } }>('/auth/google/status'),
  loginGoogle: (idToken: string) => api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/google', { idToken }),
  loginDemo: (email?: string, name?: string, avatar?: string) => api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/demo', { email, name, avatar }),
  getMe: () => api.get<{ success: boolean; data: User }>('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const dashboardApi = {
  getStats: () => api.get<{
    success: boolean;
    data: {
      metrics: {
        totalEmails: number;
        scheduledEmails: number;
        sentEmails: number;
        failedEmails: number;
        pendingEmails: number;
        activeQueueJobs: number;
        waitingQueueJobs: number;
        delayedQueueJobs: number;
      };
      queue: QueueMetrics;
      rateLimits: RateLimitUsage[];
      recentEmails: Email[];
    };
  }>('/dashboard/stats')
};

export const senderApi = {
  getAll: () => api.get<{ success: boolean; data: Sender[] }>('/senders'),
  create: (data: any) => api.post<{ success: boolean; data: Sender }>('/senders', data),
  createEthereal: (name?: string) => api.post<{ success: boolean; data: Sender }>('/senders/ethereal', { name }),
  test: (id: string) => api.post<{ success: boolean; data: { success: boolean; message: string } }>(`/senders/${id}/test`),
  delete: (id: string) => api.delete<{ success: boolean }>(`/senders/${id}`)
};

export const campaignApi = {
  getAll: () => api.get<{ success: boolean; data: Campaign[] }>('/campaigns'),
  getById: (id: string) => api.get<{ success: boolean; data: Campaign }>(`/campaigns/${id}`)
};

export const emailApi = {
  schedule: (data: {
    subject: string;
    body: string;
    recipients: string[];
    startDate: string;
    startTime: string;
    delayBetweenEmails?: number;
    hourlyLimit?: number;
    senderId: string;
  }) => api.post<{ success: boolean; data: any }>('/emails/schedule', data),

  uploadRecipients: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ success: boolean; data: RecipientParseResult }>('/emails/upload-recipients', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getScheduled: (params: { page?: number; limit?: number; status?: string; search?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: Email[]; pagination: Pagination }>('/emails/scheduled', { params }),

  getSent: (params: { page?: number; limit?: number; status?: string; search?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: Email[]; pagination: Pagination }>('/emails/sent', { params }),

  search: (params: { q?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; total: number; page: number; limit: number; totalPages: number; results: any[]; source: string }>('/emails/search', { params }),

  cancel: (id: string) => api.post<{ success: boolean; data: Email }>(`/emails/${id}/cancel`)
};

export const slackApi = {
  getConnectUrl: () => api.get<{ success: boolean; data: { url: string } }>('/slack/connect'),
  getStatus: () => api.get<{ success: boolean; data: SlackStatus }>('/slack/status'),
  disconnect: () => api.post<{ success: boolean }>('/slack/disconnect'),
  sendTestAlert: () => api.post<{ success: boolean; message: string }>('/slack/test-alert')
};

export const queueApi = {
  getStats: () => api.get<{ success: boolean; data: QueueMetrics }>('/queue/stats'),
  pause: () => api.post('/queue/pause'),
  resume: () => api.post('/queue/resume')
};

export const rateLimitApi = {
  getAll: () => api.get<{ success: boolean; data: RateLimitUsage[] }>('/rate-limits'),
  getSender: (senderId: string) => api.get<{ success: boolean; data: RateLimitUsage }>(`/rate-limits/${senderId}`),
  reset: (senderId: string) => api.post<{ success: boolean }>(`/rate-limits/${senderId}/reset`)
};

export default api;

