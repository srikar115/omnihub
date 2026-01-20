import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | null = null;
  private isPostgres: boolean;

  constructor(private configService: ConfigService) {
    this.isPostgres = !!this.configService.get('database.url');
  }

  async onModuleInit() {
    if (this.isPostgres) {
      this.pool = new Pool({
        connectionString: this.configService.get('database.url'),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: this.configService.get('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
      });

      this.pool.on('error', (err) => {
        console.error('[DB] Unexpected error on idle client', err);
      });

      try {
        await this.pool.query('SELECT NOW()');
        console.log('[DB] PostgreSQL connected successfully');
      } catch (err) {
        console.error('[DB] PostgreSQL connection failed:', err.message);
      }
    } else {
      console.log('[DB] DATABASE_URL not set, PostgreSQL not configured');
      console.log('[DB] Note: SQLite fallback not implemented in NestJS version');
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      console.log('[DB] PostgreSQL pool closed');
    }
  }

  /**
   * Check if using PostgreSQL
   */
  get usingPostgres(): boolean {
    return this.isPostgres;
  }

  /**
   * Execute a query (PostgreSQL)
   */
  async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.isPostgres || !this.pool) {
      throw new Error('PostgreSQL not configured. Set DATABASE_URL in .env');
    }

    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      console.log('[DB] Slow query:', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });
    }

    return { rows: result.rows, rowCount: result.rowCount };
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient() {
    if (!this.isPostgres || !this.pool) {
      throw new Error('PostgreSQL not configured. Set DATABASE_URL in .env');
    }
    return this.pool.connect();
  }

  /**
   * Execute a transaction with automatic commit/rollback
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
   */
  convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Get single row (compatibility with SQLite .get())
   */
  async getOne<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query<T>(pgQuery, params);
    return result.rows[0];
  }

  /**
   * Get all rows (compatibility with SQLite .all())
   */
  async getAll<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query<T>(pgQuery, params);
    return result.rows;
  }

  /**
   * Run a statement (INSERT, UPDATE, DELETE)
   */
  async run(text: string, params: any[] = []): Promise<{ rowCount: number; rows: any[] }> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query(pgQuery, params);
    return { rowCount: result.rowCount, rows: result.rows };
  }

  /**
   * Execute raw SQL statements
   */
  async exec(sql: string): Promise<void> {
    const statements = sql.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await this.query(stmt.trim());
      }
    }
  }
}
