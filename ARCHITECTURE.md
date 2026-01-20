# OmniHub Technical Architecture

> Technical documentation for developers. This document explains how the system is built, the patterns used, and how to extend it.

**Last Updated:** January 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Provider Abstraction Layer](#provider-abstraction-layer)
5. [Workflow Engine (AI Apps)](#workflow-engine-ai-apps)
6. [Backend Architecture](#backend-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Database Design](#database-design)
9. [Authentication & Authorization](#authentication--authorization)
10. [Credit System](#credit-system)
11. [SEO Strategy](#seo-strategy)
12. [Extending the System](#extending-the-system)
13. [Migration Roadmap](#migration-roadmap)

---

## System Overview

OmniHub is a unified AI generation platform that aggregates multiple AI providers (Fal.ai, Replicate, OpenRouter, Self-hosted) into a single interface. The system follows a **provider-agnostic** architecture where the UI knows nothing about specific AI providers - all provider logic is encapsulated in the backend through adapters and routers.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     Next.js 14 App Router                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │ Landing  │  │Community │  │Dashboard │  │   Admin Panel    │   │ │
│  │  │  (SSG)   │  │  (SSR)   │  │  (CSR)   │  │     (CSR)        │   │ │
│  │  │          │  │          │  │Generator │  │                  │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  │                              │                                      │ │
│  │                     Fetch API + API Proxy                           │ │
│  └──────────────────────────────┼──────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ REST API + SSE (Streaming)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express.js)                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         API Layer                                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │   Auth   │  │  Models  │  │ Workflow │  │   Generations    │   │ │
│  │  │  Routes  │  │  Routes  │  │  Routes  │  │     Routes       │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  └────────────────────────────────┼────────────────────────────────────┘ │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                     Provider Router Service                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │  • Automatic failover between providers                        │ │ │
│  │  │  • Health checking with recovery                               │ │ │
│  │  │  • Cost-based routing                                          │ │ │
│  │  │  • Provider preference per model                               │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────┬──────────────────────────────────────┘ │
│                                  │                                      │
│  ┌───────────────────────────────▼──────────────────────────────────────┐ │
│  │                      Provider Adapters (BaseProvider)                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │ │
│  │  │ FalProvider  │  │  Replicate   │  │     SelfHostedProvider     │ │ │
│  │  │              │  │   Provider   │  │  (ComfyUI/Automatic1111)   │ │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                 Database (PostgreSQL / SQLite fallback)              │ │
│  │  users | models | generations | workflows | workflow_runs | ...      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Fal.ai       │    │   Replicate     │    │   Self-Hosted   │
│  Images/Video   │    │   Images/Video  │    │ ComfyUI/A1111   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Principles

1. **Provider Agnosticism** - Frontend never knows about Fal.ai, Replicate, or other providers
2. **Automatic Failover** - If one provider fails, system automatically tries next available
3. **Data-Driven Configuration** - All model options stored in database, not code
4. **Settings Hierarchy** - Database (Admin Panel) → Environment variables → Defaults
5. **Unified Generation API** - Single `/api/generate` endpoint for all types
6. **Workflow Engine** - Multi-step AI pipelines with human-in-the-loop support
7. **PostgreSQL Ready** - Production-ready with SQLite fallback for development

---

## Tech Stack

### Frontend (Next.js - Production Ready)

Located in `frontend-next/` directory:

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | SSR/SSG/CSR framework with App Router |
| React | 18.x | UI framework with hooks |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS with CSS variables |
| Framer Motion | 11.x | Animations and transitions |
| Lucide React | 0.469.x | Icon library |
| Recharts | 2.x | Admin analytics charts |
| React Markdown | 9.x | Markdown rendering |
| clsx + tailwind-merge | - | Class name utilities |

**Rendering Strategies:**
- Landing Page (`/`): Static Site Generation (SSG)
- Community (`/community`): Server-Side Rendering (SSR)
- Dashboard (`/dashboard/*`): Client-Side Rendering (CSR)
- Admin (`/admin/*`): Client-Side Rendering (CSR)

### Frontend (Legacy: Vite + React)

Located in `frontend/` directory (preserved for reference):

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework with hooks |
| Vite | 7.x | Build tool, dev server |
| Tailwind CSS | 4.x | Styling |
| React Router | 7.x | Client-side routing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Web framework |
| better-sqlite3 | 11.x | SQLite driver (dev fallback) |
| pg | 8.x | PostgreSQL driver (production) |
| jsonwebtoken | 9.x | JWT auth |
| bcryptjs | 2.x | Password hashing |
| uuid | 11.x | ID generation |
| axios | 1.x | External API calls |
| dotenv | 17.x | Environment variables |

### Database

| Environment | Database | Configuration |
|-------------|----------|---------------|
| Development | SQLite | Automatic (no setup needed) |
| Production | PostgreSQL | Set `DATABASE_URL` env var |

---

## Architecture Patterns

### 1. Provider Abstraction Pattern

All AI providers implement a common `BaseProvider` interface:

```javascript
// providers/BaseProvider.js
class BaseProvider {
  async isAvailable() { /* Check if provider is configured */ }
  async generateImage(model, prompt, options, inputImages) { /* Generate image */ }
  async generateVideo(model, prompt, options, inputImages, genId, db) { /* Generate video */ }
  async upscaleImage(model, imageUrl, options) { /* Upscale image */ }
  async upscaleVideo(model, videoUrl, options, genId, db) { /* Upscale video */ }
}
```

**Concrete implementations:**
- `FalProvider` - Fal.ai API
- `ReplicateProvider` - Replicate API  
- `SelfHostedProvider` - ComfyUI/Automatic1111

### 2. Provider Router Pattern

The router handles intelligent routing with automatic failover:

```javascript
// services/providerRouter.js
async function generate(modelId, type, params, getSetting, logError, context) {
  const model = getModel(modelId);
  const providerOrder = [model.defaultProvider, ...model.fallbackOrder];
  
  for (const providerId of providerOrder) {
    if (!isProviderHealthy(providerId)) continue;
    
    try {
      const provider = getProvider(providerId, getSetting);
      const result = await provider.generateImage(...);
      markProviderSuccess(providerId);
      return result;
    } catch (error) {
      markProviderFailure(providerId);
      continue; // Try next provider
    }
  }
  
  throw new Error('All providers failed');
}
```

### 3. Model Registry Pattern

Models are defined with multi-provider support:

```javascript
// models/modelRegistry.js
const MODEL_REGISTRY = {
  'flux-pro-1.1': {
    name: 'FLUX 1.1 Pro',
    type: 'image',
    baseCost: 0.04,
    options: { /* ... */ },
    providers: {
      fal: { endpoint: 'fal-ai/flux-pro/v1.1', cost: 0.04 },
      replicate: { version: 'black-forest-labs/flux-pro', cost: 0.05 },
      selfhosted: { checkpoint: 'flux1-pro.safetensors', cost: 0 }
    },
    defaultProvider: 'fal',
    fallbackOrder: ['replicate', 'selfhosted']
  }
};
```

### 4. Database Abstraction Pattern

Single codebase supports both SQLite and PostgreSQL:

```javascript
// Database detection
const isPostgres = !!process.env.DATABASE_URL;

// Helper functions work with both
const addColumnIfNotExists = async (table, column, type) => {
  if (isPostgres) {
    await dbModule.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
  } else {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }
};
```

---

## Provider Abstraction Layer

### Directory Structure

```
backend/
├── providers/
│   ├── index.js           # Provider registry and factory
│   ├── BaseProvider.js    # Abstract base class
│   ├── FalProvider.js     # Fal.ai implementation
│   ├── ReplicateProvider.js
│   └── SelfHostedProvider.js
├── services/
│   └── providerRouter.js  # Intelligent routing with failover
└── models/
    └── modelRegistry.js   # Multi-provider model definitions
```

### Adding a New Provider

1. **Create provider class:**
```javascript
// providers/NewProvider.js
const BaseProvider = require('./BaseProvider');

class NewProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.name = 'newprovider';
    this.baseUrl = 'https://api.newprovider.com';
  }
  
  async isAvailable() {
    return !!this.apiKey;
  }
  
  async generateImage(model, prompt, options, inputImages) {
    // Implementation
    return { urls: ['https://...'], metadata: {} };
  }
}

module.exports = NewProvider;
```

2. **Register in index.js:**
```javascript
// providers/index.js
const PROVIDER_CONFIG = {
  // ... existing providers
  newprovider: {
    name: 'New Provider',
    class: NewProvider,
    envKey: 'NEWPROVIDER_API_KEY',
    settingsKey: 'newproviderApiKey',
    priority: 4
  }
};
```

3. **Add to model registry:**
```javascript
providers: {
  // ... existing
  newprovider: { endpoint: 'generate/v1', cost: 0.03 }
}
```

### Enabling Provider Layer

Set environment variable to enable new provider system:

```env
USE_PROVIDER_LAYER=true
```

When disabled, falls back to direct `callFal*` functions for backward compatibility.

---

## Workflow Engine (AI Apps)

The workflow engine enables multi-step AI pipelines for complex use cases like video ad generation, resume analysis, and content creation.

### Workflow Schema

```javascript
// models/workflowSchema.js
const STEP_TYPES = {
  LLM: 'llm',           // Text generation
  IMAGE: 'image',       // Image generation
  VIDEO: 'video',       // Video generation
  TTS: 'tts',           // Text-to-speech
  EMBEDDING: 'embedding', // Vector embeddings
  TRANSFORM: 'transform', // Data transformation
  CONDITION: 'condition', // Conditional branching
  LOOP: 'loop',         // Iterate over arrays
  HUMAN: 'human',       // Human approval/input
};
```

### Example Workflow: Video Ad Generator

```javascript
{
  id: 'video-ad-generator',
  name: 'AI Video Ad Generator',
  category: 'marketing',
  steps: [
    {
      id: 'generate-script',
      type: 'llm',
      model: 'gpt-4o',
      inputs: { prompt: 'Create ad script for ${input.productName}...' },
      dependsOn: []
    },
    {
      id: 'generate-voiceover',
      type: 'tts',
      model: 'elevenlabs-turbo',
      inputs: { text: '${generate-script.script}' },
      dependsOn: ['generate-script']
    },
    {
      id: 'human-review',
      type: 'human',
      config: { message: 'Please review before generating video' },
      dependsOn: ['generate-script']
    },
    {
      id: 'create-video',
      type: 'video',
      model: 'kling-1.5-pro',
      condition: { if: '${human-review.approved}', equals: true },
      dependsOn: ['generate-voiceover', 'human-review']
    }
  ]
}
```

### Workflow Execution

```javascript
// services/workflowEngine.js
class WorkflowExecutor {
  async startRun(workflowId, userId, inputs) {
    // 1. Create run record
    // 2. Execute steps in topological order
    // 3. Handle human-in-the-loop pauses
    // 4. Track credits per step
    // 5. Persist state between steps
  }
  
  async executeStep(runId, step, context) {
    switch (step.type) {
      case 'llm': return this.executeLLMStep(step, context);
      case 'image': return this.executeImageStep(step, context);
      case 'human': return this.createHumanTask(runId, step, context);
      // ...
    }
  }
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflows` | GET | List available workflows |
| `/api/workflows/:id` | GET | Get workflow details |
| `/api/workflows/:id/run` | POST | Start workflow execution |
| `/api/workflow-runs/:id` | GET | Get run status |
| `/api/workflow-runs/:id/cancel` | POST | Cancel running workflow |
| `/api/workflow-tasks/:id/complete` | POST | Complete human task |
| `/api/workflow-tasks` | GET | Get pending human tasks |

---

## Backend Architecture

### File Structure

```
backend/
├── index.js              # Main server (routes + controllers)
├── db.js                 # Database abstraction (PostgreSQL + SQLite)
├── providers/            # AI provider adapters
│   ├── index.js
│   ├── BaseProvider.js
│   ├── FalProvider.js
│   ├── ReplicateProvider.js
│   └── SelfHostedProvider.js
├── services/
│   ├── providerRouter.js # Provider routing with failover
│   └── workflowEngine.js # Workflow execution
├── models/
│   ├── modelRegistry.js  # Model definitions
│   └── workflowSchema.js # Workflow definitions
├── migrations/
│   └── schema.js         # Database schema migrations
├── omnihub.db           # SQLite database (auto-created)
├── package.json
└── .env                 # API keys
```

### Environment Variables

```env
# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:pass@host:5432/omnihub
DATABASE_SSL=true

# AI Providers
FAL_KEY=your-fal-key
OPENROUTER_API_KEY=your-openrouter-key
REPLICATE_API_TOKEN=your-replicate-token

# Optional
JWT_SECRET=your-jwt-secret
USE_PROVIDER_LAYER=true
```

---

## Frontend Architecture

### Directory Structure (Next.js)

```
frontend-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Landing page (SSG)
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── community/
│   │   │   └── page.tsx        # Community gallery (SSR)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   └── generate/
│   │   │       └── page.tsx    # AI generation interface
│   │   └── admin/
│   │       ├── page.tsx        # Admin panel
│   │       └── login/
│   │           └── page.tsx    # Admin login
│   ├── components/
│   │   ├── landing/            # Landing page sections
│   │   │   ├── Navbar.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── ModelsSection.tsx
│   │   │   ├── PricingSection.tsx
│   │   │   └── FAQSection.tsx
│   │   ├── shared/             # Reusable components
│   │   │   ├── AuthModal.tsx
│   │   │   ├── GenerationCard.tsx
│   │   │   ├── GenerationModal.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── PricingModal.tsx
│   │   ├── creator/            # Generation interface components
│   │   │   ├── ModelSelectorModal.tsx
│   │   │   └── UpscaleModal.tsx
│   │   ├── chat/               # Chat interface components
│   │   │   ├── ChatInput.tsx
│   │   │   └── MessageList.tsx
│   │   ├── workspace/          # Workspace management
│   │   │   ├── WorkspaceSwitcher.tsx
│   │   │   └── CreateWorkspaceModal.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── providers/
│   │       └── ThemeProvider.tsx
│   └── lib/
│       ├── api.ts              # API client utilities
│       └── utils.ts            # Helper functions
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── next.config.js              # API proxy + security headers
├── tailwind.config.js
└── package.json
```

### Key Patterns

**1. Server vs Client Components**

```typescript
// Server Component (default) - runs on server
export default function LandingPage() {
  return <div>Static content</div>;
}

// Client Component - runs in browser
'use client';
export function InteractiveForm() {
  const [state, setState] = useState();
  return <form>...</form>;
}
```

**2. API Communication**

```typescript
// lib/api.ts - centralized API client
const API_BASE = '/api'; // Proxied to Express backend

export const api = {
  get: (path: string) => fetch(`${API_BASE}${path}`),
  post: (path: string, data: any) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('userToken')}`
    },
    body: JSON.stringify(data),
  }),
};
```

**3. Theme System**

CSS variables enable light/dark mode without JavaScript:

```css
/* globals.css */
:root, [data-theme="dark"] {
  --bg-primary: #0a0b0f;
  --text-primary: #ffffff;
}

[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #111827;
}
```

---

## Database Design

### Entity Relationship

```
users
  ├──< generations
  ├──< conversations
  │     └──< messages
  ├──< workspaces
  │     ├──< workspace_members
  │     └──< projects
  └──< workflow_runs
        ├──< workflow_step_runs
        └──< workflow_tasks

models (standalone)
workflows (standalone)
settings (key-value)
```

### Key Tables

**workflows:**
```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  definition TEXT NOT NULL,  -- JSON workflow definition
  estimatedCredits REAL DEFAULT 0,
  estimatedTime INTEGER DEFAULT 60,
  isPublic INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**workflow_runs:**
```sql
CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflowId TEXT NOT NULL,
  userId TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, running, paused, completed, failed
  inputs TEXT,      -- JSON user inputs
  outputs TEXT,     -- JSON final outputs
  state TEXT,       -- JSON execution state
  currentStepId TEXT,
  creditsUsed REAL DEFAULT 0,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP
);
```

**workflow_tasks (Human-in-the-loop):**
```sql
CREATE TABLE workflow_tasks (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  stepId TEXT NOT NULL,
  type TEXT DEFAULT 'approval',
  title TEXT NOT NULL,
  data TEXT,      -- JSON data to display
  response TEXT,  -- JSON user response
  status TEXT DEFAULT 'pending'
);
```

---

## SEO Strategy

### Current Implementation (Next.js 14) ✅

The platform now uses Next.js 14 App Router with optimal rendering strategies per page:

```
Frontend Architecture (frontend-next/):
┌──────────────────────────────────────────────────────────────────┐
│                        Next.js 14 App Router                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Landing  │  │Community │  │Dashboard │  │   Admin Panel    │ │
│  │  (SSG)   │  │  (SSR)   │  │  (CSR)   │  │     (CSR)        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Rendering Strategies

| Page | Strategy | Why |
|------|----------|-----|
| `/` (Landing) | SSG | Static content, maximum SEO, fastest load |
| `/community` | SSR | Dynamic gallery, fresh content for crawlers |
| `/dashboard/*` | CSR | Authenticated, user-specific data |
| `/admin/*` | CSR | Authenticated admin-only content |

### SEO Features Implemented

1. **Next.js Metadata API**
   - `layout.tsx` defines global metadata
   - Per-page metadata via `export const metadata`
   - Dynamic OG images support

2. **Structured Data (JSON-LD)**
   - Organization schema in root layout
   - SoftwareApplication schema
   - FAQ schema on landing page

3. **Static Assets**
   - `robots.txt` - Allows public routes, blocks `/dashboard/`, `/api/`, `/admin/`
   - `sitemap.xml` - Lists public pages

4. **Performance**
   - Automatic code splitting
   - Image optimization via `next/image`
   - Font optimization
   - API route caching

### API Proxy Configuration

Next.js proxies API calls to the Express backend:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/api/:path*',
    },
  ];
}
```

### Legacy Frontend (Vite)

The original Vite frontend is preserved in `frontend/` for reference but is no longer the primary frontend.

---

## Extending the System

### Adding a New Generation Type

1. Add models to database with new type
2. Create step executor in workflow engine
3. Update frontend type selector

### Adding a New Workflow

1. Define workflow in `workflowSchema.js`
2. Add to `WORKFLOW_REGISTRY`
3. Or create via Admin API

### Adding Admin Features

1. Add API endpoint in `index.js`
2. Add tab to Admin Panel frontend
3. Create tab component

---

## Migration Roadmap

### Phase 1: Core Stabilization ✅ (Completed)
- [x] Wire provider abstraction to index.js
- [x] Add PostgreSQL support with SQLite fallback
- [x] Implement basic SEO improvements
- [x] Design workflow schema
- [x] Build workflow execution engine

### Phase 2: Frontend Migration ✅ (Completed)
- [x] Migrate to Next.js 14 App Router
- [x] Implement SSG for landing page (`/`)
- [x] Implement SSR for community page (`/community`)
- [x] Keep CSR for authenticated dashboard (`/dashboard/*`)
- [x] Metadata API for SEO management
- [x] API proxy to Express backend
- [x] Theme provider with dark/light mode

**Location:** `frontend-next/` directory

### Phase 3: Advanced Features (Next Priority)
- [ ] Add semantic search with pgvector for HR resume analysis
- [ ] Integrate agent frameworks (LangGraph/CrewAI) for super agents
- [ ] Add n8n/webhook integrations for workflow triggers
- [ ] Multi-tenant workspace isolation with billing
- [ ] AI App workflow landing pages (Arcads-style, Jasper-style)
- [ ] Workflow marketplace/templates

### Phase 4: Scale & Enterprise
- [ ] Horizontal scaling with load balancer
- [ ] Redis caching layer for sessions/rate limiting
- [ ] CDN for generated assets (CloudFront/Cloudflare)
- [ ] Advanced monitoring and alerting (Sentry, Datadog)
- [ ] Kubernetes deployment manifests
- [ ] Automated backups and disaster recovery

### Phase 5: Monetization & Growth
- [ ] Usage-based billing with Stripe metered billing
- [ ] Team/Organization subscription tiers
- [ ] White-label/embedded SDK for B2B
- [ ] Affiliate/referral program
- [ ] API access tier for developers

---

## Summary

OmniHub is built on these core principles:

1. **Provider Agnosticism** - Unified interface for all AI providers (Fal, Replicate, Self-hosted)
2. **Automatic Failover** - Resilient generation with fallback providers and health checks
3. **Workflow Engine** - Multi-step AI pipelines with human-in-the-loop support
4. **Database Flexibility** - PostgreSQL for production, SQLite for development
5. **Extensibility** - Easy to add new providers, models, and features
6. **SEO Optimized** - Next.js with SSG/SSR for full search engine visibility

### What's Complete

| Component | Status | Description |
|-----------|--------|-------------|
| Provider Abstraction | ✅ | BaseProvider, FalProvider, ReplicateProvider, SelfHostedProvider |
| Provider Router | ✅ | Automatic failover, health checks, cost-based routing |
| Model Registry | ✅ | Multi-provider model definitions |
| PostgreSQL Support | ✅ | Production-ready with SQLite fallback |
| Workflow Engine | ✅ | Multi-step pipelines, human-in-the-loop |
| Next.js Frontend | ✅ | SSG landing, SSR community, CSR dashboard |
| SEO Implementation | ✅ | Metadata API, JSON-LD, sitemap, robots.txt |

### Next Steps

1. **Deploy PostgreSQL** - Switch from SQLite for production
2. **Enable Provider Layer** - Set `USE_PROVIDER_LAYER=true`
3. **Build AI Apps** - Create workflow landing pages
4. **Add Semantic Search** - pgvector for resume analysis
5. **Scale** - Redis caching, CDN, monitoring

For questions or contributions, check the codebase or reach out to the team.
