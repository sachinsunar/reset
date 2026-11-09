import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Achievement,
  DailyCheckIn,
  DayLog,
  FocusSession,
  Goal,
  JournalEntry,
  LearningSession,
  LearningTopic,
  Profile,
  RoutinePhase,
  ScheduleBlock,
  StudySession,
  Subject,
  SyllabusTopic,
  WorkoutLog,
} from '@/types';
import { nowIso } from '@/db/database';
import { shouldApplyRemote } from '@/lib/syncConflict';
import type { XpAward } from '@/lib/xp';
import { applyRemoteDayLog } from './repositories/days';
import { applyRemoteGoal } from './repositories/goals';
import {
  applyRemoteStudySession,
  applyRemoteSubject,
  applyRemoteTopic,
} from './repositories/academic';
import { applyRemoteWorkout } from './repositories/fitness';
import {
  applyRemoteLearningSession,
  applyRemoteLearningTopic,
} from './repositories/learning';
import { applyRemoteFocusSession } from './repositories/focus';
import { applyRemoteCheckIn, applyRemoteJournal } from './repositories/journal';

export interface RemoteChange {
  entity: string;
  id: string;
  day?: string | null;
  updatedAt: string;
  deleted: boolean;
  payload: Record<string, unknown> | null;
}

interface LocalTarget {
  table: string;
  keyColumn: string;
  key: (change: RemoteChange) => string | number;
  timestampColumn: string;
}

const LOCAL_TARGETS: Record<string, LocalTarget> = {
  profile: { table: 'profile', keyColumn: 'id', key: () => 1, timestampColumn: 'updated_at' },
  settings: { table: 'settings', keyColumn: 'key', key: (c) => c.id, timestampColumn: 'updated_at' },
  routine_phase: {
    table: 'routine_phases',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  schedule_block: {
    table: 'schedule_blocks',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  goal: { table: 'goals', keyColumn: 'id', key: (c) => c.id, timestampColumn: 'updated_at' },
  day_log: { table: 'day_logs', keyColumn: 'date', key: (c) => c.id, timestampColumn: 'updated_at' },
  subject: { table: 'subjects', keyColumn: 'id', key: (c) => c.id, timestampColumn: 'updated_at' },
  topic: { table: 'topics', keyColumn: 'id', key: (c) => c.id, timestampColumn: 'updated_at' },
  study_session: {
    table: 'study_sessions',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  workout_log: {
    table: 'workout_logs',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  learning_topic: {
    table: 'learning_topics',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  learning_session: {
    table: 'learning_sessions',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'created_at',
  },
  focus_session: {
    table: 'focus_sessions',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  checkin: { table: 'checkins', keyColumn: 'date', key: (c) => c.id, timestampColumn: 'updated_at' },
  journal: {
    table: 'journal_entries',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'updated_at',
  },
  achievement: {
    table: 'achievements',
    keyColumn: 'key',
    key: (c) => c.id,
    timestampColumn: 'unlocked_at',
  },
  xp_award: {
    table: 'xp_awards',
    keyColumn: 'id',
    key: (c) => c.id,
    timestampColumn: 'awarded_at',
  },
};

const localTimestamp = async (
  db: SQLiteDatabase,
  target: LocalTarget,
  key: string | number,
): Promise<string | null> => {
  const row = await db.getFirstAsync<Record<string, string | null>>(
    `SELECT ${target.timestampColumn} as stamp FROM ${target.table} WHERE ${target.keyColumn} = ?`,
    key,
  );
  return row?.stamp ?? null;
};

const deleteLocal = async (db: SQLiteDatabase, entity: string, id: string) => {
  const target = LOCAL_TARGETS[entity];
  if (!target) return;
  if (entity === 'profile') return;
  await db.runAsync(`DELETE FROM ${target.table} WHERE ${target.keyColumn} = ?`, target.key({ entity, id, updatedAt: '', deleted: true, payload: null }));
};

export async function applyRemoteChange(db: SQLiteDatabase, change: RemoteChange): Promise<boolean> {
  const target = LOCAL_TARGETS[change.entity];
  if (!target) return false;
  if (change.entity === 'settings') {
    const value = change.payload?.value;
    if (change.deleted) {
      await deleteLocal(db, change.entity, change.id);
    } else if (typeof value === 'string') {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        change.id,
        value,
        change.updatedAt,
      );
    }
    return true;
  }

  const key = target.key(change);
  const local = await localTimestamp(db, target, key);
  if (!shouldApplyRemote(change.entity, change.updatedAt, local)) return false;

  if (change.deleted) {
    await deleteLocal(db, change.entity, change.id);
    return true;
  }

  const payload = change.payload;
  if (!payload) return false;

  switch (change.entity) {
    case 'profile': {
      const profile = payload as unknown as Profile;
      await db.runAsync(
        `INSERT INTO profile
          (id, name, email, timezone, onboarding_complete, tracking_since, active_phase_id,
           streak_threshold, rest_days_per_week, theme_mode, wake_time, bedtime, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, email = excluded.email, timezone = excluded.timezone,
           onboarding_complete = excluded.onboarding_complete,
           tracking_since = excluded.tracking_since, active_phase_id = excluded.active_phase_id,
           streak_threshold = excluded.streak_threshold,
           rest_days_per_week = excluded.rest_days_per_week, theme_mode = excluded.theme_mode,
           wake_time = excluded.wake_time, bedtime = excluded.bedtime,
           updated_at = excluded.updated_at`,
        profile.name,
        profile.email,
        profile.timezone,
        profile.onboardingComplete ? 1 : 0,
        profile.trackingSince,
        profile.activePhaseId,
        profile.streakThreshold,
        profile.restDaysPerWeek,
        profile.themeMode,
        profile.wakeTime,
        profile.bedtime,
        profile.createdAt,
        profile.updatedAt || change.updatedAt,
      );
      return true;
    }
    case 'routine_phase': {
      const phase = payload as unknown as RoutinePhase;
      await db.runAsync(
        `INSERT INTO routine_phases
          (id, name, objective, start_date, end_date, auto, sort_order, color, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, objective = excluded.objective, start_date = excluded.start_date,
           end_date = excluded.end_date, auto = excluded.auto, sort_order = excluded.sort_order,
           color = excluded.color, updated_at = excluded.updated_at`,
        phase.id,
        phase.name,
        phase.objective,
        phase.startDate,
        phase.endDate,
        phase.auto ? 1 : 0,
        phase.sortOrder,
        phase.color,
        change.updatedAt,
      );
      return true;
    }
    case 'schedule_block': {
      const block = payload as unknown as ScheduleBlock;
      await db.runAsync(
        `INSERT INTO schedule_blocks
          (id, phase_id, title, description, category, start_time, end_time, days, trackable,
           fixed, kind, est_minutes, sort_order, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           phase_id = excluded.phase_id, title = excluded.title,
           description = excluded.description, category = excluded.category,
           start_time = excluded.start_time, end_time = excluded.end_time, days = excluded.days,
           trackable = excluded.trackable, fixed = excluded.fixed, kind = excluded.kind,
           est_minutes = excluded.est_minutes, sort_order = excluded.sort_order,
           active = excluded.active, updated_at = excluded.updated_at`,
        block.id,
        block.phaseId,
        block.title,
        block.description ?? '',
        block.category,
        block.startTime,
        block.endTime,
        JSON.stringify(block.days ?? [0, 1, 2, 3, 4, 5, 6]),
        block.trackable ? 1 : 0,
        block.fixed ? 1 : 0,
        block.kind,
        block.estMinutes ?? 0,
        block.sortOrder ?? 0,
        block.active ? 1 : 0,
        change.updatedAt,
      );
      return true;
    }
    case 'goal':
      await applyRemoteGoal(db, payload as unknown as Goal);
      return true;
    case 'day_log':
      await applyRemoteDayLog(db, payload as unknown as DayLog);
      return true;
    case 'subject':
      await applyRemoteSubject(db, payload as unknown as Subject);
      return true;
    case 'topic':
      await applyRemoteTopic(db, payload as unknown as SyllabusTopic);
      return true;
    case 'study_session':
      await applyRemoteStudySession(db, payload as unknown as StudySession);
      return true;
    case 'workout_log':
      await applyRemoteWorkout(db, payload as unknown as WorkoutLog);
      return true;
    case 'learning_topic':
      await applyRemoteLearningTopic(db, payload as unknown as LearningTopic);
      return true;
    case 'learning_session':
      await applyRemoteLearningSession(db, payload as unknown as LearningSession);
      return true;
    case 'focus_session':
      await applyRemoteFocusSession(db, payload as unknown as FocusSession);
      return true;
    case 'checkin':
      await applyRemoteCheckIn(db, payload as unknown as DailyCheckIn);
      return true;
    case 'journal':
      await applyRemoteJournal(db, payload as unknown as JournalEntry);
      return true;
    case 'achievement': {
      const achievement = payload as unknown as Achievement;
      await db.runAsync(
        `INSERT INTO achievements (key, title, description, icon, unlocked_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           title = excluded.title, description = excluded.description, icon = excluded.icon,
           unlocked_at = excluded.unlocked_at`,
        achievement.key,
        achievement.title,
        achievement.description,
        achievement.icon,
        achievement.unlockedAt,
      );
      return true;
    }
    case 'xp_award': {
      const award = payload as unknown as XpAward;
      await db.runAsync(
        `INSERT INTO xp_awards (id, source_type, source_id, date, amount, awarded_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source_type = excluded.source_type, source_id = excluded.source_id,
           date = excluded.date, amount = excluded.amount, awarded_at = excluded.awarded_at`,
        award.id,
        award.sourceType,
        award.sourceId,
        award.date,
        award.amount,
        award.awardedAt,
      );
      return true;
    }
    default:
      return false;
  }
}

export const BACKUP_TABLES = [
  'profile',
  'settings',
  'routine_phases',
  'schedule_blocks',
  'goals',
  'day_logs',
  'subjects',
  'topics',
  'study_sessions',
  'workout_logs',
  'learning_topics',
  'learning_sessions',
  'focus_sessions',
  'checkins',
  'journal_entries',
  'achievements',
  'xp_awards',
] as const;

export interface BackupSnapshot {
  version: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function exportSnapshot(db: SQLiteDatabase): Promise<BackupSnapshot> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of BACKUP_TABLES) {
    const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
    tables[table] = rows;
  }
  return { version: 1, exportedAt: nowIso(), tables };
}

export async function snapshotRowCount(snapshot: BackupSnapshot): Promise<number> {
  return Object.values(snapshot.tables ?? {}).reduce((sum, rows) => sum + rows.length, 0);
}

const identifier = /^[a-z][a-z0-9_]*$/;

export async function restoreSnapshot(
  db: SQLiteDatabase,
  input: unknown,
): Promise<{ restoredRows: number; tables: number }> {
  if (!input || typeof input !== 'object') throw new Error('Backup is not readable.');
  const snapshot = input as Partial<BackupSnapshot>;
  if (!snapshot.tables || typeof snapshot.tables !== 'object') {
    throw new Error('Backup has no tables.');
  }
  const known = new Set<string>(BACKUP_TABLES);
  let restoredRows = 0;
  let tables = 0;

  await db.withTransactionAsync(async () => {
    for (const table of BACKUP_TABLES) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const [table, rows] of Object.entries(snapshot.tables!)) {
      if (!known.has(table) || !Array.isArray(rows)) continue;
      let insertedForTable = 0;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const columns = Object.keys(row).filter((column) => identifier.test(column));
        if (!columns.length) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((column) => {
          const value = (row as Record<string, unknown>)[column];
          if (value === undefined) return null;
          if (value !== null && typeof value === 'object') return JSON.stringify(value);
          return value as string | number | null;
        });
        const quoted = columns.map((column) => `"${column}"`).join(', ');
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${quoted}) VALUES (${placeholders})`,
          ...values,
        );
        insertedForTable += 1;
      }
      if (insertedForTable > 0) tables += 1;
      restoredRows += insertedForTable;
    }
    await db.runAsync(`DELETE FROM outbox`);
    const restoredAt = nowIso();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES ('lastRestoreAt', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      restoredAt,
      restoredAt,
    );
    if (typeof snapshot.exportedAt === 'string') {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES ('lastSyncAt', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        snapshot.exportedAt,
        restoredAt,
      );
    }
  });

  return { restoredRows, tables };
}
