import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

export interface DatabaseHealthStatus {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  user: string;
  version?: string;
  currentTime?: string;
  poolSize?: number;
  idleConnections?: number;
  waitingClients?: number;
  error?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const dbUrl = this.configService.get<string>('database.url');

    if (!dbUrl) {
      throw new Error('DATABASE_URL is required. Please set it in your .env file.');
    }

    this.pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: this.configService.get('database.ssl') !== false
        ? { rejectUnauthorized: false }
        : false,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err.stack);
      this.isConnected = false;
    });

    this.pool.on('connect', () => {
      this.logger.debug('New client connected to pool');
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL pool closed');
  }

  /**
   * Connect to database and verify connection
   */
  private async connect(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT 
          NOW() as time, 
          version() as version,
          current_database() as database
      `);

      this.isConnected = true;
      const info = result.rows[0];

      this.logger.log('✅ PostgreSQL connected successfully');
      this.logger.log(`   Database: ${info.database}`);
      this.logger.log(`   Version: ${info.version.split(',')[0]}`);
      this.logger.log(`   Server time: ${info.time}`);
    } catch (err) {
      this.isConnected = false;
      this.logger.error('❌ PostgreSQL connection failed');
      this.logger.error(`   Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Check if database is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get database health status
   */
  async healthCheck(): Promise<DatabaseHealthStatus> {
    const dbUrl = this.configService.get<string>('database.url') || '';

    // Parse connection info from URL (hide password)
    let host = 'unknown';
    let port = 5432;
    let database = 'unknown';
    let user = 'unknown';

    try {
      const url = new URL(dbUrl);
      host = url.hostname;
      port = parseInt(url.port) || 5432;
      database = url.pathname.replace('/', '');
      user = url.username;
    } catch {
      // URL parsing failed
    }

    try {
      const result = await this.pool.query(`
        SELECT 
          NOW() as current_time,
          version() as version,
          current_database() as database
      `);

      return {
        connected: true,
        database: result.rows[0].database,
        host,
        port,
        user,
        version: result.rows[0].version.split(',')[0],
        currentTime: result.rows[0].current_time,
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
      };
    } catch (err) {
      return {
        connected: false,
        database,
        host,
        port,
        user,
        error: err.message,
      };
    }
  }

  /**
   * Test database connection with detailed info
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    this.logger.log('Testing database connection...');

    try {
      // Test basic connectivity
      const result = await this.pool.query(`
        SELECT 
          NOW() as server_time,
          version() as version,
          current_database() as database,
          current_user as db_user,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port
      `);

      // Check if tables exist
      const tables = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      const info = result.rows[0];
      const tableList = tables.rows.map((t) => t.table_name);

      this.logger.log('✅ Connection successful!');
      this.logger.log(`   Database: ${info.database}`);
      this.logger.log(`   User: ${info.db_user}`);
      this.logger.log(`   Server: ${info.server_ip}:${info.server_port}`);
      this.logger.log(`   Version: ${info.version.split(',')[0]}`);
      this.logger.log(`   Tables: ${tableList.length}`);

      return {
        success: true,
        message: 'Database connection successful',
        details: {
          database: info.database,
          user: info.db_user,
          serverTime: info.server_time,
          version: info.version.split(',')[0],
          tablesCount: tableList.length,
          tables: tableList,
        },
      };
    } catch (err) {
      this.logger.error('❌ Connection failed:', err.message);
      return {
        success: false,
        message: `Connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Execute a raw query with PostgreSQL placeholders ($1, $2, etc.)
   */
  async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      this.logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }

    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a transaction with automatic commit/rollback
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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
   * This allows services to use ? placeholders for compatibility
   */
  private convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Get single row - uses ? placeholders (auto-converted to $1, $2)
   */
  async getOne<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query<T>(pgQuery, params);
    return result.rows[0];
  }

  /**
   * Get all rows - uses ? placeholders (auto-converted to $1, $2)
   */
  async getAll<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query<T>(pgQuery, params);
    return result.rows;
  }

  /**
   * Run a statement (INSERT, UPDATE, DELETE) - uses ? placeholders
   */
  async run(text: string, params: any[] = []): Promise<{ rowCount: number; rows: any[] }> {
    const pgQuery = this.convertPlaceholders(text);
    const result = await this.query(pgQuery, params);
    return { rowCount: result.rowCount, rows: result.rows };
  }

  /**
   * Execute raw SQL statements (multiple statements separated by ;)
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
