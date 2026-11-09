import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

let connection: Promise<SQLite.SQLiteDatabase> | null = null;

export function nowIso(): string {
  return new Date().toISOString();
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(schedule_blocks)`);
  if (!columns.some((column) => column.name === 'fixed')) {
    await db.execAsync(
      `ALTER TABLE schedule_blocks ADD COLUMN fixed INTEGER NOT NULL DEFAULT 0;`,
    );
  }

  const marker = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'migration_design_v2'`,
  );
  if (marker?.value === '1') return;

  await db.runAsync(
    `UPDATE schedule_blocks SET fixed = 1
     WHERE id IN ('v2-college', 'exam-college')`,
  );
  await db.runAsync(
    `UPDATE schedule_blocks
     SET title = 'NestJS Project Time',
         description = 'Build and improve my NestJS project. One small feature at a time.'
     WHERE id = 'v1-nestjs'`,
  );
  await db.runAsync(
    `UPDATE schedule_blocks
     SET title = 'NestJS Project Time',
         description = 'Optional. Build and improve my NestJS project.'
     WHERE id = 'v4-nestjs'`,
  );
  await db.runAsync(
    `UPDATE schedule_blocks
     SET title = 'NestJS project deep work',
         description = 'Optional. One meaningful step on the NestJS project.'
     WHERE id = 'v4-lms'`,
  );
  await db.runAsync(
    `UPDATE routine_phases SET color = CASE id
       WHEN 'vacation' THEN '#B94DF2'
       WHEN 'college' THEN '#008F8D'
       WHEN 'exam' THEN '#806F00'
       WHEN 'post-exam' THEN '#7A28A8'
       ELSE color END`,
  );
  await db.runAsync(
    `UPDATE subjects SET color = CASE id
       WHEN 'numerical-method' THEN '#7A28A8'
       WHEN 'operating-system' THEN '#008F8D'
       WHEN 'software-engineering' THEN '#806F00'
       ELSE color END`,
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES ('migration_design_v2', '1', ?)`,
    nowIso(),
  );
}

async function initialize(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('reset.db');
  await db.execAsync(SCHEMA_SQL);
  await migrate(db);
  await seedDatabase(db, nowIso());
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!connection) connection = initialize();
  return connection;
}

export async function resetDatabaseConnection(): Promise<void> {
  if (connection) {
    const db = await connection.catch(() => null);
    await db?.closeAsync().catch(() => undefined);
  }
  connection = null;
}
