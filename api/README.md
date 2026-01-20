# OmniHub API (NestJS)

A modular NestJS backend for the OmniHub AI Generation Platform.

## 📁 Project Structure

```
api/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── config/                    # Configuration
│   │   └── configuration.ts       # Environment config
│   │
│   ├── database/                  # Database layer
│   │   ├── database.module.ts
│   │   └── database.service.ts    # PostgreSQL service
│   │
│   ├── common/                    # Shared utilities
│   │   ├── guards/                # Auth guards
│   │   ├── decorators/            # Custom decorators
│   │   └── filters/               # Exception filters
│   │
│   ├── modules/                   # Feature modules
│   │   ├── auth/                  # Authentication
│   │   ├── models/                # AI Models
│   │   ├── generations/           # Image/Video Generation
│   │   ├── chat/                  # Chat/Conversations
│   │   ├── workspaces/            # Workspace Management
│   │   ├── admin/                 # Admin Panel
│   │   ├── community/             # Community/Sharing
│   │   ├── payments/              # Payments/Subscriptions
│   │   ├── projects/              # Projects/Assets
│   │   ├── upscale/               # Image/Video Upscaling
│   │   └── settings/              # Public Settings
│   │
│   └── providers/                 # AI Providers
│       ├── fal.provider.ts        # Fal.ai integration
│       └── provider-router.service.ts
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# Server
PORT=3001
NODE_ENV=development

# JWT & Token Settings
JWT_SECRET=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRY=15m                    # Access token validity (default: 15 minutes)
ACCESS_TOKEN_EXPIRY_SECONDS=900            # Same in seconds for frontend
REFRESH_TOKEN_EXPIRY=7d                    # Refresh token validity (default: 7 days)
REFRESH_TOKEN_EXPIRY_MS=604800000          # Same in milliseconds

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/omnihub
DATABASE_SSL=true

# AI Providers
FAL_KEY=your-fal-api-key
OPENROUTER_API_KEY=your-openrouter-key

# Frontend
FRONTEND_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Run Development Server

```bash
npm run start:dev
```

### 4. Access

- API: http://localhost:3001
- Swagger Docs: http://localhost:3001/docs

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start production server |
| `npm run start:dev` | Start development server with hot reload |
| `npm run start:debug` | Start with debugger |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run lint` | Lint code |

## 🔗 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user (returns access + refresh tokens)
- `POST /api/auth/login` - Login (returns access + refresh tokens)
- `POST /api/auth/google` - Google OAuth (returns access + refresh tokens)
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout (revoke refresh token)
- `POST /api/auth/logout-all` - Logout from all devices (requires auth)
- `GET /api/auth/sessions` - Get active sessions (requires auth)
- `DELETE /api/auth/sessions/:id` - Revoke specific session (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Models (`/api/models`)
- `GET /api/models` - List all models
- `GET /api/models/:id` - Get model by ID
- `POST /api/models/:id/price` - Calculate price

### Generations (`/api/generations`, `/api/generate`)
- `POST /api/generate` - Create generation
- `GET /api/generations` - List generations
- `GET /api/generations/:id` - Get by ID
- `DELETE /api/generations/:id` - Delete
- `POST /api/generations/:id/cancel` - Cancel

### Chat (`/api/chat`)
- `GET /api/chat/models` - Chat models
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations/:id/messages` - Send message

### Workspaces (`/api/workspaces`)
- Full CRUD + member management + invites

### Admin (`/api/admin`)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users` - List users
- `GET /api/admin/settings` - Get settings

## 🏗️ Module Structure

Each module follows this pattern:

```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── module-name.routes.ts      # Route constants
├── dto/                       # Data transfer objects
│   └── index.ts
└── index.ts                   # Exports
```

## 📝 Route Files

Each module has a `*.routes.ts` file that defines all routes:

```typescript
// auth.routes.ts
export const AUTH_ROUTES = {
  BASE: 'api/auth',
  LOGIN: 'login',
  REGISTER: 'register',
  ME: 'me',
} as const;
```

## 🔒 Authentication

### Token-based Authentication with Refresh Tokens

The API uses a dual-token system for secure authentication:

| Token | Default Lifetime | Purpose |
|-------|-----------------|---------|
| Access Token | 15 minutes | Short-lived JWT for API requests |
| Refresh Token | 7 days | Long-lived token stored in DB for getting new access tokens |

**How it works:**
1. User logs in → receives `accessToken` + `refreshToken`
2. Frontend uses `accessToken` for API requests
3. When `accessToken` expires → frontend calls `/auth/refresh` with `refreshToken`
4. Server validates refresh token, rotates it (old one invalidated), returns new pair
5. Session continues until user is inactive for 7 days (or logs out)

**Security features:**
- Token rotation: Each refresh invalidates the old refresh token
- Device tracking: Sessions can be viewed and revoked individually
- Logout all: User can invalidate all sessions from any device

**Configuration (via environment variables):**
```env
ACCESS_TOKEN_EXPIRY=15m          # Access token validity
REFRESH_TOKEN_EXPIRY=7d          # Refresh token validity
```

### Guards & Decorators
- Guards: `JwtAuthGuard` for users, `AdminAuthGuard` for admins
- Decorators: `@CurrentUser()`, `@CurrentAdmin()`

## 🗄️ Database

- PostgreSQL with `pg` driver
- Connection pooling enabled
- SQLite fallback removed (use PostgreSQL)

## 📄 License

ISC
