import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { DayLog, DayStatus } from '@/types';
import { evaluateDayStatus, type DayInput } from '@/lib/streak';
import { queueChange } from './outbox';
import { awardDailyPlanXp } from './xp';

interface DayRow {
  date: string;
  status: DayStatus;
  is_rest: number;
  is_recovery: number;
  note: string | null;
  completed_core: number;
  total_core: number;
  percent: number;
  updated_at: string;
}

const mapDay = (row: DayRow): DayLog => ({
  date: row.date,
  status: row.status,
  isRest: row.is_rest === 1,
  isRecovery: row.is_recovery === 1,
  note: row.note,
  completedCore: row.completed_core,
  totalCore: row.total_core,
  percent: row.percent,
  updatedAt: row.updated_at,
});

export async function getDayLog(date: string): Promise<DayLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DayRow>(`SELECT * FROM day_logs WHERE date = ?`, date);
  return row ? mapDay(row) : null;
}

export async function getDayLogs(from: string, to: string): Promise<DayLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DayRow>(
    `SELECT * FROM day_logs WHERE date >= ? AND date <= ? ORDER BY date ASC`,
    from,
    to,
  );
  return rows.map(mapDay);
}

export async function getRecentDayLogs(limit = 90): Promise<DayLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DayRow>(
    `SELECT * FROM day_logs ORDER BY date DESC LIMIT ?`,
    limit,
  );
  return rows.map(mapDay).reverse();
}

/**
 * Recomputes a day from its goals. Skipped core goals are removed from the
 * denominator so that intentional skips do not read as failure.
 */
export async function recomputeDayLog(
  date: string,
  today: string,
  threshold: number,
  overrides?: { isRest?: boolean; isRecovery?: boolean; note?: string | null },
): Promise<DayLog | null> {
  const db = await getDb();
  const existing = await db.getFirstAsync<DayRow>(`SELECT * FROM day_logs WHERE date = ?`, date);
  const counts = await db.getFirstAsync<{ completed: number; total: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
       COALESCE(SUM(CASE WHEN status != 'skipped' THEN 1 ELSE 0 END), 0) as total
     FROM goals WHERE date = ? AND kind = 'core'`,
    date,
  );
  const completedCore = counts?.completed ?? 0;
  const totalCore = counts?.total ?? 0;
  const isRest = overrides?.isRest ?? existing?.is_rest === 1;
  const isRecovery = overrides?.isRecovery ?? existing?.is_recovery === 1;
  const hasGoals = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals WHERE date = ?`,
    date,
  );

  if (!hasGoals?.count && !isRest && !isRecovery && !existing) return null;

  const percent = totalCore > 0 ? completedCore / totalCore : 0;
  const status = evaluateDayStatus({
    date,
    today,
    completedCore,
    totalCore,
    isRest,
    isRecovery,
    threshold,
  });
  const now = nowIso();
  const note = overrides?.note ?? existing?.note ?? null;
  await db.runAsync(
    `INSERT INTO day_logs
      (date, status, is_rest, is_recovery, note, completed_core, total_core, percent, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       status = excluded.status,
       is_rest = excluded.is_rest,
       is_recovery = excluded.is_recovery,
       note = excluded.note,
       completed_core = excluded.completed_core,
       total_core = excluded.total_core,
       percent = excluded.percent,
       updated_at = excluded.updated_at`,
    date,
    status,
    isRest ? 1 : 0,
    isRecovery ? 1 : 0,
    note,
    completedCore,
    totalCore,
    percent,
    now,
  );
  await queueChange(
    'day_log',
    date,
    {
      date,
      status,
      isRest,
      isRecovery,
      note,
      completedCore,
      totalCore,
      percent,
      updatedAt: now,
    },
    date,
    now,
    db,
  );
  if (status === 'completed') await awardDailyPlanXp(date);
  return {
    date,
    status,
    isRest,
    isRecovery,
    note,
    completedCore,
    totalCore,
    percent,
    updatedAt: now,
  };
}

export async function setDayRest(
  date: string,
  kind: 'none' | 'rest' | 'recovery',
  today: string,
  threshold: number,
  note?: string,
): Promise<DayLog | null> {
  await recomputeDayLog(date, today, threshold, {
    isRest: kind === 'rest',
    isRecovery: kind === 'recovery',
    note: note ?? null,
  });
  return getDayLog(date);
}

export async function dayInputs(from: string, to: string): Promise<DayInput[]> {
  const logs = await getDayLogs(from, to);
  return logs.map((log) => ({
    date: log.date,
    status: log.status,
    completedCore: log.completedCore,
    totalCore: log.totalCore,
    isRest: log.isRest,
    isRecovery: log.isRecovery,
  }));
}

export async function getAllDayInputs(limit = 400): Promise<DayInput[]> {
  const logs = await getRecentDayLogs(limit);
  return logs.map((log) => ({
    date: log.date,
    status: log.status,
    completedCore: log.completedCore,
    totalCore: log.totalCore,
    isRest: log.isRest,
    isRecovery: log.isRecovery,
  }));
}

export async function getDayStatuses(from: string, to: string): Promise<Record<string, DayStatus>> {
  const logs = await getDayLogs(from, to);
  return Object.fromEntries(logs.map((log) => [log.date, log.status]));
}

export async function applyRemoteDayLog(db: SQLiteDatabase, log: DayLog): Promise<void> {
  await db.runAsync(
    `INSERT INTO day_logs
      (date, status, is_rest, is_recovery, note, completed_core, total_core, percent, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       status = excluded.status, is_rest = excluded.is_rest, is_recovery = excluded.is_recovery,
       note = excluded.note, completed_core = excluded.completed_core,
       total_core = excluded.total_core, percent = excluded.percent,
       updated_at = excluded.updated_at`,
    log.date,
    log.status,
    log.isRest ? 1 : 0,
    log.isRecovery ? 1 : 0,
    log.note,
    log.completedCore,
    log.totalCore,
    log.percent,
    log.updatedAt,
  );
}
