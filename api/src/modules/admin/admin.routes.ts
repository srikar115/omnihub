/**
 * Admin Module Route Definitions
 *
 * All admin panel routes are defined here.
 * Routes map to: /api/admin/*
 */

export const ADMIN_ROUTES = {
  BASE: 'api/admin',

  // Auth
  LOGIN: 'login', // POST /api/admin/login

  // Dashboard
  STATS: 'stats', // GET /api/admin/stats
  PROVIDERS: 'providers', // GET /api/admin/providers

  // Models management
  MODELS: 'models', // GET /api/admin/models
  MODEL_BY_ID: 'models/:id', // PUT /api/admin/models/:id
  MODEL_TAGS: 'model-tags', // GET /api/admin/model-tags
  MODEL_PRICING: 'models/:id/pricing-matrix', // GET

  // Users management
  USERS: 'users', // GET /api/admin/users
  USER_BY_ID: 'users/:id', // GET /api/admin/users/:id
  USER_CREDITS: 'users/:id/credits', // PUT
  USER_STATUS: 'users/:id/status', // PUT
  USER_DELETE: 'users/:id', // DELETE

  // Settings
  SETTINGS: 'settings', // GET, PUT /api/admin/settings
  SYNC_MODELS: 'sync-models', // POST
  REFRESH_PRICING: 'refresh-pricing', // POST

  // Logs
  AUDIT_LOGS: 'audit-logs', // GET
  ERROR_LOGS: 'error-logs', // GET

  // Analytics
  ANALYTICS: 'analytics', // GET
  ANALYTICS_SIGNUPS: 'analytics/signups', // GET
  ANALYTICS_REVENUE: 'analytics/revenue', // GET
  ANALYTICS_USAGE: 'analytics/usage', // GET

  // Community moderation
  COMMUNITY: 'community', // GET
} as const;
