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
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/omnihub
FAL_KEY=your-fal-api-key
OPENROUTER_API_KEY=your-openrouter-key
FRONTEND_URL=http://localhost:3000
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
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

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

- JWT-based authentication
- Guards: `JwtAuthGuard` for users, `AdminAuthGuard` for admins
- Decorators: `@CurrentUser()`, `@CurrentAdmin()`

## 🗄️ Database

- PostgreSQL with `pg` driver
- Connection pooling enabled
- SQLite fallback removed (use PostgreSQL)

## 📄 License

ISC
