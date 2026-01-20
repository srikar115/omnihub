# PostgreSQL Migrations

A dedicated migration system for managing database schema changes.

---

## Quick Start

```bash
cd api

# Check migration status
npm run migrate:status

# Run all pending migrations
npm run migrate

# Create a new migration
npm run migrate:create add_user_avatar
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:status` | Show migration status (pending/executed) |
| `npm run migrate:rollback` | Rollback last batch of migrations |
| `npm run migrate:reset` | Rollback ALL migrations (⚠️ destructive) |
| `npm run migrate:refresh` | Reset and re-run all migrations |
| `npm run migrate:create <name>` | Create a new migration file |

---

## Migration File Format

Migrations use SQL files with `-- UP` and `-- DOWN` markers:

```sql
-- Migration: 002_add_user_avatar.sql
-- Created: 2026-01-20
-- Description: Add avatar column to users table

-- UP
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX idx_users_avatar ON users(avatar_url) WHERE avatar_url IS NOT NULL;


-- DOWN
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

### Rules

1. **UP section**: Contains SQL to apply the migration
2. **DOWN section**: Contains SQL to rollback (drop tables, remove columns)
3. **Order matters**: Migrations run in filename order (001, 002, 003...)
4. **Idempotent**: Use `IF NOT EXISTS` / `IF EXISTS` for safety

---

## Batches

Migrations are grouped into **batches**:

- Each `npm run migrate` creates a new batch
- `npm run migrate:rollback` rolls back the **last batch** only
- Useful for deploying multiple related changes together

Example:
```
001_initial_schema.sql    [batch 1]
002_add_user_avatar.sql   [batch 2]
003_add_user_bio.sql      [batch 2]  ← rolled back together
```

---

## Creating Migrations

```bash
npm run migrate:create add_user_preferences
```

Creates: `migrations/002_add_user_preferences.sql`

### Best Practices

1. **Descriptive names**: `add_user_avatar`, `create_notifications_table`
2. **One change per migration**: Don't combine unrelated changes
3. **Always write DOWN**: Enable clean rollbacks
4. **Test rollbacks**: Run `migrate:rollback` then `migrate` to verify

---

## Migration Tracking

Migrations are tracked in the `_migrations` table:

```sql
SELECT * FROM _migrations ORDER BY batch, name;

-- id | name                      | batch | executed_at
-- 1  | 001_initial_schema.sql    | 1     | 2026-01-20 10:00:00
-- 2  | 002_add_user_avatar.sql   | 2     | 2026-01-20 11:00:00
```

---

## Example Migrations

### Adding a Column

```sql
-- UP
ALTER TABLE users ADD COLUMN phone TEXT;

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS phone;
```

### Creating a Table

```sql
-- UP
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- DOWN
DROP TABLE IF EXISTS notifications CASCADE;
```

### Adding an Index

```sql
-- UP
CREATE INDEX CONCURRENTLY idx_generations_model ON generations(model);

-- DOWN
DROP INDEX IF EXISTS idx_generations_model;
```

### Modifying a Column

```sql
-- UP
ALTER TABLE users ALTER COLUMN credits TYPE DECIMAL(20,8);

-- DOWN
ALTER TABLE users ALTER COLUMN credits TYPE DECIMAL(18,8);
```

### Adding a Foreign Key

```sql
-- UP
ALTER TABLE generations 
ADD CONSTRAINT fk_generations_workspace 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- DOWN
ALTER TABLE generations DROP CONSTRAINT IF EXISTS fk_generations_workspace;
```

---

## Handling Errors

### Migration Failed Mid-Way

If a migration fails:

1. Check the error message
2. Fix the SQL in the migration file
3. Run `npm run migrate` again

The system will skip already-executed migrations.

### "Already Exists" Errors

These are handled gracefully - the migration is marked as executed.

### Rollback Failed

If rollback fails:

1. Check if the DOWN SQL is correct
2. You may need to manually fix the database
3. Then update `_migrations` table manually

---

## File Structure

```
api/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_user_avatar.sql
│   └── 003_create_notifications.sql
├── scripts/
│   └── migrate.ts           # CLI script
├── src/database/migrations/
│   ├── index.ts
│   ├── migration.interface.ts
│   └── migration.service.ts
└── MIGRATIONS.md            # This file
```

---

## Environment Variables

Required in `.env`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true
```

---

## Tips

1. **Before deploying**: Always test migrations on a staging database
2. **Backup first**: Take a backup before running migrations in production
3. **Small migrations**: Prefer many small migrations over few large ones
4. **Document changes**: Add comments in SQL explaining why changes are needed
