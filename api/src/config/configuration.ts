export const configuration = () => ({
  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'omnihub-secret-key-change-in-production',
    expiresIn: '7d',
  },

  // Database (PostgreSQL only)
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== 'false', // Default: SSL enabled
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // AI Providers
  providers: {
    fal: {
      apiKey: process.env.FAL_KEY,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
    },
    replicate: {
      apiKey: process.env.REPLICATE_API_TOKEN,
    },
    selfHosted: {
      url: process.env.SELFHOSTED_URL || 'http://localhost:7860',
      backend: process.env.SELFHOSTED_BACKEND || 'automatic1111',
    },
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  // Feature Flags
  features: {
    useProviderLayer: process.env.USE_PROVIDER_LAYER === 'true',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
