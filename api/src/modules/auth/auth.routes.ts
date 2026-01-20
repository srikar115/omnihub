/**
 * Auth Module Route Definitions
 *
 * All authentication-related routes are defined here for easy maintenance.
 * Routes map to: /api/auth/*
 */

export const AUTH_ROUTES = {
  // Base path for all auth routes
  BASE: 'api/auth',

  // Public routes (no authentication required)
  REGISTER: 'register', // POST /api/auth/register
  LOGIN: 'login', // POST /api/auth/login
  GOOGLE: 'google', // POST /api/auth/google

  // Protected routes (authentication required)
  ME: 'me', // GET /api/auth/me
} as const;

// Route descriptions for documentation
export const AUTH_ROUTE_DESCRIPTIONS = {
  REGISTER: 'Register a new user account',
  LOGIN: 'Login with email and password',
  GOOGLE: 'Authenticate using Google OAuth',
  ME: 'Get current authenticated user profile',
} as const;
