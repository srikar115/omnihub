export const PROJECTS_ROUTES = {
  BASE: 'api/projects',
  LIST: '', // GET
  CREATE: '', // POST
  UPDATE: ':id', // PUT
  DELETE: ':id', // DELETE
  ASSETS: ':id/assets', // GET, POST
  ITEMS: ':id/items', // GET
} as const;
