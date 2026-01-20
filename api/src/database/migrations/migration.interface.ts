/**
 * Migration Interface
 * All migrations must implement this interface
 */
export interface Migration {
  /** Unique migration name (e.g., '001_initial_schema') */
  name: string;

  /** Apply the migration */
  up(): string;

  /** Rollback the migration */
  down(): string;
}

/**
 * Migration record stored in database
 */
export interface MigrationRecord {
  id: number;
  name: string;
  batch: number;
  executed_at: Date;
}

/**
 * Migration status for CLI output
 */
export interface MigrationStatus {
  name: string;
  status: 'pending' | 'executed';
  batch?: number;
  executedAt?: Date;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migration: string;
  direction: 'up' | 'down';
  error?: string;
  duration?: number;
}
