# Production Architecture Migration Guide

This guide explains how to migrate OmniHub to the new production-ready architecture with PostgreSQL and provider-agnostic AI integration.

## Overview

The new architecture provides:
1. **PostgreSQL Database** - Scalable, concurrent, production-ready
2. **Provider Abstraction** - Automatic failover between Fal.ai, Replicate, and self-hosted
3. **Unified Model Registry** - Single source of truth for model configurations

---

## Phase 1: PostgreSQL Migration

### Step 1: Configure Database

Add to your `.env` file:

```bash
# PostgreSQL connection (use your cloud provider's URL)
DATABASE_URL=postgresql://user:password@host:5432/omnihub

# Optional: Disable SSL for local development
DATABASE_SSL=false
```

**Recommended Providers:**
- [Supabase](https://supabase.com) - Free tier, easy setup
- [Neon](https://neon.tech) - Serverless, auto-scaling
- [Railway](https://railway.app) - Simple deployment

### Step 2: Run Schema Migration

```bash
# Connect to your PostgreSQL instance and run:
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

### Step 3: Update index.js Imports

Replace the SQLite imports with the new database module:

```javascript
// OLD (SQLite)
const Database = require('better-sqlite3');
const db = new Database('omnihub.db');

// NEW (PostgreSQL with fallback)
const { query, getOne, getAll, run, db, isPostgres } = require('./db');
```

### Step 4: Convert Queries (Incremental)

The `db.js` module provides compatibility functions. You can migrate queries incrementally:

```javascript
// OLD (SQLite - synchronous)
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
const users = db.prepare('SELECT * FROM users').all();
db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);

// NEW (PostgreSQL - async with compatibility layer)
const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
const users = await getAll('SELECT * FROM users');
await run('INSERT INTO users (id, email) VALUES (?, ?)', [id, email]);

// OR using native PostgreSQL syntax
const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
const user = rows[0];
```

### Step 5: Handle Async Routes

All route handlers need to be async when using PostgreSQL:

```javascript
// OLD
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// NEW
app.get('/api/users', async (req, res) => {
  try {
    const users = await getAll('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Phase 2: Provider-Agnostic Integration

### Step 1: Add Provider API Keys

Add to `.env`:

```bash
# Primary provider (Fal.ai)
FAL_KEY=your-fal-api-key

# Fallback provider (Replicate) - optional
REPLICATE_API_TOKEN=your-replicate-token

# Self-hosted (optional)
SELFHOSTED_URL=http://localhost:7860
SELFHOSTED_BACKEND=automatic1111
```

### Step 2: Use Provider Router

Replace direct Fal.ai calls with the provider router:

```javascript
// Import the router
const { providerRouter } = require('./services');
const { getModel, calculateCost } = require('./models/modelRegistry');

// OLD (Direct Fal.ai call)
const result = await callFalImageBatch(endpoint, prompt, options, inputImages, apiKey, numImages, model);

// NEW (Provider-agnostic with failover)
const { result, provider, cost } = await providerRouter.generateImage(
  'flux-pro-1.1',  // Model ID from registry
  prompt,
  options,
  inputImages,
  getSetting,      // Your settings function
  logError,        // Your error logging function
  { userId, genId, db }  // Context
);

console.log(`Generated via ${provider}, cost: ${cost}`);
```

### Step 3: Add New Models to Registry

Edit `models/modelRegistry.js` to add new models:

```javascript
const MODEL_REGISTRY = {
  // Add your model
  'my-new-model': {
    name: 'My New Model',
    type: 'image',
    baseCost: 0.05,
    
    providers: {
      fal: {
        endpoint: 'fal-ai/my-model',
        cost: 0.05,
      },
      replicate: {
        version: 'owner/model:version',
        cost: 0.06,
      }
    },
    
    defaultProvider: 'fal',
    fallbackOrder: ['replicate'],
  }
};
```

### Step 4: Handle Provider Failover

The router automatically handles failover, but you can check health:

```javascript
const { providerRouter } = require('./services');

// Get current health status
app.get('/api/admin/provider-health', (req, res) => {
  res.json(providerRouter.getHealthStatus());
});

// Force health check
app.post('/api/admin/check-provider/:id', async (req, res) => {
  const healthy = await providerRouter.checkProviderHealth(req.params.id, getSetting);
  res.json({ provider: req.params.id, healthy });
});
```

---

## Example: Full Migration of Generation Endpoint

Here's how the generation endpoint would look with both migrations:

```javascript
const { providerRouter } = require('./services');
const { getModel, calculateCost } = require('./models/modelRegistry');
const { getOne, run, transaction } = require('./db');

app.post('/api/generate', userAuthMiddleware, async (req, res) => {
  const { modelId, prompt, options, inputImages } = req.body;
  const userId = req.user.id;
  
  try {
    // Get model from registry
    const model = getModel(modelId);
    if (!model) {
      return res.status(400).json({ error: 'Unknown model' });
    }
    
    // Calculate cost
    const estimatedCost = calculateCost(modelId, model.defaultProvider, options);
    
    // Check credits
    const user = await getOne('SELECT credits FROM users WHERE id = ?', [userId]);
    if (user.credits < estimatedCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }
    
    // Reserve credits
    const genId = uuidv4();
    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE id = $2',
        [estimatedCost, userId]
      );
      await client.query(
        'INSERT INTO generations (id, user_id, model, prompt, credits, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [genId, userId, modelId, prompt, estimatedCost, 'pending']
      );
    });
    
    // Generate using provider router (with failover)
    const { result, provider, cost } = await providerRouter.generateImage(
      modelId,
      prompt,
      options,
      inputImages,
      getSetting,
      logError,
      { userId, genId, db }
    );
    
    // Update generation with result
    await run(
      "UPDATE generations SET status = 'completed', result = ?, provider = ? WHERE id = ?",
      [result.url, provider, genId]
    );
    
    res.json({
      id: genId,
      result: result.url,
      provider,
      cost
    });
    
  } catch (error) {
    // Handle error, refund credits, etc.
    logError('generation', userId, genId, modelId, 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

## File Structure After Migration

```
backend/
├── index.js              # Main Express server
├── db.js                 # PostgreSQL connection pool
├── .env                  # Environment variables
├── migrations/
│   └── 001_initial_schema.sql
├── models/
│   └── modelRegistry.js  # Unified model configurations
├── providers/
│   ├── index.js          # Provider exports
│   ├── BaseProvider.js   # Abstract base class
│   ├── FalProvider.js    # Fal.ai implementation
│   ├── ReplicateProvider.js
│   └── SelfHostedProvider.js
└── services/
    ├── index.js          # Service exports
    └── providerRouter.js # Routing with failover
```

---

## Rollback Plan

If you need to roll back:

1. **Database**: Keep SQLite as fallback (db.js automatically uses SQLite if DATABASE_URL is not set)
2. **Providers**: The existing Fal.ai-specific code in index.js still works

---

## Testing

```bash
# Test database connection
node -e "require('./db'); console.log('DB connected')"

# Test provider availability
node -e "
  const { getAvailableProviders } = require('./providers');
  getAvailableProviders((key) => process.env[key]).then(console.log);
"
```

---

## Performance Considerations

1. **Connection Pooling**: The db.js pool is configured for 20 connections max
2. **Query Optimization**: Use indexes defined in the migration
3. **Provider Caching**: Provider instances are cached after first creation
4. **Health Checks**: Failed providers are temporarily disabled (5 min recovery)

---

## Next Steps

1. Set up PostgreSQL hosting (Supabase/Neon recommended for free tier)
2. Run the schema migration
3. Update `.env` with new connection strings
4. Gradually convert routes to async
5. Add Replicate API key for failover capability
6. Monitor provider health in admin panel
