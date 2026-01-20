-- PostgreSQL Schema for OmniHub
-- Migration: 001_initial_schema
-- Description: Initial PostgreSQL schema converted from SQLite
-- 
-- Key changes from SQLite:
-- - TEXT PRIMARY KEY -> TEXT PRIMARY KEY (UUIDs remain TEXT for compatibility)
-- - INTEGER -> INTEGER (no change needed)
-- - REAL -> DECIMAL(18,8) for credits (higher precision)
-- - TEXT DEFAULT CURRENT_TIMESTAMP -> TIMESTAMPTZ DEFAULT NOW()
-- - TEXT for JSON -> JSONB for better querying
-- - Added proper indexes for common queries

-- Enable UUID extension (optional, we use app-generated UUIDs)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    credits DECIMAL(18,8) DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Admins
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Models
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT,
    provider TEXT,
    type TEXT,
    credits DECIMAL(18,8),
    base_cost DECIMAL(18,8) DEFAULT 0,
    input_cost DECIMAL(18,8) DEFAULT 0,
    output_cost DECIMAL(18,8) DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    api_endpoint TEXT,
    doc_url TEXT,
    options JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '{}',
    image_input TEXT DEFAULT 'none',
    max_input_images INTEGER DEFAULT 0,
    max_wait_time INTEGER,
    pricing_last_checked TIMESTAMPTZ,
    thumbnail TEXT,
    logo_url TEXT,
    heading TEXT,
    subheading TEXT,
    tags JSONB DEFAULT '[]',
    display_order INTEGER DEFAULT 100,
    category TEXT DEFAULT 'text-to-image',
    provider_name TEXT,
    text_to_image_endpoint TEXT,
    image_to_image_endpoint TEXT,
    image_param_name TEXT DEFAULT 'image_url',
    image_param_type TEXT DEFAULT 'single'
);

CREATE INDEX idx_models_type ON models(type);
CREATE INDEX idx_models_enabled ON models(enabled);
CREATE INDEX idx_models_provider ON models(provider);

-- ============================================
-- GENERATION TABLES
-- ============================================

-- Generations
CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    visible_id TEXT,
    user_id TEXT REFERENCES users(id),
    workspace_id TEXT,
    shared_with_workspace BOOLEAN DEFAULT FALSE,
    type TEXT,
    model TEXT,
    model_name TEXT,
    prompt TEXT,
    options JSONB DEFAULT '{}',
    credits DECIMAL(18,8),
    status TEXT DEFAULT 'pending',
    result TEXT,
    thumbnail_url TEXT,
    error TEXT,
    error_type TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    fal_request_id TEXT,
    source_generation_id TEXT
);

CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_workspace_id ON generations(workspace_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_type ON generations(type);
CREATE INDEX idx_generations_started_at ON generations(started_at DESC);

-- ============================================
-- CHAT TABLES
-- ============================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT,
    shared_with_workspace BOOLEAN DEFAULT FALSE,
    title TEXT DEFAULT 'New Chat',
    model_id TEXT,
    model_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_credits DECIMAL(18,8) DEFAULT 0
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    image_urls JSONB DEFAULT '[]',
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    credits DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    web_search_used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- ============================================
-- WORKSPACE TABLES
-- ============================================

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    credits DECIMAL(18,8) DEFAULT 0,
    credit_mode TEXT DEFAULT 'shared',
    privacy_settings JSONB DEFAULT '{"chatVisibility":"private","imageVisibility":"private","videoVisibility":"private","whoCanBeAdmin":"owner_only","whoCanAllocateCredits":"owner_only","whoCanInvite":"admins"}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'member',
    allocated_credits DECIMAL(18,8) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Workspace Invites
CREATE TABLE IF NOT EXISTS workspace_invites (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by TEXT NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================
-- ASSET TABLES
-- ============================================

-- Uploaded Assets
CREATE TABLE IF NOT EXISTS uploaded_assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    filename TEXT,
    type TEXT DEFAULT 'image',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploaded_assets_user_id ON uploaded_assets(user_id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Project Assets
CREATE TABLE IF NOT EXISTS project_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_url TEXT NOT NULL,
    asset_type TEXT DEFAULT 'image',
    name TEXT,
    tag TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_assets_project_id ON project_assets(project_id);

-- ============================================
-- COMMUNITY TABLES
-- ============================================

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL REFERENCES generations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    nickname TEXT NOT NULL,
    title TEXT,
    category TEXT DEFAULT 'other',
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    prompt TEXT,
    model_name TEXT,
    like_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_nsfw BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_published_at ON community_posts(published_at DESC);

-- Community Likes
CREATE TABLE IF NOT EXISTS community_likes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Shared Generations
CREATE TABLE IF NOT EXISTS shared_generations (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL REFERENCES generations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    share_token TEXT UNIQUE NOT NULL,
    allow_download BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================
-- SUBSCRIPTION & PAYMENT TABLES
-- ============================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly INTEGER DEFAULT 0,
    price_yearly INTEGER DEFAULT 0,
    credits_per_month INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]',
    is_popular BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    status TEXT DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    razorpay_subscription_id TEXT,
    razorpay_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    type TEXT DEFAULT 'subscription',
    description TEXT,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_signature TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Credit Transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT,
    type TEXT NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    balance_before DECIMAL(18,8),
    balance_after DECIMAL(18,8),
    description TEXT,
    reference_id TEXT,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- ============================================
-- ADMIN & LOGGING TABLES
-- ============================================

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'system',
    severity TEXT DEFAULT 'error',
    user_id TEXT,
    generation_id TEXT,
    endpoint TEXT,
    error_code TEXT,
    error_message TEXT,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    admin_username TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'global',
    target_id TEXT,
    requests_per_minute INTEGER DEFAULT 60,
    requests_per_hour INTEGER DEFAULT 1000,
    requests_per_day INTEGER DEFAULT 10000,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limit Violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    rule_id TEXT,
    endpoint TEXT,
    violation_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_violations_user_id ON rate_limit_violations(user_id);
CREATE INDEX idx_rate_limit_violations_created_at ON rate_limit_violations(created_at DESC);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    priority INTEGER DEFAULT 0,
    target_audience TEXT DEFAULT 'all',
    active BOOLEAN DEFAULT TRUE,
    dismissible BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LANDING PAGE TABLES
-- ============================================

-- Landing Featured Content
CREATE TABLE IF NOT EXISTS landing_featured (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'announcement',
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'image',
    link_url TEXT,
    link_text TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Landing Models
CREATE TABLE IF NOT EXISTS landing_models (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES models(id),
    category TEXT DEFAULT 'featured',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Tools
CREATE TABLE IF NOT EXISTS ai_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Sparkles',
    color TEXT DEFAULT 'from-cyan-500 to-blue-500',
    background_image TEXT,
    badge TEXT,
    route TEXT,
    show_on_landing BOOLEAN DEFAULT FALSE,
    show_on_dashboard BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default admin
INSERT INTO admins (id, username, password) 
VALUES ('admin-1', 'admin', '$2a$10$xVqYLGxPz9y8oN5Z3Gk4S.HxGGxNxZ6U8k9qRKhRqL6XKwQZwQZwQ')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('profitMargin', '0'),
    ('profitMarginImage', '0'),
    ('profitMarginVideo', '0'),
    ('profitMarginChat', '0'),
    ('freeCredits', '10'),
    ('creditPrice', '1.00')
ON CONFLICT (key) DO NOTHING;
