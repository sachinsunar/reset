import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { WorkoutLog } from '@/types';
import { queueChange } from './outbox';
import { addDays, startOfWeekKey, todayKey } from '@/lib/date';

interface WorkoutRow {
  id: string;
  date: string;
  workout_key: string;
  title: string;
  kind: WorkoutLog['kind'];
  duration_min: number;
  distance_km: number | null;
  intensity: WorkoutLog['intensity'];
  completed: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

const mapWorkout = (row: WorkoutRow): WorkoutLog => ({
  id: row.id,
  date: row.date,
  workoutKey: row.workout_key,
  title: row.title,
  kind: row.kind,
  durationMin: row.duration_min,
  distanceKm: row.distance_km,
  intensity: row.intensity,
  completed: row.completed === 1,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getWorkoutLogs(from: string, to: string): Promise<WorkoutLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workout_logs WHERE date >= ? AND date <= ? ORDER BY date DESC`,
    from,
    to,
  );
  return rows.map(mapWorkout);
}

export async function getWorkoutLogForDate(
  date: string,
  workoutKey: string,
): Promise<WorkoutLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM workout_logs WHERE date = ? AND workout_key = ?`,
    date,
    workoutKey,
  );
  return row ? mapWorkout(row) : null;
}

export async function upsertWorkoutLog(input: {
  id?: string;
  date: string;
  workoutKey: string;
  title: string;
  kind: WorkoutLog['kind'];
  durationMin: number;
  distanceKm?: number | null;
  intensity?: WorkoutLog['intensity'];
  completed?: boolean;
  notes?: string;
}): Promise<WorkoutLog> {
  const db = await getDb();
  const existing = await getWorkoutLogForDate(input.date, input.workoutKey);
  const now = nowIso();
  const id = input.id ?? existing?.id ?? `wlog_${input.date}_${input.workoutKey}`;
  const log: WorkoutLog = {
    id,
    date: input.date,
    workoutKey: input.workoutKey,
    title: input.title,
    kind: input.kind,
    durationMin: Math.max(0, Math.round(input.durationMin)),
    distanceKm: input.distanceKm ?? existing?.distanceKm ?? null,
    intensity: input.intensity ?? existing?.intensity ?? 'normal',
    completed: input.completed ?? true,
    notes: input.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO workout_logs
      (id, date, workout_key, title, kind, duration_min, distance_km, intensity, completed,
       notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, workout_key) DO UPDATE SET
       title = excluded.title,
       kind = excluded.kind,
       duration_min = excluded.duration_min,
       distance_km = excluded.distance_km,
       intensity = excluded.intensity,
       completed = excluded.completed,
       notes = excluded.notes,
       updated_at = excluded.updated_at`,
    log.id,
    log.date,
    log.workoutKey,
    log.title,
    log.kind,
    log.durationMin,
    log.distanceKm,
    log.intensity,
    log.completed ? 1 : 0,
    log.notes,
    log.createdAt,
    log.updatedAt,
  );
  await queueChange(
    'workout_log',
    log.id,
    { ...log, id: log.id },
    log.date,
    log.updatedAt,
    db,
  );
  return log;
}

export async function deleteWorkoutLogForDate(date: string, workoutKey: string): Promise<void> {
  const existing = await getWorkoutLogForDate(date, workoutKey);
  if (!existing) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM workout_logs WHERE date = ? AND workout_key = ?`, date, workoutKey);
  await queueChange('workout_log', existing.id, null, date, nowIso(), db);
}

export interface FitnessStats {
  workoutsThisWeek: number;
  minutesThisWeek: number;
  distanceThisWeek: number;
  workoutsLast30: number;
  totalMinutes: number;
  totalDistance: number;
}

export async function getFitnessStats(): Promise<FitnessStats> {
  const db = await getDb();
  const today = todayKey();
  const weekStart = startOfWeekKey(today);
  const monthStart = addDays(today, -29);
  const row = await db.getFirstAsync<{
    workouts: number;
    minutes: number;
    distance: number;
  }>(
    `SELECT COUNT(*) as workouts, COALESCE(SUM(duration_min), 0) as minutes,
            COALESCE(SUM(distance_km), 0) as distance
     FROM workout_logs
     WHERE completed = 1 AND date >= ? AND date <= ?`,
    weekStart,
    today,
  );
  const month = await db.getFirstAsync<{ workouts: number }>(
    `SELECT COUNT(*) as workouts FROM workout_logs WHERE completed = 1 AND date >= ? AND date <= ?`,
    monthStart,
    today,
  );
  const total = await db.getFirstAsync<{ minutes: number; distance: number; count: number }>(
    `SELECT COALESCE(SUM(duration_min), 0) as minutes, COALESCE(SUM(distance_km), 0) as distance,
            COUNT(*) as count
     FROM workout_logs WHERE completed = 1`,
  );
  return {
    workoutsThisWeek: row?.workouts ?? 0,
    minutesThisWeek: row?.minutes ?? 0,
    distanceThisWeek: row?.distance ?? 0,
    workoutsLast30: month?.workouts ?? 0,
    totalMinutes: total?.minutes ?? 0,
    totalDistance: total?.distance ?? 0,
  };
}

export async function getWorkoutCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workout_logs WHERE completed = 1`,
  );
  return row?.count ?? 0;
}

export async function getRecentWorkoutDates(limit = 30): Promise<WorkoutLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workout_logs WHERE completed = 1 ORDER BY date DESC LIMIT ?`,
    limit,
  );
  return rows.map(mapWorkout);
}

export async function applyRemoteWorkout(db: SQLiteDatabase, log: WorkoutLog): Promise<void> {
  await db.runAsync(
    `INSERT INTO workout_logs
      (id, date, workout_key, title, kind, duration_min, distance_km, intensity, completed,
       notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date, workout_key = excluded.workout_key, title = excluded.title,
       kind = excluded.kind, duration_min = excluded.duration_min,
       distance_km = excluded.distance_km, intensity = excluded.intensity,
       completed = excluded.completed, notes = excluded.notes, updated_at = excluded.updated_at`,
    log.id,
    log.date,
    log.workoutKey,
    log.title,
    log.kind,
    log.durationMin,
    log.distanceKm,
    log.intensity,
    log.completed ? 1 : 0,
    log.notes,
    log.createdAt,
    log.updatedAt,
  );
}
