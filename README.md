# OmniHub - Universal AI Gateway

A modern, production-ready AI generation platform that provides a unified interface for generating images, videos, and conversations using multiple AI providers through a single dashboard.

![OmniHub](https://img.shields.io/badge/OmniHub-AI%20Gateway-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)
![Express](https://img.shields.io/badge/Express-4.x-green?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-3-lightblue?style=flat-square)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

---

## Features

### Multi-Modal AI Generation
- **Image Generation** (via Fal.ai): FLUX Pro/Dev/Schnell, Stable Diffusion 3/XL, Recraft V3, Ideogram, and more
- **Video Generation** (via Fal.ai): Kling, MiniMax, Luma Dream Machine, Runway Gen-3, Veo, Sora
- **Chat/Text** (via OpenRouter): GPT-4o, Claude 3.5/4, Gemini Pro, Llama 3/4, DeepSeek, Mistral

### User Features
- **OmniHub**: Unified workspace for all AI generation types
- **Multi-Model Comparison**: Generate with up to 4 models simultaneously
- **Workspaces**: Team workspaces with shared/individual credit modes
- **Workspace Credits**: Separate credit pools for each workspace
- **Generation Isolation**: Each workspace has its own generations
- **Projects**: Save and organize generations into projects
- **Community Gallery**: Share and discover AI-generated content
- **Chat Interface**: Full-featured chat with streaming responses and markdown rendering

### Admin Dashboard
- **Analytics**: Revenue tracking, generation statistics, user metrics
- **Model Management**: Configure pricing, enable/disable models
- **User Management**: View and manage user accounts and credits
- **Featured Content**: Manage landing page content
- **Rate Limiting**: Configure per-user and global rate limits
- **Audit Logs**: Track all admin actions

### Credits System
- Direct pass-through pricing (configurable, default 1 Credit = $0.001)
- Per-model credit costs matching provider pricing
- **Personal Credits**: User's own credit balance
- **Workspace Credits**: Shared pool for team workspaces
- **Allocated Credits**: Per-member allocations in individual mode
- Credit source tracking on each generation
- Free credits for new users
- Subscription plans with monthly credit allowances

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontends                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │   Vite + React (JS)        │  │   Next.js 14 + TypeScript          │ │
│  │   localhost:5173           │  │   localhost:3000                   │ │
│  │   ├── Dashboard            │  │   ├── Dashboard (App Router)      │ │
│  │   ├── OmniHub Generator    │  │   ├── Generate Page               │ │
│  │   ├── Chat Interface       │  │   ├── Chat with Markdown          │ │
│  │   ├── Workspace Manager    │  │   ├── Workspace Manager           │ │
│  │   └── Admin Panel          │  │   └── Admin Panel                 │ │
│  └────────────────────────────┘  └────────────────────────────────────┘ │
│                              │                                           │
│                    REST API (fetch/axios)                                │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────────┐
│                        Backend (Express.js)                              │
│  ┌──────────┬───────────┬─────────────┬────────────┬─────────────────┐  │
│  │   Auth   │  Models   │ Generations │ Workspaces │   Community     │  │
│  │   JWT    │   CRUD    │   + Queue   │  + Credits │   + Sharing     │  │
│  └──────────┴───────────┴─────────────┴────────────┴─────────────────┘  │
│                              │                                           │
│                      SQLite Database (better-sqlite3)                    │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐  ┌───────▼───────┐  ┌────────▼────────┐
│      Fal.ai       │  │  OpenRouter   │  │   Replicate     │
│  Images & Video   │  │   Chat/LLM    │  │   (Future)      │
└───────────────────┘  └───────────────┘  └─────────────────┘
```

### Request Flow

1. **User Request**: Frontend sends generation request to backend API
2. **Authentication**: JWT middleware validates user token
3. **Credit Check**: Verify user has sufficient credits
4. **Provider Routing**: Route to appropriate AI provider (Fal.ai/OpenRouter)
5. **Generation**: Submit job to provider API
6. **Webhook/Polling**: Handle async completion for video models
7. **Credit Deduction**: Deduct credits based on actual usage
8. **Response**: Return result to frontend

---

## Tech Stack

### Frontend (Dual Implementation)

**Vite + React (frontend/)**
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework with hooks |
| Vite 7 | Build tool and dev server |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion 11 | Animations and transitions |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Lucide React | Icon library |
| Recharts | Admin analytics charts |

**Next.js + TypeScript (frontend-next/)**
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript 5 | Type-safe development |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion 11 | Animations and transitions |
| React Markdown | Markdown rendering in chat |
| React Syntax Highlighter | Code block syntax highlighting |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 18+ | JavaScript runtime |
| Express.js 4 | Web server framework |
| better-sqlite3 | SQLite database driver |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| uuid | Unique ID generation |
| cors | Cross-origin requests |
| dotenv | Environment variables |
| @fal-ai/client | Fal.ai SDK for image/video |

### External APIs
| Provider | Purpose | Models |
|----------|---------|--------|
| Fal.ai | Image & Video generation | FLUX, SD, Kling, Veo, Sora |
| OpenRouter | Chat/LLM | GPT-4, Claude, Gemini, Llama |

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/srikar115/omnihub.git
cd omnihub

# Install backend dependencies
cd backend
npm install

# Create .env file for API keys
echo "FAL_KEY=your-fal-api-key" > .env
echo "OPENROUTER_API_KEY=your-openrouter-key" >> .env

# Start backend server
npm start

# In a new terminal, start Vite frontend
cd ../frontend
npm install
npm run dev

# OR start Next.js frontend (alternative)
cd ../frontend-next
npm install
npm run dev
```

### Access Points
- **Vite Frontend**: http://localhost:5173
- **Next.js Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:5173/admin (or :3000/admin)
- **Backend API**: http://localhost:3001/api

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`


---

## Project Structure

```
omnihub/
├── frontend/                    # React + Vite frontend (JavaScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # Chat interface components
│   │   │   ├── creator/        # Generation UI (CreatorBar, Upscale)
│   │   │   ├── landing/        # Landing page sections
│   │   │   ├── layout/         # AppLayout, Sidebar, Header
│   │   │   ├── shared/         # Modals and shared components
│   │   │   └── workspace/      # Workspace management
│   │   ├── context/            # ThemeContext
│   │   ├── pages/              # Route pages
│   │   └── index.css           # Global styles + Tailwind
│   └── package.json
│
├── frontend-next/               # Next.js 14 frontend (TypeScript)
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── dashboard/      # Dashboard, Generate, Chat, Profile
│   │   │   ├── admin/          # Admin panel
│   │   │   ├── community/      # Community gallery
│   │   │   └── share/          # Shared generation pages
│   │   ├── components/
│   │   │   ├── chat/           # Chat with markdown rendering
│   │   │   ├── creator/        # CreatorBar, ModelSelector
│   │   │   ├── landing/        # Landing page sections
│   │   │   ├── layout/         # Header, Sidebar
│   │   │   ├── shared/         # GenerationModal, AuthModal
│   │   │   ├── workspace/      # Workspace switcher & settings
│   │   │   └── providers/      # ThemeProvider
│   │   └── lib/                # Utilities
│   └── package.json
│
├── backend/
│   ├── index.js                # Express server (5000+ lines)
│   ├── providers/              # AI provider integrations
│   ├── services/               # Workflow engine, provider router
│   ├── models/                 # Model registry
│   ├── migrations/             # Database migrations
│   ├── omnihub.db             # SQLite database (auto-created)
│   ├── .env                   # API keys (create this)
│   └── package.json
│
├── ARCHITECTURE.md             # Detailed system architecture
└── README.md
```

---

## API Integration

### Credit Pricing Model

OmniHub uses a **direct pass-through pricing model**:

```
1 Credit = 1 USD = $1.00
```

This means:
- A model costing $0.05 per generation = 0.05 credits
- Users pay exactly what the API costs (plus optional margin)
- Simple, transparent pricing

### Fal.ai Integration (Images & Video)

```javascript
// Generation request flow
const generateImage = async (modelId, prompt, options) => {
  // 1. Look up model endpoint
  const model = getModel(modelId);
  
  // 2. Submit to Fal.ai
  const result = await fal.subscribe(model.falModel, {
    input: {
      prompt,
      ...options,
      // Model-specific parameters
    },
    logs: true,
    onQueueUpdate: (update) => {
      // Track progress
    }
  });
  
  // 3. Calculate actual cost
  const credits = calculateCredits(model, result);
  
  // 4. Deduct from user
  deductCredits(userId, credits);
  
  return result;
};
```

### Video Generation (Async with Webhooks)

Video models use async generation with status polling:

```javascript
// 1. Submit generation
POST /api/generate
{
  "modelId": "kling-video",
  "prompt": "A sunset over mountains",
  "options": { "aspect_ratio": "16:9" }
}

// Response: Generation started
{
  "id": "gen_123",
  "status": "pending",
  "queuePosition": 2
}

// 2. Poll for status
GET /api/generations/gen_123

// 3. When complete
{
  "id": "gen_123",
  "status": "completed",
  "result": "https://cdn.fal.ai/video.mp4",
  "thumbnailUrl": "https://cdn.fal.ai/thumb.jpg"
}
```

### OpenRouter Integration (Chat)

```javascript
// Chat with streaming
const streamChat = async (modelId, messages) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
    }),
  });
  
  // Stream response chunks to client
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Send chunk via SSE
    sendEvent('content', parseChunk(value));
  }
};
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  credits REAL DEFAULT 100,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Models
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'image', 'video', 'chat'
  provider TEXT NOT NULL,
  credits REAL NOT NULL,
  enabled INTEGER DEFAULT 1,
  options TEXT  -- JSON string of model options
);

-- Generations
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  modelId TEXT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT,
  options TEXT,  -- JSON
  result TEXT,   -- URL or response
  status TEXT DEFAULT 'pending',
  credits REAL,
  startedAt TEXT,
  completedAt TEXT
);

-- Workspaces
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  isDefault INTEGER DEFAULT 0,
  createdAt TEXT
);

-- Community Posts
CREATE TABLE community_posts (
  id TEXT PRIMARY KEY,
  generationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  title TEXT,
  likeCount INTEGER DEFAULT 0,
  viewCount INTEGER DEFAULT 0,
  publishedAt TEXT
);
```

---

## Configuration

### Environment Variables

```bash
# backend/.env

# Required: AI Provider API Keys
FAL_KEY=your-fal-api-key
OPENROUTER_API_KEY=your-openrouter-key

# Optional: Override defaults
PORT=3001
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=admin123
```

### Admin Settings

Configurable via Admin Panel > Settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Profit Margin | Markup on API costs | 0% |
| Free Credits | Credits for new users | 100 |
| Credit Price | USD per credit | $1.00 |

---

## Best Practices

### Frontend

1. **Component Organization**
   - Keep components small and focused
   - Use composition over inheritance
   - Extract reusable logic into custom hooks

2. **State Management**
   - Use local state for UI-only state
   - Lift state up only when necessary
   - Use URL params for shareable state

3. **Performance**
   - Lazy load routes with React.lazy()
   - Memoize expensive computations
   - Use virtual scrolling for long lists

4. **Styling**
   - Use CSS variables for theming
   - Follow mobile-first responsive design
   - Keep Tailwind classes organized

### Backend

1. **API Design**
   - Use consistent response formats
   - Return appropriate HTTP status codes
   - Include pagination for list endpoints

2. **Security**
   - Validate all user inputs
   - Use parameterized queries (SQLite)
   - Implement rate limiting

3. **Error Handling**
   - Catch and log all errors
   - Return user-friendly error messages
   - Don't expose internal details

4. **Database**
   - Use transactions for related operations
   - Index frequently queried columns
   - Clean up old/orphaned records

### Code Quality

```javascript
// Good: Descriptive naming
const fetchUserGenerations = async (userId, options) => {
  const { type, limit = 20, offset = 0 } = options;
  // ...
};

// Good: Error handling
try {
  const result = await generateImage(prompt);
  return { success: true, data: result };
} catch (error) {
  console.error('Generation failed:', error);
  return { success: false, error: error.message };
}

// Good: Input validation
if (!prompt || prompt.length < 3) {
  return res.status(400).json({ error: 'Prompt must be at least 3 characters' });
}
```

---

## API Reference

### Authentication

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Models

```
GET  /api/models                    # List all enabled models
GET  /api/models/:id                # Get model details
```

### Generations

```
POST /api/generate                  # Create generation
GET  /api/generations               # List user's generations
GET  /api/generations/:id           # Get generation details
DELETE /api/generations/:id         # Delete generation
```

### Chat

```
GET  /api/chat/models               # List chat models
GET  /api/chat/conversations        # List conversations
POST /api/chat/conversations        # Create conversation
POST /api/chat/conversations/:id/messages  # Send message (SSE stream)
```

### Community

```
GET  /api/community                 # List community posts
POST /api/community/publish         # Publish generation
POST /api/community/:id/like        # Toggle like
```

### Admin (requires admin token)

```
POST /api/admin/login
GET  /api/admin/stats
GET  /api/admin/users
GET  /api/admin/models
PUT  /api/admin/models/:id
GET  /api/admin/settings
PUT  /api/admin/settings
```

---

## License

MIT License - Feel free to use for personal or commercial purposes.

---

## Links

- [Fal.ai Documentation](https://fal.ai/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

Built with care for the AI generation community
