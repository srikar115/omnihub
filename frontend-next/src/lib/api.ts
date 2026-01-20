/**
 * API utilities for OmniHub frontend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Get auth token from localStorage
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userToken');
}

/**
 * Make an API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = config;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || 'Request failed',
      response.status,
      data
    );
  }

  return data;
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'PUT', body }),

  delete: <T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'DELETE' }),
};

// Auth helpers
export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }, { auth: false }),

  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }, { auth: false }),

  me: () => api.get('/auth/me'),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
    }
  },
};

// Generation helpers
export const generations = {
  create: (type: string, model: string, prompt: string, options = {}) =>
    api.post('/generate', { type, model, prompt, options }),

  get: (id: string) => api.get(`/generations/${id}`),

  list: (params?: { type?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get(`/generations${query ? `?${query}` : ''}`);
  },
};

// Models helpers
export const models = {
  list: () => api.get('/models', { auth: false }),
  get: (id: string) => api.get(`/models/${id}`, { auth: false }),
};

// Workflows helpers
export const workflows = {
  list: () => api.get('/workflows', { auth: false }),
  get: (id: string) => api.get(`/workflows/${id}`, { auth: false }),
  run: (id: string, inputs: any, workspaceId?: string) =>
    api.post(`/workflows/${id}/run`, { inputs, workspaceId }),
  getRunStatus: (runId: string) => api.get(`/workflow-runs/${runId}`),
  cancelRun: (runId: string) => api.post(`/workflow-runs/${runId}/cancel`),
  completeTask: (taskId: string, response: any) =>
    api.post(`/workflow-tasks/${taskId}/complete`, { response }),
};

export { ApiError };
