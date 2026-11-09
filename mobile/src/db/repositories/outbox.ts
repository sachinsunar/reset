import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { OutboxItem } from '@/types';

export async function queueChange(
  entity: string,
  entityId: string,
  payload: Record<string, unknown> | null,
  day: string | null = null,
  updatedAt: string = nowIso(),
  db?: SQLiteDatabase,
): Promise<void> {
  const conn = db ?? (await getDb());
  const id = `${entity}:${entityId}`;
  await conn.runAsync(
    `INSERT INTO outbox (id, entity, entity_id, day, payload, created_at, attempts, last_error)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
     ON CONFLICT(id) DO UPDATE SET
       payload = excluded.payload,
       day = excluded.day,
       created_at = excluded.created_at,
       last_error = NULL`,
    id,
    entity,
    entityId,
    day,
    JSON.stringify({ deleted: payload === null, data: payload }),
    updatedAt,
  );
}

export async function getOutbox(limit = 200): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    entity: string;
    entity_id: string;
    day: string | null;
    payload: string;
    created_at: string;
    attempts: number;
    last_error: string | null;
  }>(`SELECT * FROM outbox ORDER BY created_at ASC LIMIT ?`, limit);
  return rows.map((row) => ({
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    day: row.day,
    payload: row.payload,
    createdAt: row.created_at,
    attempts: row.attempts,
    lastError: row.last_error,
  }));
}

export async function removeOutbox(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(`DELETE FROM outbox WHERE id = ?`, id);
    }
  });
}

export async function markOutboxFailure(ids: string[], error: string): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        error.slice(0, 500),
        id,
      );
    }
  });
}

export async function outboxCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM outbox`);
  return row?.count ?? 0;
}
