/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';
import { Migrator, Migration, MigrationProvider } from 'kysely/migration';
import * as initialSchema from './migrations/001_initial_schema.js';
import * as timeLogs from './migrations/002_time_logs.js';
import { db } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

function isMigrationImplemented(migration: Migration): boolean {
  if (!migration.up) return false;
  // Normalize function body to detect if it's still an empty stub
  const body = migration.up.toString().replace(/\s+/g, '');
  return (
    body !== 'asyncfunctionup(db){}' &&
    !body.endsWith('{//TODO:Studentimplementation}')
  );
}

export function createMigrator(database: Kysely<any> = db): Migrator {
  const provider: MigrationProvider = {
    async getMigrations(): Promise<Record<string, Migration>> {
      const migrations: Record<string, Migration> = {
        '001_initial_schema': initialSchema,
      };

      // Automatically register 002_time_logs once student implements it
      if (isMigrationImplemented(timeLogs)) {
        migrations['002_time_logs'] = timeLogs;
      }

      return migrations;
    },
  };

  return new Migrator({
    db: database,
    provider,
  });
}

export async function migrateToLatest(database: Kysely<any> = db) {
  const migrator = createMigrator(database);
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" executed successfully.`);
    } else if (it.status === 'Error') {
      console.error(`Failed to execute migration "${it.migrationName}".`);
    }
  });

  if (error) {
    console.error('Failed to migrate to latest:', error);
    throw error;
  }

  return results;
}

export async function migrateDown(database: Kysely<any> = db) {
  const migrator = createMigrator(database);
  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was reverted.`);
    } else if (it.status === 'Error') {
      console.error(`Failed to revert migration "${it.migrationName}".`);
    }
  });

  if (error) {
    console.error('Failed to migrate down:', error);
    throw error;
  }

  return results;
}

// Allow running directly via CLI
if (process.argv[1]?.includes('migrator')) {
  const action = process.argv[2] || 'up';
  if (action === 'down') {
    migrateDown()
      .then(() => db.destroy())
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    migrateToLatest()
      .then(() => db.destroy())
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
