/**
 * API utilities for OmniHub frontend
 * Includes automatic token refresh mechanism
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
// Backward compatibility - many components still use 'userToken'
const LEGACY_TOKEN_KEY = 'userToken';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean;
  _retry?: boolean; // Internal flag to prevent infinite retry loops
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
 * Token management utilities
 */
export const tokenManager = {
  /**
   * Get access token from localStorage
   * Also checks legacy 'userToken' key for backward compatibility
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Store tokens after login/register/refresh
   * Also stores to legacy 'userToken' key for backward compatibility
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Backward compatibility - set userToken as well
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    if (expiresIn) {
      // Store expiry time (current time + expiresIn seconds - 30 second buffer)
      const expiryTime = Date.now() + (expiresIn - 30) * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
  },

  /**
   * Clear all tokens (logout)
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    // Backward compatibility - also remove legacy token
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },

  /**
   * Check if access token is expired or about to expire
   */
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() >= parseInt(expiry, 10);
  },

  /**
   * Check if user has tokens (is logged in)
   * Checks both new and legacy token keys
   */
  hasTokens(): boolean {
    const hasAccess = !!this.getAccessToken();
    const hasRefresh = !!this.getRefreshToken();
    // For backward compatibility, if only legacy token exists, consider logged in
    // but refresh won't work until re-login
    return hasAccess && (hasRefresh || !!localStorage.getItem(LEGACY_TOKEN_KEY));
  },
};

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that request to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear tokens and redirect to login
        tokenManager.clearTokens();
        return false;
      }

      const data = await response.json();
      tokenManager.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      return true;
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      tokenManager.clearTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Make an API request with automatic token refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, _retry = false } = config;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if needed
  if (auth) {
    // Check if token is expired and refresh proactively
    if (tokenManager.hasTokens() && tokenManager.isTokenExpired() && !_retry) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        throw new ApiError('Session expired. Please login again.', 401);
      }
    }

    const token = tokenManager.getAccessToken();
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

  // Handle 401 - try to refresh token and retry once
  if (response.status === 401 && auth && !_retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the request with new token
      return apiRequest<T>(endpoint, { ...config, _retry: true });
    }
    // Refresh failed - throw error
    throw new ApiError('Session expired. Please login again.', 401, data);
  }

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

  patch: <T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>) =>
    apiRequest<T>(endpoint, { ...config, method: 'DELETE' }),
};

// Auth response type
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    credits: number;
    avatarUrl?: string;
  };
  defaultWorkspace?: any;
}

// Auth helpers
export const auth = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password }, { auth: false });
    tokenManager.setTokens(response.accessToken, response.refreshToken, response.expiresIn);
    return response;
  },

  /**
   * Register a new user
   */
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', { email, password, name }, { auth: false });
    tokenManager.setTokens(response.accessToken, response.refreshToken, response.expiresIn);
    return response;
  },

  /**
   * Google OAuth login
   */
  googleAuth: async (credential: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/google', { credential }, { auth: false });
    tokenManager.setTokens(response.accessToken, response.refreshToken, response.expiresIn);
    return response;
  },

  /**
   * Get current user profile
   */
  me: () => api.get('/auth/me'),

  /**
   * Refresh tokens manually
   */
  refresh: async (): Promise<boolean> => {
    return refreshAccessToken();
  },

  /**
   * Logout from current device
   */
  logout: async (): Promise<void> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken }, { auth: false });
      } catch (error) {
        // Ignore errors during logout
        console.warn('[API] Logout request failed:', error);
      }
    }
    tokenManager.clearTokens();
  },

  /**
   * Logout from all devices
   */
  logoutAll: async (): Promise<void> => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.warn('[API] Logout all request failed:', error);
    }
    tokenManager.clearTokens();
  },

  /**
   * Get active sessions
   */
  getSessions: () => api.get('/auth/sessions'),

  /**
   * Revoke a specific session
   */
  revokeSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),

  /**
   * Check if user is logged in
   */
  isLoggedIn: (): boolean => tokenManager.hasTokens(),
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
