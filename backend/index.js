const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

// ============ PROVIDER ABSTRACTION LAYER ============
// Import provider infrastructure for provider-agnostic generation
const { 
  getProvider, 
  getAvailableProviders, 
  getFirstAvailableProvider,
  FalProvider,
  ReplicateProvider,
  SelfHostedProvider
} = require('./providers');
const providerRouter = require('./services/providerRouter');

// ============ DATABASE ABSTRACTION ============
// Import PostgreSQL-ready db module
const dbModule = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'omnihub-secret-key-change-in-production';

// ============ DATABASE INITIALIZATION ============
// Use PostgreSQL if DATABASE_URL is set, otherwise fall back to SQLite
const isPostgres = dbModule.isPostgres;
let db;

if (isPostgres) {
  console.log('[DB] Using PostgreSQL database');
  // For PostgreSQL, we create a compatibility wrapper
  db = {
    prepare: (sql) => {
      // Convert SQLite-style prepared statements to PostgreSQL-compatible functions
      return {
        run: async (...params) => {
          try {
            return await dbModule.run(sql, params);
          } catch (err) {
            console.error('[DB] Run error:', err.message, { sql: sql.substring(0, 100) });
            throw err;
          }
        },
        get: async (...params) => {
          try {
            return await dbModule.getOne(sql, params);
          } catch (err) {
            console.error('[DB] Get error:', err.message, { sql: sql.substring(0, 100) });
            throw err;
          }
        },
        all: async (...params) => {
          try {
            return await dbModule.getAll(sql, params);
          } catch (err) {
            console.error('[DB] All error:', err.message, { sql: sql.substring(0, 100) });
            throw err;
          }
        }
      };
    },
    exec: async (sql) => {
      // Execute raw SQL statements (for migrations)
      try {
        // Split by semicolons and execute each statement
        const statements = sql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            await dbModule.query(stmt.trim());
          }
        }
      } catch (err) {
        console.error('[DB] Exec error:', err.message);
        throw err;
      }
    },
    transaction: (fn) => {
      // Transaction wrapper
      return async (...args) => {
        return await dbModule.transaction(async (client) => {
          return fn(...args);
        });
      };
    },
    pragma: () => {} // PostgreSQL doesn't use pragma
  };
} else {
  // SQLite fallback for local development
  console.log('[DB] Using SQLite database (development mode)');
  db = new Database('omnihub.db');
}

// ============ DATABASE HELPER FUNCTIONS ============
// Helper to check if a column exists in a table (works for both SQLite and PostgreSQL)
const hasColumn = async (tableName, columnName) => {
  if (isPostgres) {
    const result = await dbModule.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } else {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(c => c.name === columnName);
  }
};

// Helper to add a column if it doesn't exist
const addColumnIfNotExists = async (tableName, columnName, columnType) => {
  try {
    const exists = await hasColumn(tableName, columnName);
    if (!exists) {
      if (isPostgres) {
        await dbModule.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      } else {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      }
      console.log(`[MIGRATION] Added column ${columnName} to ${tableName}`);
      return true;
    }
    return false;
  } catch (error) {
    // Ignore if column already exists
    if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
      console.error(`[MIGRATION] Error adding ${columnName} to ${tableName}:`, error.message);
    }
    return false;
  }
};

// Helper to execute raw SQL (works for both databases)
const execSQL = async (sql) => {
  if (isPostgres) {
    await dbModule.query(sql);
  } else {
    db.exec(sql);
  }
};

// Initialize database tables
db.exec(`
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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
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
    userId TEXT,
    type TEXT,
    model TEXT,
    modelName TEXT,
    prompt TEXT,
    options TEXT DEFAULT '{}',
    credits REAL,
    status TEXT DEFAULT 'pending',
    result TEXT,
    error TEXT,
    startedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    completedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT DEFAULT 'New Chat',
    modelId TEXT,
    modelName TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    totalInputTokens INTEGER DEFAULT 0,
    totalOutputTokens INTEGER DEFAULT 0,
    totalCredits REAL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    imageUrls TEXT DEFAULT '[]',
    inputTokens INTEGER DEFAULT 0,
    outputTokens INTEGER DEFAULT 0,
    credits REAL DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    webSearchUsed INTEGER DEFAULT 0,
    FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ownerId TEXT NOT NULL,
    credits REAL DEFAULT 0,
    creditMode TEXT DEFAULT 'shared',
    privacySettings TEXT DEFAULT '{"chatVisibility":"private","imageVisibility":"private","videoVisibility":"private","whoCanBeAdmin":"owner_only","whoCanAllocateCredits":"owner_only","whoCanInvite":"admins"}',
    isDefault INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ownerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspaceId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    allocatedCredits REAL DEFAULT 0,
    joinedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(workspaceId, userId)
  );

  CREATE TABLE IF NOT EXISTS workspace_invites (
    id TEXT PRIMARY KEY,
    workspaceId TEXT NOT NULL,
    invitedEmail TEXT NOT NULL,
    invitedBy TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now')),
    expiresAt TEXT,
    FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invitedBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS uploaded_assets (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    url TEXT NOT NULL,
    filename TEXT,
    type TEXT DEFAULT 'image',
    uploadedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8b5cf6',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_assets (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    assetUrl TEXT NOT NULL,
    assetType TEXT DEFAULT 'image',
    name TEXT,
    tag TEXT,
    addedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    generationId TEXT NOT NULL,
    userId TEXT NOT NULL,
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
    publishedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generationId) REFERENCES generations(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_likes (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postId, userId),
    FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS shared_generations (
    id TEXT PRIMARY KEY,
    generationId TEXT NOT NULL,
    userId TEXT NOT NULL,
    shareToken TEXT UNIQUE NOT NULL,
    allowDownload INTEGER DEFAULT 1,
    viewCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    expiresAt TEXT,
    FOREIGN KEY (generationId) REFERENCES generations(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  -- Subscription Plans
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    priceMonthly INTEGER DEFAULT 0,
    priceYearly INTEGER DEFAULT 0,
    creditsPerMonth INTEGER DEFAULT 0,
    features TEXT DEFAULT '[]',
    isPopular INTEGER DEFAULT 0,
    displayOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- User Subscriptions
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    planId TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    billingCycle TEXT DEFAULT 'monthly',
    razorpaySubscriptionId TEXT,
    razorpayCustomerId TEXT,
    currentPeriodStart TEXT,
    currentPeriodEnd TEXT,
    cancelledAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (planId) REFERENCES subscription_plans(id)
  );

  -- Payments/Transactions
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    type TEXT DEFAULT 'subscription',
    description TEXT,
    razorpayPaymentId TEXT,
    razorpayOrderId TEXT,
    razorpaySignature TEXT,
    status TEXT DEFAULT 'pending',
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  -- Error Logs
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
    resolvedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Landing Page Featured Content
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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    expiresAt TEXT
  );

  -- Landing Page Models Configuration
  CREATE TABLE IF NOT EXISTS landing_models (
    id TEXT PRIMARY KEY,
    modelId TEXT NOT NULL,
    category TEXT DEFAULT 'featured',
    displayOrder INTEGER DEFAULT 0,
    isVisible INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modelId) REFERENCES models(id)
  );

  -- AI Tools Configuration
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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Rate Limits Configuration
  CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'global',
    targetId TEXT,
    requestsPerMinute INTEGER DEFAULT 60,
    requestsPerHour INTEGER DEFAULT 1000,
    requestsPerDay INTEGER DEFAULT 10000,
    enabled INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Rate Limit Violations Log
  CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id TEXT PRIMARY KEY,
    userId TEXT,
    ruleId TEXT,
    endpoint TEXT,
    violationType TEXT,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Audit Logs
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    adminId TEXT,
    adminUsername TEXT,
    action TEXT NOT NULL,
    targetType TEXT,
    targetId TEXT,
    details TEXT DEFAULT '{}',
    ipAddress TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Feature Flags
  CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    enabled INTEGER DEFAULT 0,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    updatedBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- System Announcements
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    priority INTEGER DEFAULT 0,
    targetAudience TEXT DEFAULT 'all',
    active INTEGER DEFAULT 1,
    dismissible INTEGER DEFAULT 1,
    expiresAt TEXT,
    createdBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Credit Transactions (detailed credit history)
  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    workspaceId TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balanceBefore REAL,
    balanceAfter REAL,
    description TEXT,
    referenceId TEXT,
    referenceType TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  -- ============ WORKFLOW / AI APPS TABLES ============
  
  -- Workflow Templates (AI Apps definitions)
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    icon TEXT DEFAULT 'Workflow',
    color TEXT DEFAULT 'from-purple-500 to-pink-500',
    isPublic INTEGER DEFAULT 0,
    estimatedCredits REAL DEFAULT 0,
    estimatedTime INTEGER DEFAULT 60,
    definition TEXT NOT NULL,
    createdBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    isActive INTEGER DEFAULT 1
  );

  -- Workflow Runs (Executions)
  CREATE TABLE IF NOT EXISTS workflow_runs (
    id TEXT PRIMARY KEY,
    workflowId TEXT NOT NULL,
    userId TEXT NOT NULL,
    workspaceId TEXT,
    status TEXT DEFAULT 'pending',
    inputs TEXT,
    outputs TEXT,
    state TEXT,
    currentStepId TEXT,
    creditsUsed REAL DEFAULT 0,
    startedAt TEXT,
    completedAt TEXT,
    error TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflowId) REFERENCES workflows(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  -- Step Executions
  CREATE TABLE IF NOT EXISTS workflow_step_runs (
    id TEXT PRIMARY KEY,
    runId TEXT NOT NULL,
    stepId TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    inputs TEXT,
    outputs TEXT,
    error TEXT,
    creditsUsed REAL DEFAULT 0,
    startedAt TEXT,
    completedAt TEXT,
    retryCount INTEGER DEFAULT 0,
    FOREIGN KEY (runId) REFERENCES workflow_runs(id) ON DELETE CASCADE
  );

  -- Human-in-the-loop Tasks
  CREATE TABLE IF NOT EXISTS workflow_tasks (
    id TEXT PRIMARY KEY,
    runId TEXT NOT NULL,
    stepId TEXT NOT NULL,
    userId TEXT,
    type TEXT DEFAULT 'approval',
    title TEXT NOT NULL,
    description TEXT,
    data TEXT,
    response TEXT,
    status TEXT DEFAULT 'pending',
    expiresAt TEXT,
    completedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (runId) REFERENCES workflow_runs(id) ON DELETE CASCADE
  );

  -- Workflow Categories
  CREATE TABLE IF NOT EXISTS workflow_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Folder',
    color TEXT DEFAULT 'from-gray-500 to-gray-600',
    displayOrder INTEGER DEFAULT 0
  );
`);

// Database migrations for workspace columns
// Updated to work with both PostgreSQL and SQLite
const runMigrations = async () => {
  console.log('[MIGRATIONS] Running database migrations...');
  
  // Generations table migrations
  await addColumnIfNotExists('generations', 'workspaceId', 'TEXT');
  await addColumnIfNotExists('generations', 'sharedWithWorkspace', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('generations', 'queuedAt', 'TEXT');
  await addColumnIfNotExists('generations', 'externalRequestId', 'TEXT');
  await addColumnIfNotExists('generations', 'cancelledAt', 'TEXT');
  await addColumnIfNotExists('generations', 'maxWaitTime', 'INTEGER DEFAULT 300');
  await addColumnIfNotExists('generations', 'errorType', 'TEXT');
  await addColumnIfNotExists('generations', 'thumbnailUrl', 'TEXT');
  
  // Conversations table migrations
  await addColumnIfNotExists('conversations', 'workspaceId', 'TEXT');
  await addColumnIfNotExists('conversations', 'sharedWithWorkspace', 'INTEGER DEFAULT 0');
  
  // Models table migrations
  await addColumnIfNotExists('models', 'imageInput', "TEXT DEFAULT 'none'");
  await addColumnIfNotExists('models', 'maxInputImages', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('models', 'docUrl', 'TEXT');
  await addColumnIfNotExists('models', 'pricingLastChecked', 'TEXT');
  await addColumnIfNotExists('models', 'thumbnail', 'TEXT');
  await addColumnIfNotExists('models', 'tags', "TEXT DEFAULT '[]'");
  await addColumnIfNotExists('models', 'displayOrder', 'INTEGER DEFAULT 100');
  await addColumnIfNotExists('models', 'category', "TEXT DEFAULT 'text-to-image'");
  await addColumnIfNotExists('models', 'providerName', 'TEXT');
  await addColumnIfNotExists('models', 'textToImageEndpoint', 'TEXT');
  await addColumnIfNotExists('models', 'imageToImageEndpoint', 'TEXT');
  await addColumnIfNotExists('models', 'imageParamName', "TEXT DEFAULT 'image_url'");
  await addColumnIfNotExists('models', 'imageParamType', "TEXT DEFAULT 'single'");
  await addColumnIfNotExists('models', 'logoUrl', 'TEXT');
  await addColumnIfNotExists('models', 'heading', 'TEXT');
  await addColumnIfNotExists('models', 'subheading', 'TEXT');
  await addColumnIfNotExists('models', 'imageToVideoEndpoint', 'TEXT');
  
  // Users table migrations
  await addColumnIfNotExists('users', 'reservedCredits', 'REAL DEFAULT 0');
  await addColumnIfNotExists('users', 'nickname', 'TEXT');
  await addColumnIfNotExists('users', 'avatarUrl', 'TEXT');
  await addColumnIfNotExists('users', 'bio', 'TEXT');
  await addColumnIfNotExists('users', 'isPublicProfile', 'INTEGER DEFAULT 1');
  await addColumnIfNotExists('users', 'googleId', 'TEXT');
  await addColumnIfNotExists('users', 'authProvider', "TEXT DEFAULT 'email'");
  await addColumnIfNotExists('users', 'subscriptionId', 'TEXT');
  await addColumnIfNotExists('users', 'status', "TEXT DEFAULT 'active'");
  await addColumnIfNotExists('users', 'statusReason', 'TEXT');
  await addColumnIfNotExists('users', 'adminNotes', 'TEXT');
  await addColumnIfNotExists('users', 'lastLoginAt', 'TEXT');
  await addColumnIfNotExists('users', 'totalSpent', 'REAL DEFAULT 0');
  
  // Workspaces table migrations
  await addColumnIfNotExists('workspaces', 'reservedCredits', 'REAL DEFAULT 0');
  
  // Workspace members table migrations
  await addColumnIfNotExists('workspace_members', 'reservedAllocated', 'REAL DEFAULT 0');
  
  // Project assets table migrations
  await addColumnIfNotExists('project_assets', 'tag', 'TEXT');
  await addColumnIfNotExists('project_assets', 'name', 'TEXT');
  
  console.log('✅ Database migrations complete');
};

// Run migrations (async for PostgreSQL support)
(async () => {
  try {
    await runMigrations();
  } catch (error) {
    console.error('[MIGRATIONS] Error running migrations:', error);
  }
})();

// ============ NICKNAME GENERATOR ============
const NICKNAME_ADJECTIVES = [
  'Cosmic', 'Neon', 'Crystal', 'Shadow', 'Stellar', 'Mystic', 'Electric', 'Velvet',
  'Quantum', 'Lunar', 'Solar', 'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald',
  'Frost', 'Storm', 'Thunder', 'Nova', 'Pixel', 'Digital', 'Cyber', 'Astral',
  'Radiant', 'Vivid', 'Prism', 'Echo', 'Phantom', 'Glitch', 'Zen', 'Wild'
];

const NICKNAME_NOUNS = [
  'Panda', 'Dragon', 'Phoenix', 'Wolf', 'Raven', 'Fox', 'Tiger', 'Falcon',
  'Lynx', 'Owl', 'Bear', 'Eagle', 'Hawk', 'Panther', 'Lion', 'Viper',
  'Serpent', 'Griffin', 'Unicorn', 'Sphinx', 'Kraken', 'Hydra', 'Chimera', 'Pegasus',
  'Ninja', 'Wizard', 'Knight', 'Sage', 'Hunter', 'Wanderer', 'Dreamer', 'Artist'
];

function generateNickname() {
  const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}_${num}`;
}

function generateUniqueNickname() {
  let nickname = generateNickname();
  let attempts = 0;
  
  // Check if nickname exists and regenerate if needed
  while (attempts < 100) {
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
    if (!existing) break;
    nickname = generateNickname();
    attempts++;
  }
  
  return nickname;
}

// ============ PROMPT CATEGORY CLASSIFIER ============
const PROMPT_CATEGORIES = {
  anime: ['anime', 'manga', 'chibi', 'waifu', 'kawaii', 'studio ghibli', 'japanese animation', 'otaku', 'shounen', 'shoujo'],
  realistic: ['realistic', 'photorealistic', 'photography', 'portrait', 'cinematic', 'hyperrealistic', 'photo', 'lifelike', 'natural'],
  game: ['game', 'rpg', 'fantasy', 'character design', 'concept art', 'pixel art', 'video game', 'gaming', 'mmorpg', 'd&d', 'dungeons'],
  abstract: ['abstract', 'surreal', 'psychedelic', 'geometric', 'minimalist', 'expressionist', 'modern art', 'contemporary'],
  nature: ['landscape', 'nature', 'forest', 'ocean', 'mountains', 'sunset', 'sunrise', 'beach', 'wildlife', 'flowers', 'garden'],
  scifi: ['sci-fi', 'cyberpunk', 'futuristic', 'robot', 'spaceship', 'alien', 'space', 'dystopian', 'steampunk', 'mech', 'android'],
  art: ['oil painting', 'watercolor', 'digital art', 'illustration', 'sketch', 'impressionist', 'renaissance', 'baroque', 'pop art'],
  portrait: ['portrait', 'headshot', 'face', 'selfie', 'person', 'woman', 'man', 'model', 'beauty'],
  architecture: ['building', 'architecture', 'city', 'urban', 'skyline', 'interior', 'room', 'house', 'castle', 'tower'],
  food: ['food', 'dish', 'meal', 'cuisine', 'cooking', 'restaurant', 'delicious', 'tasty', 'gourmet']
};

function categorizePrompt(prompt) {
  if (!prompt) return 'other';
  const lower = prompt.toLowerCase();
  
  for (const [category, keywords] of Object.entries(PROMPT_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  
  return 'other';
}

// ============ FAL.AI MODEL SYNC ============
// Curated list of best Fal.ai models with their endpoints and options
const FAL_MODELS = {
  image: [
    // === Black Forest Labs (FLUX) ===
    {
      id: 'fal-flux-pro-v1.1',
      name: 'FLUX 1.1 Pro',
      apiEndpoint: 'fal-ai/flux-pro/v1.1',
      docUrl: 'https://fal.ai/models/fal-ai/flux-pro/v1.1',
      baseCost: 0.04,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Black Forest Labs',
      category: 'text-to-image',
      tags: ['photorealistic', 'pro', 'high-quality'],
      displayOrder: 10,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024 (Square)', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.5 },
            { value: 'portrait_4_3', label: '768×1024 (Portrait)', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '576×1024 (Portrait 16:9)', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768 (Landscape)', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1024×576 (Landscape 16:9)', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    {
      id: 'fal-flux-pro-v1.1-ultra',
      name: 'FLUX 1.1 Pro Ultra',
      apiEndpoint: 'fal-ai/flux-pro/v1.1-ultra',
      docUrl: 'https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra',
      baseCost: 0.06,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Black Forest Labs',
      category: 'text-to-image',
      tags: ['photorealistic', 'pro', 'ultra', 'high-resolution'],
      displayOrder: 11,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '21:9', label: '21:9 (Ultrawide)', priceMultiplier: 1.2 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
            { value: '9:21', label: '9:21', priceMultiplier: 1.2 },
          ]
        }
      }
    },
    {
      id: 'fal-flux-schnell',
      name: 'FLUX Schnell',
      apiEndpoint: 'fal-ai/flux/schnell',
      docUrl: 'https://fal.ai/models/fal-ai/flux/schnell',
      baseCost: 0.003,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Black Forest Labs',
      category: 'text-to-image',
      tags: ['fast', 'budget', 'photorealistic'],
      displayOrder: 12,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1024×576', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1', priceMultiplier: 1 },
            { value: '4', label: '4', priceMultiplier: 4 },
          ]
        }
      }
    },
    {
      id: 'fal-flux-dev',
      name: 'FLUX Dev',
      apiEndpoint: 'fal-ai/flux/dev',
      docUrl: 'https://fal.ai/models/fal-ai/flux/dev',
      baseCost: 0.025,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Black Forest Labs',
      category: 'text-to-image',
      tags: ['photorealistic', 'creative'],
      displayOrder: 13,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1024×576', priceMultiplier: 1 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '3.5',
          choices: [
            { value: '2', label: '2 (More Creative)', priceMultiplier: 1 },
            { value: '3.5', label: '3.5 (Balanced)', priceMultiplier: 1 },
            { value: '5', label: '5 (More Accurate)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Google ===
    // NEW: Nano Banana Pro (Google Gemini 3 Pro Image) - Best text rendering
    // Has separate endpoints for text-to-image and image-to-image
    {
      id: 'fal-nano-banana-pro',
      name: 'Nano Banana Pro',
      apiEndpoint: 'fal-ai/nano-banana-pro',
      textToImageEndpoint: 'fal-ai/nano-banana-pro',
      imageToImageEndpoint: 'fal-ai/nano-banana-pro/edit',
      docUrl: 'https://fal.ai/models/fal-ai/nano-banana-pro',
      baseCost: 0.15,
      imageInput: 'optional',
      maxInputImages: 14,
      imageParamName: 'image_urls', // Edit endpoint uses image_urls array
      imageParamType: 'array',
      providerName: 'Google',
      category: 'both',
      tags: ['text-rendering', 'typography', 'photorealistic', 'new', 'pro'],
      displayOrder: 1,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '21:9', label: '21:9 (Ultrawide)', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '3:2', label: '3:2', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '5:4', label: '5:4', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
            { value: '4:5', label: '4:5', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
            { value: '2:3', label: '2:3', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
          ]
        },
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '1K',
          choices: [
            { value: '1K', label: '1K', priceMultiplier: 1 },
            { value: '2K', label: '2K', priceMultiplier: 1 },
            { value: '4K', label: '4K', priceMultiplier: 2 },
          ]
        }
      }
    },
    // NEW: Flux Kontext Max - Context-aware generation with text and image modes
    // Updated endpoints: fal-ai/flux-pro/kontext/max/text-to-image and fal-ai/flux-pro/kontext/max
    {
      id: 'fal-flux-kontext-max',
      name: 'Flux Kontext Max',
      apiEndpoint: 'fal-ai/flux-pro/kontext/max',
      textToImageEndpoint: 'fal-ai/flux-pro/kontext/max/text-to-image',
      imageToImageEndpoint: 'fal-ai/flux-pro/kontext/max',
      docUrl: 'https://fal.ai/models/fal-ai/flux-pro/kontext/max',
      baseCost: 0.08,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_url', // Kontext uses image_url for I2I
      imageParamType: 'single',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['context-aware', 'pro', 'editing', 'new'],
      displayOrder: 5,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
            { value: '21:9', label: '21:9', priceMultiplier: 1 },
            { value: '9:21', label: '9:21', priceMultiplier: 1 },
            { value: '2:3', label: '2:3', priceMultiplier: 1 },
            { value: '3:2', label: '3:2', priceMultiplier: 1 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '3.5',
          choices: [
            { value: '2', label: '2 (Creative)', priceMultiplier: 1 },
            { value: '3.5', label: '3.5 (Default)', priceMultiplier: 1 },
            { value: '5', label: '5 (Accurate)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: Flux Redux - Image variations
    {
      id: 'fal-flux-redux',
      name: 'Flux Redux',
      apiEndpoint: 'fal-ai/flux-pro/v1/redux',
      docUrl: 'https://fal.ai/models/fal-ai/flux-pro/redux',
      baseCost: 0.03,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url', // Redux uses single image_url
      imageParamType: 'single',
      providerName: 'Black Forest Labs',
      category: 'image-to-image',
      tags: ['variations', 'style-transfer'],
      displayOrder: 14,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: Flux Fill - Inpainting
    {
      id: 'fal-flux-fill',
      name: 'Flux Fill (Inpainting)',
      apiEndpoint: 'fal-ai/flux-pro/v1/fill',
      docUrl: 'https://fal.ai/models/fal-ai/flux-pro/fill',
      baseCost: 0.04,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url', // Fill uses single image_url
      imageParamType: 'single',
      providerName: 'Black Forest Labs',
      category: 'image-to-image',
      tags: ['inpainting', 'editing'],
      displayOrder: 15,
      options: {}
    },
    // === Recraft ===
    {
      id: 'fal-recraft-v3',
      name: 'Recraft V3',
      apiEndpoint: 'fal-ai/recraft-v3',
      docUrl: 'https://fal.ai/models/fal-ai/recraft-v3',
      baseCost: 0.04,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Recraft',
      category: 'text-to-image',
      tags: ['photorealistic', 'illustration', 'vector'],
      displayOrder: 20,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: '1024x1024',
          choices: [
            { value: '1024x1024', label: '1024×1024', priceMultiplier: 1 },
            { value: '1365x1024', label: '1365×1024', priceMultiplier: 1 },
            { value: '1024x1365', label: '1024×1365', priceMultiplier: 1 },
            { value: '1536x1024', label: '1536×1024', priceMultiplier: 1.2 },
            { value: '1024x1536', label: '1024×1536', priceMultiplier: 1.2 },
          ]
        },
        style: {
          label: 'Style',
          type: 'select',
          default: 'realistic_image',
          choices: [
            { value: 'any', label: 'Any', priceMultiplier: 1 },
            { value: 'realistic_image', label: 'Realistic', priceMultiplier: 1 },
            { value: 'digital_illustration', label: 'Digital Illustration', priceMultiplier: 1 },
            { value: 'vector_illustration', label: 'Vector', priceMultiplier: 1 },
            { value: 'realistic_image/b_and_w', label: 'B&W Photo', priceMultiplier: 1 },
            { value: 'realistic_image/hdr', label: 'HDR Photo', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Ideogram ===
    {
      id: 'fal-ideogram-v2',
      name: 'Ideogram V2',
      apiEndpoint: 'fal-ai/ideogram/v2',
      docUrl: 'https://fal.ai/models/fal-ai/ideogram/v2',
      baseCost: 0.08,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Ideogram',
      category: 'text-to-image',
      tags: ['typography', 'text-rendering', 'design'],
      displayOrder: 30,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
          ]
        },
        style: {
          label: 'Style',
          type: 'select',
          default: 'auto',
          choices: [
            { value: 'auto', label: 'Auto', priceMultiplier: 1 },
            { value: 'general', label: 'General', priceMultiplier: 1 },
            { value: 'realistic', label: 'Realistic', priceMultiplier: 1 },
            { value: 'design', label: 'Design', priceMultiplier: 1 },
            { value: 'render_3d', label: '3D Render', priceMultiplier: 1 },
            { value: 'anime', label: 'Anime', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Stability AI ===
    {
      id: 'fal-sdxl-lightning',
      name: 'SDXL Lightning',
      apiEndpoint: 'fal-ai/fast-lightning-sdxl',
      docUrl: 'https://fal.ai/models/fal-ai/fast-lightning-sdxl',
      baseCost: 0.002,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Stability AI',
      category: 'text-to-image',
      tags: ['fast', 'budget', 'sdxl'],
      displayOrder: 40,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1024×576', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1', priceMultiplier: 1 },
            { value: '4', label: '4', priceMultiplier: 4 },
          ]
        }
      }
    },
    {
      id: 'fal-stable-diffusion-v35-large',
      name: 'SD 3.5 Large',
      apiEndpoint: 'fal-ai/stable-diffusion-v35-large',
      docUrl: 'https://fal.ai/models/fal-ai/stable-diffusion-v35-large',
      baseCost: 0.035,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Stability AI',
      category: 'text-to-image',
      tags: ['photorealistic', 'high-quality'],
      displayOrder: 41,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: SD 3.5 Large Turbo - Fast version
    {
      id: 'fal-stable-diffusion-v35-large-turbo',
      name: 'SD 3.5 Large Turbo',
      apiEndpoint: 'fal-ai/stable-diffusion-v35-large/turbo',
      docUrl: 'https://fal.ai/models/fal-ai/stable-diffusion-v35-large-turbo',
      baseCost: 0.02,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Stability AI',
      category: 'text-to-image',
      tags: ['fast', 'photorealistic'],
      displayOrder: 42,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Fal.ai Utilities ===
    // NEW: Background Remover
    {
      id: 'fal-birefnet',
      name: 'Background Remover',
      apiEndpoint: 'fal-ai/birefnet',
      docUrl: 'https://fal.ai/models/fal-ai/birefnet',
      baseCost: 0.01,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Fal.ai',
      category: 'image-to-image',
      tags: ['utility', 'background-removal'],
      displayOrder: 80,
      options: {}
    },
    // NEW: Creative Upscaler
    {
      id: 'fal-creative-upscaler',
      name: 'Creative Upscaler',
      apiEndpoint: 'fal-ai/creative-upscaler',
      docUrl: 'https://fal.ai/models/fal-ai/creative-upscaler',
      baseCost: 0.03,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Fal.ai',
      category: 'image-to-image',
      tags: ['upscale', 'enhancement', 'utility'],
      displayOrder: 81,
      options: {
        scale: {
          label: 'Scale',
          type: 'select',
          default: '2',
          choices: [
            { value: '2', label: '2x', priceMultiplier: 1 },
            { value: '4', label: '4x', priceMultiplier: 2 },
          ]
        }
      }
    },
    // NEW: AuraSR - Fast Upscaler
    {
      id: 'fal-aura-sr',
      name: 'Aura SR (Fast Upscale)',
      apiEndpoint: 'fal-ai/aura-sr',
      docUrl: 'https://fal.ai/models/fal-ai/aura-sr',
      baseCost: 0.005,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Fal.ai',
      category: 'image-to-image',
      tags: ['upscale', 'fast', 'budget'],
      displayOrder: 82,
      options: {}
    },
    // === Community / Other ===
    // NEW: Kolors
    {
      id: 'fal-kolors',
      name: 'Kolors',
      apiEndpoint: 'fal-ai/kolors',
      docUrl: 'https://fal.ai/models/fal-ai/kolors',
      baseCost: 0.02,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Kuaishou',
      category: 'text-to-image',
      tags: ['photorealistic', 'creative'],
      displayOrder: 50,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1024×576', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: Playground V3
    {
      id: 'fal-playground-v3',
      name: 'Playground V3',
      apiEndpoint: 'fal-ai/playground-v3',
      docUrl: 'https://fal.ai/models/fal-ai/playground-v3',
      baseCost: 0.015,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Playground',
      category: 'text-to-image',
      tags: ['creative', 'photorealistic'],
      displayOrder: 51,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: HiDream
    {
      id: 'fal-hidream-i1-full',
      name: 'HiDream I1 Full',
      apiEndpoint: 'fal-ai/hidream-i1-full',
      docUrl: 'https://fal.ai/models/fal-ai/hidream-i1-full',
      baseCost: 0.03,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'HiDream',
      category: 'text-to-image',
      tags: ['creative', 'artistic', 'new'],
      displayOrder: 52,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
          ]
        }
      }
    },
    // NEW: IP-Adapter Flux - Style Transfer
    {
      id: 'fal-ip-adapter-flux',
      name: 'IP-Adapter FLUX',
      apiEndpoint: 'fal-ai/flux-lora/ip-adapter',
      docUrl: 'https://fal.ai/models/fal-ai/flux-lora/ip-adapter',
      baseCost: 0.02,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Community',
      category: 'image-to-image',
      tags: ['style-transfer', 'creative'],
      displayOrder: 60,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '1:1',
          choices: [
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
          ]
        }
      }
    },
    // ============ FLUX 2 MODELS ============
    // FLUX 2 Klein 4B - Fast, efficient, Apache 2.0 license
    {
      id: 'fal-flux-2-klein-4b',
      name: 'FLUX 2 Klein 4B',
      apiEndpoint: 'fal-ai/flux-2/klein/4b',
      textToImageEndpoint: 'fal-ai/flux-2/klein/4b',
      imageToImageEndpoint: 'fal-ai/flux-2/klein/4b/edit',
      docUrl: 'https://fal.ai/models/fal-ai/flux-2/klein/4b',
      baseCost: 0.014,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['fast', 'budget', 'open-source', 'new'],
      displayOrder: 15,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024 (Square HD)', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.5 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1 },
          ]
        },
        num_inference_steps: {
          label: 'Quality Steps',
          type: 'select',
          default: '4',
          choices: [
            { value: '4', label: '4 (Default)', priceMultiplier: 1 },
            { value: '8', label: '8 (Higher Quality)', priceMultiplier: 1.5 },
          ]
        }
      }
    },
    // FLUX 2 Turbo - Fast and affordable
    {
      id: 'fal-flux-2-turbo',
      name: 'FLUX 2 Turbo',
      apiEndpoint: 'fal-ai/flux-2/turbo',
      textToImageEndpoint: 'fal-ai/flux-2/turbo',
      imageToImageEndpoint: 'fal-ai/flux-2/turbo/edit',
      docUrl: 'https://fal.ai/models/fal-ai/flux-2/turbo',
      baseCost: 0.008,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['fast', 'budget', 'turbo', 'new'],
      displayOrder: 16,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1 },
          ]
        }
      }
    },
    // FLUX 2 Max - Premium quality
    {
      id: 'fal-flux-2-max',
      name: 'FLUX 2 Max',
      apiEndpoint: 'fal-ai/flux-2-max',
      textToImageEndpoint: 'fal-ai/flux-2-max',
      imageToImageEndpoint: 'fal-ai/flux-2-max/edit',
      docUrl: 'https://fal.ai/models/fal-ai/flux-2-max',
      baseCost: 0.07,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['premium', 'high-quality', 'pro', 'new'],
      displayOrder: 8,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.5 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1 },
          ]
        },
        safety_tolerance: {
          label: 'Safety Level',
          type: 'select',
          default: '2',
          choices: [
            { value: '1', label: 'Strict', priceMultiplier: 1 },
            { value: '2', label: 'Default', priceMultiplier: 1 },
            { value: '3', label: 'Relaxed', priceMultiplier: 1 },
          ]
        }
      }
    },
    // FLUX 2 (Base) - Core FLUX 2 model
    {
      id: 'fal-flux-2',
      name: 'FLUX 2',
      apiEndpoint: 'fal-ai/flux-2',
      textToImageEndpoint: 'fal-ai/flux-2',
      imageToImageEndpoint: 'fal-ai/flux-2/edit',
      docUrl: 'https://fal.ai/models/fal-ai/flux-2',
      baseCost: 0.025,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['flux-2', 'balanced', 'new'],
      displayOrder: 13,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.5 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '2.5',
          choices: [
            { value: '1.5', label: '1.5 (Creative)', priceMultiplier: 1 },
            { value: '2.5', label: '2.5 (Default)', priceMultiplier: 1 },
            { value: '4', label: '4 (Precise)', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    // FLUX 2 Pro - Professional quality FLUX 2
    {
      id: 'fal-flux-2-pro',
      name: 'FLUX 2 Pro',
      apiEndpoint: 'fal-ai/flux-2-pro',
      textToImageEndpoint: 'fal-ai/flux-2-pro',
      imageToImageEndpoint: 'fal-ai/flux-2-pro/edit',
      docUrl: 'https://fal.ai/models/fal-ai/flux-2-pro',
      baseCost: 0.05,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Black Forest Labs',
      category: 'both',
      tags: ['flux-2', 'pro', 'high-quality', 'new'],
      displayOrder: 9,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.5 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '3',
          choices: [
            { value: '1.5', label: '1.5 (Creative)', priceMultiplier: 1 },
            { value: '3', label: '3 (Default)', priceMultiplier: 1 },
            { value: '5', label: '5 (Precise)', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    // FLUX Dev Image-to-Image - Image editing with FLUX Dev
    {
      id: 'fal-flux-dev-i2i',
      name: 'FLUX Dev (Image-to-Image)',
      apiEndpoint: 'fal-ai/flux/dev/image-to-image',
      docUrl: 'https://fal.ai/models/fal-ai/flux/dev/image-to-image',
      baseCost: 0.025,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Black Forest Labs',
      category: 'image-to-image',
      tags: ['flux-dev', 'editing', 'variation'],
      displayOrder: 20,
      options: {
        strength: {
          label: 'Transformation Strength',
          type: 'select',
          default: '0.85',
          choices: [
            { value: '0.5', label: '0.5 (Subtle)', priceMultiplier: 1 },
            { value: '0.7', label: '0.7 (Moderate)', priceMultiplier: 1 },
            { value: '0.85', label: '0.85 (Strong)', priceMultiplier: 1 },
            { value: '1.0', label: '1.0 (Maximum)', priceMultiplier: 1 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '3.5',
          choices: [
            { value: '2', label: '2 (Creative)', priceMultiplier: 1 },
            { value: '3.5', label: '3.5 (Default)', priceMultiplier: 1 },
            { value: '5', label: '5 (Precise)', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    // ============ GPT IMAGE MODELS ============
    // GPT Image 1.5 - OpenAI-style image generation
    {
      id: 'fal-gpt-image-1.5',
      name: 'GPT Image 1.5',
      apiEndpoint: 'fal-ai/gpt-image-1.5',
      textToImageEndpoint: 'fal-ai/gpt-image-1.5',
      imageToImageEndpoint: 'fal-ai/gpt-image-1.5/edit',
      docUrl: 'https://fal.ai/models/fal-ai/gpt-image-1.5',
      baseCost: 0.034, // Medium quality default
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'OpenAI',
      category: 'both',
      tags: ['gpt', 'versatile', 'new'],
      displayOrder: 6,
      options: {
        quality: {
          label: 'Quality',
          type: 'select',
          default: 'medium',
          choices: [
            { value: 'low', label: 'Low ($0.009)', priceMultiplier: 0.26 },
            { value: 'medium', label: 'Medium ($0.034)', priceMultiplier: 1 },
            { value: 'high', label: 'High ($0.133)', priceMultiplier: 3.9 },
          ]
        },
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: '1024x1024',
          choices: [
            { value: '1024x1024', label: '1024×1024', priceMultiplier: 1 },
            { value: '1024x1536', label: '1024×1536', priceMultiplier: 1.5 },
            { value: '1536x1024', label: '1536×1024', priceMultiplier: 1.5 },
          ]
        }
      }
    },
    // ============ GLM IMAGE MODELS ============
    // GLM Image - Zhipu AI's image model with excellent text rendering
    // I2I endpoint uses image_urls (array) parameter
    {
      id: 'fal-glm-image',
      name: 'GLM Image',
      apiEndpoint: 'fal-ai/glm-image',
      textToImageEndpoint: 'fal-ai/glm-image',
      imageToImageEndpoint: 'fal-ai/glm-image/image-to-image',
      docUrl: 'https://fal.ai/models/fal-ai/glm-image',
      baseCost: 0.15,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Zhipu AI',
      category: 'both',
      tags: ['text-rendering', 'chinese', 'pro', 'new'],
      displayOrder: 7,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.25 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
            { value: 'portrait_hd', label: '1280×1920', priceMultiplier: 2.4 },
            { value: 'landscape_hd', label: '1920×1280', priceMultiplier: 2.4 },
          ]
        },
        num_inference_steps: {
          label: 'Quality Steps',
          type: 'select',
          default: '30',
          choices: [
            { value: '10', label: '10 (Fast)', priceMultiplier: 0.7 },
            { value: '30', label: '30 (Default)', priceMultiplier: 1 },
            { value: '50', label: '50 (High)', priceMultiplier: 1.3 },
          ]
        },
        enable_prompt_expansion: {
          label: 'Prompt Expansion',
          type: 'select',
          default: 'false',
          choices: [
            { value: 'false', label: 'Off', priceMultiplier: 1 },
            { value: 'true', label: 'On (AI enhances prompt)', priceMultiplier: 1.1 },
          ]
        }
      }
    },
    // ============ QWEN IMAGE MODELS ============
    // Qwen Image 2512 - Alibaba's latest image model
    {
      id: 'fal-qwen-image-2512',
      name: 'Qwen Image 2512',
      apiEndpoint: 'fal-ai/qwen-image-2512',
      docUrl: 'https://fal.ai/models/fal-ai/qwen-image-2512',
      baseCost: 0.02,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Alibaba',
      category: 'text-to-image',
      tags: ['qwen', 'fast', 'new'],
      displayOrder: 25,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'square', label: '512×512', priceMultiplier: 0.25 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
          ]
        }
      }
    },
    // Qwen Image Edit - Multi-angle editing
    {
      id: 'fal-qwen-image-edit',
      name: 'Qwen Image Edit',
      apiEndpoint: 'fal-ai/qwen-image-edit-2511-multiple-angles',
      docUrl: 'https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles',
      baseCost: 0.02,
      imageInput: 'required',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Alibaba',
      category: 'image-to-image',
      tags: ['qwen', 'editing', 'multi-angle', 'new'],
      displayOrder: 26,
      options: {
        image_size: {
          label: 'Output Size',
          type: 'select',
          default: 'auto',
          choices: [
            { value: 'auto', label: 'Auto (Match Input)', priceMultiplier: 1 },
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
          ]
        }
      }
    },
    // ============ WAN v2.6 IMAGE MODELS ============
    // WAN v2.6 Text-to-Image
    {
      id: 'fal-wan-v2.6-t2i',
      name: 'WAN v2.6 (Text-to-Image)',
      apiEndpoint: 'wan/v2.6/text-to-image',
      docUrl: 'https://fal.ai/models/wan/v2.6/text-to-image',
      baseCost: 0.03,
      imageInput: 'optional', // Can use 1 reference image for style
      maxInputImages: 1,
      imageParamName: 'reference_image_url',
      imageParamType: 'single',
      providerName: 'Alibaba',
      category: 'both',
      tags: ['fast', 'chinese', 'new'],
      displayOrder: 27,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'square_hd',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1280×720', priceMultiplier: 1 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    // WAN v2.6 Image-to-Image
    {
      id: 'fal-wan-v2.6-i2i',
      name: 'WAN v2.6 (Image-to-Image)',
      apiEndpoint: 'wan/v2.6/image-to-image',
      docUrl: 'https://fal.ai/models/wan/v2.6/image-to-image',
      baseCost: 0.03,
      imageInput: 'required',
      maxInputImages: 3,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'Alibaba',
      category: 'image-to-image',
      tags: ['editing', 'multi-reference', 'chinese', 'new'],
      displayOrder: 28,
      options: {
        image_size: {
          label: 'Output Size',
          type: 'select',
          default: 'auto',
          choices: [
            { value: 'auto', label: 'Auto', priceMultiplier: 1 },
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: '1280x1280', label: '1280×1280', priceMultiplier: 1.5 },
          ]
        },
        enable_prompt_expansion: {
          label: 'Prompt Expansion',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'false', label: 'Off', priceMultiplier: 1 },
            { value: 'true', label: 'On (Recommended)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // ============ Z-IMAGE MODELS ============
    // Z-Image Turbo - Fast Tongyi-MAI model
    {
      id: 'fal-z-image-turbo',
      name: 'Z-Image Turbo',
      apiEndpoint: 'fal-ai/z-image/turbo',
      textToImageEndpoint: 'fal-ai/z-image/turbo',
      imageToImageEndpoint: 'fal-ai/z-image/turbo/image-to-image',
      docUrl: 'https://fal.ai/models/fal-ai/z-image/turbo',
      baseCost: 0.005,
      imageInput: 'optional',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Tongyi-MAI',
      category: 'both',
      tags: ['fast', 'budget', 'turbo', 'new'],
      displayOrder: 30,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
          ]
        },
        num_inference_steps: {
          label: 'Quality Steps',
          type: 'select',
          default: '8',
          choices: [
            { value: '4', label: '4 (Fastest)', priceMultiplier: 0.6 },
            { value: '8', label: '8 (Default)', priceMultiplier: 1 },
          ]
        },
        strength: {
          label: 'Transform Strength (I2I)',
          type: 'select',
          default: '0.7',
          choices: [
            { value: '0.3', label: 'Light (30%)', priceMultiplier: 1 },
            { value: '0.5', label: 'Medium (50%)', priceMultiplier: 1 },
            { value: '0.7', label: 'Strong (70%)', priceMultiplier: 1 },
            { value: '0.9', label: 'Very Strong (90%)', priceMultiplier: 1 },
          ]
        },
        enable_prompt_expansion: {
          label: 'Prompt Expansion',
          type: 'select',
          default: 'false',
          choices: [
            { value: 'false', label: 'Off', priceMultiplier: 1 },
            { value: 'true', label: 'On (+$0.0025)', priceMultiplier: 1.5 },
          ]
        }
      }
    },
    // ============ BYTEDANCE SEEDREAM MODELS ============
    // Seedream v4.5 Text-to-Image
    {
      id: 'fal-seedream-v4.5',
      name: 'Seedream v4.5',
      apiEndpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
      textToImageEndpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
      imageToImageEndpoint: 'fal-ai/bytedance/seedream/v4.5/edit',
      docUrl: 'https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image',
      baseCost: 0.04,
      imageInput: 'optional',
      maxInputImages: 4,
      imageParamName: 'image_urls',
      imageParamType: 'array',
      providerName: 'ByteDance',
      category: 'both',
      tags: ['creative', 'pro', 'new'],
      displayOrder: 20,
      options: {
        image_size: {
          label: 'Image Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768', priceMultiplier: 1.3 },
            { value: '2048x2048', label: '2048×2048 (4MP)', priceMultiplier: 4 },
          ]
        },
        num_images: {
          label: 'Number of Images',
          type: 'select',
          default: '1',
          choices: [
            { value: '1', label: '1 Image', priceMultiplier: 1 },
            { value: '2', label: '2 Images', priceMultiplier: 2 },
            { value: '4', label: '4 Images', priceMultiplier: 4 },
          ]
        }
      }
    },
    // ============ UPSCALING MODELS ============
    // Crystal Upscaler - Clarity AI's portrait-optimized image upscaler
    {
      id: 'fal-crystal-upscaler',
      name: 'Crystal Upscaler',
      apiEndpoint: 'clarityai/crystal-upscaler',
      docUrl: 'https://fal.ai/models/clarityai/crystal-upscaler',
      baseCost: 0.016, // $0.016 per megapixel
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Clarity AI',
      category: 'upscale',
      tags: ['upscale', 'enhance', 'portrait', 'face'],
      displayOrder: 90,
      options: {
        scale_factor: {
          label: 'Scale Factor',
          type: 'select',
          default: '2',
          choices: [
            { value: '2', label: '2x (4× megapixels)', priceMultiplier: 4 },
            { value: '4', label: '4x (16× megapixels)', priceMultiplier: 16 },
            { value: '8', label: '8x (64× megapixels)', priceMultiplier: 64 },
          ]
        },
        creativity: {
          label: 'Creativity',
          type: 'select',
          default: '0',
          choices: [
            { value: '0', label: '0 - Preserve Details', priceMultiplier: 1 },
            { value: '3', label: '3 - Balanced', priceMultiplier: 1 },
            { value: '5', label: '5 - Enhanced', priceMultiplier: 1 },
            { value: '8', label: '8 - Creative', priceMultiplier: 1 },
            { value: '10', label: '10 - Maximum AI Enhancement', priceMultiplier: 1 },
          ]
        }
      }
    },
  ],
  video: [
    // Crystal Video Upscaler - High precision video upscaling
    {
      id: 'fal-crystal-video-upscaler',
      name: 'Crystal Video Upscaler',
      apiEndpoint: 'clarityai/crystal-video-upscaler',
      docUrl: 'https://fal.ai/models/clarityai/crystal-video-upscaler',
      baseCost: 0.10, // $0.10 per megapixel per second (at 30fps)
      imageInput: 'none', // Uses video_url instead
      maxInputImages: 0,
      maxWaitTime: 900,
      providerName: 'Clarity AI',
      category: 'upscale',
      tags: ['upscale', 'enhance', 'video', '4k'],
      displayOrder: 90,
      options: {
        scale_factor: {
          label: 'Scale Factor',
          type: 'select',
          default: '2',
          choices: [
            { value: '2', label: '2x Upscale', priceMultiplier: 4 },
            { value: '4', label: '4x Upscale (4K)', priceMultiplier: 16 },
          ]
        }
      }
    },
    {
      id: 'fal-wan-v2.1',
      name: 'Wan 2.1 (Text-to-Video)',
      apiEndpoint: 'fal-ai/wan/v2.1/1.3b/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/wan/v2.1',
      baseCost: 0.069,
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 300, // 5 minutes for budget model
      providerName: 'Alibaba',
      category: 'text-to-video',
      tags: ['budget', 'fast'],
      displayOrder: 10,
      options: {
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '480p',
          choices: [
            { value: '480p', label: '480p', priceMultiplier: 1 },
            { value: '720p', label: '720p', priceMultiplier: 1.5 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-wan-v2.1-img2vid',
      name: 'Wan 2.1 (Image-to-Video)',
      apiEndpoint: 'fal-ai/wan/v2.1/1.3b/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/wan/v2.1',
      baseCost: 0.069,
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Alibaba',
      category: 'image-to-video',
      tags: ['budget', 'animate'],
      displayOrder: 11,
      options: {
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '480p',
          choices: [
            { value: '480p', label: '480p', priceMultiplier: 1 },
            { value: '720p', label: '720p', priceMultiplier: 1.5 },
          ]
        }
      }
    },
    // ============ LTX 2 19B DISTILLED MODELS ============
    // LTX 2 19B Distilled - Fast, efficient video generation
    {
      id: 'fal-ltx-2-19b-t2v',
      name: 'LTX 2 19B (Text-to-Video)',
      apiEndpoint: 'fal-ai/ltx-2-19b/distilled/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/distilled/text-to-video',
      baseCost: 0.05, // Estimated $0.05/second
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 600,
      providerName: 'Lightricks',
      category: 'text-to-video',
      tags: ['ltx', 'distilled', 'fast', 'new'],
      displayOrder: 5,
      options: {
        num_frames: {
          label: 'Frames',
          type: 'select',
          default: '121',
          choices: [
            { value: '61', label: '61 frames (~2.5s)', priceMultiplier: 0.5 },
            { value: '121', label: '121 frames (~5s)', priceMultiplier: 1 },
            { value: '181', label: '181 frames (~7s)', priceMultiplier: 1.5 },
          ]
        },
        video_size: {
          label: 'Video Size',
          type: 'select',
          default: 'landscape_16_9',
          choices: [
            { value: 'square_hd', label: '1024×1024 (Square)', priceMultiplier: 1 },
            { value: 'portrait_4_3', label: '768×1024 (Portrait)', priceMultiplier: 1 },
            { value: 'portrait_16_9', label: '768×1344 (Portrait 16:9)', priceMultiplier: 1.3 },
            { value: 'landscape_4_3', label: '1024×768 (Landscape)', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768 (Landscape 16:9)', priceMultiplier: 1.3 },
          ]
        },
        acceleration: {
          label: 'Speed Mode',
          type: 'select',
          default: 'regular',
          choices: [
            { value: 'full', label: 'Full (Fastest)', priceMultiplier: 0.7 },
            { value: 'high', label: 'High', priceMultiplier: 0.85 },
            { value: 'regular', label: 'Regular', priceMultiplier: 1 },
            { value: 'none', label: 'None (Best Quality)', priceMultiplier: 1.2 },
          ]
        },
        camera_lora: {
          label: 'Camera Movement',
          type: 'select',
          default: 'none',
          choices: [
            { value: 'none', label: 'None', priceMultiplier: 1 },
            { value: 'static', label: 'Static', priceMultiplier: 1 },
            { value: 'dolly_in', label: 'Dolly In', priceMultiplier: 1 },
            { value: 'dolly_out', label: 'Dolly Out', priceMultiplier: 1 },
            { value: 'dolly_left', label: 'Dolly Left', priceMultiplier: 1 },
            { value: 'dolly_right', label: 'Dolly Right', priceMultiplier: 1 },
            { value: 'jib_up', label: 'Jib Up', priceMultiplier: 1 },
            { value: 'jib_down', label: 'Jib Down', priceMultiplier: 1 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'With Audio', priceMultiplier: 1 },
            { value: 'false', label: 'Silent', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-ltx-2-19b-i2v',
      name: 'LTX 2 19B (Image-to-Video)',
      apiEndpoint: 'fal-ai/ltx-2-19b/distilled/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/distilled/image-to-video',
      baseCost: 0.05, // Estimated $0.05/second
      imageInput: 'required',
      maxInputImages: 1,
      imageParamName: 'image_url',
      imageParamType: 'single',
      maxWaitTime: 600,
      providerName: 'Lightricks',
      category: 'image-to-video',
      tags: ['ltx', 'distilled', 'animate', 'new'],
      displayOrder: 6,
      options: {
        num_frames: {
          label: 'Frames',
          type: 'select',
          default: '121',
          choices: [
            { value: '61', label: '61 frames (~2.5s)', priceMultiplier: 0.5 },
            { value: '121', label: '121 frames (~5s)', priceMultiplier: 1 },
            { value: '181', label: '181 frames (~7s)', priceMultiplier: 1.5 },
          ]
        },
        video_size: {
          label: 'Video Size',
          type: 'select',
          default: 'auto',
          choices: [
            { value: 'auto', label: 'Auto (Match Input)', priceMultiplier: 1 },
            { value: 'square_hd', label: '1024×1024 (Square)', priceMultiplier: 1 },
            { value: 'landscape_16_9', label: '1344×768 (Landscape)', priceMultiplier: 1.3 },
            { value: 'portrait_16_9', label: '768×1344 (Portrait)', priceMultiplier: 1.3 },
          ]
        },
        acceleration: {
          label: 'Speed Mode',
          type: 'select',
          default: 'regular',
          choices: [
            { value: 'full', label: 'Full (Fastest)', priceMultiplier: 0.7 },
            { value: 'high', label: 'High', priceMultiplier: 0.85 },
            { value: 'regular', label: 'Regular', priceMultiplier: 1 },
            { value: 'none', label: 'None (Best Quality)', priceMultiplier: 1.2 },
          ]
        },
        camera_lora: {
          label: 'Camera Movement',
          type: 'select',
          default: 'none',
          choices: [
            { value: 'none', label: 'None', priceMultiplier: 1 },
            { value: 'static', label: 'Static', priceMultiplier: 1 },
            { value: 'dolly_in', label: 'Dolly In', priceMultiplier: 1 },
            { value: 'dolly_out', label: 'Dolly Out', priceMultiplier: 1 },
            { value: 'dolly_left', label: 'Dolly Left', priceMultiplier: 1 },
            { value: 'dolly_right', label: 'Dolly Right', priceMultiplier: 1 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'With Audio', priceMultiplier: 1 },
            { value: 'false', label: 'Silent', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-kling-v1.6-pro',
      name: 'Kling 1.6 Pro',
      apiEndpoint: 'fal-ai/kling-video/v1.6/pro/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/kling-video/v1.6/pro',
      baseCost: 0.195,
      imageInput: 'optional',
      maxInputImages: 1,
      maxWaitTime: 600, // 10 minutes for pro model
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Kuaishou',
      category: 'text-to-video',
      tags: ['pro', 'high-quality'],
      displayOrder: 20,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5',
          choices: [
            { value: '5', label: '5 seconds', priceMultiplier: 1 },
            { value: '10', label: '10 seconds', priceMultiplier: 2 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-kling-v1.5-standard',
      name: 'Kling 1.5 Standard',
      apiEndpoint: 'fal-ai/kling-video/v1.5/standard/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/kling-video/v1.5/standard',
      baseCost: 0.065,
      imageInput: 'optional',
      maxInputImages: 1,
      maxWaitTime: 420, // 7 minutes for standard model
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Kuaishou',
      category: 'text-to-video',
      tags: ['budget'],
      displayOrder: 21,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5',
          choices: [
            { value: '5', label: '5 seconds', priceMultiplier: 1 },
            { value: '10', label: '10 seconds', priceMultiplier: 2 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-minimax-video-01',
      name: 'MiniMax Video-01',
      apiEndpoint: 'fal-ai/minimax/video-01',
      docUrl: 'https://fal.ai/models/fal-ai/minimax/video-01',
      baseCost: 0.30,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'MiniMax',
      category: 'text-to-video',
      tags: ['high-quality'],
      displayOrder: 30,
      options: {
        prompt_optimizer: {
          label: 'Optimize Prompt',
          type: 'toggle',
          default: true
        }
      }
    },
    {
      id: 'fal-luma-dream-machine',
      name: 'Luma Dream Machine',
      apiEndpoint: 'fal-ai/luma-dream-machine',
      docUrl: 'https://fal.ai/models/fal-ai/luma-dream-machine',
      baseCost: 0.032,
      imageInput: 'optional',
      maxInputImages: 1,
      maxWaitTime: 300, // 5 minutes
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Luma AI',
      category: 'text-to-video',
      tags: ['budget', 'cinematic'],
      displayOrder: 40,
      options: {
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
            { value: '1:1', label: '1:1', priceMultiplier: 1 },
            { value: '4:3', label: '4:3', priceMultiplier: 1 },
            { value: '3:4', label: '3:4', priceMultiplier: 1 },
            { value: '21:9', label: '21:9 (Cinematic)', priceMultiplier: 1.2 },
          ]
        }
      }
    },
    {
      id: 'fal-hunyuan-video',
      name: 'Hunyuan Video',
      apiEndpoint: 'fal-ai/hunyuan-video',
      docUrl: 'https://fal.ai/models/fal-ai/hunyuan-video',
      baseCost: 0.50,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Tencent',
      category: 'text-to-video',
      tags: ['high-quality'],
      displayOrder: 50,
      options: {
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '720p',
          choices: [
            { value: '540p', label: '540p', priceMultiplier: 0.7 },
            { value: '720p', label: '720p', priceMultiplier: 1 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9', priceMultiplier: 1 },
            { value: '9:16', label: '9:16', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-ltx-video',
      name: 'LTX Video (Fast)',
      apiEndpoint: 'fal-ai/ltx-video',
      docUrl: 'https://fal.ai/models/fal-ai/ltx-video',
      baseCost: 0.019,
      imageInput: 'none',
      maxInputImages: 0,
      providerName: 'Lightricks',
      category: 'text-to-video',
      tags: ['fast', 'budget'],
      displayOrder: 60,
      options: {
        num_frames: {
          label: 'Length',
          type: 'select',
          default: '97',
          choices: [
            { value: '65', label: '~2.5 seconds', priceMultiplier: 0.7 },
            { value: '97', label: '~4 seconds', priceMultiplier: 1 },
            { value: '129', label: '~5 seconds', priceMultiplier: 1.3 },
          ]
        }
      }
    },
    {
      id: 'fal-runway-gen3-turbo',
      name: 'Runway Gen-3 Turbo',
      apiEndpoint: 'fal-ai/runway-gen3/turbo/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/runway-gen3/turbo',
      baseCost: 0.25,
      imageInput: 'optional',
      maxInputImages: 1,
      maxWaitTime: 480, // 8 minutes for premium model
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Runway',
      category: 'text-to-video',
      tags: ['pro', 'cinematic'],
      displayOrder: 70,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5',
          choices: [
            { value: '5', label: '5 seconds', priceMultiplier: 1 },
            { value: '10', label: '10 seconds', priceMultiplier: 2 },
          ]
        }
      }
    },
    // === Google Veo 3.1 Series ===
    {
      id: 'fal-veo3.1-t2v',
      name: 'Veo 3.1 (Text-to-Video)',
      apiEndpoint: 'fal-ai/veo3.1',
      docUrl: 'https://fal.ai/models/fal-ai/veo3.1',
      baseCost: 1.60, // ~$0.20/sec × 8s default
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 600,
      providerName: 'Google',
      category: 'text-to-video',
      tags: ['premium', 'high-quality', 'audio', 'new'],
      displayOrder: 1,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '8s',
          choices: [
            { value: '4s', label: '4 seconds', priceMultiplier: 0.5 },
            { value: '6s', label: '6 seconds', priceMultiplier: 0.75 },
            { value: '8s', label: '8 seconds', priceMultiplier: 1 },
          ]
        },
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '720p',
          choices: [
            { value: '720p', label: '720p', priceMultiplier: 1 },
            { value: '1080p', label: '1080p', priceMultiplier: 1.5 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'aspect_ratio',
          default: '16:9',
          choices: [
            { value: '16:9', label: 'Landscape', priceMultiplier: 1 },
            { value: '9:16', label: 'Portrait', priceMultiplier: 1 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'toggle',
          default: 'true',
          choices: [
            { value: 'true', label: 'With audio', priceMultiplier: 2 },
            { value: 'false', label: 'Silent', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-veo3.1-i2v',
      name: 'Veo 3.1 (Image-to-Video)',
      apiEndpoint: 'fal-ai/veo3.1/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/veo3.1/image-to-video',
      baseCost: 1.60,
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 600,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Google',
      category: 'image-to-video',
      tags: ['premium', 'high-quality', 'audio', 'animate', 'new'],
      displayOrder: 2,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '8s',
          choices: [
            { value: '4s', label: '4 seconds', priceMultiplier: 0.5 },
            { value: '6s', label: '6 seconds', priceMultiplier: 0.75 },
            { value: '8s', label: '8 seconds', priceMultiplier: 1 },
          ]
        },
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '720p',
          choices: [
            { value: '720p', label: '720p', priceMultiplier: 1 },
            { value: '1080p', label: '1080p', priceMultiplier: 1.5 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'toggle',
          default: 'true',
          choices: [
            { value: 'true', label: 'With audio', priceMultiplier: 2 },
            { value: 'false', label: 'Silent', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-veo3-fast-t2v',
      name: 'Veo 3 Fast (Text-to-Video)',
      apiEndpoint: 'fal-ai/veo3/fast',
      docUrl: 'https://fal.ai/models/fal-ai/veo3/fast',
      baseCost: 0.75, // ~$0.15/sec × 5s with audio
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 300,
      providerName: 'Google',
      category: 'text-to-video',
      tags: ['fast', 'audio', 'new'],
      displayOrder: 3,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5s',
          choices: [
            { value: '5s', label: '5 seconds', priceMultiplier: 1 },
            { value: '8s', label: '8 seconds', priceMultiplier: 1.6 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
          ]
        },
        generate_audio: {
          label: 'Generate Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'Yes (with audio)', priceMultiplier: 1.5 },
            { value: 'false', label: 'No (silent)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-veo3.1-fast-i2v',
      name: 'Veo 3.1 Fast (Image-to-Video)',
      apiEndpoint: 'fal-ai/veo3.1/fast/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/veo3.1/fast/image-to-video',
      baseCost: 0.75,
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 300,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Google',
      category: 'image-to-video',
      tags: ['fast', 'audio', 'animate', 'new'],
      displayOrder: 4,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5s',
          choices: [
            { value: '5s', label: '5 seconds', priceMultiplier: 1 },
            { value: '8s', label: '8 seconds', priceMultiplier: 1.6 },
          ]
        },
        generate_audio: {
          label: 'Generate Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'Yes (with audio)', priceMultiplier: 1.5 },
            { value: 'false', label: 'No (silent)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === OpenAI Sora 2 Series ===
    {
      id: 'fal-sora2-t2v',
      name: 'Sora 2 (Text-to-Video)',
      apiEndpoint: 'fal-ai/sora-2/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/sora-2/text-to-video',
      baseCost: 0.80, // ~$0.10/sec × 8s
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 600,
      providerName: 'OpenAI',
      category: 'text-to-video',
      tags: ['premium', 'cinematic', 'new'],
      displayOrder: 5,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '8',
          choices: [
            { value: '4', label: '4 seconds', priceMultiplier: 0.5 },
            { value: '8', label: '8 seconds', priceMultiplier: 1 },
            { value: '12', label: '12 seconds', priceMultiplier: 1.5 },
          ]
        },
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '720p',
          choices: [
            { value: '720p', label: '720p', priceMultiplier: 1 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-sora2-i2v',
      name: 'Sora 2 (Image-to-Video)',
      apiEndpoint: 'fal-ai/sora-2/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/sora-2/image-to-video',
      baseCost: 0.80,
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 600,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'OpenAI',
      category: 'image-to-video',
      tags: ['premium', 'cinematic', 'animate', 'new'],
      displayOrder: 6,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '8',
          choices: [
            { value: '4', label: '4 seconds', priceMultiplier: 0.5 },
            { value: '8', label: '8 seconds', priceMultiplier: 1 },
            { value: '12', label: '12 seconds', priceMultiplier: 1.5 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: 'auto',
          choices: [
            { value: 'auto', label: 'Auto (match image)', priceMultiplier: 1 },
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-sora2-pro-t2v',
      name: 'Sora 2 Pro (Text-to-Video)',
      apiEndpoint: 'fal-ai/sora-2/text-to-video/pro',
      docUrl: 'https://fal.ai/models/fal-ai/sora-2/text-to-video/pro',
      baseCost: 2.40, // ~$0.30/sec × 8s
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 900,
      providerName: 'OpenAI',
      category: 'text-to-video',
      tags: ['premium', 'pro', 'cinematic', '1080p', 'new'],
      displayOrder: 7,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '8',
          choices: [
            { value: '4', label: '4 seconds', priceMultiplier: 0.5 },
            { value: '8', label: '8 seconds', priceMultiplier: 1 },
            { value: '12', label: '12 seconds', priceMultiplier: 1.5 },
          ]
        },
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '1080p',
          choices: [
            { value: '720p', label: '720p', priceMultiplier: 0.7 },
            { value: '1080p', label: '1080p', priceMultiplier: 1 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: '16:9 (Landscape)', priceMultiplier: 1 },
            { value: '9:16', label: '9:16 (Portrait)', priceMultiplier: 1 },
            { value: '1:1', label: '1:1 (Square)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Kling v2.6 Pro ===
    {
      id: 'fal-kling-v2.6-pro-t2v',
      name: 'Kling 2.6 Pro (Text-to-Video)',
      apiEndpoint: 'fal-ai/kling-video/v2.6/pro/text-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video',
      baseCost: 0.35, // $0.07/sec × 5s (no audio)
      imageInput: 'none',
      maxInputImages: 0,
      maxWaitTime: 600,
      providerName: 'Kuaishou',
      category: 'text-to-video',
      tags: ['pro', 'high-quality', 'audio', 'new'],
      displayOrder: 7,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5',
          choices: [
            { value: '5', label: '5 seconds', priceMultiplier: 1 },
            { value: '10', label: '10 seconds', priceMultiplier: 2 },
          ]
        },
        aspect_ratio: {
          label: 'Aspect Ratio',
          type: 'select',
          default: '16:9',
          choices: [
            { value: '16:9', label: 'Landscape', priceMultiplier: 1 },
            { value: '9:16', label: 'Portrait', priceMultiplier: 1 },
            { value: '1:1', label: 'Square', priceMultiplier: 1 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'With audio ($0.14/sec)', priceMultiplier: 2 },
            { value: 'false', label: 'Silent ($0.07/sec)', priceMultiplier: 1 },
          ]
        }
      }
    },
    {
      id: 'fal-kling-v2.6-pro-i2v',
      name: 'Kling 2.6 Pro (Image-to-Video)',
      apiEndpoint: 'fal-ai/kling-video/v2.6/pro/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video',
      baseCost: 0.35, // $0.07/sec × 5s (no audio)
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 600,
      imageParamName: 'start_image_url', // Kling uses start_image_url
      imageParamType: 'single',
      providerName: 'Kuaishou',
      category: 'image-to-video',
      tags: ['pro', 'high-quality', 'audio', 'animate', 'new'],
      displayOrder: 8,
      options: {
        duration: {
          label: 'Duration',
          type: 'select',
          default: '5',
          choices: [
            { value: '5', label: '5 seconds', priceMultiplier: 1 },
            { value: '10', label: '10 seconds', priceMultiplier: 2 },
          ]
        },
        generate_audio: {
          label: 'Audio',
          type: 'toggle',
          default: 'true',
          choices: [
            { value: 'true', label: 'With audio', priceMultiplier: 2 },
            { value: 'false', label: 'Silent', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === LTX 2 19B Series ===
    {
      id: 'fal-ltx2-19b-extend',
      name: 'LTX 2 19B (Extend Video)',
      apiEndpoint: 'fal-ai/ltx-2-19b/extend-video',
      docUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/extend-video',
      baseCost: 0.20, // ~$0.0018/megapixel, typical video ~$0.20
      imageInput: 'none',
      videoInput: 'required',
      maxInputImages: 0,
      maxWaitTime: 300,
      providerName: 'Lightricks',
      category: 'video-extension',
      tags: ['extend', 'continuation', 'audio', 'new'],
      displayOrder: 9,
      options: {
        num_frames: {
          label: 'Frames to Generate',
          type: 'select',
          default: '121',
          choices: [
            { value: '65', label: '~2.5 seconds', priceMultiplier: 0.5 },
            { value: '121', label: '~5 seconds', priceMultiplier: 1 },
            { value: '181', label: '~7 seconds', priceMultiplier: 1.5 },
          ]
        },
        generate_audio: {
          label: 'Generate Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'Yes', priceMultiplier: 1 },
            { value: 'false', label: 'No', priceMultiplier: 1 },
          ]
        },
        video_quality: {
          label: 'Quality',
          type: 'select',
          default: 'high',
          choices: [
            { value: 'medium', label: 'Medium', priceMultiplier: 0.8 },
            { value: 'high', label: 'High', priceMultiplier: 1 },
            { value: 'maximum', label: 'Maximum', priceMultiplier: 1.3 },
          ]
        }
      }
    },
    {
      id: 'fal-ltx2-19b-distilled-extend',
      name: 'LTX 2 19B Distilled (Extend Video)',
      apiEndpoint: 'fal-ai/ltx-2-19b/distilled/extend-video',
      docUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/distilled/extend-video',
      baseCost: 0.12, // Distilled is faster/cheaper
      imageInput: 'none',
      videoInput: 'required',
      maxInputImages: 0,
      maxWaitTime: 180,
      providerName: 'Lightricks',
      category: 'video-extension',
      tags: ['extend', 'fast', 'budget', 'new'],
      displayOrder: 10,
      options: {
        num_frames: {
          label: 'Frames to Generate',
          type: 'select',
          default: '121',
          choices: [
            { value: '65', label: '~2.5 seconds', priceMultiplier: 0.5 },
            { value: '121', label: '~5 seconds', priceMultiplier: 1 },
            { value: '181', label: '~7 seconds', priceMultiplier: 1.5 },
          ]
        },
        generate_audio: {
          label: 'Generate Audio',
          type: 'select',
          default: 'true',
          choices: [
            { value: 'true', label: 'Yes', priceMultiplier: 1 },
            { value: 'false', label: 'No', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Wan Move ===
    {
      id: 'fal-wan-move',
      name: 'Wan Move (Trajectory Control)',
      apiEndpoint: 'fal-ai/wan-move',
      docUrl: 'https://fal.ai/models/fal-ai/wan-move',
      baseCost: 0.20, // Fixed $0.20 per video at 480p
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 300,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Alibaba',
      category: 'image-to-video',
      tags: ['motion-control', 'trajectory', 'animate', 'new'],
      displayOrder: 11,
      options: {
        num_inference_steps: {
          label: 'Quality Steps',
          type: 'select',
          default: '40',
          choices: [
            { value: '20', label: 'Fast (20 steps)', priceMultiplier: 0.8 },
            { value: '40', label: 'Standard (40 steps)', priceMultiplier: 1 },
            { value: '60', label: 'High Quality (60 steps)', priceMultiplier: 1.3 },
          ]
        },
        guidance_scale: {
          label: 'Guidance Scale',
          type: 'select',
          default: '3.5',
          choices: [
            { value: '2', label: '2 (More Creative)', priceMultiplier: 1 },
            { value: '3.5', label: '3.5 (Balanced)', priceMultiplier: 1 },
            { value: '5', label: '5 (More Accurate)', priceMultiplier: 1 },
          ]
        }
      }
    },
    // === Bria Video Erase ===
    {
      id: 'fal-bria-video-erase',
      name: 'Bria Video Erase (Keypoints)',
      apiEndpoint: 'bria/video/erase/keypoints',
      docUrl: 'https://fal.ai/models/bria/video/erase/keypoints',
      baseCost: 0.70, // $0.14/sec × 5s typical
      imageInput: 'none',
      videoInput: 'required',
      maxInputImages: 0,
      maxWaitTime: 300,
      providerName: 'Bria',
      category: 'video-editing',
      tags: ['editing', 'erase', 'remove-objects', 'new'],
      displayOrder: 12,
      options: {}
    },
    // === Kandinsky 5 Pro ===
    {
      id: 'fal-kandinsky5-pro-i2v',
      name: 'Kandinsky 5 Pro (Image-to-Video)',
      apiEndpoint: 'fal-ai/kandinsky5-pro/image-to-video',
      docUrl: 'https://fal.ai/models/fal-ai/kandinsky5-pro/image-to-video',
      baseCost: 0.20, // $0.20 for 5s at 512p
      imageInput: 'required',
      maxInputImages: 1,
      maxWaitTime: 300,
      imageParamName: 'image_url',
      imageParamType: 'single',
      providerName: 'Sber',
      category: 'image-to-video',
      tags: ['animate', 'artistic', 'new'],
      displayOrder: 13,
      options: {
        resolution: {
          label: 'Resolution',
          type: 'select',
          default: '512p',
          choices: [
            { value: '512p', label: '512p', priceMultiplier: 1 },
            { value: '1024p', label: '1024p', priceMultiplier: 3 },
          ]
        }
      }
    },
  ],
  chat: [
    // OpenRouter models with capabilities
    { 
      id: 'openai/gpt-4o', 
      name: 'GPT-4o', 
      apiEndpoint: 'openai/gpt-4o', 
      docUrl: 'https://openrouter.ai/openai/gpt-4o',
      baseCost: 0.005,
      inputCost: 0.0025,  // per 1K tokens
      outputCost: 0.01,   // per 1K tokens
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 128000,
        maxOutput: 16384
      }
    },
    { 
      id: 'openai/gpt-4o-mini', 
      name: 'GPT-4o Mini', 
      apiEndpoint: 'openai/gpt-4o-mini', 
      docUrl: 'https://openrouter.ai/openai/gpt-4o-mini',
      baseCost: 0.00015,
      inputCost: 0.00015,
      outputCost: 0.0006,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 128000,
        maxOutput: 16384
      }
    },
    { 
      id: 'anthropic/claude-3.5-sonnet', 
      name: 'Claude 3.5 Sonnet', 
      apiEndpoint: 'anthropic/claude-3.5-sonnet', 
      docUrl: 'https://openrouter.ai/anthropic/claude-3.5-sonnet',
      baseCost: 0.003,
      inputCost: 0.003,
      outputCost: 0.015,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 200000,
        maxOutput: 8192
      }
    },
    { 
      id: 'anthropic/claude-3-haiku', 
      name: 'Claude 3 Haiku', 
      apiEndpoint: 'anthropic/claude-3-haiku', 
      docUrl: 'https://openrouter.ai/anthropic/claude-3-haiku',
      baseCost: 0.00025,
      inputCost: 0.00025,
      outputCost: 0.00125,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 200000,
        maxOutput: 4096
      }
    },
    { 
      id: 'google/gemini-2.0-flash-exp:free', 
      name: 'Gemini 2.0 Flash (Free)', 
      apiEndpoint: 'google/gemini-2.0-flash-exp:free', 
      docUrl: 'https://openrouter.ai/google/gemini-2.0-flash-exp:free',
      baseCost: 0,
      inputCost: 0,
      outputCost: 0,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: false,
        maxContext: 1000000,
        maxOutput: 8192
      }
    },
    { 
      id: 'google/gemini-pro-1.5', 
      name: 'Gemini 1.5 Pro', 
      apiEndpoint: 'google/gemini-pro-1.5', 
      docUrl: 'https://openrouter.ai/google/gemini-pro-1.5',
      baseCost: 0.00125,
      inputCost: 0.00125,
      outputCost: 0.005,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 2000000,
        maxOutput: 8192
      }
    },
    { 
      id: 'meta-llama/llama-3.3-70b-instruct', 
      name: 'Llama 3.3 70B', 
      apiEndpoint: 'meta-llama/llama-3.3-70b-instruct', 
      docUrl: 'https://openrouter.ai/meta-llama/llama-3.3-70b-instruct',
      baseCost: 0.00035,
      inputCost: 0.00035,
      outputCost: 0.0004,
      capabilities: {
        vision: false,
        streaming: true,
        webSearch: true,
        maxContext: 131072,
        maxOutput: 4096
      }
    },
    { 
      id: 'deepseek/deepseek-chat', 
      name: 'DeepSeek V3', 
      apiEndpoint: 'deepseek/deepseek-chat', 
      docUrl: 'https://openrouter.ai/deepseek/deepseek-chat',
      baseCost: 0.00014,
      inputCost: 0.00014,
      outputCost: 0.00028,
      capabilities: {
        vision: false,
        streaming: true,
        webSearch: false,
        maxContext: 64000,
        maxOutput: 8192
      }
    },
    { 
      id: 'deepseek/deepseek-r1', 
      name: 'DeepSeek R1 (Reasoning)', 
      apiEndpoint: 'deepseek/deepseek-r1', 
      docUrl: 'https://openrouter.ai/deepseek/deepseek-r1',
      baseCost: 0.00055,
      inputCost: 0.00055,
      outputCost: 0.00219,
      capabilities: {
        vision: false,
        streaming: true,
        webSearch: false,
        maxContext: 64000,
        maxOutput: 8192,
        reasoning: true
      }
    },
    { 
      id: 'qwen/qwen-2.5-72b-instruct', 
      name: 'Qwen 2.5 72B', 
      apiEndpoint: 'qwen/qwen-2.5-72b-instruct', 
      docUrl: 'https://openrouter.ai/qwen/qwen-2.5-72b-instruct',
      baseCost: 0.00035,
      inputCost: 0.00035,
      outputCost: 0.0004,
      capabilities: {
        vision: false,
        streaming: true,
        webSearch: true,
        maxContext: 131072,
        maxOutput: 8192
      }
    },
    { 
      id: 'mistralai/mistral-large-2411', 
      name: 'Mistral Large', 
      apiEndpoint: 'mistralai/mistral-large-2411', 
      docUrl: 'https://openrouter.ai/mistralai/mistral-large-2411',
      baseCost: 0.002,
      inputCost: 0.002,
      outputCost: 0.006,
      capabilities: {
        vision: true,
        streaming: true,
        webSearch: true,
        maxContext: 128000,
        maxOutput: 8192
      }
    },
  ]
};

// Seed default data
const seedDefaultData = () => {
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (id, username, password) VALUES (?, ?, ?)').run(uuidv4(), 'admin', hashedPassword);
    console.log('Default admin created: admin / admin123');
  }

  const settings = [
    ['openrouterApiKey', ''],
    ['falApiKey', ''],
    ['profitMargin', '0'],
    ['profitMarginImage', '0'],
    ['profitMarginVideo', '0'],
    ['profitMarginChat', '0'],
    ['freeCredits', '10'],
    ['creditPrice', '1.00'],
    ['razorpayKeyId', ''],
    ['razorpayKeySecret', ''],
    ['googleClientId', ''],
    ['googleClientSecret', ''],
  ];
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  settings.forEach(([key, value]) => insertSetting.run(key, value));

  // Seed subscription plans
  const plansExist = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get();
  if (plansExist.count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO subscription_plans (id, name, priceMonthly, priceYearly, creditsPerMonth, features, isPopular, displayOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 1350,
        priceYearly: 12960, // 20% discount
        creditsPerMonth: 12000,
        features: JSON.stringify([
          '~5,000 chats, 1000 images, or 100 videos*',
          'Access to all 50+ AI models',
          'GPT-5, Gemini 3.0 Pro, Sora 2 included',
          'Basic support',
          'Community access',
          'No watermarks'
        ]),
        isPopular: 0,
        displayOrder: 1
      },
      {
        id: 'standard',
        name: 'Standard',
        priceMonthly: 2700,
        priceYearly: 25920, // 20% discount
        creditsPerMonth: 24000,
        features: JSON.stringify([
          '~12,500 chats, 2500 images, or 250 videos*',
          'Access to all 50+ AI models',
          'GPT-5, Gemini 3.0 Pro, Sora 2 included',
          'Priority support',
          'Team collaboration (up to 5)',
          'Advanced analytics'
        ]),
        isPopular: 1,
        displayOrder: 2
      },
      {
        id: 'professional',
        name: 'Professional',
        priceMonthly: 9000,
        priceYearly: 86400, // 20% discount
        creditsPerMonth: 90000,
        features: JSON.stringify([
          '~25,000 chats, 5000 images, or 500 videos*',
          '~25,000 chats, 5000 images, or 500 videos*',
          'GPT-5, Gemini 3.0 Pro, Sora 2 included',
          'Unlimited team members',
          'Dedicated support',
          'SSO & advanced security',
          'Custom workflows'
        ]),
        isPopular: 0,
        displayOrder: 3
      }
    ];
    
    plans.forEach(plan => {
      insertPlan.run(plan.id, plan.name, plan.priceMonthly, plan.priceYearly, plan.creditsPerMonth, plan.features, plan.isPopular, plan.displayOrder);
    });
    console.log('✅ Seeded subscription plans');
  }

  // Seed default rate limits
  const rateLimitsExist = db.prepare('SELECT COUNT(*) as count FROM rate_limits').get();
  if (rateLimitsExist.count === 0) {
    const insertRateLimit = db.prepare(`
      INSERT INTO rate_limits (id, name, type, targetId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const defaultLimits = [
      { id: 'global-default', name: 'Global Default', type: 'global', targetId: null, rpm: 60, rph: 500, rpd: 5000 },
      { id: 'free-tier', name: 'Free Tier Users', type: 'tier', targetId: 'free', rpm: 10, rph: 100, rpd: 500 },
      { id: 'starter-tier', name: 'Starter Plan Users', type: 'tier', targetId: 'starter', rpm: 30, rph: 300, rpd: 3000 },
      { id: 'standard-tier', name: 'Standard Plan Users', type: 'tier', targetId: 'standard', rpm: 60, rph: 600, rpd: 6000 },
      { id: 'professional-tier', name: 'Professional Plan Users', type: 'tier', targetId: 'professional', rpm: 120, rph: 1200, rpd: 12000 },
    ];
    
    defaultLimits.forEach(limit => {
      insertRateLimit.run(limit.id, limit.name, limit.type, limit.targetId, limit.rpm, limit.rph, limit.rpd, 1);
    });
    console.log('✅ Seeded default rate limits');
  }

  // Seed default feature flags
  const flagsExist = db.prepare('SELECT COUNT(*) as count FROM feature_flags').get();
  if (flagsExist.count === 0) {
    const insertFlag = db.prepare(`
      INSERT INTO feature_flags (id, name, enabled, description)
      VALUES (?, ?, ?, ?)
    `);
    
    const defaultFlags = [
      { id: 'flag-community', name: 'community_gallery', enabled: 1, description: 'Enable community gallery feature' },
      { id: 'flag-workspaces', name: 'team_workspaces', enabled: 1, description: 'Enable team workspace feature' },
      { id: 'flag-video', name: 'video_generation', enabled: 1, description: 'Enable video generation' },
      { id: 'flag-3d', name: '3d_generation', enabled: 0, description: 'Enable 3D model generation (coming soon)' },
      { id: 'flag-api-access', name: 'api_access', enabled: 0, description: 'Enable API access for users' },
      { id: 'flag-maintenance', name: 'maintenance_mode', enabled: 0, description: 'Put the platform in maintenance mode' },
    ];
    
    defaultFlags.forEach(flag => {
      insertFlag.run(flag.id, flag.name, flag.enabled, flag.description);
    });
    console.log('✅ Seeded default feature flags');
  }

  // Sync models
  syncModels();
};

function syncModels() {
  const insertModel = db.prepare(`
    INSERT OR REPLACE INTO models (id, name, provider, type, credits, baseCost, inputCost, outputCost, apiEndpoint, docUrl, options, capabilities, imageInput, maxInputImages, thumbnail, tags, displayOrder, category, providerName, textToImageEndpoint, imageToImageEndpoint, imageParamName, imageParamType, lastUpdated) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  Object.entries(FAL_MODELS).forEach(([type, models]) => {
    models.forEach((model, index) => {
      const provider = type === 'chat' ? 'OpenRouter' : 'Fal.ai';
      insertModel.run(
        model.id,
        model.name,
        provider,
        type,
        model.baseCost, // credits = baseCost (1:1 ratio)
        model.baseCost,
        model.inputCost || model.baseCost,
        model.outputCost || model.baseCost,
        model.apiEndpoint,
        model.docUrl || null,
        JSON.stringify(model.options || {}),
        JSON.stringify(model.capabilities || {}),
        model.imageInput || 'none',
        model.maxInputImages || 0,
        model.thumbnail || null,
        JSON.stringify(model.tags || []),
        model.displayOrder || (index + 1) * 10,
        model.category || (type === 'image' ? 'text-to-image' : type === 'video' ? 'text-to-video' : 'chat'),
        model.providerName || provider,
        model.textToImageEndpoint || null,
        model.imageToImageEndpoint || null,
        model.imageParamName || 'image_url',
        model.imageParamType || 'single'
      );
    });
  });
  
  console.log(`✅ Synced ${Object.values(FAL_MODELS).flat().length} models`);
}

seedDefaultData();
seedDefaultAiTools();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware
const userAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'user') return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') return res.status(401).json({ error: 'Invalid token' });
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Helpers - Check ENV first, then database (Admin Panel overrides)
const ENV_KEY_MAP = {
  falApiKey: 'FAL_KEY',
  openrouterApiKey: 'OPENROUTER_API_KEY',
  freeCredits: 'DEFAULT_FREE_CREDITS',
  creditPrice: 'CREDIT_PRICE',
  profitMargin: 'PROFIT_MARGIN',
};

const getSetting = (key) => {
  // First check database (Admin Panel settings take priority)
  const dbValue = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
  if (dbValue) return dbValue;
  
  // Fall back to environment variable
  const envKey = ENV_KEY_MAP[key];
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }
  
  return null;
};

// Get profit margin for a specific model type
const getProfitMargin = (modelType) => {
  // Check for type-specific margin first
  let typeMargin = 0;
  
  if (modelType === 'image') {
    typeMargin = parseFloat(getSetting('profitMarginImage')) || 0;
  } else if (modelType === 'video') {
    typeMargin = parseFloat(getSetting('profitMarginVideo')) || 0;
  } else if (modelType === 'chat') {
    typeMargin = parseFloat(getSetting('profitMarginChat')) || 0;
  }
  
  // If type-specific margin is set (> 0), use it
  if (typeMargin > 0) {
    return typeMargin;
  }
  
  // Otherwise fall back to universal margin
  return parseFloat(getSetting('profitMargin')) || 0;
};

// Check if API keys are configured
const checkApiKeys = () => {
  const falKey = getSetting('falApiKey');
  const openrouterKey = getSetting('openrouterApiKey');
  
  console.log('\n🔐 API Key Status:');
  console.log(`   - Fal.ai: ${falKey ? '✅ Configured' : '❌ Not set (set FAL_KEY env or in Admin Panel)'}`);
  console.log(`   - OpenRouter: ${openrouterKey ? '✅ Configured' : '❌ Not set (set OPENROUTER_API_KEY env or in Admin Panel)'}`);
};
const getModel = (modelId) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(modelId);
  if (model) {
    model.options = JSON.parse(model.options || '{}');
    model.capabilities = JSON.parse(model.capabilities || '{}');
    model.tags = JSON.parse(model.tags || '[]');
  }
  return model;
};

// Smart endpoint selection based on model category and whether images are provided
const getSmartEndpoint = (model, inputImages) => {
  const hasImages = inputImages && inputImages.length > 0;
  
  // If model has dual endpoints (text-to-image AND image-to-image)
  if (model.category === 'both') {
    if (hasImages && model.imageToImageEndpoint) {
      return model.imageToImageEndpoint;
    }
    if (model.textToImageEndpoint) {
      return model.textToImageEndpoint;
    }
  }
  
  // Default to apiEndpoint
  return model.apiEndpoint;
};

// Calculate base price (without margin/conversion) - used for API cost tracking
const calculateBasePrice = (model, selectedOptions) => {
  let multiplier = 1;
  const modelOptions = model.options;
  
  for (const [key, value] of Object.entries(selectedOptions || {})) {
    if (modelOptions[key]?.choices) {
      const choice = modelOptions[key].choices.find(c => c.value === String(value));
      if (choice?.priceMultiplier) multiplier *= choice.priceMultiplier;
    }
  }
  
  return Math.round(model.credits * multiplier * 10000) / 10000;
};

// Calculate user-facing price with profit margin and credit conversion
const calculatePrice = (model, selectedOptions) => {
  // Get base price (API cost in USD/credits)
  const basePrice = calculateBasePrice(model, selectedOptions);
  
  // Apply profit margin for this model type
  const margin = getProfitMargin(model.type);
  const priceWithMargin = basePrice * (1 + margin / 100);
  
  // Convert to user credits using creditPrice setting
  // creditPrice = USD per credit (e.g., 0.001 means 1000 credits = $1)
  const creditPrice = parseFloat(getSetting('creditPrice')) || 1;
  const userCredits = priceWithMargin / creditPrice;
  
  return Math.round(userCredits * 100) / 100; // Round to 2 decimal places for display
};

// ============ PROVIDER-BASED GENERATION ============
// Get a configured provider instance
const getConfiguredProvider = (providerId = 'fal') => {
  return getProvider(providerId, getSetting);
};

// Generate using the provider abstraction layer
// This is the new provider-agnostic generation function
async function generateWithProvider(model, prompt, options, inputImages, genId = null) {
  const providerId = model.provider || 'fal';
  const provider = getConfiguredProvider(providerId);
  
  if (!provider) {
    throw new Error(`Provider ${providerId} not available`);
  }
  
  // Check provider availability
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    throw new Error(`Provider ${providerId} is not configured or available`);
  }
  
  // Route to appropriate generation method
  if (model.type === 'image') {
    return await provider.generateImage(model, prompt, options, inputImages);
  } else if (model.type === 'video') {
    return await provider.generateVideo(model, prompt, options, inputImages, genId, db);
  } else {
    throw new Error(`Unsupported generation type: ${model.type}`);
  }
}

// Generate using provider router with automatic failover
// This tries multiple providers if the first one fails
async function generateWithFailover(model, type, params, genId = null, userId = null) {
  try {
    const result = await providerRouter.generate(
      model.id,
      type,
      params,
      getSetting,
      logError,
      { genId, userId, db }
    );
    return result;
  } catch (error) {
    console.error('[PROVIDER_ROUTER] All providers failed:', error.message);
    throw error;
  }
}

// Get provider health status for monitoring
function getProviderHealthStatus() {
  return providerRouter.getHealthStatus();
}

// ============ USER AUTH ============
// Helper: Create default workspace for user
function ensureDefaultWorkspace(userId, userName) {
  const existing = db.prepare('SELECT id FROM workspaces WHERE ownerId = ? AND isDefault = 1').get(userId);
  if (existing) return existing;
  
  const workspaceId = uuidv4();
  const workspaceName = `${userName}'s Workspace`;
  
  db.prepare(`
    INSERT INTO workspaces (id, name, ownerId, isDefault) VALUES (?, ?, ?, 1)
  `).run(workspaceId, workspaceName, userId);
  
  db.prepare(`
    INSERT INTO workspace_members (id, workspaceId, userId, role) VALUES (?, ?, ?, 'owner')
  `).run(uuidv4(), workspaceId, userId);
  
  return { id: workspaceId, name: workspaceName };
}

// Public endpoint to get Google Client ID for OAuth
app.get('/api/settings/google-client-id', (req, res) => {
  const clientId = db.prepare('SELECT value FROM settings WHERE key = ?').get('googleClientId')?.value;
  res.json({ clientId: clientId || null });
});

// Public endpoint to get Razorpay Key ID
app.get('/api/settings/razorpay-key', (req, res) => {
  const keyId = db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeyId')?.value;
  res.json({ keyId: keyId || null });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const freeCredits = parseFloat(getSetting('freeCredits')) || 10;
    const userId = uuidv4();
    const userName = name || email.split('@')[0];
    
    db.prepare('INSERT INTO users (id, email, password, name, credits) VALUES (?, ?, ?, ?, ?)').run(
      userId, email, hashedPassword, userName, freeCredits
    );
    
    // Create default workspace
    const defaultWorkspace = ensureDefaultWorkspace(userId, userName);
    
    const token = jwt.sign({ id: userId, email, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { id: userId, email, name: userName, credits: freeCredits },
      defaultWorkspace
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Ensure default workspace exists for existing users
    const defaultWorkspace = ensureDefaultWorkspace(user.id, user.name);
    
    const token = jwt.sign({ id: user.id, email: user.email, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
      defaultWorkspace
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', userAuthMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, name, credits, createdAt FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Ensure default workspace exists and get workspaces
  ensureDefaultWorkspace(user.id, user.name);
  const workspaces = db.prepare(`
    SELECT w.*, wm.role as userRole
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspaceId AND wm.userId = ?
    ORDER BY w.isDefault DESC, w.updatedAt DESC
  `).all(user.id);
  workspaces.forEach(w => w.privacySettings = JSON.parse(w.privacySettings || '{}'));
  
  user.workspaces = workspaces;
  user.defaultWorkspace = workspaces.find(w => w.isDefault) || workspaces[0];
  res.json(user);
});

// Google OAuth
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }
    
    // Get Google Client ID from settings
    const googleClientId = db.prepare('SELECT value FROM settings WHERE key = ?').get('googleClientId')?.value;
    
    if (!googleClientId) {
      return res.status(500).json({ error: 'Google OAuth is not configured' });
    }
    
    // Verify the Google token
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user exists with this googleId
    let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId);
    
    if (!user) {
      // Check if user exists with this email (might have registered with email/password)
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      if (user) {
        // Link Google account to existing user
        db.prepare('UPDATE users SET googleId = ?, authProvider = ?, avatarUrl = COALESCE(avatarUrl, ?) WHERE id = ?')
          .run(googleId, 'google', picture, user.id);
        user.googleId = googleId;
        user.authProvider = 'google';
      } else {
        // Create new user with Google account
        const userId = uuidv4();
        const freeCredits = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('freeCredits')?.value || '10');
        
        db.prepare(`
          INSERT INTO users (id, email, name, googleId, authProvider, avatarUrl, credits, nickname)
          VALUES (?, ?, ?, ?, 'google', ?, ?, ?)
        `).run(userId, email, name, googleId, picture, freeCredits, generateNickname());
        
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        // Log the sign-up
        logAudit(null, 'user_registered', 'user', userId, { method: 'google', email });
      }
    }
    
    // Update last login
    db.prepare('UPDATE users SET lastLoginAt = datetime("now") WHERE id = ?').run(user.id);
    
    // Ensure default workspace exists
    const defaultWorkspace = ensureDefaultWorkspace(user.id, user.name);
    
    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        avatarUrl: user.avatarUrl
      },
      defaultWorkspace
    });
  } catch (err) {
    console.error('[GOOGLE_AUTH] Error:', err.message);
    logError('auth', null, null, '/api/auth/google', 'GOOGLE_AUTH_ERROR', err.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ============ MODELS ============
app.get('/api/models', (req, res) => {
  const models = db.prepare(`
    SELECT id, name, provider, type, credits, baseCost, options, imageInput, maxInputImages, 
           thumbnail, logoUrl, heading, subheading, tags, displayOrder, category, 
           providerName, docUrl, imageParamName, imageParamType, capabilities
    FROM models WHERE enabled = 1 ORDER BY type, displayOrder, credits
  `).all();
  models.forEach(m => {
    m.options = JSON.parse(m.options || '{}');
    m.tags = JSON.parse(m.tags || '[]');
    m.capabilities = JSON.parse(m.capabilities || '{}');
  });
  res.json(models);
});

// Public pricing settings endpoint (no auth required, excludes sensitive data)
app.get('/api/pricing-settings', (req, res) => {
  res.json({
    profitMargin: parseFloat(getSetting('profitMargin')) || 0,
    profitMarginImage: parseFloat(getSetting('profitMarginImage')) || 0,
    profitMarginVideo: parseFloat(getSetting('profitMarginVideo')) || 0,
    profitMarginChat: parseFloat(getSetting('profitMarginChat')) || 0,
    creditPrice: parseFloat(getSetting('creditPrice')) || 1,
    freeCredits: parseFloat(getSetting('freeCredits')) || 10,
  });
});

app.post('/api/models/:id/price', (req, res) => {
  const model = getModel(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  
  const basePrice = calculateBasePrice(model, req.body.options || {});
  const userCredits = calculatePrice(model, req.body.options || {});
  const margin = getProfitMargin(model.type);
  const creditPrice = parseFloat(getSetting('creditPrice')) || 1;
  
  res.json({ 
    price: userCredits,           // User-facing credits (with margin + conversion)
    basePrice: basePrice,         // Base API cost in credits
    baseCost: model.baseCost,     // Raw USD cost from API
    profitMargin: margin,
    creditPrice: creditPrice,
    // Calculation breakdown
    breakdown: {
      apiCost: basePrice,
      marginPercent: margin,
      priceWithMargin: basePrice * (1 + margin / 100),
      creditsPerDollar: 1 / creditPrice,
      finalCredits: userCredits
    }
  });
});

// ============ GENERATIONS ============
app.post('/api/generate', userAuthMiddleware, async (req, res) => {
  try {
    const { type, model: modelId, prompt, options, inputImages, workspaceId } = req.body;
    
    if (!type || !modelId || !prompt) return res.status(400).json({ error: 'Missing required fields' });
    
    const model = getModel(modelId);
    if (!model) return res.status(400).json({ error: 'Invalid model' });
    
    // Validate image input requirements
    if (model.imageInput === 'required' && (!inputImages || inputImages.length === 0)) {
      return res.status(400).json({ error: 'This model requires a reference image' });
    }
    if (model.maxInputImages && inputImages?.length > model.maxInputImages) {
      return res.status(400).json({ error: `This model supports max ${model.maxInputImages} reference image(s)` });
    }
    
    const price = calculatePrice(model, options);
    
    // Reserve credits (not deducted yet, moved to reserved pool)
    const reservation = reserveCredits(req.user.id, price, workspaceId);
    if (!reservation.success) {
      return res.status(402).json({ 
        error: reservation.error, 
        required: price, 
        available: reservation.available || reservation.personalCredits || 0,
        workspaceCredits: reservation.workspaceCredits,
        allocatedCredits: reservation.allocatedCredits
      });
    }
    
    // Determine number of images to generate
    const numImages = type === 'image' ? (parseInt(options?.num_images) || 1) : 1;
    const pricePerImage = price / numImages;
    
    // Get model's max wait time
    const maxWaitTime = model.maxWaitTime || (type === 'video' ? 600 : 120);
    
    // Create generation records for each image
    const generationIds = [];
    for (let i = 0; i < numImages; i++) {
      const genId = uuidv4();
      const visibleId = genId.slice(0, 8);
      
      db.prepare(`
        INSERT INTO generations (id, visibleId, userId, type, model, modelName, prompt, options, credits, status, workspaceId, queuedAt, maxWaitTime) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
      `).run(genId, visibleId, req.user.id, type, modelId, model.name, prompt, JSON.stringify({ 
        ...options, 
        inputImages, 
        imageIndex: i,
        creditSource: reservation.source 
      }), pricePerImage, workspaceId || null, maxWaitTime);
      
      generationIds.push({ id: genId, visibleId });
    }
    
    // Return all generation IDs
    res.json({ 
      generations: generationIds,
      status: 'pending', 
      credits: price, 
      remainingCredits: reservation.availableCredits,
      creditSource: reservation.source,
      // For backwards compatibility
      id: generationIds[0].id,
      visibleId: generationIds[0].visibleId,
      userCredits: reservation.source.includes('personal') ? reservation.availableCredits : undefined
    });
    
    // Process in background - pass all generation IDs
    processGenerationBatch(generationIds.map(g => g.id), model, prompt, options, inputImages, numImages);
  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

app.get('/api/generations/:id', userAuthMiddleware, (req, res) => {
  const gen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!gen) return res.status(404).json({ error: 'Not found' });
  gen.options = JSON.parse(gen.options || '{}');
  res.json(gen);
});

app.get('/api/generations', userAuthMiddleware, (req, res) => {
  const { type, limit = 50, offset = 0, workspaceId } = req.query;
  
  let query = 'SELECT * FROM generations WHERE userId = ?';
  const params = [req.user.id];
  
  // Filter by workspace
  if (workspaceId) {
    // Check if this is the user's default workspace using workspace_members join
    // This works for both owners and members
    const workspace = db.prepare(`
      SELECT w.isDefault FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspaceId
      WHERE w.id = ? AND wm.userId = ?
    `).get(workspaceId, req.user.id);
    
    if (workspace && workspace.isDefault) {
      // For default workspace, include both: workspaceId matches OR workspaceId is NULL (legacy generations)
      query += " AND (workspaceId = ? OR workspaceId IS NULL OR workspaceId = '')";
      params.push(workspaceId);
    } else {
      // For non-default workspaces, only show generations with matching workspaceId
      query += ' AND workspaceId = ?';
      params.push(workspaceId);
    }
  } else {
    // No workspaceId provided - show only generations without workspace (legacy)
    query += " AND (workspaceId IS NULL OR workspaceId = '')";
  }
  
  if (type) { query += ' AND type = ?'; params.push(type); }
  query += ' ORDER BY startedAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const generations = db.prepare(query).all(...params);
  generations.forEach(g => g.options = JSON.parse(g.options || '{}'));
  
  // Also filter counts by workspace
  let countQuery = 'SELECT type, COUNT(*) as count FROM generations WHERE userId = ?';
  const countParams = [req.user.id];
  if (workspaceId) {
    // Use same workspace_members join for count query
    const workspace = db.prepare(`
      SELECT w.isDefault FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspaceId
      WHERE w.id = ? AND wm.userId = ?
    `).get(workspaceId, req.user.id);
    if (workspace && workspace.isDefault) {
      countQuery += " AND (workspaceId = ? OR workspaceId IS NULL OR workspaceId = '')";
      countParams.push(workspaceId);
    } else {
      countQuery += ' AND workspaceId = ?';
      countParams.push(workspaceId);
    }
  } else {
    countQuery += " AND (workspaceId IS NULL OR workspaceId = '')";
  }
  countQuery += ' GROUP BY type';
  
  const counts = db.prepare(countQuery).all(...countParams);
  res.json({ generations, counts: Object.fromEntries(counts.map(c => [c.type, c.count])) });
});

app.delete('/api/generations/:id', userAuthMiddleware, (req, res) => {
  const gen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!gen) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM generations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Cancel a pending generation
app.post('/api/generations/:id/cancel', userAuthMiddleware, (req, res) => {
  const gen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ? AND status = ?')
    .get(req.params.id, req.user.id, 'pending');
  
  if (!gen) {
    return res.status(404).json({ error: 'Generation not found or cannot be cancelled' });
  }
  
  // Mark as cancelled
  db.prepare("UPDATE generations SET status = 'cancelled', cancelledAt = datetime('now'), error = 'Cancelled by user', errorType = 'cancelled', completedAt = datetime('now') WHERE id = ?")
    .run(req.params.id);
  
  // Release reserved credits
  const opts = JSON.parse(gen.options || '{}');
  releaseCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
  
  console.log(`[CANCEL] Generation ${req.params.id} cancelled, ${gen.credits} credits released`);
  
  res.json({ success: true, creditsRefunded: gen.credits });
});

// ============ UPSCALING ============
// Upscale an existing generation (image or video)
app.post('/api/upscale', userAuthMiddleware, async (req, res) => {
  try {
    const { generationId, modelId, options, workspaceId } = req.body;
    
    // Get the source generation
    const sourceGen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?')
      .get(generationId, req.user.id);
    
    if (!sourceGen) {
      return res.status(404).json({ error: 'Source generation not found' });
    }
    
    if (sourceGen.status !== 'completed' || !sourceGen.result) {
      return res.status(400).json({ error: 'Source generation is not completed or has no result' });
    }
    
    // Determine upscale model based on source type
    let upscaleModel;
    if (modelId) {
      upscaleModel = getModel(modelId);
    } else {
      // Auto-select based on source type
      upscaleModel = sourceGen.type === 'video' 
        ? getModel('fal-crystal-video-upscaler')
        : getModel('fal-crystal-upscaler');
    }
    
    if (!upscaleModel) {
      return res.status(400).json({ error: 'Invalid upscale model' });
    }
    
    const price = calculatePrice(upscaleModel, options || {});
    
    // Reserve credits
    const reservation = reserveCredits(req.user.id, price, workspaceId);
    if (!reservation.success) {
      return res.status(402).json({ 
        error: reservation.error, 
        required: price, 
        available: reservation.available || 0
      });
    }
    
    // Create upscale generation record
    const genId = uuidv4();
    const visibleId = genId.slice(0, 8);
    
    db.prepare(`
      INSERT INTO generations (id, visibleId, userId, type, model, modelName, prompt, options, credits, status, workspaceId, queuedAt, maxWaitTime) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
    `).run(
      genId, 
      visibleId, 
      req.user.id, 
      'upscale', 
      upscaleModel.id, 
      upscaleModel.name,
      `Upscale: ${sourceGen.modelName || sourceGen.model}`,
      JSON.stringify({
        ...options,
        sourceGenerationId: generationId,
        sourceUrl: sourceGen.result,
        sourceType: sourceGen.type,
        creditSource: reservation.source
      }),
      price,
      workspaceId || null,
      upscaleModel.maxWaitTime || 300
    );
    
    res.json({ 
      id: genId,
      visibleId,
      status: 'pending', 
      credits: price,
      remainingCredits: reservation.availableCredits,
      creditSource: reservation.source
    });
    
    // Process in background
    processUpscale(genId, upscaleModel, sourceGen.result, sourceGen.type, options);
  } catch (err) {
    console.error('Upscale error:', err);
    res.status(500).json({ error: 'Upscale failed' });
  }
});

// Get upscale models
app.get('/api/upscale/models', (req, res) => {
  const { type } = req.query; // 'image' or 'video'
  
  const models = db.prepare(`
    SELECT id, name, provider, type, credits, options, providerName, docUrl, tags
    FROM models WHERE enabled = 1 AND category = 'upscale'
    ORDER BY displayOrder
  `).all();
  
  models.forEach(m => {
    m.options = JSON.parse(m.options || '{}');
    m.tags = JSON.parse(m.tags || '[]');
  });
  
  // Filter by type if specified
  if (type === 'image') {
    res.json(models.filter(m => m.type === 'image'));
  } else if (type === 'video') {
    res.json(models.filter(m => m.type === 'video'));
  } else {
    res.json(models);
  }
});

// Calculate upscale cost
app.post('/api/upscale/calculate', userAuthMiddleware, (req, res) => {
  const { generationId, modelId, options } = req.body;
  
  // Get source generation to determine dimensions
  const sourceGen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?')
    .get(generationId, req.user.id);
  
  if (!sourceGen) {
    return res.status(404).json({ error: 'Source generation not found' });
  }
  
  const model = getModel(modelId);
  if (!model) {
    return res.status(400).json({ error: 'Invalid model' });
  }
  
  const price = calculatePrice(model, options || {});
  
  res.json({ 
    price,
    basePrice: model.credits,
    model: model.name,
    sourceType: sourceGen.type
  });
});

// Bulk delete generations
app.post('/api/generations/bulk-delete', userAuthMiddleware, (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }
  
  // Validate all IDs belong to the user
  const placeholders = ids.map(() => '?').join(',');
  const validGens = db.prepare(`SELECT id FROM generations WHERE id IN (${placeholders}) AND userId = ?`)
    .all(...ids, req.user.id);
  
  const validIds = validGens.map(g => g.id);
  
  if (validIds.length === 0) {
    return res.status(404).json({ error: 'No valid generations found' });
  }
  
  // Delete valid generations
  const deletePlaceholders = validIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM generations WHERE id IN (${deletePlaceholders})`).run(...validIds);
  
  res.json({ success: true, deleted: validIds.length });
});

// ============ CHAT API ============

// Get chat models with capabilities
app.get('/api/chat/models', (req, res) => {
  const models = db.prepare('SELECT * FROM models WHERE type = ? AND enabled = 1').all('chat');
  models.forEach(m => {
    m.options = JSON.parse(m.options || '{}');
    m.capabilities = JSON.parse(m.capabilities || '{}');
  });
  res.json(models);
});

// Estimate chat cost
app.post('/api/chat/estimate', (req, res) => {
  const { modelId, inputText, imageCount, contextTokens } = req.body;
  const model = getModel(modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  
  const estimate = estimateChatCost(model, inputText || '', imageCount || 0, contextTokens || 0);
  res.json(estimate);
});

// Create conversation
app.post('/api/chat/conversations', userAuthMiddleware, (req, res) => {
  const { modelId, title } = req.body;
  const model = modelId ? getModel(modelId) : null;
  
  const id = uuidv4();
  db.prepare(`
    INSERT INTO conversations (id, userId, title, modelId, modelName) 
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, title || 'New Chat', modelId || null, model?.name || null);
  
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.json(conversation);
});

// List conversations
app.get('/api/chat/conversations', userAuthMiddleware, (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM messages WHERE conversationId = c.id) as messageCount
    FROM conversations c 
    WHERE c.userId = ? 
    ORDER BY c.updatedAt DESC
  `).all(req.user.id);
  res.json(conversations);
});

// Get conversation with messages
app.get('/api/chat/conversations/:id', userAuthMiddleware, (req, res) => {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  const messages = db.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC')
    .all(req.params.id);
  messages.forEach(m => m.imageUrls = JSON.parse(m.imageUrls || '[]'));
  
  res.json({ ...conversation, messages });
});

// Update conversation
app.patch('/api/chat/conversations/:id', userAuthMiddleware, (req, res) => {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  const { title, modelId } = req.body;
  const model = modelId ? getModel(modelId) : null;
  
  if (title) {
    db.prepare("UPDATE conversations SET title = ?, updatedAt = datetime('now') WHERE id = ?")
      .run(title, req.params.id);
  }
  if (modelId) {
    db.prepare("UPDATE conversations SET modelId = ?, modelName = ?, updatedAt = datetime('now') WHERE id = ?")
      .run(modelId, model?.name || null, req.params.id);
  }
  
  res.json({ success: true });
});

// Delete conversation
app.delete('/api/chat/conversations/:id', userAuthMiddleware, (req, res) => {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  db.prepare('DELETE FROM messages WHERE conversationId = ?').run(req.params.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Send message with streaming response
app.post('/api/chat/conversations/:id/messages', userAuthMiddleware, async (req, res) => {
  const { content, imageUrls, webSearch } = req.body;
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  const modelId = conversation.modelId || 'openai/gpt-4o-mini';
  const model = getModel(modelId);
  if (!model) return res.status(400).json({ error: 'Model not found' });
  
  const openrouterKey = getSetting('openrouterApiKey');
  if (!openrouterKey) {
    return res.status(400).json({ error: 'OpenRouter API key not configured' });
  }
  
  // Get conversation history
  const historyMessages = db.prepare('SELECT role, content, imageUrls FROM messages WHERE conversationId = ? ORDER BY createdAt ASC')
    .all(req.params.id);
  
  // Estimate input cost
  const contextTokens = historyMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  const inputTokensEstimate = Math.ceil(content.length / 4) + (imageUrls?.length || 0) * 85 + contextTokens;
  
  // Check if user has enough credits (estimate max cost)
  const estimatedMaxCost = (inputTokensEstimate * model.inputCost / 1000) + (model.capabilities?.maxOutput || 4096) * model.outputCost / 1000;
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
  
  if (user.credits < estimatedMaxCost * 0.1) { // At least 10% of max cost
    return res.status(402).json({ error: 'Insufficient credits', required: estimatedMaxCost * 0.1, available: user.credits });
  }
  
  // Save user message
  const userMessageId = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, imageUrls, inputTokens) 
    VALUES (?, ?, 'user', ?, ?, ?)
  `).run(userMessageId, req.params.id, content, JSON.stringify(imageUrls || []), inputTokensEstimate);
  
  // Build messages for API
  const apiMessages = historyMessages.map(m => {
    const images = JSON.parse(m.imageUrls || '[]');
    if (images.length > 0 && model.capabilities?.vision) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          ...images.map(url => ({ type: 'image_url', image_url: { url } }))
        ]
      };
    }
    return { role: m.role, content: m.content };
  });
  
  // Add current message
  if ((imageUrls?.length || 0) > 0 && model.capabilities?.vision) {
    apiMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: content },
        ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
      ]
    });
  } else {
    apiMessages.push({ role: 'user', content });
  }
  
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  try {
    const modelEndpoint = webSearch && model.capabilities?.webSearch 
      ? model.apiEndpoint + ':online' 
      : model.apiEndpoint;
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: modelEndpoint,
      messages: apiMessages,
      stream: true
    }, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'OmniHub Chat',
      },
      responseType: 'stream'
    });
    
    let fullContent = '';
    let outputTokens = 0;
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim().startsWith('data:'));
      
      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') {
          continue;
        }
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            outputTokens++;
            res.write(`data: ${JSON.stringify({ type: 'content', content: delta })}\n\n`);
          }
          
          // Check for usage info
          if (parsed.usage) {
            outputTokens = parsed.usage.completion_tokens || outputTokens;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });
    
    response.data.on('end', async () => {
      // Calculate actual cost
      const actualInputTokens = inputTokensEstimate;
      const actualOutputTokens = outputTokens || Math.ceil(fullContent.length / 4);
      const actualCost = (actualInputTokens * model.inputCost / 1000) + (actualOutputTokens * model.outputCost / 1000);
      
      // Save assistant message
      const assistantMessageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, conversationId, role, content, outputTokens, credits, webSearchUsed) 
        VALUES (?, ?, 'assistant', ?, ?, ?, ?)
      `).run(assistantMessageId, req.params.id, fullContent, actualOutputTokens, actualCost, webSearch ? 1 : 0);
      
      // Update conversation
      db.prepare(`
        UPDATE conversations SET 
          totalInputTokens = totalInputTokens + ?,
          totalOutputTokens = totalOutputTokens + ?,
          totalCredits = totalCredits + ?,
          updatedAt = datetime('now')
        WHERE id = ?
      `).run(actualInputTokens, actualOutputTokens, actualCost, req.params.id);
      
      // Auto-generate title if first message
      if (historyMessages.length === 0) {
        const shortTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(shortTitle, req.params.id);
      }
      
      // Deduct credits
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(actualCost, req.user.id);
      const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
      
      // Send completion event
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        messageId: assistantMessageId,
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        credits: actualCost,
        userCredits: updatedUser.credits
      })}\n\n`);
      
      res.end();
    });
    
    response.data.on('error', (error) => {
      console.error('[CHAT] Stream error:', error);
      logError(
        'chat',
        req.user?.id,
        null,
        'openrouter/chat',
        'stream_error',
        error.message,
        error.stack,
        { modelId: req.body.modelId, conversationId: req.params.id }
      );
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    });
    
  } catch (error) {
    console.error('[CHAT] Error:', error.message);
    logError(
      'chat',
      req.user?.id,
      null,
      'openrouter/chat',
      error.response?.status === 429 ? 'rate_limit' : 'api_error',
      error.message,
      error.stack,
      { 
        modelId: req.body.modelId, 
        conversationId: req.params.id,
        responseStatus: error.response?.status,
        responseData: JSON.stringify(error.response?.data || {}).substring(0, 500)
      }
    );
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Helper function to deduct credits with workspace support
// Returns: { success, source, remainingCredits, error }
function deductCredits(userId, amount, workspaceId) {
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
  
  // If no workspace or default personal workspace, use personal credits
  if (!workspaceId) {
    if (user.credits < amount) {
      return { success: false, error: 'Insufficient credits', available: user.credits, required: amount };
    }
    db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, userId);
    return { success: true, source: 'personal', remainingCredits: user.credits - amount };
  }
  
  const workspace = getWorkspace(workspaceId);
  if (!workspace) {
    return { success: false, error: 'Workspace not found' };
  }
  
  // Check if user is member
  const member = db.prepare('SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(workspaceId, userId);
  if (!member) {
    return { success: false, error: 'Not a member of this workspace' };
  }
  
  // For default personal workspace, use personal credits
  if (workspace.isDefault && workspace.ownerId === userId) {
    if (user.credits < amount) {
      return { success: false, error: 'Insufficient credits', available: user.credits, required: amount };
    }
    db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, userId);
    return { success: true, source: 'personal', remainingCredits: user.credits - amount, workspaceId };
  }
  
  // Shared mode: use workspace credits first, fallback to personal
  if (workspace.creditMode === 'shared') {
    if (workspace.credits >= amount) {
      db.prepare('UPDATE workspaces SET credits = credits - ? WHERE id = ?').run(amount, workspaceId);
      return { success: true, source: 'workspace', remainingCredits: workspace.credits - amount, workspaceId };
    }
    // Fallback to personal credits
    if (user.credits >= amount) {
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, userId);
      return { success: true, source: 'personal_fallback', remainingCredits: user.credits - amount, workspaceId };
    }
    return { 
      success: false, 
      error: 'Insufficient credits', 
      workspaceCredits: workspace.credits,
      personalCredits: user.credits,
      required: amount 
    };
  }
  
  // Individual mode: use member's allocated credits first, fallback to personal
  if (workspace.creditMode === 'individual') {
    if (member.allocatedCredits >= amount) {
      db.prepare('UPDATE workspace_members SET allocatedCredits = allocatedCredits - ? WHERE workspaceId = ? AND userId = ?')
        .run(amount, workspaceId, userId);
      return { success: true, source: 'allocated', remainingCredits: member.allocatedCredits - amount, workspaceId };
    }
    // Fallback to personal credits
    if (user.credits >= amount) {
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, userId);
      return { success: true, source: 'personal_fallback', remainingCredits: user.credits - amount, workspaceId };
    }
    return { 
      success: false, 
      error: 'Insufficient credits', 
      allocatedCredits: member.allocatedCredits,
      personalCredits: user.credits,
      required: amount 
    };
  }
  
  return { success: false, error: 'Invalid credit mode' };
}

// Helper function to refund credits (legacy - for backward compatibility)
function refundCredits(userId, amount, workspaceId, source) {
  if (source === 'personal' || source === 'personal_fallback') {
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(amount, userId);
  } else if (source === 'workspace') {
    db.prepare('UPDATE workspaces SET credits = credits + ? WHERE id = ?').run(amount, workspaceId);
  } else if (source === 'allocated') {
    db.prepare('UPDATE workspace_members SET allocatedCredits = allocatedCredits + ? WHERE workspaceId = ? AND userId = ?')
      .run(amount, workspaceId, userId);
  }
}

// ============ RESERVE/COMMIT/RELEASE CREDITS SYSTEM ============
// Reserve credits - moves from available to reserved pool
function reserveCredits(userId, amount, workspaceId) {
  const user = db.prepare('SELECT credits, reservedCredits FROM users WHERE id = ?').get(userId);
  if (!user) return { success: false, error: 'User not found' };
  
  // If no workspace, use personal credits
  if (!workspaceId) {
    if (user.credits < amount) {
      return { success: false, error: 'Insufficient credits', available: user.credits, required: amount };
    }
    db.prepare('UPDATE users SET credits = credits - ?, reservedCredits = reservedCredits + ? WHERE id = ?')
      .run(amount, amount, userId);
    return { success: true, source: 'personal', reservedAmount: amount, availableCredits: user.credits - amount };
  }
  
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return { success: false, error: 'Workspace not found' };
  
  const member = db.prepare('SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(workspaceId, userId);
  if (!member) return { success: false, error: 'Not a member of this workspace' };
  
  // For default personal workspace, use personal credits
  if (workspace.isDefault && workspace.ownerId === userId) {
    if (user.credits < amount) {
      return { success: false, error: 'Insufficient credits', available: user.credits, required: amount };
    }
    db.prepare('UPDATE users SET credits = credits - ?, reservedCredits = reservedCredits + ? WHERE id = ?')
      .run(amount, amount, userId);
    return { success: true, source: 'personal', reservedAmount: amount, availableCredits: user.credits - amount, workspaceId };
  }
  
  // Shared mode: use workspace credits first
  if (workspace.creditMode === 'shared') {
    if (workspace.credits >= amount) {
      db.prepare('UPDATE workspaces SET credits = credits - ?, reservedCredits = reservedCredits + ? WHERE id = ?')
        .run(amount, amount, workspaceId);
      return { success: true, source: 'workspace', reservedAmount: amount, availableCredits: workspace.credits - amount, workspaceId };
    }
    // Fallback to personal
    if (user.credits >= amount) {
      db.prepare('UPDATE users SET credits = credits - ?, reservedCredits = reservedCredits + ? WHERE id = ?')
        .run(amount, amount, userId);
      return { success: true, source: 'personal_fallback', reservedAmount: amount, availableCredits: user.credits - amount, workspaceId };
    }
    return { success: false, error: 'Insufficient credits', workspaceCredits: workspace.credits, personalCredits: user.credits, required: amount };
  }
  
  // Individual mode: use allocated credits first
  if (workspace.creditMode === 'individual') {
    if (member.allocatedCredits >= amount) {
      db.prepare('UPDATE workspace_members SET allocatedCredits = allocatedCredits - ?, reservedAllocated = reservedAllocated + ? WHERE workspaceId = ? AND userId = ?')
        .run(amount, amount, workspaceId, userId);
      return { success: true, source: 'allocated', reservedAmount: amount, availableCredits: member.allocatedCredits - amount, workspaceId };
    }
    // Fallback to personal
    if (user.credits >= amount) {
      db.prepare('UPDATE users SET credits = credits - ?, reservedCredits = reservedCredits + ? WHERE id = ?')
        .run(amount, amount, userId);
      return { success: true, source: 'personal_fallback', reservedAmount: amount, availableCredits: user.credits - amount, workspaceId };
    }
    return { success: false, error: 'Insufficient credits', allocatedCredits: member.allocatedCredits, personalCredits: user.credits, required: amount };
  }
  
  return { success: false, error: 'Invalid credit mode' };
}

// Commit credits - removes from reserved pool (credits already deducted, just clear reservation)
function commitCredits(userId, amount, workspaceId, source) {
  if (source === 'personal' || source === 'personal_fallback') {
    db.prepare('UPDATE users SET reservedCredits = MAX(0, reservedCredits - ?) WHERE id = ?')
      .run(amount, userId);
  } else if (source === 'workspace') {
    db.prepare('UPDATE workspaces SET reservedCredits = MAX(0, reservedCredits - ?) WHERE id = ?')
      .run(amount, workspaceId);
  } else if (source === 'allocated') {
    db.prepare('UPDATE workspace_members SET reservedAllocated = MAX(0, reservedAllocated - ?) WHERE workspaceId = ? AND userId = ?')
      .run(amount, workspaceId, userId);
  }
}

// Release credits - refunds from reserved pool back to available
function releaseCredits(userId, amount, workspaceId, source) {
  if (source === 'personal' || source === 'personal_fallback') {
    db.prepare('UPDATE users SET credits = credits + ?, reservedCredits = MAX(0, reservedCredits - ?) WHERE id = ?')
      .run(amount, amount, userId);
  } else if (source === 'workspace') {
    db.prepare('UPDATE workspaces SET credits = credits + ?, reservedCredits = MAX(0, reservedCredits - ?) WHERE id = ?')
      .run(amount, amount, workspaceId);
  } else if (source === 'allocated') {
    db.prepare('UPDATE workspace_members SET allocatedCredits = allocatedCredits + ?, reservedAllocated = MAX(0, reservedAllocated - ?) WHERE workspaceId = ? AND userId = ?')
      .run(amount, amount, workspaceId, userId);
  }
}

// Generate optimized thumbnail URL from full image/video URL
// Fal.ai CDN supports resize params for images
function getThumbnailUrl(url, width = 300, quality = 75) {
  if (!url) return null;
  
  // Fal.ai images support CDN resize params
  if (url.includes('fal.media') || url.includes('fal.run') || url.includes('fal-cdn')) {
    // Add resize params - Fal.ai CDN supports these
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }
  
  // For video files, we can't easily generate thumbnails server-side
  // Return null and let frontend handle video thumbnails with poster or first frame
  if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
    return null;
  }
  
  // For other image URLs (like picsum), return as-is
  return url;
}

// Categorize errors for user-friendly display
function categorizeError(err) {
  const message = err.message?.toLowerCase() || '';
  const status = err.response?.status;
  const data = err.response?.data;
  
  // Content policy violation
  if (status === 400 || message.includes('content') || message.includes('moderation') || 
      message.includes('policy') || message.includes('nsfw') || message.includes('safety')) {
    return { 
      type: 'content_violation', 
      message: 'Content policy violation - your prompt was flagged', 
      refundable: true,
      userMessage: 'This prompt violates content policies. Credits have been refunded.'
    };
  }
  
  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return { 
      type: 'timeout', 
      message: 'Generation timed out', 
      refundable: true,
      userMessage: 'Generation took too long and was cancelled. Credits have been refunded.'
    };
  }
  
  // Cancelled by user
  if (message.includes('cancelled') || message.includes('canceled')) {
    return { 
      type: 'cancelled', 
      message: 'Cancelled by user', 
      refundable: true,
      userMessage: 'Generation was cancelled. Credits have been refunded.'
    };
  }
  
  // Rate limit
  if (status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return { 
      type: 'rate_limit', 
      message: 'Rate limit exceeded', 
      refundable: true,
      userMessage: 'Too many requests. Please try again in a moment. Credits have been refunded.'
    };
  }
  
  // API error
  if (status >= 500 || message.includes('server error') || message.includes('internal')) {
    return { 
      type: 'api_error', 
      message: 'API service error', 
      refundable: true,
      userMessage: 'The AI service is temporarily unavailable. Credits have been refunded.'
    };
  }
  
  // Default - unknown error
  return { 
    type: 'unknown', 
    message: err.message || 'Unknown error', 
    refundable: true,
    userMessage: 'An error occurred. Credits have been refunded.'
  };
}

// Helper function to estimate chat cost
function estimateChatCost(model, inputText, imageCount, contextTokens) {
  const textTokens = Math.ceil(inputText.length / 4);
  const imageTokens = imageCount * 85;
  const totalInputTokens = textTokens + imageTokens + contextTokens;
  
  const minOutput = 100;
  const maxOutput = model.capabilities?.maxOutput || 4096;
  
  const minCost = (totalInputTokens * model.inputCost / 1000) + (minOutput * model.outputCost / 1000);
  const maxCost = (totalInputTokens * model.inputCost / 1000) + (maxOutput * model.outputCost / 1000);
  
  return { 
    minCost: Math.round(minCost * 10000) / 10000, 
    maxCost: Math.round(maxCost * 10000) / 10000, 
    estimatedInputTokens: totalInputTokens,
    contextTokens,
    textTokens,
    imageTokens
  };
}

// ============ WORKSPACE API ============

// Helper: Get workspace with parsed settings
const getWorkspace = (workspaceId) => {
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
  if (workspace) {
    workspace.privacySettings = JSON.parse(workspace.privacySettings || '{}');
  }
  return workspace;
};

// Helper: Get user's role in workspace
const getUserWorkspaceRole = (workspaceId, userId) => {
  const member = db.prepare('SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(workspaceId, userId);
  return member?.role || null;
};

// Helper: Check if user can perform action in workspace
const canPerformAction = (workspace, userId, action) => {
  if (workspace.ownerId === userId) return true;
  
  const role = getUserWorkspaceRole(workspace.id, userId);
  if (!role) return false;
  
  const settings = workspace.privacySettings || {};
  
  switch (action) {
    case 'admin':
      return role === 'admin';
    case 'invite':
      if (settings.whoCanInvite === 'all_members') return true;
      if (settings.whoCanInvite === 'admins') return role === 'admin';
      return false;
    case 'allocate_credits':
      if (settings.whoCanAllocateCredits === 'admins') return role === 'admin';
      return false;
    case 'promote':
      if (settings.whoCanBeAdmin === 'admins_can_promote') return role === 'admin';
      return false;
    default:
      return false;
  }
};

// Create workspace
app.post('/api/workspaces', userAuthMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }
  
  const id = uuidv4();
  db.prepare(`
    INSERT INTO workspaces (id, name, ownerId) VALUES (?, ?, ?)
  `).run(id, name.trim(), req.user.id);
  
  // Add owner as member with 'owner' role
  db.prepare(`
    INSERT INTO workspace_members (id, workspaceId, userId, role) VALUES (?, ?, ?, 'owner')
  `).run(uuidv4(), id, req.user.id);
  
  const workspace = getWorkspace(id);
  res.json(workspace);
});

// List user's workspaces
app.get('/api/workspaces', userAuthMiddleware, (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, wm.role as userRole, wm.allocatedCredits,
           (SELECT COUNT(*) FROM workspace_members WHERE workspaceId = w.id) as memberCount
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspaceId AND wm.userId = ?
    ORDER BY w.isDefault DESC, w.updatedAt DESC
  `).all(req.user.id);
  
  // Get user's personal credits for default workspace display
  const userCredits = req.user.credits || 0;
  
  workspaces.forEach(w => {
    w.privacySettings = JSON.parse(w.privacySettings || '{}');
    // For default/personal workspaces, show user's personal credits
    // For team workspaces, show workspace shared credits
    if (w.isDefault) {
      w.displayCredits = userCredits;
    } else {
      w.displayCredits = w.credits || 0;
    }
  });
  
  res.json(workspaces);
});

// Get workspace details
app.get('/api/workspaces/:id', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const role = getUserWorkspaceRole(workspace.id, req.user.id);
  if (!role && workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }
  
  workspace.userRole = role || 'owner';
  workspace.memberCount = db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE workspaceId = ?')
    .get(workspace.id).count;
  
  res.json(workspace);
});

// Update workspace
app.patch('/api/workspaces/:id', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  // Only owner or admin can update
  if (workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'admin')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  const { name, creditMode, privacySettings } = req.body;
  const updates = [];
  const values = [];
  
  if (name?.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (creditMode && ['shared', 'individual'].includes(creditMode)) {
    updates.push('creditMode = ?');
    values.push(creditMode);
  }
  if (privacySettings) {
    updates.push('privacySettings = ?');
    values.push(JSON.stringify(privacySettings));
  }
  
  if (updates.length > 0) {
    updates.push("updatedAt = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  res.json(getWorkspace(req.params.id));
});

// Delete workspace (owner only)
app.delete('/api/workspaces/:id', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  if (workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can delete a workspace' });
  }
  
  if (workspace.isDefault) {
    return res.status(400).json({ error: 'Cannot delete default workspace' });
  }
  
  // Delete workspace (cascade will handle members and invites)
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ WORKSPACE MEMBERS API ============

// List workspace members
app.get('/api/workspaces/:id/members', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const role = getUserWorkspaceRole(workspace.id, req.user.id);
  if (!role && workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }
  
  const members = db.prepare(`
    SELECT wm.*, u.email, u.name, u.credits as personalCredits
    FROM workspace_members wm
    JOIN users u ON wm.userId = u.id
    WHERE wm.workspaceId = ?
    ORDER BY 
      CASE wm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
      wm.joinedAt ASC
  `).all(req.params.id);
  
  res.json(members);
});

// Invite member to workspace
app.post('/api/workspaces/:id/invite', userAuthMiddleware, (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  // Check permission
  if (workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'invite')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  // Check if already a member
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existingUser) {
    const existingMember = db.prepare('SELECT id FROM workspace_members WHERE workspaceId = ? AND userId = ?')
      .get(workspace.id, existingUser.id);
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }
  }
  
  // Check for existing pending invite
  const existingInvite = db.prepare("SELECT id FROM workspace_invites WHERE workspaceId = ? AND invitedEmail = ? AND status = 'pending'")
    .get(workspace.id, email.trim().toLowerCase());
  if (existingInvite) {
    return res.status(400).json({ error: 'Invitation already sent' });
  }
  
  // Create invite
  const token = uuidv4();
  db.prepare(`
    INSERT INTO workspace_invites (id, workspaceId, invitedEmail, invitedBy, token, expiresAt)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))
  `).run(uuidv4(), workspace.id, email.trim().toLowerCase(), req.user.id, token);
  
  res.json({ 
    success: true, 
    inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${token}`,
    token 
  });
});

// Accept invite
app.post('/api/workspaces/join/:token', userAuthMiddleware, (req, res) => {
  const invite = db.prepare(`
    SELECT * FROM workspace_invites 
    WHERE token = ? AND status = 'pending' AND expiresAt > datetime('now')
  `).get(req.params.token);
  
  if (!invite) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  
  // Check if invite is for this user
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  if (user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
    return res.status(403).json({ error: 'This invitation is for a different email address' });
  }
  
  // Check if already a member
  const existingMember = db.prepare('SELECT id FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(invite.workspaceId, req.user.id);
  if (existingMember) {
    db.prepare("UPDATE workspace_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
    return res.status(400).json({ error: 'You are already a member of this workspace' });
  }
  
  // Add as member
  db.prepare(`
    INSERT INTO workspace_members (id, workspaceId, userId, role) VALUES (?, ?, ?, 'member')
  `).run(uuidv4(), invite.workspaceId, req.user.id);
  
  // Update invite status
  db.prepare("UPDATE workspace_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
  
  const workspace = getWorkspace(invite.workspaceId);
  res.json({ success: true, workspace });
});

// Get invite details (for join page)
app.get('/api/workspaces/invite/:token', (req, res) => {
  const invite = db.prepare(`
    SELECT wi.*, w.name as workspaceName, u.name as inviterName
    FROM workspace_invites wi
    JOIN workspaces w ON wi.workspaceId = w.id
    JOIN users u ON wi.invitedBy = u.id
    WHERE wi.token = ? AND wi.status = 'pending' AND wi.expiresAt > datetime('now')
  `).get(req.params.token);
  
  if (!invite) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  
  res.json({
    workspaceName: invite.workspaceName,
    inviterName: invite.inviterName,
    email: invite.invitedEmail
  });
});

// Update member role or credits
app.patch('/api/workspaces/:id/members/:userId', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const member = db.prepare('SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(req.params.id, req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  
  const { role, allocatedCredits } = req.body;
  
  // Check permissions for role change
  if (role && role !== member.role) {
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }
    if (workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'promote')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    db.prepare('UPDATE workspace_members SET role = ? WHERE workspaceId = ? AND userId = ?')
      .run(role, req.params.id, req.params.userId);
  }
  
  // Check permissions for credit allocation
  if (allocatedCredits !== undefined) {
    if (workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'allocate_credits')) {
      return res.status(403).json({ error: 'Permission denied to allocate credits' });
    }
    if (allocatedCredits < 0) {
      return res.status(400).json({ error: 'Credits cannot be negative' });
    }
    db.prepare('UPDATE workspace_members SET allocatedCredits = ? WHERE workspaceId = ? AND userId = ?')
      .run(allocatedCredits, req.params.id, req.params.userId);
  }
  
  res.json({ success: true });
});

// Remove member from workspace
app.delete('/api/workspaces/:id/members/:userId', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const member = db.prepare('SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(req.params.id, req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  
  // Owner cannot be removed
  if (member.role === 'owner') {
    return res.status(400).json({ error: 'Cannot remove workspace owner' });
  }
  
  // User can remove themselves, or owner/admin can remove others
  const isSelf = req.params.userId === req.user.id;
  if (!isSelf && workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'admin')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  db.prepare('DELETE FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .run(req.params.id, req.params.userId);
  
  res.json({ success: true });
});

// ============ WORKSPACE CREDITS API ============

// Add credits to workspace
app.post('/api/workspaces/:id/credits/add', userAuthMiddleware, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  // Only owner can add credits
  if (workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can add credits' });
  }
  
  db.prepare("UPDATE workspaces SET credits = credits + ?, updatedAt = datetime('now') WHERE id = ?")
    .run(amount, req.params.id);
  
  const updated = getWorkspace(req.params.id);
  res.json({ success: true, credits: updated.credits });
});

// Allocate credits to member (from workspace pool)
app.post('/api/workspaces/:id/credits/allocate', userAuthMiddleware, (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || amount === undefined) return res.status(400).json({ error: 'userId and amount required' });
  
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  // Check permission
  if (workspace.ownerId !== req.user.id && !canPerformAction(workspace, req.user.id, 'allocate_credits')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  if (workspace.creditMode !== 'individual') {
    return res.status(400).json({ error: 'Credit allocation only available in individual mode' });
  }
  
  const member = db.prepare('SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?')
    .get(req.params.id, userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  
  if (amount > workspace.credits) {
    return res.status(400).json({ error: 'Insufficient workspace credits' });
  }
  
  // Transfer from workspace to member
  db.prepare('UPDATE workspaces SET credits = credits - ? WHERE id = ?').run(amount, req.params.id);
  db.prepare('UPDATE workspace_members SET allocatedCredits = allocatedCredits + ? WHERE workspaceId = ? AND userId = ?')
    .run(amount, req.params.id, userId);
  
  res.json({ success: true });
});

// Get workspace credit usage stats
app.get('/api/workspaces/:id/credits/usage', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const role = getUserWorkspaceRole(workspace.id, req.user.id);
  if (!role && workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }
  
  const totalUsed = db.prepare(`
    SELECT COALESCE(SUM(credits), 0) as total 
    FROM generations 
    WHERE workspaceId = ? AND status = 'completed'
  `).get(req.params.id).total;
  
  const byType = db.prepare(`
    SELECT type, COALESCE(SUM(credits), 0) as total, COUNT(*) as count
    FROM generations 
    WHERE workspaceId = ? AND status = 'completed'
    GROUP BY type
  `).all(req.params.id);
  
  const byMember = db.prepare(`
    SELECT u.name, u.email, COALESCE(SUM(g.credits), 0) as used, COUNT(g.id) as count
    FROM workspace_members wm
    JOIN users u ON wm.userId = u.id
    LEFT JOIN generations g ON g.userId = u.id AND g.workspaceId = ?
    WHERE wm.workspaceId = ?
    GROUP BY wm.userId
  `).all(req.params.id, req.params.id);
  
  res.json({
    workspaceCredits: workspace.credits,
    totalUsed,
    byType,
    byMember
  });
});

// ============ WORKSPACE GALLERY API ============

// Get workspace shared content
app.get('/api/workspaces/:id/gallery', userAuthMiddleware, (req, res) => {
  const workspace = getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
  const role = getUserWorkspaceRole(workspace.id, req.user.id);
  if (!role && workspace.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }
  
  const { type } = req.query;
  const typeFilter = type && type !== 'all' ? 'AND g.type = ?' : '';
  const params = type && type !== 'all' ? [req.params.id, type] : [req.params.id];
  
  const generations = db.prepare(`
    SELECT g.*, u.name as userName, u.email as userEmail
    FROM generations g
    JOIN users u ON g.userId = u.id
    WHERE g.workspaceId = ? AND g.sharedWithWorkspace = 1 ${typeFilter}
    ORDER BY g.startedAt DESC
    LIMIT 100
  `).all(...params);
  
  res.json(generations);
});

// Toggle sharing for generation
app.patch('/api/generations/:id/share', userAuthMiddleware, (req, res) => {
  const { sharedWithWorkspace, workspaceId } = req.body;
  
  const gen = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!gen) return res.status(404).json({ error: 'Generation not found' });
  
  const updates = [];
  const values = [];
  
  if (sharedWithWorkspace !== undefined) {
    updates.push('sharedWithWorkspace = ?');
    values.push(sharedWithWorkspace ? 1 : 0);
  }
  if (workspaceId !== undefined) {
    // Verify user is member of workspace
    if (workspaceId) {
      const role = getUserWorkspaceRole(workspaceId, req.user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    updates.push('workspaceId = ?');
    values.push(workspaceId || null);
  }
  
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE generations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  res.json({ success: true });
});

// Toggle sharing for conversation
app.patch('/api/conversations/:id/share', userAuthMiddleware, (req, res) => {
  const { sharedWithWorkspace, workspaceId } = req.body;
  
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  
  const updates = [];
  const values = [];
  
  if (sharedWithWorkspace !== undefined) {
    updates.push('sharedWithWorkspace = ?');
    values.push(sharedWithWorkspace ? 1 : 0);
  }
  if (workspaceId !== undefined) {
    if (workspaceId) {
      const role = getUserWorkspaceRole(workspaceId, req.user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    updates.push('workspaceId = ?');
    values.push(workspaceId || null);
  }
  
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  res.json({ success: true });
});

// Background processing for batch (multiple images)
// Updated to use provider abstraction layer with fallback to direct calls
async function processGenerationBatch(genIds, model, prompt, options, inputImages, numImages) {
  const openrouterKey = getSetting('openrouterApiKey');
  const falKey = getSetting('falApiKey');
  const useProviderLayer = process.env.USE_PROVIDER_LAYER === 'true'; // Feature flag
  
  console.log(`\n[DEBUG] Processing batch of ${numImages} generations`);
  console.log(`[DEBUG] Model type: ${model.type}, endpoint: ${model.apiEndpoint}`);
  console.log(`[DEBUG] Generation IDs: ${genIds.join(', ')}`);
  console.log(`[DEBUG] Using provider layer: ${useProviderLayer}`);
  
  try {
    if (model.type === 'chat') {
      // Chat only generates one response
      const genId = genIds[0];
      let result;
      if (!openrouterKey) {
        result = `**Demo Response**\n\nAdd your OpenRouter API key in admin settings for real responses.\n\nPrompt: "${prompt}"`;
      } else {
        result = await callOpenRouter(model.apiEndpoint, prompt, [], openrouterKey);
      }
      // Chat doesn't need thumbnail
      db.prepare("UPDATE generations SET status = 'completed', result = ?, completedAt = datetime('now') WHERE id = ?").run(result, genId);
      
      // Commit credits on success
      const gen = db.prepare('SELECT userId, credits, workspaceId, options FROM generations WHERE id = ?').get(genId);
      if (gen) {
        const opts = JSON.parse(gen.options || '{}');
        commitCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
      }
    } else if (model.type === 'image') {
      // Smart endpoint selection based on whether images are provided
      const endpoint = getSmartEndpoint(model, inputImages);
      console.log(`[FAL] Using endpoint: ${endpoint} (hasImages: ${inputImages?.length > 0})`);
      
      // Generate all images in one API call
      let imageUrls = [];
      if (!falKey) {
        // Demo mode - generate placeholder images
        for (let i = 0; i < numImages; i++) {
          imageUrls.push(`https://picsum.photos/seed/${Date.now() + i}/1024/1024`);
        }
      } else if (useProviderLayer) {
        // Use provider abstraction layer
        try {
          const providerResult = await generateWithProvider(
            { ...model, apiEndpoint: endpoint },
            prompt,
            { ...options, num_images: numImages },
            inputImages,
            genIds[0]
          );
          imageUrls = providerResult.urls || [providerResult.url];
          console.log(`[PROVIDER] Generated ${imageUrls.length} images via provider layer`);
        } catch (providerError) {
          console.error('[PROVIDER] Provider layer failed, falling back to direct call:', providerError.message);
          imageUrls = await callFalImageBatch(endpoint, prompt, options, inputImages, falKey, numImages, model);
        }
      } else {
        // Use direct Fal.ai call (current behavior)
        imageUrls = await callFalImageBatch(endpoint, prompt, options, inputImages, falKey, numImages, model);
      }
      
      // Update each generation record with its corresponding image and commit credits
      for (let i = 0; i < genIds.length; i++) {
        const imageUrl = imageUrls[i] || imageUrls[0]; // Fallback to first if not enough
        const thumbnailUrl = getThumbnailUrl(imageUrl, 300, 75); // Generate thumbnail URL
        db.prepare("UPDATE generations SET status = 'completed', result = ?, thumbnailUrl = ?, completedAt = datetime('now') WHERE id = ?").run(imageUrl, thumbnailUrl, genIds[i]);
        
        // Commit credits on success
        const gen = db.prepare('SELECT userId, credits, workspaceId, options FROM generations WHERE id = ?').get(genIds[i]);
        if (gen) {
          const opts = JSON.parse(gen.options || '{}');
          commitCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
        }
      }
    } else if (model.type === 'video') {
      // Smart endpoint selection for video
      const endpoint = getSmartEndpoint(model, inputImages);
      console.log(`[FAL] Using video endpoint: ${endpoint} (hasImages: ${inputImages?.length > 0})`);
      
      // Video only generates one at a time
      const genId = genIds[0];
      let result;
      if (!falKey) {
        result = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      } else if (useProviderLayer) {
        // Use provider abstraction layer
        try {
          const providerResult = await generateWithProvider(
            { ...model, apiEndpoint: endpoint },
            prompt,
            options,
            inputImages,
            genId
          );
          result = providerResult.url;
          console.log(`[PROVIDER] Generated video via provider layer`);
        } catch (providerError) {
          console.error('[PROVIDER] Provider layer failed, falling back to direct call:', providerError.message);
          result = await callFalVideo(endpoint, prompt, options, inputImages, falKey, model, genId);
        }
      } else {
        // Use direct Fal.ai call (current behavior)
        result = await callFalVideo(endpoint, prompt, options, inputImages, falKey, model, genId);
      }
      // Video thumbnail - try to get from Fal.ai CDN if possible
      const thumbnailUrl = getThumbnailUrl(result, 300, 75);
      db.prepare("UPDATE generations SET status = 'completed', result = ?, thumbnailUrl = ?, completedAt = datetime('now') WHERE id = ?").run(result, thumbnailUrl, genId);
      
      // Commit credits on success
      const gen = db.prepare('SELECT userId, credits, workspaceId, options FROM generations WHERE id = ?').get(genId);
      if (gen) {
        const opts = JSON.parse(gen.options || '{}');
        commitCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
      }
    }
  } catch (err) {
    console.error('[ERROR] Processing error:', err.message);
    if (err.response) {
      console.error('[ERROR] Status:', err.response.status);
      console.error('[ERROR] Data:', JSON.stringify(err.response.data));
    }
    
    // Categorize the error for user-friendly display
    const errorInfo = categorizeError(err);
    console.log(`[ERROR] Categorized as: ${errorInfo.type} - ${errorInfo.message}`);
    
    // Mark all generations as failed and release reserved credits
    for (const genId of genIds) {
      const gen = db.prepare('SELECT userId, credits, workspaceId, options, modelId, modelName FROM generations WHERE id = ?').get(genId);
      
      db.prepare("UPDATE generations SET status = 'failed', error = ?, errorType = ?, completedAt = datetime('now') WHERE id = ?")
        .run(errorInfo.userMessage, errorInfo.type, genId);
      
      // Log error to error_logs table for monitoring
      logError(
        'generation',
        gen?.userId,
        genId,
        model?.apiEndpoint || 'unknown',
        errorInfo.type,
        errorInfo.message,
        err.stack,
        {
          modelId: gen?.modelId,
          modelName: gen?.modelName,
          prompt: prompt?.substring(0, 500),
          options: JSON.stringify(options || {}),
          responseStatus: err.response?.status,
          responseData: JSON.stringify(err.response?.data || {}).substring(0, 1000)
        }
      );
      
      if (gen && errorInfo.refundable) {
        const opts = JSON.parse(gen.options || '{}');
        releaseCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
        console.log(`[CREDITS] Released ${gen.credits} credits for generation ${genId}`);
      }
    }
  }
}

// Legacy single generation processing (for backwards compatibility)
async function processGeneration(genId, model, prompt, options, inputImages) {
  return processGenerationBatch([genId], model, prompt, options, inputImages, 1);
}

// Process upscaling request
// Updated to use provider abstraction layer with fallback
async function processUpscale(genId, model, sourceUrl, sourceType, options) {
  const falKey = getSetting('falApiKey');
  const useProviderLayer = process.env.USE_PROVIDER_LAYER === 'true';
  
  console.log(`\n[UPSCALE] Processing upscale request`);
  console.log(`[UPSCALE] Model: ${model.name}, Source: ${sourceType}`);
  console.log(`[UPSCALE] Options:`, options);
  console.log(`[UPSCALE] Using provider layer: ${useProviderLayer}`);
  
  try {
    if (!falKey) {
      throw new Error('Fal.ai API key not configured');
    }
    
    let result;
    
    if (useProviderLayer) {
      // Use provider abstraction layer
      const provider = getConfiguredProvider(model.provider || 'fal');
      if (!provider) {
        throw new Error(`Provider ${model.provider || 'fal'} not available`);
      }
      
      try {
        if (sourceType === 'video') {
          const upscaleResult = await provider.upscaleVideo(model, sourceUrl, options, genId, db);
          result = upscaleResult.url;
        } else {
          const upscaleResult = await provider.upscaleImage(model, sourceUrl, options);
          result = upscaleResult.url;
        }
        console.log(`[PROVIDER] Upscale completed via provider layer`);
      } catch (providerError) {
        console.error('[PROVIDER] Provider layer failed, falling back to direct call:', providerError.message);
        // Fallback to direct calls
        if (sourceType === 'video') {
          result = await callFalVideoUpscale(model.apiEndpoint, sourceUrl, options, falKey, model, genId);
        } else {
          result = await callFalImageUpscale(model.apiEndpoint, sourceUrl, options, falKey);
        }
      }
    } else {
      // Use direct Fal.ai calls (current behavior)
      if (sourceType === 'video') {
        result = await callFalVideoUpscale(model.apiEndpoint, sourceUrl, options, falKey, model, genId);
      } else {
        result = await callFalImageUpscale(model.apiEndpoint, sourceUrl, options, falKey);
      }
    }
    
    // Generate thumbnail
    const thumbnailUrl = getThumbnailUrl(result, 300, 75);
    
    // Update generation with result
    db.prepare("UPDATE generations SET status = 'completed', result = ?, thumbnailUrl = ?, completedAt = datetime('now') WHERE id = ?")
      .run(result, thumbnailUrl, genId);
    
    // Commit credits
    const gen = db.prepare('SELECT userId, credits, workspaceId, options FROM generations WHERE id = ?').get(genId);
    if (gen) {
      const opts = JSON.parse(gen.options || '{}');
      commitCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
      console.log(`[UPSCALE] Completed, committed ${gen.credits} credits`);
    }
  } catch (err) {
    console.error('[UPSCALE] Error:', err.message);
    
    const errorInfo = categorizeError(err);
    const gen = db.prepare('SELECT userId, credits, workspaceId, options, modelId, modelName FROM generations WHERE id = ?').get(genId);
    
    db.prepare("UPDATE generations SET status = 'failed', error = ?, errorType = ?, completedAt = datetime('now') WHERE id = ?")
      .run(errorInfo.userMessage, errorInfo.type, genId);
    
    // Log error for monitoring
    logError(
      'upscale',
      gen?.userId,
      genId,
      model?.apiEndpoint || 'unknown',
      errorInfo.type,
      errorInfo.message,
      err.stack,
      {
        modelId: gen?.modelId,
        modelName: gen?.modelName,
        sourceType,
        sourceUrl: sourceUrl?.substring(0, 200),
        options: JSON.stringify(options || {}),
        responseStatus: err.response?.status,
        responseData: JSON.stringify(err.response?.data || {}).substring(0, 1000)
      }
    );
    
    // Release credits
    if (gen && errorInfo.refundable) {
      const opts = JSON.parse(gen.options || '{}');
      releaseCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
      console.log(`[UPSCALE] Failed, released ${gen.credits} credits`);
    }
  }
}

// Call Fal.ai for image upscaling
const callFalImageUpscale = async (endpoint, imageUrl, options, apiKey) => {
  console.log(`[FAL] Image upscale: ${endpoint}`);
  
  const payload = {
    image_url: imageUrl
  };
  
  if (options?.scale_factor) payload.scale_factor = parseInt(options.scale_factor);
  if (options?.creativity !== undefined) payload.creativity = parseInt(options.creativity);
  
  console.log(`[FAL] Upscale payload:`, JSON.stringify(payload, null, 2));
  
  const response = await axios.post(`https://fal.run/${endpoint}`, payload, {
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 120000,
  });
  
  // Return upscaled image URL
  if (response.data.images?.length > 0) {
    return response.data.images[0];
  }
  if (response.data.image?.url) return response.data.image.url;
  throw new Error('No image in upscale response');
};

// Call Fal.ai for video upscaling (uses queue)
const callFalVideoUpscale = async (endpoint, videoUrl, options, apiKey, model, genId) => {
  console.log(`[FAL] Video upscale: ${endpoint}`);
  
  const payload = {
    video_url: videoUrl
  };
  
  if (options?.scale_factor) payload.scale_factor = parseInt(options.scale_factor);
  
  console.log(`[FAL] Video upscale payload:`, JSON.stringify(payload, null, 2));
  
  // Submit to queue
  const submitResponse = await axios.post(`https://queue.fal.run/${endpoint}`, payload, {
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' }
  });
  
  const requestId = submitResponse.data.request_id;
  if (!requestId) {
    if (submitResponse.data.video?.url) return submitResponse.data.video.url;
    throw new Error('No request_id for video upscale');
  }
  
  // Store request ID
  if (genId) {
    db.prepare('UPDATE generations SET externalRequestId = ? WHERE id = ?').run(requestId, genId);
  }
  
  // Poll for result
  const maxWaitTime = (model.maxWaitTime || 900) * 1000;
  const startTime = Date.now();
  const pollInterval = 5000;
  
  while ((Date.now() - startTime) < maxWaitTime) {
    await new Promise(r => setTimeout(r, pollInterval));
    
    // Check if cancelled
    if (genId) {
      const gen = db.prepare('SELECT cancelledAt FROM generations WHERE id = ?').get(genId);
      if (gen?.cancelledAt) {
        console.log(`[FAL] Video upscale ${genId} was cancelled`);
        throw new Error('Cancelled by user');
      }
    }
    
    // Check status
    const statusResponse = await axios.get(`https://queue.fal.run/${endpoint}/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${apiKey}` }
    });
    
    console.log(`[FAL] Video upscale status: ${statusResponse.data.status}`);
    
    if (statusResponse.data.status === 'COMPLETED') {
      const resultResponse = await axios.get(`https://queue.fal.run/${endpoint}/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${apiKey}` }
      });
      
      if (resultResponse.data.video?.url) return resultResponse.data.video.url;
      throw new Error('No video URL in upscale result');
    }
    
    if (statusResponse.data.status === 'FAILED') {
      throw new Error(statusResponse.data.error || 'Video upscale failed');
    }
  }
  
  throw new Error('Video upscale timed out');
};

// OpenRouter
const callOpenRouter = async (modelEndpoint, prompt, chatHistory, apiKey) => {
  const messages = [...(chatHistory || []), { role: 'user', content: prompt }];
  
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: modelEndpoint,
    messages,
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'OmniHub',
    }
  });
  
  return response.data.choices[0].message.content;
};

// Fal.ai Image - returns array of URLs
const callFalImageBatch = async (modelEndpoint, prompt, options, inputImages, apiKey, numImages, model = {}) => {
  console.log(`[FAL] Image batch: ${modelEndpoint}, num_images: ${numImages}`, options);
  console.log(`[FAL] Input images: ${inputImages?.length || 0}`, inputImages);
  
  const payload = {
    prompt,
    num_images: numImages,
    enable_safety_checker: true,
  };
  
  // Add standard options
  if (options?.image_size) payload.image_size = options.image_size;
  if (options?.aspect_ratio) payload.aspect_ratio = options.aspect_ratio;
  if (options?.style) payload.style = options.style;
  if (options?.guidance_scale) payload.guidance_scale = parseFloat(options.guidance_scale);
  if (options?.resolution) payload.resolution = options.resolution;
  if (options?.scale) payload.scale = parseInt(options.scale);
  
  // Handle image input based on model configuration
  if (inputImages?.length > 0) {
    const paramName = model.imageParamName || 'image_url';
    const paramType = model.imageParamType || 'single';
    
    if (paramType === 'array') {
      // Model expects an array of image URLs
      payload[paramName] = inputImages;
      console.log(`[FAL] Sending ${inputImages.length} images as array: ${paramName}`);
    } else {
      // Model expects a single image URL
      payload[paramName] = inputImages[0];
      console.log(`[FAL] Sending single image: ${paramName} = ${inputImages[0]}`);
    }
  }
  
  console.log(`[FAL] Full payload:`, JSON.stringify(payload, null, 2));
  
  const response = await axios.post(`https://fal.run/${modelEndpoint}`, payload, {
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 120000,
  });
  
  // Return array of image URLs
  if (response.data.images?.length > 0) {
    return response.data.images.map(img => img.url).filter(Boolean);
  }
  if (response.data.image?.url) return [response.data.image.url];
  throw new Error('No image in response');
};

// Fal.ai Image - single image (legacy)
const callFalImage = async (modelEndpoint, prompt, options, inputImages, apiKey) => {
  const urls = await callFalImageBatch(modelEndpoint, prompt, options, inputImages, apiKey, 1);
  return urls[0];
};

// Fal.ai Video with smart timeout and cancellation support
const callFalVideo = async (modelEndpoint, prompt, options, inputImages, apiKey, model = {}, genId = null) => {
  console.log(`[FAL] Video: ${modelEndpoint}`, options);
  console.log(`[FAL] Video input images: ${inputImages?.length || 0}`, inputImages);
  
  const payload = { prompt };
  
  // Duration - some models want string, some want integer
  if (options?.duration) {
    // Kling expects string ("5" or "10"), others might want int
    payload.duration = options.duration;
  }
  if (options?.aspect_ratio) payload.aspect_ratio = options.aspect_ratio;
  if (options?.resolution) payload.resolution = options.resolution;
  if (options?.num_frames) payload.num_frames = parseInt(options.num_frames);
  if (options?.prompt_optimizer !== undefined) payload.prompt_optimizer = options.prompt_optimizer;
  
  // Kling-specific: negative_prompt and cfg_scale
  if (options?.negative_prompt) {
    payload.negative_prompt = options.negative_prompt;
  } else if (modelEndpoint.includes('kling')) {
    // Default negative prompt for Kling
    payload.negative_prompt = "blur, distort, and low quality";
  }
  if (options?.cfg_scale) {
    payload.cfg_scale = parseFloat(options.cfg_scale);
  } else if (modelEndpoint.includes('kling')) {
    // Default cfg_scale for Kling
    payload.cfg_scale = 0.5;
  }
  
  // Handle image input based on model configuration
  if (inputImages?.length > 0) {
    const paramName = model.imageParamName || 'image_url';
    payload[paramName] = inputImages[0]; // Video models typically only use one image
    console.log(`[FAL] Video sending image: ${paramName} = ${inputImages[0]}`);
  }
  if (options?.image_url) payload.image_url = options.image_url;
  
  // Handle video input for video extension models
  if (options?.video_url) {
    payload.video_url = options.video_url;
    console.log(`[FAL] Video extension sending video_url: ${options.video_url}`);
  }
  
  // Additional video model options
  if (options?.generate_audio !== undefined) {
    payload.generate_audio = options.generate_audio === 'true' || options.generate_audio === true;
  }
  if (options?.with_audio !== undefined) {
    payload.with_audio = options.with_audio === 'true' || options.with_audio === true;
  }
  if (options?.num_inference_steps) payload.num_inference_steps = parseInt(options.num_inference_steps);
  if (options?.guidance_scale) payload.guidance_scale = parseFloat(options.guidance_scale);
  if (options?.video_quality) payload.video_quality = options.video_quality;
  
  // Handle trajectories for Wan Move
  if (options?.trajectories) {
    payload.trajectories = options.trajectories;
  }
  
  // Log the full payload for debugging
  console.log(`[FAL] Video full payload:`, JSON.stringify(payload, null, 2));
  
  // Submit to queue
  let submitResponse;
  try {
    submitResponse = await axios.post(`https://queue.fal.run/${modelEndpoint}`, payload, {
      headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' }
    });
  } catch (submitErr) {
    console.error(`[FAL] Video submit error:`, submitErr.message);
    if (submitErr.response) {
      console.error(`[FAL] Video submit status:`, submitErr.response.status);
      console.error(`[FAL] Video submit data:`, JSON.stringify(submitErr.response.data));
    }
    throw submitErr;
  }
  
  const requestId = submitResponse.data.request_id;
  if (!requestId) {
    if (submitResponse.data.video?.url) return submitResponse.data.video.url;
    throw new Error('No request_id');
  }
  
  // Store external request ID for cancellation support
  if (genId) {
    db.prepare('UPDATE generations SET externalRequestId = ? WHERE id = ?').run(requestId, genId);
  }
  
  // Smart polling with time-based timeout
  const maxWaitTime = (model.maxWaitTime || 600) * 1000; // Convert to ms
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds between polls
  
  console.log(`[FAL] Video polling with max wait time: ${maxWaitTime / 1000}s`);
  
  while ((Date.now() - startTime) < maxWaitTime) {
    await new Promise(r => setTimeout(r, pollInterval));
    
    // Check if generation was cancelled
    if (genId) {
      const gen = db.prepare('SELECT cancelledAt FROM generations WHERE id = ?').get(genId);
      if (gen?.cancelledAt) {
        console.log(`[FAL] Generation ${genId} was cancelled, stopping poll`);
        // Try to cancel on Fal side (best effort)
        try {
          await axios.delete(`https://queue.fal.run/${modelEndpoint}/requests/${requestId}`, {
            headers: { 'Authorization': `Key ${apiKey}` }
          });
        } catch (e) { /* Ignore cancellation errors */ }
        throw new Error('Generation cancelled by user');
      }
    }
    
    try {
      const statusRes = await axios.get(
        `https://queue.fal.run/${modelEndpoint}/requests/${requestId}/status`,
        { headers: { 'Authorization': `Key ${apiKey}` } }
      );
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[FAL] Video status: ${statusRes.data.status} (${elapsed}s elapsed)`);
      
      if (statusRes.data.status === 'COMPLETED') {
        const resultRes = await axios.get(
          `https://queue.fal.run/${modelEndpoint}/requests/${requestId}`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );
        if (resultRes.data.video?.url) return resultRes.data.video.url;
        throw new Error('No video in result');
      } else if (statusRes.data.status === 'FAILED') {
        const errorMsg = statusRes.data.error || 'Video generation failed';
        throw new Error(errorMsg);
      }
    } catch (e) {
      if (e.response?.status !== 404) throw e;
    }
  }
  
  throw new Error('Video generation timed out');
};

// ============ ADMIN ============
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: admin.id, username: admin.username, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/api/admin/stats', adminAuthMiddleware, (req, res) => {
  const totalGenerations = db.prepare('SELECT COUNT(*) as count FROM generations').get().count;
  const creditsUsed = db.prepare("SELECT SUM(credits) as total FROM generations WHERE status = 'completed'").get().total || 0;
  const activeUsers = db.prepare('SELECT COUNT(DISTINCT userId) as count FROM generations').get().count;
  
  const imageGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'image'").get().count;
  const videoGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'video'").get().count;
  const chatGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'chat'").get().count;
  
  const creditPrice = parseFloat(getSetting('creditPrice')) || 1;
  const revenue = creditsUsed * creditPrice;
  
  const recentActivity = db.prepare(`
    SELECT g.type, g.modelName as model, g.credits, g.startedAt as time, g.status
    FROM generations g ORDER BY g.startedAt DESC LIMIT 10
  `).all().map(a => ({ ...a, time: new Date(a.time).toLocaleString() }));
  
  res.json({ totalGenerations, creditsUsed, activeUsers, imageGenerations, videoGenerations, chatGenerations, revenue, recentActivity });
});

// Provider health status endpoint
app.get('/api/admin/providers', adminAuthMiddleware, async (req, res) => {
  try {
    const providers = ['fal', 'replicate', 'self-hosted'];
    const status = {};
    
    for (const providerId of providers) {
      const provider = getConfiguredProvider(providerId);
      if (provider) {
        const isAvailable = await provider.isAvailable();
        status[providerId] = {
          name: provider.name,
          available: isAvailable,
          configured: true
        };
      } else {
        status[providerId] = {
          name: providerId,
          available: false,
          configured: false
        };
      }
    }
    
    // Add provider router health info
    const routerHealth = getProviderHealthStatus();
    
    res.json({
      providers: status,
      routerHealth,
      useProviderLayer: process.env.USE_PROVIDER_LAYER === 'true'
    });
  } catch (error) {
    console.error('Error checking provider status:', error);
    res.status(500).json({ error: 'Failed to check provider status' });
  }
});

app.get('/api/admin/models', adminAuthMiddleware, (req, res) => {
  const models = db.prepare('SELECT * FROM models ORDER BY type, credits').all();
  models.forEach(m => {
    m.options = JSON.parse(m.options || '{}');
    m.capabilities = JSON.parse(m.capabilities || '{}');
    m.tags = JSON.parse(m.tags || '[]');
    m.enabled = m.enabled === 1;
  });
  res.json(models);
});

app.put('/api/admin/models/:id', adminAuthMiddleware, (req, res) => {
  const { credits, baseCost, enabled, thumbnail, logoUrl, heading, subheading, tags, displayOrder, category, providerName } = req.body;
  const updates = [], values = [];
  
  if (credits !== undefined) { updates.push('credits = ?'); values.push(credits); }
  if (baseCost !== undefined) { updates.push('baseCost = ?'); values.push(baseCost); }
  if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (thumbnail !== undefined) { updates.push('thumbnail = ?'); values.push(thumbnail); }
  if (logoUrl !== undefined) { updates.push('logoUrl = ?'); values.push(logoUrl); }
  if (heading !== undefined) { updates.push('heading = ?'); values.push(heading); }
  if (subheading !== undefined) { updates.push('subheading = ?'); values.push(subheading); }
  if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
  if (displayOrder !== undefined) { updates.push('displayOrder = ?'); values.push(displayOrder); }
  if (category !== undefined) { updates.push('category = ?'); values.push(category); }
  if (providerName !== undefined) { updates.push('providerName = ?'); values.push(providerName); }
  
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json({ success: true });
});

// Get all unique tags
app.get('/api/admin/model-tags', adminAuthMiddleware, (req, res) => {
  const models = db.prepare('SELECT tags FROM models').all();
  const allTags = new Set();
  models.forEach(m => {
    const tags = JSON.parse(m.tags || '[]');
    tags.forEach(tag => allTags.add(tag));
  });
  res.json([...allTags].sort());
});

// Get pricing matrix for a specific model
app.get('/api/admin/models/:id/pricing-matrix', adminAuthMiddleware, (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  
  const options = JSON.parse(model.options || '{}');
  const capabilities = JSON.parse(model.capabilities || '{}');
  
  // Get all option keys that have choices
  const optionKeys = Object.keys(options).filter(key => options[key].choices?.length > 0);
  
  // Generate all price combinations
  const combinations = [];
  
  const generateCombinations = (index, current) => {
    if (index === optionKeys.length) {
      let multiplier = 1;
      const labels = {};
      
      Object.entries(current).forEach(([key, value]) => {
        const choice = options[key].choices.find(c => String(c.value) === String(value));
        if (choice) {
          if (choice.priceMultiplier) multiplier *= choice.priceMultiplier;
          labels[key] = choice.label;
        }
      });
      
      combinations.push({
        options: { ...current },
        labels,
        multiplier,
        credits: Math.round(model.credits * multiplier * 10000) / 10000,
        usdPrice: Math.round(model.baseCost * multiplier * 10000) / 10000
      });
      return;
    }
    
    const key = optionKeys[index];
    const opt = options[key];
    opt.choices.forEach(choice => {
      current[key] = choice.value;
      generateCombinations(index + 1, current);
    });
  };
  
  if (optionKeys.length > 0) {
    generateCombinations(0, {});
  } else {
    // No options, just return base price
    combinations.push({
      options: {},
      labels: {},
      multiplier: 1,
      credits: model.credits,
      usdPrice: model.baseCost
    });
  }
  
  // Build pricing info based on model type
  const pricingInfo = {
    modelId: model.id,
    modelName: model.name,
    type: model.type,
    provider: model.provider,
    baseCost: model.baseCost,
    baseCredits: model.credits,
    enabled: model.enabled === 1,
    options: options,
    combinations: combinations,
    // Chat-specific pricing
    ...(model.type === 'chat' && {
      inputCost: model.inputCost,
      outputCost: model.outputCost,
      capabilities: capabilities
    }),
    // Summary stats
    stats: {
      minCredits: Math.min(...combinations.map(c => c.credits)),
      maxCredits: Math.max(...combinations.map(c => c.credits)),
      minUsd: Math.min(...combinations.map(c => c.usdPrice)),
      maxUsd: Math.max(...combinations.map(c => c.usdPrice)),
      totalCombinations: combinations.length
    }
  };
  
  res.json(pricingInfo);
});

app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.*, COUNT(g.id) as generations 
    FROM users u LEFT JOIN generations g ON u.id = g.userId 
    GROUP BY u.id ORDER BY u.createdAt DESC
  `).all();
  res.json(users);
});

app.put('/api/admin/users/:id/credits', adminAuthMiddleware, (req, res) => {
  db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(req.body.credits, req.params.id);
  logAudit(req.admin.id, 'credits_modified', 'user', req.params.id, { newCredits: req.body.credits }, req.ip);
  res.json({ success: true });
});

// Get detailed user info
app.get('/api/admin/users/:id', adminAuthMiddleware, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM generations WHERE userId = u.id) as totalGenerations,
        (SELECT COUNT(*) FROM generations WHERE userId = u.id AND type = 'image') as imageGenerations,
        (SELECT COUNT(*) FROM generations WHERE userId = u.id AND type = 'video') as videoGenerations,
        (SELECT COUNT(*) FROM generations WHERE userId = u.id AND type = 'chat') as chatGenerations,
        (SELECT SUM(amount) FROM payments WHERE userId = u.id AND status = 'completed') as totalPaid
      FROM users u WHERE u.id = ?
    `).get(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get subscription
    const subscription = db.prepare(`
      SELECT us.*, sp.name as planName
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.planId = sp.id
      WHERE us.userId = ? AND us.status = 'active'
    `).get(req.params.id);
    
    // Get recent generations
    const recentGenerations = db.prepare(`
      SELECT id, type, model, prompt, status, credits, startedAt 
      FROM generations WHERE userId = ? 
      ORDER BY startedAt DESC LIMIT 20
    `).all(req.params.id);
    
    // Get recent payments
    const recentPayments = db.prepare(`
      SELECT * FROM payments WHERE userId = ? 
      ORDER BY createdAt DESC LIMIT 10
    `).all(req.params.id);
    
    // Get workspaces
    const workspaces = db.prepare(`
      SELECT w.*, wm.role
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspaceId
      WHERE wm.userId = ?
    `).all(req.params.id);
    
    res.json({
      ...user,
      subscription,
      recentGenerations,
      recentPayments,
      workspaces
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user status (ban/suspend/activate)
app.put('/api/admin/users/:id/status', adminAuthMiddleware, (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    db.prepare('UPDATE users SET status = ?, statusReason = ? WHERE id = ?')
      .run(status, reason || null, req.params.id);
    
    logAudit(req.admin.id, 'user_status_changed', 'user', req.params.id, { status, reason }, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update admin notes for a user
app.put('/api/admin/users/:id/notes', adminAuthMiddleware, (req, res) => {
  try {
    const { notes } = req.body;
    
    db.prepare('UPDATE users SET adminNotes = ? WHERE id = ?')
      .run(notes, req.params.id);
    
    logAudit(req.admin.id, 'admin_notes_updated', 'user', req.params.id, { notes }, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user activity log
app.get('/api/admin/users/:id/activity', adminAuthMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get generations as activity
    const generations = db.prepare(`
      SELECT 
        id, 
        'generation' as activityType,
        type as subType,
        model,
        prompt,
        status,
        credits,
        startedAt as timestamp
      FROM generations 
      WHERE userId = ?
      ORDER BY startedAt DESC
      LIMIT ? OFFSET ?
    `).all(req.params.id, parseInt(limit), offset);
    
    // Get payments as activity
    const payments = db.prepare(`
      SELECT 
        id,
        'payment' as activityType,
        type as subType,
        amount,
        status,
        createdAt as timestamp
      FROM payments
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(req.params.id, parseInt(limit), offset);
    
    // Combine and sort by timestamp
    const activity = [...generations, ...payments]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set custom rate limit for a user
app.put('/api/admin/users/:id/rate-limit', adminAuthMiddleware, (req, res) => {
  try {
    const { requestsPerMinute, requestsPerHour, requestsPerDay, enabled } = req.body;
    const userId = req.params.id;
    
    // Check if custom rate limit exists for this user
    const existing = db.prepare('SELECT * FROM rate_limits WHERE type = ? AND targetId = ?')
      .get('user', userId);
    
    if (existing) {
      db.prepare(`
        UPDATE rate_limits 
        SET requestsPerMinute = ?, requestsPerHour = ?, requestsPerDay = ?, enabled = ?, updatedAt = datetime('now')
        WHERE id = ?
      `).run(requestsPerMinute, requestsPerHour, requestsPerDay, enabled ? 1 : 0, existing.id);
    } else {
      db.prepare(`
        INSERT INTO rate_limits (id, name, type, targetId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled)
        VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
      `).run(uuidv4(), `User: ${userId}`, userId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled ? 1 : 0);
    }
    
    logAudit(req.admin.id, 'user_rate_limit_set', 'user', userId, req.body, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/admin/users/:id', adminAuthMiddleware, (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete related data (cascade should handle most, but be explicit)
    db.prepare('DELETE FROM workspace_members WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM workspace_invites WHERE invitedBy = ?').run(userId);
    db.prepare('DELETE FROM generations WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM conversations WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM payments WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM user_subscriptions WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM community_posts WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    logAudit(req.admin.id, 'user_deleted', 'user', userId, { email: user.email }, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: RATE LIMITS ============
app.get('/api/admin/rate-limits', adminAuthMiddleware, (req, res) => {
  try {
    const rateLimits = db.prepare('SELECT * FROM rate_limits ORDER BY type, name').all();
    res.json(rateLimits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/rate-limits', adminAuthMiddleware, (req, res) => {
  try {
    const { name, type, targetId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled } = req.body;
    
    const id = uuidv4();
    db.prepare(`
      INSERT INTO rate_limits (id, name, type, targetId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, targetId, requestsPerMinute, requestsPerHour, requestsPerDay, enabled ? 1 : 0);
    
    logAudit(req.admin.id, 'rate_limit_created', 'rate_limit', id, req.body, req.ip);
    
    res.json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/rate-limits/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { name, requestsPerMinute, requestsPerHour, requestsPerDay, enabled } = req.body;
    
    db.prepare(`
      UPDATE rate_limits 
      SET name = ?, requestsPerMinute = ?, requestsPerHour = ?, requestsPerDay = ?, enabled = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(name, requestsPerMinute, requestsPerHour, requestsPerDay, enabled ? 1 : 0, req.params.id);
    
    logAudit(req.admin.id, 'rate_limit_updated', 'rate_limit', req.params.id, req.body, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/rate-limits/:id', adminAuthMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM rate_limits WHERE id = ?').run(req.params.id);
    logAudit(req.admin.id, 'rate_limit_deleted', 'rate_limit', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: FEATURE FLAGS ============
app.get('/api/admin/feature-flags', adminAuthMiddleware, (req, res) => {
  try {
    const flags = db.prepare('SELECT * FROM feature_flags ORDER BY name').all();
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/feature-flags', adminAuthMiddleware, (req, res) => {
  try {
    const { name, enabled, description, metadata } = req.body;
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO feature_flags (id, name, enabled, description, metadata, updatedBy)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, enabled ? 1 : 0, description, JSON.stringify(metadata || {}), req.admin.id);
    
    logAudit(req.admin.id, 'feature_flag_created', 'feature_flag', id, req.body, req.ip);
    
    res.json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/feature-flags/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { enabled, description, metadata } = req.body;
    
    db.prepare(`
      UPDATE feature_flags 
      SET enabled = ?, description = ?, metadata = ?, updatedBy = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(enabled ? 1 : 0, description, JSON.stringify(metadata || {}), req.admin.id, req.params.id);
    
    logAudit(req.admin.id, 'feature_flag_updated', 'feature_flag', req.params.id, req.body, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/feature-flags/:id', adminAuthMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM feature_flags WHERE id = ?').run(req.params.id);
    logAudit(req.admin.id, 'feature_flag_deleted', 'feature_flag', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint to check feature flag status
app.get('/api/feature-flags/:name', (req, res) => {
  try {
    const flag = db.prepare('SELECT * FROM feature_flags WHERE name = ?').get(req.params.name);
    res.json({ enabled: flag?.enabled === 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: ANNOUNCEMENTS ============
app.get('/api/admin/announcements', adminAuthMiddleware, (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/announcements', adminAuthMiddleware, (req, res) => {
  try {
    const { title, message, type, priority, targetAudience, dismissible, expiresAt } = req.body;
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO announcements (id, title, message, type, priority, targetAudience, dismissible, expiresAt, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, message, type || 'info', priority || 0, targetAudience || 'all', dismissible ? 1 : 0, expiresAt, req.admin.id);
    
    logAudit(req.admin.id, 'announcement_created', 'announcement', id, req.body, req.ip);
    
    res.json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/announcements/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { title, message, type, priority, targetAudience, active, dismissible, expiresAt } = req.body;
    
    db.prepare(`
      UPDATE announcements 
      SET title = ?, message = ?, type = ?, priority = ?, targetAudience = ?, 
          active = ?, dismissible = ?, expiresAt = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(title, message, type, priority, targetAudience, active ? 1 : 0, dismissible ? 1 : 0, expiresAt, req.params.id);
    
    logAudit(req.admin.id, 'announcement_updated', 'announcement', req.params.id, req.body, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/announcements/:id', adminAuthMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    logAudit(req.admin.id, 'announcement_deleted', 'announcement', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint to get active announcements
app.get('/api/announcements', (req, res) => {
  try {
    const announcements = db.prepare(`
      SELECT id, title, message, type, priority, dismissible 
      FROM announcements 
      WHERE active = 1 
      AND (expiresAt IS NULL OR datetime(expiresAt) > datetime('now'))
      ORDER BY priority DESC, createdAt DESC
    `).all();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: AUDIT LOGS ============
app.get('/api/admin/audit-logs', adminAuthMiddleware, (req, res) => {
  try {
    const { action, targetType, adminId, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (targetType) {
      query += ' AND targetType = ?';
      params.push(targetType);
    }
    if (adminId) {
      query += ' AND adminId = ?';
      params.push(adminId);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const logs = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
    
    // Parse details JSON
    logs.forEach(log => {
      try {
        log.details = JSON.parse(log.details || '{}');
      } catch (e) {
        log.details = {};
      }
    });
    
    res.json({ logs, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: CSV EXPORT ============
app.get('/api/admin/export/users', adminAuthMiddleware, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, credits, status, createdAt, lastLoginAt, totalSpent
      FROM users ORDER BY createdAt DESC
    `).all();
    
    // Convert to CSV
    const headers = ['ID', 'Email', 'Name', 'Credits', 'Status', 'Created At', 'Last Login', 'Total Spent'];
    const csvRows = [headers.join(',')];
    
    users.forEach(user => {
      csvRows.push([
        user.id,
        user.email,
        user.name || '',
        user.credits,
        user.status || 'active',
        user.createdAt,
        user.lastLoginAt || '',
        user.totalSpent || 0
      ].map(val => `"${val}"`).join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/export/generations', adminAuthMiddleware, (req, res) => {
  try {
    const generations = db.prepare(`
      SELECT g.id, g.type, g.model, g.modelName, g.prompt, g.status, g.credits, g.startedAt, u.email
      FROM generations g
      LEFT JOIN users u ON g.userId = u.id
      ORDER BY g.startedAt DESC
      LIMIT 10000
    `).all();
    
    const headers = ['ID', 'Type', 'Model', 'Model Name', 'Prompt', 'Status', 'Credits', 'Started At', 'User Email'];
    const csvRows = [headers.join(',')];
    
    generations.forEach(gen => {
      csvRows.push([
        gen.id,
        gen.type,
        gen.model,
        gen.modelName || '',
        (gen.prompt || '').replace(/"/g, '""').substring(0, 200),
        gen.status,
        gen.credits,
        gen.startedAt,
        gen.email || ''
      ].map(val => `"${val}"`).join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=generations-export.csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/export/payments', adminAuthMiddleware, (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT p.id, p.amount, p.currency, p.type, p.description, p.status, p.createdAt, u.email
      FROM payments p
      LEFT JOIN users u ON p.userId = u.id
      ORDER BY p.createdAt DESC
    `).all();
    
    const headers = ['ID', 'Amount', 'Currency', 'Type', 'Description', 'Status', 'Created At', 'User Email'];
    const csvRows = [headers.join(',')];
    
    payments.forEach(payment => {
      csvRows.push([
        payment.id,
        payment.amount,
        payment.currency,
        payment.type,
        payment.description || '',
        payment.status,
        payment.createdAt,
        payment.email || ''
      ].map(val => `"${val}"`).join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments-export.csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: ANALYTICS ============
app.get('/api/admin/analytics/signups', adminAuthMiddleware, (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let dateFilter = "date('now', '-30 days')";
    if (period === '7d') dateFilter = "date('now', '-7 days')";
    if (period === '90d') dateFilter = "date('now', '-90 days')";
    
    const signups = db.prepare(`
      SELECT date(createdAt) as date, COUNT(*) as count
      FROM users
      WHERE createdAt >= ${dateFilter}
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `).all();
    
    const total = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const today = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE date(createdAt) = date('now')
    `).get();
    const thisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE createdAt >= date('now', '-7 days')
    `).get();
    const thisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE createdAt >= date('now', '-30 days')
    `).get();
    
    res.json({
      data: signups,
      stats: {
        total: total.count,
        today: today.count,
        thisWeek: thisWeek.count,
        thisMonth: thisMonth.count
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/revenue', adminAuthMiddleware, (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let dateFilter = "date('now', '-30 days')";
    if (period === '7d') dateFilter = "date('now', '-7 days')";
    if (period === '90d') dateFilter = "date('now', '-90 days')";
    
    const revenue = db.prepare(`
      SELECT date(createdAt) as date, SUM(amount) as amount, COUNT(*) as count
      FROM payments
      WHERE status = 'completed' AND createdAt >= ${dateFilter}
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `).all();
    
    const totalRevenue = db.prepare(`
      SELECT SUM(amount) as total FROM payments WHERE status = 'completed'
    `).get();
    const thisMonth = db.prepare(`
      SELECT SUM(amount) as total FROM payments 
      WHERE status = 'completed' AND createdAt >= date('now', '-30 days')
    `).get();
    const lastMonth = db.prepare(`
      SELECT SUM(amount) as total FROM payments 
      WHERE status = 'completed' 
      AND createdAt >= date('now', '-60 days') 
      AND createdAt < date('now', '-30 days')
    `).get();
    
    // Calculate MRR (Monthly Recurring Revenue) from active subscriptions
    const mrr = db.prepare(`
      SELECT SUM(
        CASE 
          WHEN us.billingCycle = 'yearly' THEN sp.priceYearly / 12
          ELSE sp.priceMonthly
        END
      ) as mrr
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.planId = sp.id
      WHERE us.status = 'active'
    `).get();
    
    res.json({
      data: revenue,
      stats: {
        totalRevenue: totalRevenue.total || 0,
        thisMonth: thisMonth.total || 0,
        lastMonth: lastMonth.total || 0,
        mrr: mrr.mrr || 0,
        growth: lastMonth.total ? (((thisMonth.total || 0) - lastMonth.total) / lastMonth.total * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/usage', adminAuthMiddleware, (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let dateFilter = "date('now', '-30 days')";
    if (period === '7d') dateFilter = "date('now', '-7 days')";
    if (period === '90d') dateFilter = "date('now', '-90 days')";
    
    const usage = db.prepare(`
      SELECT date(startedAt) as date, 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as images,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as videos,
        SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chats
      FROM generations
      WHERE startedAt >= ${dateFilter}
      GROUP BY date(startedAt)
      ORDER BY date ASC
    `).all();
    
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as images,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as videos,
        SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chats,
        SUM(credits) as creditsUsed
      FROM generations
    `).get();
    
    const today = db.prepare(`
      SELECT COUNT(*) as count FROM generations WHERE date(startedAt) = date('now')
    `).get();
    
    // Popular models
    const popularModels = db.prepare(`
      SELECT model, modelName, COUNT(*) as count
      FROM generations
      WHERE startedAt >= ${dateFilter}
      GROUP BY model
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    res.json({
      data: usage,
      stats: {
        total: totals.total || 0,
        images: totals.images || 0,
        videos: totals.videos || 0,
        chats: totals.chats || 0,
        creditsUsed: totals.creditsUsed || 0,
        today: today.count
      },
      popularModels
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/active-users', adminAuthMiddleware, (req, res) => {
  try {
    const dau = db.prepare(`
      SELECT COUNT(DISTINCT userId) as count FROM generations WHERE date(startedAt) = date('now')
    `).get();
    
    const wau = db.prepare(`
      SELECT COUNT(DISTINCT userId) as count FROM generations WHERE startedAt >= date('now', '-7 days')
    `).get();
    
    const mau = db.prepare(`
      SELECT COUNT(DISTINCT userId) as count FROM generations WHERE startedAt >= date('now', '-30 days')
    `).get();
    
    res.json({
      dau: dau.count,
      wau: wau.count,
      mau: mau.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: ERROR LOGS ============
app.get('/api/admin/error-logs', adminAuthMiddleware, (req, res) => {
  try {
    const { type, severity, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];
    
    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (severity && severity !== 'all') {
      query += ' AND severity = ?';
      params.push(severity);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const logs = db.prepare(query).all(...params);
    logs.forEach(log => {
      log.metadata = JSON.parse(log.metadata || '{}');
    });
    const total = db.prepare('SELECT COUNT(*) as count FROM error_logs').get();
    
    res.json({ logs, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/error-logs/:id', adminAuthMiddleware, (req, res) => {
  try {
    const log = db.prepare('SELECT * FROM error_logs WHERE id = ?').get(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Error log not found' });
    }
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/error-logs/:id/resolve', adminAuthMiddleware, (req, res) => {
  try {
    db.prepare(`
      UPDATE error_logs SET resolved = 1, resolvedBy = ?, resolvedAt = datetime('now') WHERE id = ?
    `).run(req.admin.id, req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/error-logs/:id', adminAuthMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM error_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error stats summary for dashboard
app.get('/api/admin/error-stats', adminAuthMiddleware, (req, res) => {
  try {
    // Total errors
    const totalErrors = db.prepare('SELECT COUNT(*) as count FROM error_logs').get().count;
    const unresolvedErrors = db.prepare('SELECT COUNT(*) as count FROM error_logs WHERE resolved = 0').get().count;
    
    // Errors by type
    const byType = db.prepare(`
      SELECT type, COUNT(*) as count FROM error_logs 
      WHERE resolved = 0 
      GROUP BY type 
      ORDER BY count DESC
    `).all();
    
    // Errors by severity
    const bySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count FROM error_logs 
      WHERE resolved = 0 
      GROUP BY severity 
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'error' THEN 2 
          WHEN 'warning' THEN 3 
          ELSE 4 
        END
    `).all();
    
    // Errors by model (top 10)
    const byModel = db.prepare(`
      SELECT 
        json_extract(metadata, '$.modelName') as modelName,
        COUNT(*) as count
      FROM error_logs 
      WHERE resolved = 0 AND json_extract(metadata, '$.modelName') IS NOT NULL
      GROUP BY json_extract(metadata, '$.modelName')
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    // Recent errors trend (last 7 days)
    const trend = db.prepare(`
      SELECT 
        date(createdAt) as date,
        COUNT(*) as count,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warnings
      FROM error_logs 
      WHERE createdAt >= date('now', '-7 days')
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `).all();
    
    // Most common error codes
    const byErrorCode = db.prepare(`
      SELECT errorCode, COUNT(*) as count 
      FROM error_logs 
      WHERE resolved = 0 
      GROUP BY errorCode 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
    // Today's errors
    const todayErrors = db.prepare(`
      SELECT COUNT(*) as count FROM error_logs WHERE date(createdAt) = date('now')
    `).get().count;
    
    res.json({
      total: totalErrors,
      unresolved: unresolvedErrors,
      today: todayErrors,
      byType,
      bySeverity,
      byModel,
      byErrorCode,
      trend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get rate limit violations
app.get('/api/admin/rate-limit-violations', adminAuthMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const violations = db.prepare(`
      SELECT v.*, u.email, u.name
      FROM rate_limit_violations v
      LEFT JOIN users u ON v.userId = u.id
      ORDER BY v.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);
    
    const total = db.prepare('SELECT COUNT(*) as count FROM rate_limit_violations').get();
    
    res.json({ violations, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', adminAuthMiddleware, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.key.includes('ApiKey') ? s.value : (isNaN(s.value) ? s.value : parseFloat(s.value));
  });
  res.json(settingsObj);
});

app.put('/api/admin/settings', adminAuthMiddleware, (req, res) => {
  try {
    const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    Object.entries(req.body).forEach(([key, value]) => {
      // Handle null, undefined, and valid values
      if (value !== undefined && value !== null) {
        updateSetting.run(key, String(value));
      } else if (value === null) {
        // Store empty string for null values
        updateSetting.run(key, '');
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings', details: err.message });
  }
});

// Sync models endpoint
app.post('/api/admin/sync-models', adminAuthMiddleware, (req, res) => {
  syncModels();
  res.json({ success: true, message: 'Models synced' });
});

// Refresh pricing from APIs
app.post('/api/admin/refresh-pricing', adminAuthMiddleware, async (req, res) => {
  try {
    const results = { openrouter: { updated: 0, errors: [] }, fal: { updated: 0, errors: [] } };
    
    // Get OpenRouter API key
    const openRouterKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('openrouterApiKey')?.value;
    
    // Fetch OpenRouter pricing
    if (openRouterKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://omnihub.local',
            'X-Title': 'OmniHub'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const updateStmt = db.prepare(`
            UPDATE models 
            SET baseCost = ?, inputCost = ?, outputCost = ?, pricingLastChecked = datetime('now')
            WHERE id = ?
          `);
          
          // Map OpenRouter models to our models
          const ourChatModels = db.prepare("SELECT id FROM models WHERE type = 'chat'").all();
          
          for (const ourModel of ourChatModels) {
            const orModel = data.data?.find(m => m.id === ourModel.id);
            if (orModel && orModel.pricing) {
              // OpenRouter pricing is per token, convert to per 1K tokens
              const inputCost = parseFloat(orModel.pricing.prompt) * 1000 || 0;
              const outputCost = parseFloat(orModel.pricing.completion) * 1000 || 0;
              const baseCost = inputCost; // Use input cost as base
              
              updateStmt.run(baseCost, inputCost, outputCost, ourModel.id);
              results.openrouter.updated++;
            }
          }
        } else {
          results.openrouter.errors.push(`API returned ${response.status}`);
        }
      } catch (err) {
        results.openrouter.errors.push(err.message);
      }
    } else {
      results.openrouter.errors.push('No API key configured');
    }
    
    // Update Fal.ai models timestamp (pricing is manually configured)
    // Fal.ai doesn't have a public pricing API, so we just update the timestamp
    const updateFalStmt = db.prepare(`
      UPDATE models 
      SET pricingLastChecked = datetime('now')
      WHERE provider = 'Fal.ai'
    `);
    updateFalStmt.run();
    results.fal.updated = db.prepare("SELECT COUNT(*) as count FROM models WHERE provider = 'Fal.ai'").get().count;
    results.fal.note = 'Fal.ai pricing must be updated manually - no public API available';
    
    res.json({ 
      success: true, 
      message: `Updated ${results.openrouter.updated} OpenRouter models`,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pricing refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh pricing', details: error.message });
  }
});

// Get pricing status
app.get('/api/admin/pricing-status', adminAuthMiddleware, (req, res) => {
  const status = db.prepare(`
    SELECT 
      provider,
      COUNT(*) as total,
      MIN(pricingLastChecked) as oldestCheck,
      MAX(pricingLastChecked) as newestCheck
    FROM models 
    GROUP BY provider
  `).all();
  
  const globalLastCheck = db.prepare(`
    SELECT MAX(pricingLastChecked) as lastCheck FROM models
  `).get();
  
  res.json({
    providers: status,
    lastGlobalCheck: globalLastCheck?.lastCheck,
    timestamp: new Date().toISOString()
  });
});

// ============ UPLOADED ASSETS API ============
// Get user's uploaded assets history
app.get('/api/uploads', userAuthMiddleware, (req, res) => {
  const uploads = db.prepare(`
    SELECT * FROM uploaded_assets WHERE userId = ? ORDER BY uploadedAt DESC LIMIT 100
  `).all(req.user.id);
  res.json(uploads);
});

// Save uploaded asset reference
app.post('/api/uploads', userAuthMiddleware, (req, res) => {
  const { url, filename, type = 'image' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.prepare(`
    INSERT INTO uploaded_assets (id, userId, url, filename, type)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, url, filename || null, type);
  
  res.json({ id, url, filename, type });
});

// Delete uploaded asset
app.delete('/api/uploads/:id', userAuthMiddleware, (req, res) => {
  const result = db.prepare(`
    DELETE FROM uploaded_assets WHERE id = ? AND userId = ?
  `).run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  res.json({ success: true });
});


// ============ PROJECTS API ============
// Get user's projects
app.get('/api/projects', userAuthMiddleware, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, 
           (SELECT COUNT(*) FROM project_assets WHERE projectId = p.id) as assetCount
    FROM projects p 
    WHERE p.userId = ? 
    ORDER BY p.createdAt DESC
  `).all(req.user.id);
  
  // Include assets for each project
  projects.forEach(project => {
    project.assets = db.prepare(`
      SELECT * FROM project_assets WHERE projectId = ? ORDER BY addedAt DESC LIMIT 20
    `).all(project.id);
  });
  
  res.json(projects);
});

// Create new project
app.post('/api/projects', userAuthMiddleware, (req, res) => {
  const { name, description, color = '#8b5cf6' } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  
  const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.prepare(`
    INSERT INTO projects (id, userId, name, description, color)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, description || null, color);
  
  res.json({ id, name, description, color, assetCount: 0 });
});

// Update project
app.put('/api/projects/:id', userAuthMiddleware, (req, res) => {
  const { name, description, color } = req.body;
  
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  db.prepare(`
    UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color)
    WHERE id = ?
  `).run(name || null, description, color || null, req.params.id);
  
  res.json({ success: true });
});

// Delete project
app.delete('/api/projects/:id', userAuthMiddleware, (req, res) => {
  const result = db.prepare(`
    DELETE FROM projects WHERE id = ? AND userId = ?
  `).run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ success: true });
});

// Get project assets
app.get('/api/projects/:id/assets', userAuthMiddleware, (req, res) => {
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const assets = db.prepare(`
    SELECT * FROM project_assets WHERE projectId = ? ORDER BY addedAt DESC
  `).all(req.params.id);
  res.json(assets);
});

// Add asset to project
app.post('/api/projects/:id/assets', userAuthMiddleware, (req, res) => {
  const { assetUrl, assetType = 'image', name, tag } = req.body;
  if (!assetUrl) {
    return res.status(400).json({ error: 'Asset URL is required' });
  }
  
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Check for duplicate - same asset URL in same project
  const existing = db.prepare('SELECT * FROM project_assets WHERE projectId = ? AND assetUrl = ?').get(req.params.id, assetUrl);
  if (existing) {
    return res.status(409).json({ error: 'This image is already saved to this project', duplicate: true });
  }
  
  const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.prepare(`
    INSERT INTO project_assets (id, projectId, assetUrl, assetType, name, tag)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, assetUrl, assetType, name || null, tag || null);
  
  res.json({ id, assetUrl, assetType, name, tag, message: 'Saved to project successfully' });
});

// Update asset tag
app.patch('/api/projects/:id/assets/:assetId', userAuthMiddleware, (req, res) => {
  const { tag, name } = req.body;
  
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const asset = db.prepare('SELECT * FROM project_assets WHERE id = ? AND projectId = ?').get(req.params.assetId, req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  
  const updates = [];
  const params = [];
  if (tag !== undefined) { updates.push('tag = ?'); params.push(tag); }
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  
  if (updates.length > 0) {
    params.push(req.params.assetId);
    db.prepare(`UPDATE project_assets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  
  res.json({ success: true });
});

// Get project tags
app.get('/api/projects/:id/tags', userAuthMiddleware, (req, res) => {
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const tags = db.prepare(`
    SELECT DISTINCT tag FROM project_assets WHERE projectId = ? AND tag IS NOT NULL AND tag != ''
  `).all(req.params.id);
  
  res.json(tags.map(t => t.tag));
});

// Remove asset from project
app.delete('/api/projects/:id/assets/:assetId', userAuthMiddleware, (req, res) => {
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const result = db.prepare(`
    DELETE FROM project_assets WHERE id = ? AND projectId = ?
  `).run(req.params.assetId, req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ success: true });
});


// ============ AI TOOLS API ============
// Get AI tools (public) - filtered by location
app.get('/api/ai-tools', (req, res) => {
  const { location } = req.query; // 'dashboard', 'landing', or 'all'
  
  try {
    let query = 'SELECT * FROM ai_tools WHERE isActive = 1';
    
    if (location === 'dashboard') {
      query += ' AND showOnDashboard = 1';
    } else if (location === 'landing') {
      query += ' AND showOnLanding = 1';
    }
    
    query += ' ORDER BY displayOrder ASC';
    
    const tools = db.prepare(query).all();
    res.json(tools);
  } catch (err) {
    console.error('Failed to get AI tools:', err);
    res.status(500).json({ error: 'Failed to get AI tools' });
  }
});

// Admin: Get all AI tools
app.get('/api/admin/ai-tools', adminAuthMiddleware, (req, res) => {
  try {
    const tools = db.prepare('SELECT * FROM ai_tools ORDER BY displayOrder ASC').all();
    res.json(tools);
  } catch (err) {
    console.error('Failed to get AI tools:', err);
    res.status(500).json({ error: 'Failed to get AI tools' });
  }
});

// Admin: Create AI tool
app.post('/api/admin/ai-tools', adminAuthMiddleware, (req, res) => {
  const { name, description, icon, color, backgroundImage, badge, route, showOnLanding, showOnDashboard, displayOrder } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    db.prepare(`
      INSERT INTO ai_tools (id, name, description, icon, color, backgroundImage, badge, route, showOnLanding, showOnDashboard, displayOrder, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id, 
      name, 
      description || '', 
      icon || 'Sparkles', 
      color || 'from-cyan-500 to-blue-500', 
      backgroundImage || '',
      badge || null,
      route || `/tools/${id}`,
      showOnLanding ? 1 : 0,
      showOnDashboard !== false ? 1 : 0,
      displayOrder || 0
    );
    
    const created = db.prepare('SELECT * FROM ai_tools WHERE id = ?').get(id);
    res.json(created);
  } catch (err) {
    console.error('Failed to create AI tool:', err);
    res.status(500).json({ error: 'Failed to create AI tool' });
  }
});

// Admin: Update AI tool
app.put('/api/admin/ai-tools/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, description, icon, color, backgroundImage, badge, route, showOnLanding, showOnDashboard, displayOrder, isActive } = req.body;
  
  try {
    const existing = db.prepare('SELECT * FROM ai_tools WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'AI tool not found' });
    }
    
    db.prepare(`
      UPDATE ai_tools 
      SET name = ?, description = ?, icon = ?, color = ?, backgroundImage = ?, 
          badge = ?, route = ?, showOnLanding = ?, showOnDashboard = ?, displayOrder = ?, isActive = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      icon || existing.icon,
      color || existing.color,
      backgroundImage !== undefined ? backgroundImage : existing.backgroundImage,
      badge !== undefined ? badge : existing.badge,
      route || existing.route,
      showOnLanding !== undefined ? (showOnLanding ? 1 : 0) : existing.showOnLanding,
      showOnDashboard !== undefined ? (showOnDashboard ? 1 : 0) : existing.showOnDashboard,
      displayOrder !== undefined ? displayOrder : existing.displayOrder,
      isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
      id
    );
    
    const updated = db.prepare('SELECT * FROM ai_tools WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update AI tool:', err);
    res.status(500).json({ error: 'Failed to update AI tool' });
  }
});

// Admin: Delete AI tool
app.delete('/api/admin/ai-tools/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  
  try {
    const result = db.prepare('DELETE FROM ai_tools WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'AI tool not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete AI tool:', err);
    res.status(500).json({ error: 'Failed to delete AI tool' });
  }
});

// Admin: Reorder AI tools
app.post('/api/admin/ai-tools/reorder', adminAuthMiddleware, (req, res) => {
  const { items } = req.body; // Array of { id, displayOrder }
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  
  try {
    const updateOrder = db.prepare('UPDATE ai_tools SET displayOrder = ? WHERE id = ?');
    items.forEach(item => {
      updateOrder.run(item.displayOrder, item.id);
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reorder AI tools:', err);
    res.status(500).json({ error: 'Failed to reorder AI tools' });
  }
});

// Seed default AI tools if empty
function seedDefaultAiTools() {
  const count = db.prepare('SELECT COUNT(*) as count FROM ai_tools').get().count;
  if (count === 0) {
    const defaultTools = [
      { id: 'chat-arena', name: 'Chat Arena', description: 'Compare responses from multiple AI models side by side', icon: 'MessageSquare', color: 'from-purple-500 to-indigo-600', badge: 'New', showOnDashboard: 1, showOnLanding: 1, displayOrder: 0 },
      { id: 'chat-edit-image', name: 'Chat To Edit Image', description: 'Use natural language to edit and transform your images', icon: 'Wand2', color: 'from-cyan-500 to-blue-600', badge: 'New', showOnDashboard: 1, showOnLanding: 1, displayOrder: 1 },
      { id: 'chat-edit-video', name: 'Chat To Edit Video', description: 'Edit videos using conversational AI commands', icon: 'Video', color: 'from-pink-500 to-rose-600', badge: 'New', showOnDashboard: 1, showOnLanding: 0, displayOrder: 2 },
      { id: 'lip-sync', name: 'Lip Sync', description: 'Sync lips to any audio track automatically', icon: 'Mic', color: 'from-orange-500 to-red-600', badge: 'New', showOnDashboard: 1, showOnLanding: 0, displayOrder: 3 },
      { id: 'video-bg-remove', name: 'Video Background Remover', description: 'Remove or replace video backgrounds instantly', icon: 'Eraser', color: 'from-teal-500 to-cyan-600', badge: 'New', showOnDashboard: 1, showOnLanding: 0, displayOrder: 4 },
      { id: 'auto-subtitle', name: 'Auto Subtitle', description: 'Generate accurate subtitles automatically', icon: 'Subtitles', color: 'from-green-500 to-emerald-600', badge: 'New', showOnDashboard: 1, showOnLanding: 0, displayOrder: 5 },
      { id: 'old-photo', name: 'Old Photo Restoration', description: 'Turn old, worn-out photos into crisp, clear, high-quality images', icon: 'Palette', color: 'from-amber-500 to-orange-600', badge: 'Save', showOnDashboard: 1, showOnLanding: 0, displayOrder: 6 },
      { id: 'image-upscale', name: 'Image Upscale', description: 'Transform low or medium resolution images into high resolution', icon: 'ImagePlus', color: 'from-violet-500 to-purple-600', badge: 'Save', showOnDashboard: 1, showOnLanding: 0, displayOrder: 7 },
    ];
    
    const insert = db.prepare(`
      INSERT INTO ai_tools (id, name, description, icon, color, badge, route, showOnLanding, showOnDashboard, displayOrder, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    defaultTools.forEach(tool => {
      insert.run(tool.id, tool.name, tool.description, tool.icon, tool.color, tool.badge, `/tools/${tool.id}`, tool.showOnLanding, tool.showOnDashboard, tool.displayOrder);
    });
    
    console.log('✅ Seeded default AI tools');
  }
}

// ============ LANDING PAGE API ============
// Get active featured items (public)
app.get('/api/landing/featured', (req, res) => {
  try {
    const featured = db.prepare(`
      SELECT * FROM landing_featured 
      WHERE isActive = 1 
        AND (expiresAt IS NULL OR expiresAt > datetime('now'))
      ORDER BY displayOrder ASC
    `).all();
    res.json(featured);
  } catch (err) {
    console.error('Failed to get featured items:', err);
    res.status(500).json({ error: 'Failed to get featured items' });
  }
});

// Get landing page models (public)
app.get('/api/landing/models', (req, res) => {
  try {
    const landingModels = db.prepare(`
      SELECT lm.*, m.name, m.provider, m.type, m.credits, m.providerName, m.tags,
             m.category as modelCategory
      FROM landing_models lm
      JOIN models m ON lm.modelId = m.id
      WHERE lm.isVisible = 1 AND m.enabled = 1
      ORDER BY lm.category, lm.displayOrder ASC
    `).all();
    
    // Parse tags and group by category
    const grouped = { image: [], video: [], chat: [] };
    landingModels.forEach(m => {
      m.tags = JSON.parse(m.tags || '[]');
      const type = m.type || 'image';
      if (grouped[type]) {
        grouped[type].push({
          id: m.modelId,
          name: m.name,
          provider: m.providerName || m.provider,
          cost: `$${m.credits?.toFixed(2) || '0.00'}`,
          tags: m.tags.slice(0, 2),
          type: m.type,
        });
      }
    });
    
    res.json(grouped);
  } catch (err) {
    console.error('Failed to get landing models:', err);
    res.status(500).json({ error: 'Failed to get landing models' });
  }
});

// Admin: Get all featured items
app.get('/api/admin/landing/featured', adminAuthMiddleware, (req, res) => {
  try {
    const featured = db.prepare(`
      SELECT * FROM landing_featured ORDER BY displayOrder ASC
    `).all();
    res.json(featured);
  } catch (err) {
    console.error('Failed to get featured items:', err);
    res.status(500).json({ error: 'Failed to get featured items' });
  }
});

// Admin: Create featured item
app.post('/api/admin/landing/featured', adminAuthMiddleware, (req, res) => {
  const { type, title, description, mediaUrl, mediaType, linkUrl, linkText, displayOrder, isActive, expiresAt } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    const id = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO landing_featured (id, type, title, description, mediaUrl, mediaType, linkUrl, linkText, displayOrder, isActive, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type || 'announcement', title, description, mediaUrl, mediaType || 'image', linkUrl, linkText, displayOrder || 0, isActive !== false ? 1 : 0, expiresAt || null);
    
    const created = db.prepare('SELECT * FROM landing_featured WHERE id = ?').get(id);
    res.json(created);
  } catch (err) {
    console.error('Failed to create featured item:', err);
    res.status(500).json({ error: 'Failed to create featured item' });
  }
});

// Admin: Update featured item
app.put('/api/admin/landing/featured/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const { type, title, description, mediaUrl, mediaType, linkUrl, linkText, displayOrder, isActive, expiresAt } = req.body;
  
  try {
    const existing = db.prepare('SELECT * FROM landing_featured WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Featured item not found' });
    }
    
    db.prepare(`
      UPDATE landing_featured 
      SET type = ?, title = ?, description = ?, mediaUrl = ?, mediaType = ?, 
          linkUrl = ?, linkText = ?, displayOrder = ?, isActive = ?, expiresAt = ?
      WHERE id = ?
    `).run(
      type || existing.type,
      title || existing.title,
      description !== undefined ? description : existing.description,
      mediaUrl !== undefined ? mediaUrl : existing.mediaUrl,
      mediaType || existing.mediaType,
      linkUrl !== undefined ? linkUrl : existing.linkUrl,
      linkText !== undefined ? linkText : existing.linkText,
      displayOrder !== undefined ? displayOrder : existing.displayOrder,
      isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
      expiresAt !== undefined ? expiresAt : existing.expiresAt,
      id
    );
    
    const updated = db.prepare('SELECT * FROM landing_featured WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update featured item:', err);
    res.status(500).json({ error: 'Failed to update featured item' });
  }
});

// Admin: Delete featured item
app.delete('/api/admin/landing/featured/:id', adminAuthMiddleware, (req, res) => {
  const { id } = req.params;
  
  try {
    const result = db.prepare('DELETE FROM landing_featured WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Featured item not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete featured item:', err);
    res.status(500).json({ error: 'Failed to delete featured item' });
  }
});

// Admin: Reorder featured items
app.post('/api/admin/landing/featured/reorder', adminAuthMiddleware, (req, res) => {
  const { items } = req.body; // Array of { id, displayOrder }
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  
  try {
    const updateOrder = db.prepare('UPDATE landing_featured SET displayOrder = ? WHERE id = ?');
    items.forEach(item => {
      updateOrder.run(item.displayOrder, item.id);
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reorder featured items:', err);
    res.status(500).json({ error: 'Failed to reorder featured items' });
  }
});

// Admin: Get landing models config
app.get('/api/admin/landing/models', adminAuthMiddleware, (req, res) => {
  try {
    // Get all models with their landing config
    const models = db.prepare(`
      SELECT m.id, m.name, m.type, m.providerName, m.credits, m.enabled,
             lm.id as landingId, lm.category, lm.displayOrder, lm.isVisible
      FROM models m
      LEFT JOIN landing_models lm ON m.id = lm.modelId
      WHERE m.enabled = 1
      ORDER BY m.type, lm.displayOrder, m.name
    `).all();
    
    res.json(models);
  } catch (err) {
    console.error('Failed to get landing models:', err);
    res.status(500).json({ error: 'Failed to get landing models' });
  }
});

// Admin: Update landing models config
app.put('/api/admin/landing/models', adminAuthMiddleware, (req, res) => {
  const { models } = req.body; // Array of { modelId, category, displayOrder, isVisible }
  
  if (!Array.isArray(models)) {
    return res.status(400).json({ error: 'Models array is required' });
  }
  
  try {
    const upsert = db.prepare(`
      INSERT INTO landing_models (id, modelId, category, displayOrder, isVisible)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(modelId) DO UPDATE SET
        category = excluded.category,
        displayOrder = excluded.displayOrder,
        isVisible = excluded.isVisible
    `);
    
    // Add unique constraint if not exists (for upsert)
    try {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_models_modelId ON landing_models(modelId)');
    } catch (e) { /* ignore if already exists */ }
    
    models.forEach(m => {
      const id = require('crypto').randomUUID();
      upsert.run(id, m.modelId, m.category || 'featured', m.displayOrder || 0, m.isVisible !== false ? 1 : 0);
    });
    
    res.json({ success: true, updated: models.length });
  } catch (err) {
    console.error('Failed to update landing models:', err);
    res.status(500).json({ error: 'Failed to update landing models' });
  }
});


// ============ COMMUNITY API ============
// Publish a generation to community
app.post('/api/community/publish', userAuthMiddleware, (req, res) => {
  const { generationId, title, isNsfw = false } = req.body;
  
  if (!generationId) {
    return res.status(400).json({ error: 'Generation ID is required' });
  }
  
  // Get the generation
  const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?').get(generationId, req.user.id);
  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }
  
  if (generation.type !== 'image') {
    return res.status(400).json({ error: 'Only images can be published to community' });
  }
  
  if (!generation.result) {
    return res.status(400).json({ error: 'Generation has no result' });
  }
  
  // Check if already published
  const existing = db.prepare('SELECT id FROM community_posts WHERE generationId = ?').get(generationId);
  if (existing) {
    return res.status(400).json({ error: 'This generation is already published' });
  }
  
  // Get or create user nickname
  let userNickname = req.user.nickname;
  if (!userNickname) {
    userNickname = generateUniqueNickname();
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(userNickname, req.user.id);
  }
  
  // Categorize the prompt
  const category = categorizePrompt(generation.prompt);
  
  // Create the post
  const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  db.prepare(`
    INSERT INTO community_posts (id, generationId, userId, nickname, title, category, imageUrl, thumbnailUrl, prompt, modelName, isNsfw)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    postId,
    generationId,
    req.user.id,
    userNickname,
    title || null,
    category,
    generation.result,
    generation.thumbnailUrl || null,
    generation.prompt,
    generation.modelName,
    isNsfw ? 1 : 0
  );
  
  res.json({ 
    id: postId, 
    category,
    message: 'Published to community successfully' 
  });
});

// Get community feed
app.get('/api/community', (req, res) => {
  const { category, sort = 'latest', page = 1, limit = 24 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let whereClause = '';
  const params = [];
  
  if (category && category !== 'all') {
    whereClause = 'WHERE category = ?';
    params.push(category);
  }
  
  let orderClause = 'ORDER BY publishedAt DESC';
  if (sort === 'popular') {
    orderClause = 'ORDER BY likeCount DESC, publishedAt DESC';
  } else if (sort === 'trending') {
    // Trending = recent posts with high engagement
    orderClause = 'ORDER BY (likeCount * 1.0 / (julianday("now") - julianday(publishedAt) + 1)) DESC';
  }
  
  const posts = db.prepare(`
    SELECT * FROM community_posts
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  
  // Get total count
  const countResult = db.prepare(`
    SELECT COUNT(*) as count FROM community_posts ${whereClause}
  `).get(...params);
  
  // Check if current user liked each post (if authenticated)
  const token = req.headers.authorization?.replace('Bearer ', '');
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (e) {
      // Not authenticated, that's ok
    }
  }
  
  const postsWithLikeStatus = posts.map(post => {
    let isLiked = false;
    if (userId) {
      const like = db.prepare('SELECT id FROM community_likes WHERE postId = ? AND userId = ?').get(post.id, userId);
      isLiked = !!like;
    }
    return { ...post, isLiked };
  });
  
  res.json({
    posts: postsWithLikeStatus,
    total: countResult.count,
    page: parseInt(page),
    totalPages: Math.ceil(countResult.count / parseInt(limit))
  });
});

// Get single community post
app.get('/api/community/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(req.params.id);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Increment view count
  db.prepare('UPDATE community_posts SET viewCount = viewCount + 1 WHERE id = ?').run(req.params.id);
  
  // Check if current user liked
  const token = req.headers.authorization?.replace('Bearer ', '');
  let isLiked = false;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const like = db.prepare('SELECT id FROM community_likes WHERE postId = ? AND userId = ?').get(post.id, decoded.userId);
      isLiked = !!like;
    } catch (e) {
      // Not authenticated
    }
  }
  
  res.json({ ...post, isLiked, viewCount: post.viewCount + 1 });
});

// Toggle like on a post
app.post('/api/community/:id/like', userAuthMiddleware, (req, res) => {
  const postId = req.params.id;
  
  // Check if post exists
  const post = db.prepare('SELECT id FROM community_posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Check if already liked
  const existingLike = db.prepare('SELECT id FROM community_likes WHERE postId = ? AND userId = ?').get(postId, req.user.id);
  
  if (existingLike) {
    // Unlike
    db.prepare('DELETE FROM community_likes WHERE id = ?').run(existingLike.id);
    db.prepare('UPDATE community_posts SET likeCount = likeCount - 1 WHERE id = ?').run(postId);
    
    const updatedPost = db.prepare('SELECT likeCount FROM community_posts WHERE id = ?').get(postId);
    res.json({ liked: false, likeCount: updatedPost.likeCount });
  } else {
    // Like
    const likeId = `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare('INSERT INTO community_likes (id, postId, userId) VALUES (?, ?, ?)').run(likeId, postId, req.user.id);
    db.prepare('UPDATE community_posts SET likeCount = likeCount + 1 WHERE id = ?').run(postId);
    
    const updatedPost = db.prepare('SELECT likeCount FROM community_posts WHERE id = ?').get(postId);
    res.json({ liked: true, likeCount: updatedPost.likeCount });
  }
});

// Unpublish (delete) a community post
app.delete('/api/community/:id', userAuthMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM community_posts WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Post not found or unauthorized' });
  }
  
  res.json({ success: true });
});

// Get user's published posts
app.get('/api/community/user/me', userAuthMiddleware, (req, res) => {
  const posts = db.prepare(`
    SELECT * FROM community_posts WHERE userId = ? ORDER BY publishedAt DESC
  `).all(req.user.id);
  
  res.json(posts);
});

// Get available categories
app.get('/api/community/categories', (req, res) => {
  const categories = Object.keys(PROMPT_CATEGORIES);
  
  // Get counts for each category
  const categoryCounts = db.prepare(`
    SELECT category, COUNT(*) as count FROM community_posts GROUP BY category
  `).all();
  
  const countsMap = {};
  categoryCounts.forEach(c => countsMap[c.category] = c.count);
  
  const result = ['all', ...categories, 'other'].map(cat => ({
    id: cat,
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: cat === 'all' 
      ? categoryCounts.reduce((sum, c) => sum + c.count, 0)
      : (countsMap[cat] || 0)
  }));
  
  res.json(result);
});


// ============ SHARE API ============
// Create a shareable link for a generation
app.post('/api/share', userAuthMiddleware, (req, res) => {
  const { generationId, allowDownload = true, expiresInDays } = req.body;
  
  if (!generationId) {
    return res.status(400).json({ error: 'Generation ID is required' });
  }
  
  // Check if user owns the generation
  const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND userId = ?')
    .get(generationId, req.user.id);
  
  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }
  
  // Check if already shared
  const existingShare = db.prepare('SELECT * FROM shared_generations WHERE generationId = ? AND userId = ?')
    .get(generationId, req.user.id);
  
  if (existingShare) {
    return res.json({
      shareToken: existingShare.shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${existingShare.shareToken}`,
      allowDownload: existingShare.allowDownload === 1,
      viewCount: existingShare.viewCount
    });
  }
  
  // Generate unique share token
  const shareToken = uuidv4().slice(0, 8) + uuidv4().slice(0, 8);
  const id = uuidv4();
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  db.prepare(`
    INSERT INTO shared_generations (id, generationId, userId, shareToken, allowDownload, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, generationId, req.user.id, shareToken, allowDownload ? 1 : 0, expiresAt);
  
  res.json({
    shareToken,
    shareUrl: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
    allowDownload,
    viewCount: 0
  });
});

// Get shared generation (public - no auth required)
app.get('/api/share/:token', (req, res) => {
  const share = db.prepare(`
    SELECT sg.*, g.result, g.thumbnailUrl, g.prompt, g.type, g.model, g.modelName, 
           g.options, g.credits, g.startedAt, g.status
    FROM shared_generations sg
    JOIN generations g ON sg.generationId = g.id
    WHERE sg.shareToken = ?
  `).get(req.params.token);
  
  if (!share) {
    return res.status(404).json({ error: 'Shared content not found' });
  }
  
  // Check if expired
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Share link has expired' });
  }
  
  // Increment view count
  db.prepare('UPDATE shared_generations SET viewCount = viewCount + 1 WHERE id = ?').run(share.id);
  
  // Return public-safe data (no user info)
  res.json({
    type: share.type,
    result: share.result,
    thumbnailUrl: share.thumbnailUrl,
    prompt: share.prompt,
    modelName: share.modelName,
    credits: share.credits,
    createdAt: share.startedAt,
    allowDownload: share.allowDownload === 1,
    viewCount: share.viewCount + 1
  });
});

// Revoke a share
app.delete('/api/share/:id', userAuthMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM shared_generations WHERE id = ? AND userId = ?')
    .run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Share not found or unauthorized' });
  }
  
  res.json({ success: true });
});

// Get user's shares
app.get('/api/shares', userAuthMiddleware, (req, res) => {
  const shares = db.prepare(`
    SELECT sg.*, g.thumbnailUrl, g.type, g.modelName
    FROM shared_generations sg
    JOIN generations g ON sg.generationId = g.id
    WHERE sg.userId = ?
    ORDER BY sg.createdAt DESC
  `).all(req.user.id);
  
  res.json(shares);
});


// ============ PROMPT ENHANCEMENT API ============
// Enhance prompt using GPT-4o Vision
// Helper function to convert image URL to base64 data URL
async function urlToBase64(url) {
  try {
    // If already a data URL, return as-is
    if (url.startsWith('data:')) {
      return url;
    }
    
    // Fetch the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'OmniHub/1.0'
      }
    });
    
    // Determine content type
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Convert to base64
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('[URL_TO_BASE64] Failed to convert URL:', url, error.message);
    // Return original URL as fallback
    return url;
  }
}

app.post('/api/enhance-prompt', userAuthMiddleware, async (req, res) => {
  const { prompt, imageUrls, variationType = 'enhance' } = req.body;
  // variationType: 'enhance' | 'slight_variation' | 'strong_variation'
  
  if (!prompt && !imageUrls?.length) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }
  
  const openrouterKey = getSetting('openrouterApiKey');
  if (!openrouterKey) {
    return res.status(400).json({ error: 'OpenRouter API key not configured' });
  }
  
  // Use GPT-4o for vision capabilities
  const model = getModel('openai/gpt-4o');
  if (!model) {
    return res.status(400).json({ error: 'GPT-4o model not available' });
  }
  
  // Calculate estimated cost
  const promptTokens = Math.ceil((prompt || '').length / 4);
  // Each image tile (~512px) costs ~85 tokens, estimate 4 tiles per image
  const imageTokens = (imageUrls?.length || 0) * 85 * 4;
  const inputTokensEstimate = promptTokens + imageTokens + 200; // 200 for system prompt
  
  // Estimate output at ~200 tokens for enhanced prompt
  const outputTokensEstimate = 250;
  const estimatedCost = (inputTokensEstimate * model.inputCost / 1000) + (outputTokensEstimate * model.outputCost / 1000);
  
  // Check user credits
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
  if (user.credits < estimatedCost) {
    return res.status(402).json({ 
      error: 'Insufficient credits', 
      required: estimatedCost, 
      available: user.credits 
    });
  }
  
  // Build system prompt based on variation type
  let systemPrompt;
  if (variationType === 'enhance') {
    systemPrompt = `You are an expert AI image prompt engineer. Analyze the provided image (if any) and the user's prompt, then create an enhanced, more detailed prompt that will produce better results with AI image generators.

Guidelines:
- Add rich visual details, lighting descriptions, artistic style
- Include composition, perspective, and mood
- Keep the core idea but enhance with professional prompt techniques
- Output ONLY the enhanced prompt, no explanations
- Maximum 150 words`;
  } else if (variationType === 'slight_variation') {
    systemPrompt = `You are an expert AI image prompt engineer. Based on the provided image and prompt, create a SUBTLE variation prompt that maintains the core composition and style but with minor creative changes.

Guidelines:
- Keep 80-90% of the original concept
- Make small adjustments to colors, lighting, or minor details
- Maintain the same subject and composition
- Output ONLY the variation prompt, no explanations
- Maximum 150 words`;
  } else {
    systemPrompt = `You are an expert AI image prompt engineer. Based on the provided image and prompt, create a DRAMATIC variation prompt that reimagines the concept in a significantly different way.

Guidelines:
- Keep the core subject but change style, setting, or mood dramatically
- Try different artistic styles, time periods, or perspectives
- Be creative and bold with the transformation
- Output ONLY the variation prompt, no explanations
- Maximum 150 words`;
  }
  
  // Build messages
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add user message with image if provided
  // Convert external URLs to base64 for reliable GPT-4o vision access
  if (imageUrls?.length > 0) {
    console.log('[ENHANCE] Converting image URLs to base64 for GPT-4o vision...');
    const base64Images = await Promise.all(imageUrls.map(url => urlToBase64(url)));
    
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt || 'Describe this image and create an enhanced prompt for recreating it.' },
        ...base64Images.map(url => ({ 
          type: 'image_url', 
          image_url: { url, detail: 'low' } // Use low detail to reduce cost
        }))
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-4o',
      messages,
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'OmniHub Enhance'
      }
    });
    
    const enhancedPrompt = response.data.choices?.[0]?.message?.content?.trim();
    if (!enhancedPrompt) {
      return res.status(500).json({ error: 'Failed to generate enhanced prompt' });
    }
    
    // Calculate actual cost from usage
    const usage = response.data.usage || {};
    const actualInputTokens = usage.prompt_tokens || inputTokensEstimate;
    const actualOutputTokens = usage.completion_tokens || outputTokensEstimate;
    const actualCost = (actualInputTokens * model.inputCost / 1000) + (actualOutputTokens * model.outputCost / 1000);
    
    // Deduct credits
    db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(actualCost, req.user.id);
    const updatedUser = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
    
    res.json({
      enhancedPrompt,
      credits: actualCost,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      remainingCredits: updatedUser.credits
    });
    
  } catch (error) {
    console.error('[ENHANCE] Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to enhance prompt: ' + (error.response?.data?.error?.message || error.message) });
  }
});

// Get enhancement cost estimate
app.post('/api/enhance-prompt/estimate', userAuthMiddleware, (req, res) => {
  const { prompt, imageCount = 0 } = req.body;
  
  const model = getModel('openai/gpt-4o');
  if (!model) {
    return res.status(400).json({ error: 'Model not available' });
  }
  
  // Calculate estimated cost
  const promptTokens = Math.ceil((prompt || '').length / 4);
  const imageTokens = imageCount * 85 * 4; // ~85 tokens per 512px tile, estimate 4 tiles
  const inputTokensEstimate = promptTokens + imageTokens + 200; // 200 for system prompt
  const outputTokensEstimate = 250;
  
  const estimatedCost = (inputTokensEstimate * model.inputCost / 1000) + (outputTokensEstimate * model.outputCost / 1000);
  
  res.json({
    estimatedCost,
    inputTokens: inputTokensEstimate,
    outputTokens: outputTokensEstimate
  });
});


// ============ PROFILE API ============
// Get current user profile
app.get('/api/profile', userAuthMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, credits, nickname, avatarUrl, bio, isPublicProfile, createdAt
    FROM users WHERE id = ?
  `).get(req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Get stats
  const generationCount = db.prepare('SELECT COUNT(*) as count FROM generations WHERE userId = ?').get(req.user.id);
  const publishedCount = db.prepare('SELECT COUNT(*) as count FROM community_posts WHERE userId = ?').get(req.user.id);
  const likesReceived = db.prepare(`
    SELECT SUM(likeCount) as total FROM community_posts WHERE userId = ?
  `).get(req.user.id);
  
  res.json({
    ...user,
    stats: {
      generations: generationCount.count,
      published: publishedCount.count,
      likesReceived: likesReceived.total || 0
    }
  });
});

// Update profile
app.put('/api/profile', userAuthMiddleware, (req, res) => {
  const { name, bio, avatarUrl, isPublicProfile } = req.body;
  
  db.prepare(`
    UPDATE users SET 
      name = COALESCE(?, name),
      bio = COALESCE(?, bio),
      avatarUrl = COALESCE(?, avatarUrl),
      isPublicProfile = COALESCE(?, isPublicProfile)
    WHERE id = ?
  `).run(
    name || null,
    bio !== undefined ? bio : null,
    avatarUrl || null,
    isPublicProfile !== undefined ? (isPublicProfile ? 1 : 0) : null,
    req.user.id
  );
  
  res.json({ success: true });
});

// Regenerate nickname
app.post('/api/profile/regenerate-nickname', userAuthMiddleware, (req, res) => {
  const newNickname = generateUniqueNickname();
  
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(newNickname, req.user.id);
  
  // Update nickname on all community posts by this user
  db.prepare('UPDATE community_posts SET nickname = ? WHERE userId = ?').run(newNickname, req.user.id);
  
  res.json({ nickname: newNickname });
});

// Get public profile by nickname
app.get('/api/profile/:nickname', (req, res) => {
  const user = db.prepare(`
    SELECT id, nickname, avatarUrl, bio, createdAt, isPublicProfile
    FROM users WHERE nickname = ?
  `).get(req.params.nickname);
  
  if (!user || !user.isPublicProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  // Get published posts
  const posts = db.prepare(`
    SELECT * FROM community_posts WHERE userId = ? ORDER BY publishedAt DESC
  `).all(user.id);
  
  // Get stats
  const likesReceived = db.prepare(`
    SELECT SUM(likeCount) as total FROM community_posts WHERE userId = ?
  `).get(user.id);
  
  res.json({
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    memberSince: user.createdAt,
    posts,
    stats: {
      published: posts.length,
      likesReceived: likesReceived.total || 0
    }
  });
});


// ============ RAZORPAY & PAYMENTS ============
// Initialize Razorpay (lazy loading to handle missing keys)
let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance) {
    const keyId = db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeyId')?.value;
    const keySecret = db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeySecret')?.value;
    
    if (keyId && keySecret) {
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
    }
  }
  return razorpayInstance;
}

// Reset Razorpay instance when settings change
function resetRazorpay() {
  razorpayInstance = null;
}

// Get subscription plans
app.get('/api/subscription-plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM subscription_plans ORDER BY displayOrder ASC').all();
    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]')
    }));
    res.json(formattedPlans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Razorpay order for subscription/credits
app.post('/api/payments/create-order', userAuthMiddleware, async (req, res) => {
  try {
    const { planId, billingCycle, type = 'subscription' } = req.body;
    const razorpay = getRazorpay();
    
    if (!razorpay) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }
    
    let amount = 0;
    let description = '';
    
    if (type === 'subscription' && planId) {
      const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
      description = `${plan.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`;
    } else if (type === 'credits') {
      const { credits } = req.body;
      const creditPrice = parseFloat(db.prepare('SELECT value FROM settings WHERE key = ?').get('creditPrice')?.value || '1');
      amount = Math.round(credits * creditPrice * 100); // Convert to paise
      description = `${credits} Credits Purchase`;
    }
    
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: uuidv4(),
      notes: {
        userId: req.user.id,
        planId: planId || '',
        billingCycle: billingCycle || '',
        type
      }
    });
    
    // Store payment record
    db.prepare(`
      INSERT INTO payments (id, userId, amount, type, description, razorpayOrderId, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(uuidv4(), req.user.id, amount, type, description, order.id);
    
    // Log audit
    logAudit(null, 'payment_initiated', 'payment', order.id, { userId: req.user.id, amount, type });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeyId')?.value
    });
  } catch (err) {
    logError('api', req.user?.id, null, '/api/payments/create-order', 'PAYMENT_ERROR', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify Razorpay payment
app.post('/api/payments/verify', userAuthMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle, type = 'subscription' } = req.body;
    
    const keySecret = db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeySecret')?.value;
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      logError('api', req.user.id, null, '/api/payments/verify', 'INVALID_SIGNATURE', 'Payment signature mismatch');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
    
    // Update payment record
    db.prepare(`
      UPDATE payments 
      SET razorpayPaymentId = ?, razorpaySignature = ?, status = 'completed'
      WHERE razorpayOrderId = ?
    `).run(razorpay_payment_id, razorpay_signature, razorpay_order_id);
    
    const payment = db.prepare('SELECT * FROM payments WHERE razorpayOrderId = ?').get(razorpay_order_id);
    
    if (type === 'subscription' && planId) {
      const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(planId);
      
      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      
      // Check if user already has a subscription
      const existingSub = db.prepare('SELECT * FROM user_subscriptions WHERE userId = ? AND status = ?').get(req.user.id, 'active');
      
      if (existingSub) {
        // Update existing subscription
        db.prepare(`
          UPDATE user_subscriptions 
          SET planId = ?, billingCycle = ?, currentPeriodStart = ?, currentPeriodEnd = ?, updatedAt = datetime('now')
          WHERE id = ?
        `).run(planId, billingCycle, now.toISOString(), periodEnd.toISOString(), existingSub.id);
      } else {
        // Create new subscription
        const subId = uuidv4();
        db.prepare(`
          INSERT INTO user_subscriptions (id, userId, planId, status, billingCycle, currentPeriodStart, currentPeriodEnd)
          VALUES (?, ?, ?, 'active', ?, ?, ?)
        `).run(subId, req.user.id, planId, billingCycle, now.toISOString(), periodEnd.toISOString());
        
        // Update user's subscriptionId
        db.prepare('UPDATE users SET subscriptionId = ? WHERE id = ?').run(subId, req.user.id);
      }
      
      // Add credits to user
      const currentCredits = req.user.credits || 0;
      const newCredits = currentCredits + plan.creditsPerMonth;
      db.prepare('UPDATE users SET credits = ?, totalSpent = totalSpent + ? WHERE id = ?')
        .run(newCredits, payment.amount, req.user.id);
      
      // Log credit transaction
      db.prepare(`
        INSERT INTO credit_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, referenceType)
        VALUES (?, ?, 'subscription', ?, ?, ?, ?, ?, 'subscription')
      `).run(uuidv4(), req.user.id, plan.creditsPerMonth, currentCredits, newCredits, `${plan.name} Plan subscription`, planId);
      
      logAudit(null, 'subscription_created', 'subscription', req.user.id, { planId, billingCycle, credits: plan.creditsPerMonth });
      
      res.json({
        success: true,
        message: 'Subscription activated successfully',
        credits: newCredits,
        subscription: {
          planId,
          planName: plan.name,
          billingCycle,
          creditsAdded: plan.creditsPerMonth,
          periodEnd: periodEnd.toISOString()
        }
      });
    } else if (type === 'credits') {
      const { credits } = req.body;
      const currentCredits = req.user.credits || 0;
      const newCredits = currentCredits + credits;
      
      db.prepare('UPDATE users SET credits = ?, totalSpent = totalSpent + ? WHERE id = ?')
        .run(newCredits, payment.amount, req.user.id);
      
      // Log credit transaction
      db.prepare(`
        INSERT INTO credit_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, referenceType)
        VALUES (?, ?, 'purchase', ?, ?, ?, 'Credits purchase', ?, 'payment')
      `).run(uuidv4(), req.user.id, credits, currentCredits, newCredits, payment.id);
      
      res.json({
        success: true,
        message: 'Credits added successfully',
        credits: newCredits,
        creditsAdded: credits
      });
    }
  } catch (err) {
    logError('api', req.user?.id, null, '/api/payments/verify', 'VERIFY_ERROR', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get user's current subscription
app.get('/api/user/subscription', userAuthMiddleware, (req, res) => {
  try {
    const subscription = db.prepare(`
      SELECT us.*, sp.name as planName, sp.creditsPerMonth, sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.planId = sp.id
      WHERE us.userId = ? AND us.status = 'active'
      ORDER BY us.createdAt DESC
      LIMIT 1
    `).get(req.user.id);
    
    if (subscription) {
      subscription.features = JSON.parse(subscription.features || '[]');
    }
    
    res.json(subscription || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
app.post('/api/user/subscription/cancel', userAuthMiddleware, (req, res) => {
  try {
    const subscription = db.prepare(`
      SELECT * FROM user_subscriptions WHERE userId = ? AND status = 'active'
    `).get(req.user.id);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    db.prepare(`
      UPDATE user_subscriptions 
      SET status = 'cancelled', cancelledAt = datetime('now'), updatedAt = datetime('now')
      WHERE id = ?
    `).run(subscription.id);
    
    logAudit(null, 'subscription_cancelled', 'subscription', req.user.id, { subscriptionId: subscription.id });
    
    res.json({ 
      success: true, 
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
      periodEnd: subscription.currentPeriodEnd
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's payment history
app.get('/api/user/payments', userAuthMiddleware, (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC LIMIT 50
    `).all(req.user.id);
    
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's credit transactions
app.get('/api/user/credit-transactions', userAuthMiddleware, (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const transactions = db.prepare(`
      SELECT * FROM credit_transactions 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `).all(req.user.id, parseInt(limit), parseInt(offset));
    
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Razorpay Webhook
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const keySecret = db.prepare('SELECT value FROM settings WHERE key = ?').get('razorpayKeySecret')?.value;
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature
    const body = req.body.toString();
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');
    
    if (expectedSignature !== webhookSignature) {
      console.log('[WEBHOOK] Invalid signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const event = JSON.parse(body);
    console.log('[WEBHOOK] Received event:', event.event);
    
    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        // Payment was successful - already handled in verify endpoint
        break;
      case 'payment.failed':
        // Update payment status
        db.prepare(`
          UPDATE payments SET status = 'failed' WHERE razorpayPaymentId = ?
        `).run(event.payload.payment.entity.id);
        break;
      case 'subscription.charged':
        // Recurring subscription payment
        // Add credits for the billing cycle
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN: SUBSCRIPTION MANAGEMENT ============
app.get('/api/admin/subscriptions', adminAuthMiddleware, (req, res) => {
  try {
    const { status, planId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT us.*, u.email, u.name, sp.name as planName
      FROM user_subscriptions us
      JOIN users u ON us.userId = u.id
      JOIN subscription_plans sp ON us.planId = sp.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND us.status = ?';
      params.push(status);
    }
    if (planId) {
      query += ' AND us.planId = ?';
      params.push(planId);
    }
    
    query += ' ORDER BY us.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const subscriptions = db.prepare(query).all(...params);
    
    // Get counts
    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM user_subscriptions
    `).get();
    
    res.json({ subscriptions, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all payments
app.get('/api/admin/payments', adminAuthMiddleware, (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT p.*, u.email, u.name
      FROM payments p
      JOIN users u ON p.userId = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND p.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const payments = db.prepare(query).all(...params);
    
    // Get revenue stats
    const revenueStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN status = 'completed' AND createdAt >= date('now', '-30 days') THEN amount ELSE 0 END) as last30Days,
        SUM(CASE WHEN status = 'completed' AND createdAt >= date('now', '-7 days') THEN amount ELSE 0 END) as last7Days
      FROM payments
    `).get();
    
    res.json({ payments, revenueStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Manage subscription plans
app.put('/api/admin/subscription-plans/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, priceMonthly, priceYearly, creditsPerMonth, features, isPopular, displayOrder } = req.body;
    
    db.prepare(`
      UPDATE subscription_plans 
      SET name = ?, priceMonthly = ?, priceYearly = ?, creditsPerMonth = ?, 
          features = ?, isPopular = ?, displayOrder = ?
      WHERE id = ?
    `).run(
      name, priceMonthly, priceYearly, creditsPerMonth,
      JSON.stringify(features), isPopular ? 1 : 0, displayOrder, id
    );
    
    logAudit(req.admin.id, 'plan_updated', 'subscription_plan', id, req.body, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to log errors
function logError(type, userId, generationId, endpoint, errorCode, errorMessage, stackTrace = null, metadata = {}) {
  try {
    // Determine severity based on error type
    let severity = 'error';
    if (errorCode === 'timeout') severity = 'warning';
    if (errorCode === 'content_violation') severity = 'info';
    if (errorCode === 'rate_limit') severity = 'warning';
    if (errorCode === 'api_error' || errorCode === 'network_error') severity = 'critical';
    
    db.prepare(`
      INSERT INTO error_logs (id, type, severity, userId, generationId, endpoint, errorCode, errorMessage, stackTrace, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), type, severity, userId, generationId, endpoint, errorCode, errorMessage, stackTrace, JSON.stringify(metadata));
    
    console.log(`[ERROR_LOG] Logged ${severity} error: ${type} - ${errorCode} - ${errorMessage?.substring(0, 100)}`);
  } catch (err) {
    console.error('[ERROR_LOG] Failed to log error:', err.message);
  }
}

// Helper function to log audit
function logAudit(adminId, action, targetType, targetId, details = {}, ipAddress = null) {
  try {
    let adminUsername = null;
    if (adminId) {
      const admin = db.prepare('SELECT username FROM admins WHERE id = ?').get(adminId);
      adminUsername = admin?.username;
    }
    
    db.prepare(`
      INSERT INTO audit_logs (id, adminId, adminUsername, action, targetType, targetId, details, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), adminId, adminUsername, action, targetType, targetId, JSON.stringify(details), ipAddress);
  } catch (err) {
    console.error('[AUDIT_LOG] Failed to log audit:', err.message);
  }
}

// Start server
// ============ BACKGROUND CLEANUP JOB ============
// Check for stuck/timed out generations every 60 seconds
function cleanupStuckGenerations() {
  try {
    // Find generations that have been pending too long (using their maxWaitTime)
    const stuck = db.prepare(`
      SELECT g.*, 
        CASE 
          WHEN g.maxWaitTime IS NOT NULL THEN g.maxWaitTime 
          WHEN g.type = 'video' THEN 600 
          ELSE 300 
        END as waitLimit
      FROM generations g
      WHERE g.status = 'pending' 
      AND datetime(g.startedAt, '+' || COALESCE(g.maxWaitTime, 300) || ' seconds') < datetime('now')
    `).all();
    
    if (stuck.length > 0) {
      console.log(`[CLEANUP] Found ${stuck.length} stuck generation(s)`);
    }
    
    for (const gen of stuck) {
      console.log(`[CLEANUP] Marking generation ${gen.id} as timed out (started: ${gen.startedAt})`);
      
      // Mark as failed due to timeout
      db.prepare("UPDATE generations SET status = 'failed', error = 'Generation timed out', errorType = 'timeout', completedAt = datetime('now') WHERE id = ?")
        .run(gen.id);
      
      // Log timeout error for monitoring
      logError(
        'timeout',
        gen.userId,
        gen.id,
        gen.modelId || 'unknown',
        'timeout',
        'Generation timed out - exceeded max wait time',
        null,
        {
          modelId: gen.modelId,
          modelName: gen.modelName,
          type: gen.type,
          startedAt: gen.startedAt,
          waitLimit: gen.waitLimit,
          credits: gen.credits
        }
      );
      
      // Release reserved credits
      const opts = JSON.parse(gen.options || '{}');
      releaseCredits(gen.userId, gen.credits, gen.workspaceId, opts.creditSource || 'personal');
      console.log(`[CLEANUP] Released ${gen.credits} credits for timed out generation ${gen.id}`);
    }
  } catch (err) {
    console.error('[CLEANUP] Error during cleanup:', err.message);
  }
}

// Start the cleanup interval (every 60 seconds)
let cleanupInterval = null;

// ============ WORKFLOW / AI APPS ROUTES ============
const { createWorkflowExecutor } = require('./services/workflowEngine');
const { WORKFLOW_REGISTRY, listWorkflows } = require('./models/workflowSchema');

// Initialize workflow executor
const workflowExecutor = createWorkflowExecutor({
  db,
  getSetting,
  providers: {
    callOpenRouter,
    generateImage: async (model, prompt, options, images) => {
      // Use the provider layer for image generation
      const provider = getConfiguredProvider('fal');
      const modelObj = getModel(model) || { id: model, apiEndpoint: model };
      return await provider.generateImage(modelObj, prompt, options, images);
    },
    generateVideo: async (model, prompt, options, images) => {
      const provider = getConfiguredProvider('fal');
      const modelObj = getModel(model) || { id: model, apiEndpoint: model };
      return await provider.generateVideo(modelObj, prompt, options, images);
    }
  },
  logError
});

// List available workflows (public)
app.get('/api/workflows', (req, res) => {
  try {
    // Get built-in workflows
    const builtIn = listWorkflows().map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      category: w.category,
      icon: w.icon,
      color: w.color,
      estimatedCredits: w.estimatedCredits,
      estimatedTime: w.estimatedTime,
      isPublic: w.isPublic
    }));

    // Get custom workflows from database
    const custom = db.prepare('SELECT id, name, description, category, icon, color, estimatedCredits, estimatedTime, isPublic FROM workflows WHERE isActive = 1').all();

    res.json({ workflows: [...builtIn, ...custom] });
  } catch (err) {
    console.error('Failed to list workflows:', err);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

// Get workflow details
app.get('/api/workflows/:id', (req, res) => {
  try {
    // Check built-in first
    const builtIn = WORKFLOW_REGISTRY[req.params.id];
    if (builtIn) {
      return res.json(builtIn);
    }

    // Check database
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ? AND isActive = 1').get(req.params.id);
    if (workflow) {
      workflow.definition = JSON.parse(workflow.definition);
      return res.json({ ...workflow.definition, ...workflow });
    }

    res.status(404).json({ error: 'Workflow not found' });
  } catch (err) {
    console.error('Failed to get workflow:', err);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// Start a workflow run
app.post('/api/workflows/:id/run', userAuthMiddleware, async (req, res) => {
  try {
    const { inputs, workspaceId } = req.body;
    
    const result = await workflowExecutor.startRun(
      req.params.id,
      req.user.id,
      inputs || {},
      workspaceId
    );

    res.json(result);
  } catch (err) {
    console.error('Failed to start workflow:', err);
    res.status(500).json({ error: err.message || 'Failed to start workflow' });
  }
});

// Get run status
app.get('/api/workflow-runs/:id', userAuthMiddleware, async (req, res) => {
  try {
    const status = await workflowExecutor.getRunStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Check ownership
    if (status.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(status);
  } catch (err) {
    console.error('Failed to get run status:', err);
    res.status(500).json({ error: 'Failed to get run status' });
  }
});

// Cancel a workflow run
app.post('/api/workflow-runs/:id/cancel', userAuthMiddleware, async (req, res) => {
  try {
    await workflowExecutor.cancelRun(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to cancel run:', err);
    res.status(500).json({ error: 'Failed to cancel run' });
  }
});

// Complete a human task
app.post('/api/workflow-tasks/:id/complete', userAuthMiddleware, async (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    db.prepare('UPDATE workflow_tasks SET status = ?, response = ?, completedAt = ? WHERE id = ?')
      .run('completed', JSON.stringify(req.body.response), new Date().toISOString(), req.params.id);

    // Resume workflow
    await workflowExecutor.resumeRun(task.runId, req.body.response);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to complete task:', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Get user's pending tasks
app.get('/api/workflow-tasks', userAuthMiddleware, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, r.workflowId, w.name as workflowName
      FROM workflow_tasks t
      JOIN workflow_runs r ON t.runId = r.id
      LEFT JOIN workflows w ON r.workflowId = w.id
      WHERE r.userId = ? AND t.status = 'pending'
      ORDER BY t.createdAt DESC
    `).all(req.user.id);

    tasks.forEach(t => {
      t.data = JSON.parse(t.data || '{}');
    });

    res.json({ tasks });
  } catch (err) {
    console.error('Failed to get tasks:', err);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get user's workflow runs
app.get('/api/workflow-runs', userAuthMiddleware, (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT r.*, w.name as workflowName FROM workflow_runs r LEFT JOIN workflows w ON r.workflowId = w.id WHERE r.userId = ?';
    const params = [req.user.id];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const runs = db.prepare(query).all(...params);

    runs.forEach(r => {
      r.inputs = JSON.parse(r.inputs || '{}');
      r.outputs = JSON.parse(r.outputs || '{}');
      // Check built-in workflow names
      if (!r.workflowName && WORKFLOW_REGISTRY[r.workflowId]) {
        r.workflowName = WORKFLOW_REGISTRY[r.workflowId].name;
      }
    });

    res.json({ runs });
  } catch (err) {
    console.error('Failed to get runs:', err);
    res.status(500).json({ error: 'Failed to get runs' });
  }
});

// Admin: Create/update workflow
app.post('/api/admin/workflows', adminAuthMiddleware, (req, res) => {
  try {
    const { id, name, description, category, icon, color, definition, estimatedCredits, estimatedTime, isPublic } = req.body;
    
    const workflowId = id || uuidv4();
    const existing = db.prepare('SELECT id FROM workflows WHERE id = ?').get(workflowId);

    if (existing) {
      // Update
      db.prepare(`
        UPDATE workflows SET 
          name = ?, description = ?, category = ?, icon = ?, color = ?,
          definition = ?, estimatedCredits = ?, estimatedTime = ?, isPublic = ?,
          updatedAt = datetime('now'), version = version + 1
        WHERE id = ?
      `).run(name, description, category, icon, color, JSON.stringify(definition), estimatedCredits, estimatedTime, isPublic ? 1 : 0, workflowId);
    } else {
      // Insert
      db.prepare(`
        INSERT INTO workflows (id, name, description, category, icon, color, definition, estimatedCredits, estimatedTime, isPublic, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(workflowId, name, description, category, icon, color, JSON.stringify(definition), estimatedCredits, estimatedTime, isPublic ? 1 : 0, req.admin.id);
    }

    res.json({ id: workflowId, success: true });
  } catch (err) {
    console.error('Failed to save workflow:', err);
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

// Admin: List all workflows
app.get('/api/admin/workflows', adminAuthMiddleware, (req, res) => {
  try {
    const workflows = db.prepare('SELECT * FROM workflows ORDER BY createdAt DESC').all();
    workflows.forEach(w => {
      w.definition = JSON.parse(w.definition || '{}');
    });

    // Also include built-in workflows
    const builtIn = listWorkflows().map(w => ({
      ...w,
      isBuiltIn: true,
      isActive: true
    }));

    res.json({ workflows: [...builtIn, ...workflows] });
  } catch (err) {
    console.error('Failed to list admin workflows:', err);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 OmniHub backend running on http://localhost:${PORT}`);
  console.log(`🔑 Admin: admin / admin123`);
  console.log(`💰 1 USD = 1 Credit (direct Fal.ai/OpenRouter pricing)`);
  console.log(`\n📊 Models loaded:`);
  console.log(`   - ${FAL_MODELS.image.length} image models`);
  console.log(`   - ${FAL_MODELS.video.length} video models`);
  console.log(`   - ${FAL_MODELS.chat.length} chat models`);
  
  // Check API key status
  checkApiKeys();
  
  // Start background cleanup job
  cleanupInterval = setInterval(cleanupStuckGenerations, 60000);
  console.log(`\n🧹 Background cleanup job started (every 60s)`);
});
