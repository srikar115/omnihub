/**
 * Database Schema Migrations
 * 
 * Provides PostgreSQL-compatible schema creation with SQLite fallback.
 * Use initializeSchema(db, isPostgres) to run all migrations.
 */

// PostgreSQL-compatible schema (works for both PG and SQLite with minor adjustments)
const getSchema = (isPostgres) => {
  // Use CURRENT_TIMESTAMP for both, avoid datetime('now') for PostgreSQL compatibility
  const timestamp = isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';
  const json_default = isPostgres ? "'{}'::jsonb" : "'{}'";
  
  return `
-- Core Tables
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  credits REAL DEFAULT 10,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT,
  provider TEXT,
  type TEXT,
  credits REAL,
  baseCost REAL DEFAULT 0,
  inputCost REAL DEFAULT 0,
  outputCost REAL DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  apiEndpoint TEXT,
  docUrl TEXT,
  options TEXT DEFAULT '{}',
  capabilities TEXT DEFAULT '{}',
  imageInput TEXT DEFAULT 'none',
  maxInputImages INTEGER DEFAULT 0,
  lastUpdated TEXT,
  pricingLastChecked TEXT,
  thumbnail TEXT,
  logoUrl TEXT,
  heading TEXT,
  subheading TEXT,
  tags TEXT DEFAULT '[]',
  displayOrder INTEGER DEFAULT 100,
  category TEXT DEFAULT 'text-to-image',
  providerName TEXT,
  textToImageEndpoint TEXT,
  imageToImageEndpoint TEXT,
  imageParamName TEXT DEFAULT 'image_url',
  imageParamType TEXT DEFAULT 'single'
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  visibleId TEXT,
  userId TEXT REFERENCES users(id),
  type TEXT,
  model TEXT,
  modelName TEXT,
  prompt TEXT,
  options TEXT DEFAULT '{}',
  credits REAL,
  status TEXT DEFAULT 'pending',
  result TEXT,
  error TEXT,
  errorType TEXT,
  externalRequestId TEXT,
  thumbnailUrl TEXT,
  workspaceId TEXT,
  queuedAt TIMESTAMP,
  maxWaitTime INTEGER,
  cancelledAt TIMESTAMP,
  startedAt TIMESTAMP DEFAULT ${timestamp},
  completedAt TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  title TEXT DEFAULT 'New Chat',
  modelId TEXT,
  modelName TEXT,
  workspaceId TEXT,
  sharedWithWorkspace INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  updatedAt TIMESTAMP DEFAULT ${timestamp},
  totalInputTokens INTEGER DEFAULT 0,
  totalOutputTokens INTEGER DEFAULT 0,
  totalCredits REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  imageUrls TEXT DEFAULT '[]',
  inputTokens INTEGER DEFAULT 0,
  outputTokens INTEGER DEFAULT 0,
  credits REAL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  webSearchUsed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerId TEXT NOT NULL REFERENCES users(id),
  credits REAL DEFAULT 0,
  creditMode TEXT DEFAULT 'shared',
  privacySettings TEXT DEFAULT '{"chatVisibility":"private","imageVisibility":"private","videoVisibility":"private","whoCanBeAdmin":"owner_only","whoCanAllocateCredits":"owner_only","whoCanInvite":"admins"}',
  isDefault INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  updatedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'member',
  allocatedCredits REAL DEFAULT 0,
  joinedAt TIMESTAMP DEFAULT ${timestamp},
  UNIQUE(workspaceId, userId)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invitedEmail TEXT NOT NULL,
  invitedBy TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT ${timestamp},
  expiresAt TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_assets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT,
  type TEXT DEFAULT 'image',
  uploadedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS project_assets (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assetUrl TEXT NOT NULL,
  assetType TEXT DEFAULT 'image',
  name TEXT,
  tag TEXT,
  addedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  generationId TEXT NOT NULL REFERENCES generations(id),
  userId TEXT NOT NULL REFERENCES users(id),
  nickname TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'other',
  imageUrl TEXT NOT NULL,
  thumbnailUrl TEXT,
  prompt TEXT,
  modelName TEXT,
  likeCount INTEGER DEFAULT 0,
  viewCount INTEGER DEFAULT 0,
  isNsfw INTEGER DEFAULT 0,
  publishedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS community_likes (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT ${timestamp},
  UNIQUE(postId, userId)
);

CREATE TABLE IF NOT EXISTS shared_generations (
  id TEXT PRIMARY KEY,
  generationId TEXT NOT NULL REFERENCES generations(id),
  userId TEXT NOT NULL REFERENCES users(id),
  shareToken TEXT UNIQUE NOT NULL,
  allowDownload INTEGER DEFAULT 1,
  viewCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  expiresAt TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priceMonthly INTEGER DEFAULT 0,
  priceYearly INTEGER DEFAULT 0,
  creditsPerMonth INTEGER DEFAULT 0,
  features TEXT DEFAULT '[]',
  isPopular INTEGER DEFAULT 0,
  displayOrder INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  planId TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active',
  billingCycle TEXT DEFAULT 'monthly',
  razorpaySubscriptionId TEXT,
  razorpayCustomerId TEXT,
  currentPeriodStart TIMESTAMP,
  currentPeriodEnd TIMESTAMP,
  cancelledAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  updatedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  type TEXT DEFAULT 'subscription',
  description TEXT,
  razorpayPaymentId TEXT,
  razorpayOrderId TEXT,
  razorpaySignature TEXT,
  status TEXT DEFAULT 'pending',
  metadata TEXT DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'system',
  severity TEXT DEFAULT 'error',
  userId TEXT,
  generationId TEXT,
  endpoint TEXT,
  errorCode TEXT,
  errorMessage TEXT,
  stackTrace TEXT,
  metadata TEXT DEFAULT '{}',
  resolved INTEGER DEFAULT 0,
  resolvedBy TEXT,
  resolvedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS landing_featured (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'announcement',
  title TEXT NOT NULL,
  description TEXT,
  mediaUrl TEXT,
  mediaType TEXT DEFAULT 'image',
  linkUrl TEXT,
  linkText TEXT,
  displayOrder INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  expiresAt TIMESTAMP
);

CREATE TABLE IF NOT EXISTS landing_models (
  id TEXT PRIMARY KEY,
  modelId TEXT NOT NULL REFERENCES models(id),
  category TEXT DEFAULT 'featured',
  displayOrder INTEGER DEFAULT 0,
  isVisible INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS ai_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'from-cyan-500 to-blue-500',
  backgroundImage TEXT,
  badge TEXT,
  route TEXT,
  showOnLanding INTEGER DEFAULT 0,
  showOnDashboard INTEGER DEFAULT 1,
  displayOrder INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'global',
  targetId TEXT,
  requestsPerMinute INTEGER DEFAULT 60,
  requestsPerHour INTEGER DEFAULT 1000,
  requestsPerDay INTEGER DEFAULT 10000,
  enabled INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT ${timestamp},
  updatedAt TIMESTAMP DEFAULT ${timestamp}
);

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id TEXT PRIMARY KEY,
  userId TEXT,
  ruleId TEXT,
  endpoint TEXT,
  violationType TEXT,
  ipAddress TEXT,
  createdAt TIMESTAMP DEFAULT ${timestamp}
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generations_userId ON generations(userId);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_workspaceId ON generations(workspaceId);
CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations(userId);
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspaceId ON workspace_members(workspaceId);
CREATE INDEX IF NOT EXISTS idx_workspace_members_userId ON workspace_members(userId);
CREATE INDEX IF NOT EXISTS idx_community_posts_userId ON community_posts(userId);
CREATE INDEX IF NOT EXISTS idx_error_logs_createdAt ON error_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_models_type ON models(type);
CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);
`;
};

/**
 * Initialize database schema
 * @param {Object} db - Database connection (SQLite or PostgreSQL wrapper)
 * @param {boolean} isPostgres - Whether using PostgreSQL
 */
async function initializeSchema(db, isPostgres) {
  console.log(`[SCHEMA] Initializing schema for ${isPostgres ? 'PostgreSQL' : 'SQLite'}...`);
  
  const schema = getSchema(isPostgres);
  
  if (isPostgres) {
    // For PostgreSQL, execute each statement separately
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const stmt of statements) {
      try {
        await db.exec(stmt);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.error('[SCHEMA] Error executing statement:', error.message);
          console.error('[SCHEMA] Statement:', stmt.substring(0, 100));
        }
      }
    }
  } else {
    // For SQLite, execute all at once
    try {
      db.exec(schema);
    } catch (error) {
      console.error('[SCHEMA] SQLite schema error:', error.message);
      throw error;
    }
  }
  
  console.log('[SCHEMA] Schema initialization complete');
}

/**
 * Run migrations to add new columns to existing tables
 * @param {Object} db - Database connection
 * @param {boolean} isPostgres - Whether using PostgreSQL
 */
async function runMigrations(db, isPostgres) {
  console.log('[MIGRATIONS] Running migrations...');
  
  const migrations = [
    // Generations table migrations
    { table: 'generations', column: 'errorType', type: 'TEXT' },
    { table: 'generations', column: 'externalRequestId', type: 'TEXT' },
    { table: 'generations', column: 'thumbnailUrl', type: 'TEXT' },
    { table: 'generations', column: 'workspaceId', type: 'TEXT' },
    { table: 'generations', column: 'queuedAt', type: 'TIMESTAMP' },
    { table: 'generations', column: 'maxWaitTime', type: 'INTEGER' },
    { table: 'generations', column: 'cancelledAt', type: 'TIMESTAMP' },
    
    // Conversations table migrations
    { table: 'conversations', column: 'workspaceId', type: 'TEXT' },
    { table: 'conversations', column: 'sharedWithWorkspace', type: 'INTEGER DEFAULT 0' },
    
    // Project assets migrations
    { table: 'project_assets', column: 'tag', type: 'TEXT' },
    { table: 'project_assets', column: 'name', type: 'TEXT' },
    
    // Models table migrations
    { table: 'models', column: 'imageToVideoEndpoint', type: 'TEXT' },
  ];
  
  for (const migration of migrations) {
    try {
      if (isPostgres) {
        // PostgreSQL ALTER TABLE
        await db.exec(`ALTER TABLE ${migration.table} ADD COLUMN IF NOT EXISTS ${migration.column} ${migration.type}`);
      } else {
        // SQLite - check if column exists first
        const columns = db.prepare(`PRAGMA table_info(${migration.table})`).all();
        const columnExists = columns.some(c => c.name === migration.column);
        
        if (!columnExists) {
          db.exec(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}`);
          console.log(`[MIGRATIONS] Added column ${migration.column} to ${migration.table}`);
        }
      }
    } catch (error) {
      // Ignore "column already exists" errors
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        console.error(`[MIGRATIONS] Error adding ${migration.column} to ${migration.table}:`, error.message);
      }
    }
  }
  
  console.log('[MIGRATIONS] Migrations complete');
}

module.exports = {
  getSchema,
  initializeSchema,
  runMigrations
};
