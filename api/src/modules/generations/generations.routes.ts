/**
 * Generations Module Route Definitions
 *
 * All image/video generation routes are defined here.
 * Routes map to: /api/generations/* and /api/generate
 */

export const GENERATIONS_ROUTES = {
  // Base paths
  BASE: 'api/generations',
  GENERATE_BASE: 'api/generate',

  // Generation routes
  CREATE: '', // POST /api/generate - Create new generation
  LIST: '', // GET /api/generations - List user's generations
  GET_BY_ID: ':id', // GET /api/generations/:id - Get generation by ID
  DELETE: ':id', // DELETE /api/generations/:id - Delete generation
  CANCEL: ':id/cancel', // POST /api/generations/:id/cancel - Cancel generation
  BULK_DELETE: 'bulk-delete', // POST /api/generations/bulk-delete
  SHARE: ':id/share', // PATCH /api/generations/:id/share - Share generation
} as const;

export const GENERATIONS_ROUTE_DESCRIPTIONS = {
  CREATE: 'Create a new image or video generation',
  LIST: 'List all generations for the current user',
  GET_BY_ID: 'Get a specific generation by ID',
  DELETE: 'Delete a generation',
  CANCEL: 'Cancel an in-progress generation',
  BULK_DELETE: 'Delete multiple generations at once',
  SHARE: 'Share a generation with workspace',
} as const;
