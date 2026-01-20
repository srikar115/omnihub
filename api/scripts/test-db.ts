/**
 * Database Connection Test Script
 * Run with: npm run db:test
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from api folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let DATABASE_URL = process.env.DATABASE_URL || '';
const DATABASE_CA_CERT = process.env.DATABASE_CA_CERT;

// Remove sslmode from URL if present (we handle SSL separately)
if (DATABASE_URL.includes('sslmode=')) {
  DATABASE_URL = DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');
}

console.log('\n🔍 PostgreSQL Connection Test');
console.log('='.repeat(50));

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set in .env file\n');
  console.log('Expected format:');
  console.log('DATABASE_URL=postgresql://user:password@host:port/database\n');
  process.exit(1);
}

// Parse and display connection info (hide password)
let host = '', port = '', database = '', user = '';
try {
  const url = new URL(DATABASE_URL);
  host = url.hostname;
  port = url.port || '5432';
  database = url.pathname.replace('/', '');
  user = url.username;

  console.log('\n📋 Connection Details:');
  console.log(`   Host:     ${host}`);
  console.log(`   Port:     ${port}`);
  console.log(`   Database: ${database}`);
  console.log(`   User:     ${user}`);
  console.log(`   Password: ${'*'.repeat(url.password?.length || 0)}`);
  console.log(`   SSL:      ${process.env.DATABASE_SSL !== 'false' ? 'enabled' : 'disabled'}`);
  console.log(`   CA Cert:  ${DATABASE_CA_CERT || 'not set'}`);
} catch {
  console.error('\n❌ Invalid DATABASE_URL format');
  process.exit(1);
}

// Build SSL config
const sslEnabled = process.env.DATABASE_SSL !== 'false';
let sslConfig: boolean | { rejectUnauthorized: boolean; ca?: string } = false;

if (sslEnabled) {
  if (DATABASE_CA_CERT && fs.existsSync(DATABASE_CA_CERT)) {
    console.log(`\n🔐 Using CA certificate: ${DATABASE_CA_CERT}`);
    sslConfig = {
      rejectUnauthorized: true,
      ca: fs.readFileSync(DATABASE_CA_CERT, 'utf-8'),
    };
  } else {
    sslConfig = { rejectUnauthorized: false };
  }
}

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: sslConfig,
});

async function testConnection() {
  console.log('\n🔌 Connecting to PostgreSQL...');

  try {
    // Test connection
    const result = await pool.query(`
      SELECT 
        NOW() as server_time,
        version() as version,
        current_database() as database,
        current_user as db_user
    `);

    const info = result.rows[0];
    console.log('\n✅ CONNECTION SUCCESSFUL!\n');
    console.log('📊 Server Information:');
    console.log(`   Database:    ${info.database}`);
    console.log(`   User:        ${info.db_user}`);
    console.log(`   Server Time: ${new Date(info.server_time).toISOString()}`);
    console.log(`   PostgreSQL:  ${info.version.split(',')[0]}`);

    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tableList = tables.rows.map((t) => t.table_name);
    console.log(`\n📁 Tables in Database (${tableList.length}):`);

    if (tableList.length === 0) {
      console.log('   ⚠️  No tables found - run migrations first');
    } else {
      tableList.forEach((table) => console.log(`   • ${table}`));
    }

    // Check required tables
    const requiredTables = ['users', 'workspaces', 'generations', 'models', 'settings'];
    const missingTables = requiredTables.filter((t) => !tableList.includes(t));

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing required tables: ${missingTables.join(', ')}`);
    } else if (tableList.length > 0) {
      console.log('\n✅ All required tables exist!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Database is ready to use! 🚀\n');

  } catch (err: any) {
    console.log('\n❌ CONNECTION FAILED!\n');
    console.log(`Error: ${err.message}`);

    // Helpful suggestions
    if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestions:');
      console.log('   • Check if PostgreSQL is running');
      console.log('   • Verify the host and port');
      console.log(`   • Try: psql -h ${host} -p ${port} -U ${user} -d ${database}`);
    } else if (err.code === '28P01' || err.code === '28000') {
      console.log('\n💡 Suggestions:');
      console.log('   • Check username and password');
    } else if (err.code === '3D000') {
      console.log('\n💡 Suggestions:');
      console.log(`   • Database "${database}" does not exist`);
      console.log(`   • Create it: createdb ${database}`);
    } else if (err.code === 'ENOTFOUND') {
      console.log('\n💡 Suggestions:');
      console.log(`   • Host "${host}" not found`);
      console.log('   • Check your network/DNS settings');
    } else if (err.message.includes('SSL')) {
      console.log('\n💡 Suggestions:');
      console.log('   • Try adding DATABASE_SSL=false to .env');
    }

    console.log('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
