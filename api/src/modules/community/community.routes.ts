/**
 * Community Module Route Definitions
 */
export const COMMUNITY_ROUTES = {
  BASE: 'api/community',
  LIST: '', // GET /api/community
  CATEGORIES: 'categories', // GET /api/community/categories
  PUBLISH: 'publish', // POST /api/community/publish
  USER_POSTS: 'user/me', // GET /api/community/user/me
  POST_BY_ID: ':id', // GET, DELETE /api/community/:id
  LIKE: ':id/like', // POST /api/community/:id/like
} as const;
