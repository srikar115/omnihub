/**
 * Workspaces Module Route Definitions
 *
 * All workspace-related routes are defined here.
 * Routes map to: /api/workspaces/*
 */

export const WORKSPACES_ROUTES = {
  // Base path
  BASE: 'api/workspaces',

  // CRUD routes
  LIST: '', // GET /api/workspaces
  CREATE: '', // POST /api/workspaces
  GET_BY_ID: ':id', // GET /api/workspaces/:id
  UPDATE: ':id', // PATCH /api/workspaces/:id
  DELETE: ':id', // DELETE /api/workspaces/:id

  // Member routes
  LIST_MEMBERS: ':id/members', // GET /api/workspaces/:id/members
  UPDATE_MEMBER: ':id/members/:userId', // PATCH /api/workspaces/:id/members/:userId
  REMOVE_MEMBER: ':id/members/:userId', // DELETE /api/workspaces/:id/members/:userId

  // Invite routes
  INVITE: ':id/invite', // POST /api/workspaces/:id/invite
  GET_INVITE: 'invite/:token', // GET /api/workspaces/invite/:token
  JOIN: 'join/:token', // POST /api/workspaces/join/:token

  // Credits routes
  ADD_CREDITS: ':id/credits/add', // POST /api/workspaces/:id/credits/add
  ALLOCATE_CREDITS: ':id/credits/allocate', // POST /api/workspaces/:id/credits/allocate
  CREDITS_USAGE: ':id/credits/usage', // GET /api/workspaces/:id/credits/usage

  // Gallery route
  GALLERY: ':id/gallery', // GET /api/workspaces/:id/gallery
} as const;

export const WORKSPACES_ROUTE_DESCRIPTIONS = {
  LIST: 'List all workspaces for current user',
  CREATE: 'Create a new workspace',
  GET_BY_ID: 'Get workspace details',
  UPDATE: 'Update workspace settings',
  DELETE: 'Delete a workspace',
  LIST_MEMBERS: 'List workspace members',
  UPDATE_MEMBER: 'Update member role',
  REMOVE_MEMBER: 'Remove a member from workspace',
  INVITE: 'Invite a user to workspace',
  GET_INVITE: 'Get invite details by token',
  JOIN: 'Join workspace using invite token',
  ADD_CREDITS: 'Add credits to workspace',
  ALLOCATE_CREDITS: 'Allocate credits to a member',
  CREDITS_USAGE: 'Get workspace credits usage',
  GALLERY: 'Get workspace gallery',
} as const;
