import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type {
  Category,
  Goal,
  GoalKind,
  GoalSeed,
  GoalSource,
  GoalStatus,
  Profile,
  Subject,
} from '@/types';
import { addDays, diffDays, todayKey } from '@/lib/date';
import { generateGoalSeeds, resolveActivePhase } from '@/lib/phases';
import { workoutForDate } from '@/lib/fitness';
import { newId } from '@/lib/id';
import { queueChange } from './outbox';
import { recomputeDayLog } from './days';
import { getBlocks, getPhases, getProfile } from './settings';
import { deleteWorkoutLogForDate, upsertWorkoutLog } from './fitness';
import { getSubjects } from './academic';
import { awardMissionXp } from './xp';

interface GoalRow {
  id: string;
  date: string;
  block_id: string | null;
  title: string;
  description: string;
  category: Category;
  est_minutes: number;
  scheduled_time: string | null;
  kind: GoalKind;
  status: GoalStatus;
  skip_reason: string | null;
  completed_at: string | null;
  source: GoalSource;
  created_at: string;
  updated_at: string;
}

export const mapGoal = (row: GoalRow): Goal => ({
  id: row.id,
  date: row.date,
  blockId: row.block_id,
  title: row.title,
  description: row.description,
  category: row.category,
  estMinutes: row.est_minutes,
  scheduledTime: row.scheduled_time,
  kind: row.kind,
  status: row.status,
  skipReason: row.skip_reason,
  completedAt: row.completed_at,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function insertSeed(
  db: SQLiteDatabase,
  date: string,
  seed: GoalSeed,
  now: string,
): Promise<void> {
  const id = seed.blockId ? `goal_${date}_${seed.blockId}` : newId('goal');
  await db.runAsync(
    `INSERT OR IGNORE INTO goals
      (id, date, block_id, title, description, category, est_minutes, scheduled_time, kind,
       status, skip_reason, completed_at, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)`,
    id,
    date,
    seed.blockId,
    seed.title,
    seed.description,
    seed.category,
    seed.estMinutes,
    seed.scheduledTime,
    seed.kind,
    seed.source,
    now,
    now,
  );
}

export async function getGoalsForDate(date: string): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals WHERE date = ?
     ORDER BY
       CASE kind WHEN 'core' THEN 0 ELSE 1 END,
       CASE status WHEN 'pending' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
       COALESCE(scheduled_time, '99:99'), created_at ASC`,
    date,
  );
  return rows.map(mapGoal);
}

export async function getCompletedGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals WHERE status = 'completed' ORDER BY completed_at ASC`,
  );
  return rows.map(mapGoal);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GoalRow>(`SELECT * FROM goals WHERE id = ?`, id);
  return row ? mapGoal(row) : null;
}

export async function getGoalsForRange(from: string, to: string): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals WHERE date >= ? AND date <= ? ORDER BY date ASC`,
    from,
    to,
  );
  return rows.map(mapGoal);
}

export async function ensureGoalsForDate(
  date: string,
  profile: Profile,
  options: { force?: boolean } = {},
): Promise<Goal[]> {
  const db = await getDb();
  if (date < profile.trackingSince) return [];
  const existing = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals WHERE date = ?`,
    date,
  );
  if ((existing?.count ?? 0) > 0 && !options.force) return getGoalsForDate(date);

  const [phases, blocks, subjects] = await Promise.all([getPhases(), getBlocks(), getSubjects()]);
  const today = todayKey();
  const override = date >= today ? profile.activePhaseId : null;
  const phase = resolveActivePhase(phases, date, override);
  const seeds = generateGoalSeeds(date, phase, blocks, {
    examSubjects: (subjects as Subject[]).map((s) => s.name),
  });
  const now = nowIso();
  for (const seed of seeds) {
    await insertSeed(db, date, seed, now);
  }
  return getGoalsForDate(date);
}

/**
 * Materialises the routine for past days since tracking began. This makes
 * missed days deterministic instead of silently disappearing from the streak.
 */
export async function ensureTrackingHistory(
  profile: Profile,
  today: string = todayKey(),
  maxDays = 120,
): Promise<void> {
  if (!profile.onboardingComplete) return;
  const earliest = addDays(today, -(maxDays - 1));
  const from = profile.trackingSince > earliest ? profile.trackingSince : earliest;
  if (from > today) return;
  const total = diffDays(from, today);
  for (let i = 0; i <= total; i++) {
    const date = addDays(from, i);
    await ensureGoalsForDate(date, profile);
    await recomputeDayLog(date, today, profile.streakThreshold);
  }
}

async function refreshDate(date: string): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;
  await recomputeDayLog(date, todayKey(), profile.streakThreshold);
}

function workoutKeyForDate(date: string): string {
  return workoutForDate(date).key;
}

export async function completeGoal(id: string): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  if (goal.status === 'completed') return goal;
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `UPDATE goals SET status = 'completed', completed_at = ?, skip_reason = NULL, updated_at = ?
     WHERE id = ?`,
    now,
    now,
    id,
  );
  await queueChange(
    'goal',
    id,
    { ...goal, status: 'completed', completedAt: now, updatedAt: now },
    goal.date,
    now,
    db,
  );
  await awardMissionXp(goal);
  if (goal.category === 'fitness') {
    const plan = workoutForDate(goal.date);
    await upsertWorkoutLog({
      date: goal.date,
      workoutKey: workoutKeyForDate(goal.date),
      title: goal.title,
      kind: plan.kind,
      durationMin: goal.estMinutes || plan.durationMin,
      intensity: 'easy',
      notes: 'Logged from your daily plan.',
    });
  }
  await refreshDate(goal.date);
  return getGoal(id);
}

export async function uncompleteGoal(id: string): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `UPDATE goals SET status = 'pending', completed_at = NULL, updated_at = ? WHERE id = ?`,
    now,
    id,
  );
  await queueChange(
    'goal',
    id,
    { ...goal, status: 'pending', completedAt: null, updatedAt: now },
    goal.date,
    now,
    db,
  );
  if (goal.category === 'fitness') {
    await deleteWorkoutLogForDate(goal.date, workoutKeyForDate(goal.date));
  }
  await refreshDate(goal.date);
  return getGoal(id);
}

export async function skipGoal(id: string, reason: string): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `UPDATE goals SET status = 'skipped', skip_reason = ?, completed_at = NULL, updated_at = ?
     WHERE id = ?`,
    reason,
    now,
    id,
  );
  await queueChange(
    'goal',
    id,
    { ...goal, status: 'skipped', skipReason: reason, completedAt: null, updatedAt: now },
    goal.date,
    now,
    db,
  );
  await refreshDate(goal.date);
  return getGoal(id);
}

export async function restoreGoal(id: string): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `UPDATE goals SET status = 'pending', skip_reason = NULL, completed_at = NULL, updated_at = ?
     WHERE id = ?`,
    now,
    id,
  );
  await queueChange(
    'goal',
    id,
    { ...goal, status: 'pending', skipReason: null, completedAt: null, updatedAt: now },
    goal.date,
    now,
    db,
  );
  await refreshDate(goal.date);
  return getGoal(id);
}

export async function rescheduleGoal(
  id: string,
  newDate: string,
  newTime?: string | null,
): Promise<Goal | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  const db = await getDb();
  const now = nowIso();
  const oldDate = goal.date;
  await db.runAsync(
    `UPDATE goals
     SET date = ?, block_id = NULL, scheduled_time = ?, status = 'pending',
         skip_reason = NULL, completed_at = NULL, updated_at = ?
     WHERE id = ?`,
    newDate,
    newTime ?? goal.scheduledTime,
    now,
    id,
  );
  await queueChange(
    'goal',
    id,
    {
      ...goal,
      date: newDate,
      blockId: null,
      scheduledTime: newTime ?? goal.scheduledTime,
      status: 'pending',
      skipReason: null,
      completedAt: null,
      updatedAt: now,
    },
    newDate,
    now,
    db,
  );
  await refreshDate(oldDate);
  await refreshDate(newDate);
  return getGoal(id);
}

export async function addManualGoal(input: {
  date: string;
  title: string;
  description?: string;
  category: Category;
  estMinutes?: number;
  scheduledTime?: string | null;
  kind?: GoalKind;
  source?: GoalSource;
}): Promise<Goal> {
  const db = await getDb();
  const now = nowIso();
  const id = newId('goal');
  await db.runAsync(
    `INSERT INTO goals
      (id, date, block_id, title, description, category, est_minutes, scheduled_time, kind,
       status, skip_reason, completed_at, source, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)`,
    id,
    input.date,
    input.title.trim(),
    input.description?.trim() ?? '',
    input.category,
    Math.max(0, Math.round(input.estMinutes ?? 0)),
    input.scheduledTime ?? null,
    input.kind ?? 'optional',
    input.source ?? 'manual',
    now,
    now,
  );
  const goal = await getGoal(id);
  if (goal) await queueChange('goal', id, goal as unknown as Record<string, unknown>, input.date, now, db);
  await refreshDate(input.date);
  return goal!;
}

export async function deleteGoal(id: string): Promise<void> {
  const goal = await getGoal(id);
  if (!goal) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM goals WHERE id = ?`, id);
  await queueChange('goal', id, null, goal.date, nowIso(), db);
  await refreshDate(goal.date);
}

/** Rebuilds pending routine goals after a schedule edit, preserving completed ones. */
export async function regenerateRoutineGoals(date: string): Promise<Goal[]> {
  const profile = await getProfile();
  if (!profile) return [];
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM goals WHERE date = ? AND source = 'routine' AND status = 'pending'`,
    date,
  );
  const goals = await ensureGoalsForDate(date, profile, { force: true });
  await refreshDate(date);
  return goals;
}

export async function applyRemoteGoal(db: SQLiteDatabase, goal: Goal): Promise<void> {
  await db.runAsync(
    `INSERT INTO goals
      (id, date, block_id, title, description, category, est_minutes, scheduled_time, kind,
       status, skip_reason, completed_at, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date, block_id = excluded.block_id, title = excluded.title,
       description = excluded.description, category = excluded.category,
       est_minutes = excluded.est_minutes, scheduled_time = excluded.scheduled_time,
       kind = excluded.kind, status = excluded.status, skip_reason = excluded.skip_reason,
       completed_at = excluded.completed_at, source = excluded.source,
       updated_at = excluded.updated_at`,
    goal.id,
    goal.date,
    goal.blockId,
    goal.title,
    goal.description,
    goal.category,
    goal.estMinutes,
    goal.scheduledTime,
    goal.kind,
    goal.status,
    goal.skipReason,
    goal.completedAt,
    goal.source,
    goal.createdAt,
    goal.updatedAt,
  );
}
