import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationRecord, MigrationStatus, MigrationResult } from './migration.interface';

/**
 * Migration Service
 * Handles database migrations with up/down support
 */
export class MigrationService {
  private pool: Pool;
  private migrationsDir: string;
  private tableName = '_migrations';

  constructor(connectionString: string, ssl: boolean = true) {
    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
      ssl: ssl ? { rejectUnauthorized: false } : false,
    });

    this.migrationsDir = path.join(__dirname, '..', '..', '..', 'migrations');
  }

  /**
   * Initialize migrations table
   */
  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        batch INTEGER NOT NULL DEFAULT 1,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  /**
   * Get all executed migrations
   */
  async getExecuted(): Promise<MigrationRecord[]> {
    const result = await this.pool.query<MigrationRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY batch, name`
    );
    return result.rows;
  }

  /**
   * Get the current batch number
   */
  async getCurrentBatch(): Promise<number> {
    const result = await this.pool.query<{ max: number }>(
      `SELECT COALESCE(MAX(batch), 0) as max FROM ${this.tableName}`
    );
    return result.rows[0].max;
  }

  /**
   * Get all migration files from disk
   */
  getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  }

  /**
   * Get migration status (pending vs executed)
   */
  async getStatus(): Promise<MigrationStatus[]> {
    await this.init();

    const files = this.getMigrationFiles();
    const executed = await this.getExecuted();
    const executedMap = new Map(executed.map(e => [e.name, e]));

    return files.map(file => {
      const record = executedMap.get(file);
      return {
        name: file,
        status: record ? 'executed' : 'pending',
        batch: record?.batch,
        executedAt: record?.executed_at,
      };
    });
  }

  /**
   * Get pending migrations
   */
  async getPending(): Promise<string[]> {
    const status = await this.getStatus();
    return status.filter(s => s.status === 'pending').map(s => s.name);
  }

  /**
   * Read migration file content
   */
  readMigrationFile(name: string): { up: string; down: string } {
    const filePath = path.join(this.migrationsDir, name);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse UP and DOWN sections
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

    // If no UP/DOWN markers, treat entire file as UP
    const up = upMatch ? upMatch[1].trim() : content.trim();
    const down = downMatch ? downMatch[1].trim() : '';

    return { up, down };
  }

  /**
   * Run a single migration UP
   */
  async runUp(name: string, batch: number): Promise<MigrationResult> {
    const start = Date.now();

    try {
      const { up } = this.readMigrationFile(name);

      if (!up) {
        return {
          success: false,
          migration: name,
          direction: 'up',
          error: 'No UP migration content found',
        };
      }

      // Execute migration
      await this.pool.query(up);

      // Record migration
      await this.pool.query(
        `INSERT INTO ${this.tableName} (name, batch) VALUES ($1, $2)`,
        [name, batch]
      );

      return {
        success: true,
        migration: name,
        direction: 'up',
        duration: Date.now() - start,
      };
    } catch (error: any) {
      // Handle "already exists" errors gracefully
      if (error.message.includes('already exists')) {
        await this.pool.query(
          `INSERT INTO ${this.tableName} (name, batch) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
          [name, batch]
        );

        return {
          success: true,
          migration: name,
          direction: 'up',
          duration: Date.now() - start,
        };
      }

      return {
        success: false,
        migration: name,
        direction: 'up',
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Run a single migration DOWN
   */
  async runDown(name: string): Promise<MigrationResult> {
    const start = Date.now();

    try {
      const { down } = this.readMigrationFile(name);

      if (!down) {
        return {
          success: false,
          migration: name,
          direction: 'down',
          error: 'No DOWN migration content found',
        };
      }

      // Execute rollback
      await this.pool.query(down);

      // Remove migration record
      await this.pool.query(
        `DELETE FROM ${this.tableName} WHERE name = $1`,
        [name]
      );

      return {
        success: true,
        migration: name,
        direction: 'down',
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        success: false,
        migration: name,
        direction: 'down',
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult[]> {
    await this.init();

    const pending = await this.getPending();
    const results: MigrationResult[] = [];

    if (pending.length === 0) {
      return results;
    }

    const batch = (await this.getCurrentBatch()) + 1;

    for (const name of pending) {
      const result = await this.runUp(name, batch);
      results.push(result);

      if (!result.success) {
        break; // Stop on first error
      }
    }

    return results;
  }

  /**
   * Rollback last batch of migrations
   */
  async rollback(): Promise<MigrationResult[]> {
    await this.init();

    const currentBatch = await this.getCurrentBatch();
    const results: MigrationResult[] = [];

    if (currentBatch === 0) {
      return results;
    }

    // Get migrations from current batch in reverse order
    const result = await this.pool.query<MigrationRecord>(
      `SELECT * FROM ${this.tableName} WHERE batch = $1 ORDER BY name DESC`,
      [currentBatch]
    );

    for (const record of result.rows) {
      const rollbackResult = await this.runDown(record.name);
      results.push(rollbackResult);

      if (!rollbackResult.success) {
        break; // Stop on first error
      }
    }

    return results;
  }

  /**
   * Rollback all migrations
   */
  async reset(): Promise<MigrationResult[]> {
    await this.init();

    const results: MigrationResult[] = [];
    const executed = await this.getExecuted();

    // Rollback in reverse order
    for (const record of executed.reverse()) {
      const result = await this.runDown(record.name);
      results.push(result);

      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Reset and re-run all migrations
   */
  async refresh(): Promise<{ reset: MigrationResult[]; migrate: MigrationResult[] }> {
    const reset = await this.reset();
    const migrate = await this.migrate();
    return { reset, migrate };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
