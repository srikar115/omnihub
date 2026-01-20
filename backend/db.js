/**
 * PostgreSQL Database Connection Pool
 * 
 * This module provides a connection pool for PostgreSQL database operations.
 * It supports both cloud-hosted PostgreSQL (Supabase, Neon, Railway) and local SQLite fallback.
 * 
 * Configuration:
 * - Set DATABASE_URL in .env for PostgreSQL (e.g., postgresql://user:pass@host:5432/dbname)
 * - If DATABASE_URL is not set, falls back to SQLite for local development
 */

const { Pool } = require('pg');

// Check if PostgreSQL is configured
const isPostgres = !!process.env.DATABASE_URL;

let pool = null;
let db = null;

if (isPostgres) {
  // PostgreSQL connection pool
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                        // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000,  // Return an error after 5 seconds if connection could not be established
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
  });

  // Test connection on startup
  pool.query('SELECT NOW()')
    .then(() => console.log('[DB] PostgreSQL connected successfully'))
    .catch(err => console.error('[DB] PostgreSQL connection failed:', err.message));
} else {
  // Fallback to SQLite for local development
  console.log('[DB] DATABASE_URL not set, using SQLite fallback');
  const Database = require('better-sqlite3');
  db = new Database('./omnihub.db');
  db.pragma('journal_mode = WAL');
}

/**
 * Execute a query (PostgreSQL)
 * @param {string} text - SQL query with $1, $2... placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
const query = async (text, params = []) => {
  if (!isPostgres) {
    throw new Error('PostgreSQL not configured. Set DATABASE_URL in .env');
  }
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log('[DB] Slow query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  return result;
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
const getClient = async () => {
  if (!isPostgres) {
    throw new Error('PostgreSQL not configured. Set DATABASE_URL in .env');
  }
  return pool.connect();
};

/**
 * Execute a transaction with automatic commit/rollback
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<any>}
 */
const transaction = async (callback) => {
  const client = await getClient();
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
};

/**
 * Helper to convert SQLite-style queries to PostgreSQL
 * Replaces ? placeholders with $1, $2, etc.
 * @param {string} sql - SQLite-style query
 * @returns {string} - PostgreSQL-style query
 */
const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

/**
 * Compatibility layer: Execute query with SQLite-style ? placeholders
 * @param {string} text - SQL query with ? placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
const queryCompat = async (text, params = []) => {
  const pgQuery = convertPlaceholders(text);
  return query(pgQuery, params);
};

/**
 * Get single row (PostgreSQL equivalent of .get())
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|undefined>}
 */
const getOne = async (text, params = []) => {
  const result = await queryCompat(text, params);
  return result.rows[0];
};

/**
 * Get all rows (PostgreSQL equivalent of .all())
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
const getAll = async (text, params = []) => {
  const result = await queryCompat(text, params);
  return result.rows;
};

/**
 * Run a statement (INSERT, UPDATE, DELETE) and return info
 * @param {string} text - SQL statement
 * @param {Array} params - Query parameters
 * @returns {Promise<{rowCount: number}>}
 */
const run = async (text, params = []) => {
  const result = await queryCompat(text, params);
  return { rowCount: result.rowCount, rows: result.rows };
};

/**
 * Close the pool (for graceful shutdown)
 */
const close = async () => {
  if (isPostgres && pool) {
    await pool.end();
    console.log('[DB] PostgreSQL pool closed');
  }
};

module.exports = {
  // Core PostgreSQL functions
  query,
  getClient,
  transaction,
  
  // Compatibility layer (for migration from SQLite)
  queryCompat,
  getOne,
  getAll,
  run,
  convertPlaceholders,
  
  // Utilities
  close,
  isPostgres,
  
  // Direct access (for advanced use)
  pool,
  db  // SQLite fallback
};
