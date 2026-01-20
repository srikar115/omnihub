#!/usr/bin/env ts-node
/**
 * Migration CLI
 * 
 * Commands:
 *   npm run migrate              - Run all pending migrations
 *   npm run migrate:status       - Show migration status
 *   npm run migrate:rollback     - Rollback last batch
 *   npm run migrate:reset        - Rollback all migrations
 *   npm run migrate:refresh      - Reset and re-run all
 *   npm run migrate:create name  - Create new migration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { MigrationService } from '../src/database/migrations/migration.service';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let DATABASE_URL = process.env.DATABASE_URL || '';
const DATABASE_SSL = process.env.DATABASE_SSL !== 'false';
const DATABASE_CA_CERT = process.env.DATABASE_CA_CERT;

// Remove sslmode from URL if present (we handle SSL separately)
if (DATABASE_URL.includes('sslmode=')) {
  DATABASE_URL = DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('');
  log('━'.repeat(50), colors.dim);
  log(`  ${title}`, colors.bright);
  log('━'.repeat(50), colors.dim);
  console.log('');
}

async function main() {
  const command = process.argv[2] || 'up';
  const arg = process.argv[3];

  if (!DATABASE_URL) {
    log('❌ DATABASE_URL is not set in .env file', colors.red);
    process.exit(1);
  }

  const service = new MigrationService({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL,
    caCertPath: DATABASE_CA_CERT,
  });

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrate(service);
        break;

      case 'status':
        await showStatus(service);
        break;

      case 'rollback':
        await runRollback(service);
        break;

      case 'reset':
        await runReset(service);
        break;

      case 'refresh':
        await runRefresh(service);
        break;

      case 'create':
        if (!arg) {
          log('❌ Please provide a migration name', colors.red);
          log('   Usage: npm run migrate:create <name>', colors.dim);
          process.exit(1);
        }
        await createMigration(arg);
        break;

      default:
        log(`❌ Unknown command: ${command}`, colors.red);
        showHelp();
        process.exit(1);
    }
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    await service.close();
  }
}

async function runMigrate(service: MigrationService) {
  header('Running Migrations');

  const pending = await service.getPending();

  if (pending.length === 0) {
    log('✓ Nothing to migrate. Database is up to date.', colors.green);
    return;
  }

  log(`Found ${pending.length} pending migration(s):\n`, colors.cyan);
  pending.forEach(m => log(`   • ${m}`, colors.dim));
  console.log('');

  const results = await service.migrate();

  for (const result of results) {
    if (result.success) {
      log(`✓ ${result.migration} (${result.duration}ms)`, colors.green);
    } else {
      log(`✗ ${result.migration}`, colors.red);
      log(`  Error: ${result.error}`, colors.red);
    }
  }

  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('');
  log(`━━━ Summary ━━━`, colors.dim);
  log(`  Executed: ${success}`, colors.green);
  if (failed > 0) {
    log(`  Failed:   ${failed}`, colors.red);
  }
}

async function showStatus(service: MigrationService) {
  header('Migration Status');

  const status = await service.getStatus();

  if (status.length === 0) {
    log('No migrations found.', colors.yellow);
    return;
  }

  const executed = status.filter(s => s.status === 'executed');
  const pending = status.filter(s => s.status === 'pending');

  if (executed.length > 0) {
    log('Executed:', colors.green);
    for (const m of executed) {
      const date = m.executedAt ? new Date(m.executedAt).toISOString() : '';
      log(`  ✓ ${m.name} [batch ${m.batch}] ${date}`, colors.dim);
    }
    console.log('');
  }

  if (pending.length > 0) {
    log('Pending:', colors.yellow);
    for (const m of pending) {
      log(`  ○ ${m.name}`, colors.dim);
    }
  }

  console.log('');
  log(`━━━ Total ━━━`, colors.dim);
  log(`  Executed: ${executed.length}`, colors.green);
  log(`  Pending:  ${pending.length}`, colors.yellow);
}

async function runRollback(service: MigrationService) {
  header('Rolling Back Last Batch');

  const results = await service.rollback();

  if (results.length === 0) {
    log('Nothing to rollback.', colors.yellow);
    return;
  }

  for (const result of results) {
    if (result.success) {
      log(`✓ Rolled back: ${result.migration} (${result.duration}ms)`, colors.green);
    } else {
      log(`✗ Failed: ${result.migration}`, colors.red);
      log(`  Error: ${result.error}`, colors.red);
    }
  }
}

async function runReset(service: MigrationService) {
  header('Resetting All Migrations');

  log('⚠️  This will rollback ALL migrations!', colors.yellow);
  console.log('');

  const results = await service.reset();

  if (results.length === 0) {
    log('Nothing to reset.', colors.yellow);
    return;
  }

  for (const result of results) {
    if (result.success) {
      log(`✓ Rolled back: ${result.migration}`, colors.green);
    } else {
      log(`✗ Failed: ${result.migration}`, colors.red);
      log(`  Error: ${result.error}`, colors.red);
    }
  }

  log(`\n✓ Reset complete. ${results.filter(r => r.success).length} migrations rolled back.`, colors.green);
}

async function runRefresh(service: MigrationService) {
  header('Refreshing Database');

  log('⚠️  This will reset and re-run ALL migrations!', colors.yellow);
  console.log('');

  const { reset, migrate } = await service.refresh();

  if (reset.length > 0) {
    log('Rolled back:', colors.cyan);
    reset.forEach(r => log(`  ↩ ${r.migration}`, colors.dim));
    console.log('');
  }

  if (migrate.length > 0) {
    log('Migrated:', colors.cyan);
    migrate.forEach(r => {
      if (r.success) {
        log(`  ✓ ${r.migration}`, colors.green);
      } else {
        log(`  ✗ ${r.migration}: ${r.error}`, colors.red);
      }
    });
  }

  log('\n✓ Refresh complete.', colors.green);
}

async function createMigration(name: string) {
  header('Creating Migration');

  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // Ensure directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Get next migration number
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  const numbers = files.map(f => parseInt(f.split('_')[0], 10) || 0);
  const nextNum = (Math.max(0, ...numbers) + 1).toString().padStart(3, '0');

  // Create filename
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${nextNum}_${safeName}.sql`;
  const filepath = path.join(migrationsDir, filename);

  // Template content
  const template = `-- Migration: ${filename}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- UP
-- Add your migration SQL here



-- DOWN
-- Add rollback SQL here (drop tables, remove columns, etc.)


`;

  fs.writeFileSync(filepath, template);

  log(`✓ Created: migrations/${filename}`, colors.green);
  log('', colors.reset);
  log('Next steps:', colors.cyan);
  log(`  1. Edit the migration file: migrations/${filename}`, colors.dim);
  log('  2. Add your SQL in the -- UP section', colors.dim);
  log('  3. Add rollback SQL in the -- DOWN section', colors.dim);
  log('  4. Run: npm run migrate', colors.dim);
}

function showHelp() {
  console.log('');
  log('Usage: npm run migrate:<command>', colors.cyan);
  console.log('');
  log('Commands:', colors.bright);
  log('  migrate           Run all pending migrations', colors.dim);
  log('  migrate:status    Show migration status', colors.dim);
  log('  migrate:rollback  Rollback last batch', colors.dim);
  log('  migrate:reset     Rollback all migrations', colors.dim);
  log('  migrate:refresh   Reset and re-run all', colors.dim);
  log('  migrate:create    Create new migration file', colors.dim);
  console.log('');
}

main();
