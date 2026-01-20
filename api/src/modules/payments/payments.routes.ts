/**
 * Payments Module Route Definitions
 */
export const PAYMENTS_ROUTES = {
  BASE: 'api/payments',
  CREATE_ORDER: 'create-order', // POST
  VERIFY: 'verify', // POST
  SUBSCRIPTION_PLANS: 'api/subscription-plans', // GET (separate base)
} as const;
