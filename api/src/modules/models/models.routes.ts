/**
 * Models Module Route Definitions
 *
 * All AI model-related routes are defined here.
 * Routes map to: /api/models/*
 */

export const MODELS_ROUTES = {
  // Base path
  BASE: 'api/models',

  // Public routes
  LIST: '', // GET /api/models - List all models
  GET_BY_ID: ':id', // GET /api/models/:id - Get model by ID
  CALCULATE_PRICE: ':id/price', // POST /api/models/:id/price - Calculate price for options
} as const;

export const MODELS_ROUTE_DESCRIPTIONS = {
  LIST: 'Get all available AI models',
  GET_BY_ID: 'Get a specific model by ID',
  CALCULATE_PRICE: 'Calculate price for model with specific options',
} as const;
