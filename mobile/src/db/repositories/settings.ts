import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import { queueChange } from './outbox';
import { DEFAULT_BLOCKS, DEFAULT_SETTINGS } from '@/db/seed';
import { minutesToTime, timeToMinutes } from '@/lib/date';
import type {
  NotificationPreference,
  NotificationPreferences,
  Profile,
  RoutinePhase,
  ScheduleBlock,
  ThemeMode,
} from '@/types';

interface ProfileRow {
  id: number;
  name: string;
  email: string | null;
  timezone: string;
  onboarding_complete: number;
  tracking_since: string;
  active_phase_id: string | null;
  streak_threshold: number;
  rest_days_per_week: number;
  theme_mode: ThemeMode;
  wake_time: string;
  bedtime: string;
  created_at: string;
  updated_at: string;
}

interface PhaseRow {
  id: string;
  name: string;
  objective: string;
  start_date: string | null;
  end_date: string | null;
  auto: number;
  sort_order: number;
  color: string;
}

interface BlockRow {
  id: string;
  phase_id: string;
  title: string;
  description: string;
  category: string;
  start_time: string;
  end_time: string;
  days: string;
  trackable: number;
  fixed: number;
  kind: 'core' | 'optional';
  est_minutes: number;
  sort_order: number;
  active: number;
}

const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  timezone: row.timezone,
  onboardingComplete: row.onboarding_complete === 1,
  trackingSince: row.tracking_since,
  activePhaseId: row.active_phase_id,
  streakThreshold: row.streak_threshold,
  restDaysPerWeek: row.rest_days_per_week,
  themeMode: row.theme_mode,
  wakeTime: row.wake_time,
  bedtime: row.bedtime,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPhase = (row: PhaseRow): RoutinePhase => ({
  id: row.id,
  name: row.name,
  objective: row.objective,
  startDate: row.start_date,
  endDate: row.end_date,
  auto: row.auto === 1,
  sortOrder: row.sort_order,
  color: row.color,
});

const mapBlock = (row: BlockRow): ScheduleBlock => ({
  id: row.id,
  phaseId: row.phase_id,
  title: row.title,
  description: row.description,
  category: row.category as ScheduleBlock['category'],
  startTime: row.start_time,
  endTime: row.end_time,
  days: safeDays(row.days),
  trackable: row.trackable === 1,
  fixed: row.fixed === 1,
  kind: row.kind,
  estMinutes: row.est_minutes,
  sortOrder: row.sort_order,
  active: row.active === 1,
});

const safeDays = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
};

export async function getProfile(db?: SQLiteDatabase): Promise<Profile | null> {
  const conn = db ?? (await getDb());
  const row = await conn.getFirstAsync<ProfileRow>(`SELECT * FROM profile WHERE id = 1`);
  return row ? mapProfile(row) : null;
}

export async function createProfile(input: {
  name: string;
  email?: string | null;
  timezone: string;
  wakeTime: string;
  bedtime: string;
  trackingSince: string;
  streakThreshold?: number;
  restDaysPerWeek?: number;
  themeMode?: ThemeMode;
}): Promise<Profile> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT OR REPLACE INTO profile
      (id, name, email, timezone, onboarding_complete, tracking_since, active_phase_id,
       streak_threshold, rest_days_per_week, theme_mode, wake_time, bedtime, created_at, updated_at)
     VALUES (1, ?, ?, ?, 1, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    input.name.trim() || 'Friend',
    input.email?.trim() || null,
    input.timezone,
    input.trackingSince,
    input.streakThreshold ?? 0.7,
    input.restDaysPerWeek ?? 1,
    input.themeMode ?? 'system',
    input.wakeTime,
    input.bedtime,
    now,
    now,
  );
  const profile = await getProfile(db);
  if (profile) await queueChange('profile', 'me', profile as unknown as Record<string, unknown>, null, now, db);
  return profile!;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const db = await getDb();
  const current = await getProfile(db);
  if (!current) throw new Error('Profile has not been created yet.');
  const next: Profile = {
    ...current,
    ...patch,
    id: 1,
    updatedAt: nowIso(),
  };
  await db.runAsync(
    `UPDATE profile SET
      name = ?, email = ?, timezone = ?, onboarding_complete = ?, tracking_since = ?,
      active_phase_id = ?, streak_threshold = ?, rest_days_per_week = ?, theme_mode = ?,
      wake_time = ?, bedtime = ?, updated_at = ?
     WHERE id = 1`,
    next.name,
    next.email,
    next.timezone,
    next.onboardingComplete ? 1 : 0,
    next.trackingSince,
    next.activePhaseId,
    next.streakThreshold,
    next.restDaysPerWeek,
    next.themeMode,
    next.wakeTime,
    next.bedtime,
    next.updatedAt,
  );
  await queueChange('profile', 'me', next as unknown as Record<string, unknown>, null, next.updatedAt, db);
  return next;
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key,
  );
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    nowIso(),
  );
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await getSetting('notificationPrefs', DEFAULT_SETTINGS.notificationPrefs);
  try {
    const parsed = JSON.parse(raw) as NotificationPreferences;
    return {
      enabled: Boolean(parsed.enabled),
      quietStart: parsed.quietStart ?? '22:00',
      quietEnd: parsed.quietEnd ?? '05:30',
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return JSON.parse(DEFAULT_SETTINGS.notificationPrefs) as NotificationPreferences;
  }
}

export async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  await setSetting('notificationPrefs', JSON.stringify(prefs));
}

export async function getPhases(): Promise<RoutinePhase[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhaseRow>(
    `SELECT * FROM routine_phases ORDER BY sort_order ASC`,
  );
  return rows.map(mapPhase);
}

export async function getBlocks(phaseId?: string): Promise<ScheduleBlock[]> {
  const db = await getDb();
  const rows = phaseId
    ? await db.getAllAsync<BlockRow>(
        `SELECT * FROM schedule_blocks WHERE phase_id = ? ORDER BY start_time ASC`,
        phaseId,
      )
    : await db.getAllAsync<BlockRow>(`SELECT * FROM schedule_blocks ORDER BY phase_id, start_time ASC`);
  return rows.map(mapBlock);
}

export async function getBlock(id: string): Promise<ScheduleBlock | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BlockRow>(`SELECT * FROM schedule_blocks WHERE id = ?`, id);
  return row ? mapBlock(row) : null;
}

export async function upsertBlock(block: ScheduleBlock): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO schedule_blocks
      (id, phase_id, title, description, category, start_time, end_time, days, trackable,
       fixed, kind, est_minutes, sort_order, active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       phase_id = excluded.phase_id,
       title = excluded.title,
       description = excluded.description,
       category = excluded.category,
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       days = excluded.days,
       trackable = excluded.trackable,
       fixed = excluded.fixed,
       kind = excluded.kind,
       est_minutes = excluded.est_minutes,
       sort_order = excluded.sort_order,
       active = excluded.active,
       updated_at = excluded.updated_at`,
    block.id,
    block.phaseId,
    block.title,
    block.description,
    block.category,
    block.startTime,
    block.endTime,
    JSON.stringify(block.days),
    block.trackable ? 1 : 0,
    block.fixed ? 1 : 0,
    block.kind,
    block.estMinutes,
    block.sortOrder,
    block.active ? 1 : 0,
    now,
  );
  await queueChange('schedule_block', block.id, block as unknown as Record<string, unknown>, null, now, db);
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM schedule_blocks WHERE id = ?`, id);
  await queueChange('schedule_block', id, null, null, nowIso(), db);
}

export async function saveRoutineChanges(
  blocks: ScheduleBlock[],
  deletedIds: string[] = [],
): Promise<void> {
  for (const id of deletedIds) {
    await deleteBlock(id);
  }
  for (const block of blocks) {
    await upsertBlock(block);
  }
}

export async function restoreDefaultPhaseBlocks(phaseId: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const defaults = DEFAULT_BLOCKS.filter((b) => b.phaseId === phaseId);
  const defaultIds = new Set(defaults.map((block) => block.id));
  const existing = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM schedule_blocks WHERE phase_id = ?`,
    phaseId,
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM schedule_blocks WHERE phase_id = ?`, phaseId);
    for (const [index, block] of defaults.entries()) {
      await db.runAsync(
        `INSERT INTO schedule_blocks
          (id, phase_id, title, description, category, start_time, end_time, days, trackable,
           fixed, kind, est_minutes, sort_order, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        block.id,
        block.phaseId,
        block.title,
        block.description ?? '',
        block.category,
        block.startTime,
        block.endTime,
        JSON.stringify(block.days ?? [0, 1, 2, 3, 4, 5, 6]),
        block.trackable === false ? 0 : 1,
        block.fixed ? 1 : 0,
        block.kind ?? 'core',
        block.estMinutes ?? 0,
        index,
        now,
      );
    }
  });
  for (const row of existing) {
    if (!defaultIds.has(row.id)) {
      await queueChange('schedule_block', row.id, null, null, now, db);
    }
  }
  for (const block of defaults) {
    await queueChange(
      'schedule_block',
      block.id,
      {
        id: block.id,
        phaseId,
        title: block.title,
        description: block.description ?? '',
        category: block.category,
        startTime: block.startTime,
        endTime: block.endTime,
        days: block.days,
        trackable: block.trackable !== false,
        fixed: Boolean(block.fixed),
        kind: block.kind ?? 'core',
        estMinutes: block.estMinutes ?? 0,
        active: true,
      },
      null,
      now,
      db,
    );
  }
}

export function toNotificationItem(
  item: Partial<NotificationPreference> & { key: string; label: string; time: string },
): NotificationPreference {
  return {
    key: item.key,
    label: item.label,
    enabled: item.enabled !== false,
    time: item.time,
  };
}

export async function updateRoutineAnchors(wakeTime: string, bedtime: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const phases = await getPhases();
  await db.withTransactionAsync(async () => {
    for (const phase of phases) {
      const rows = await db.getAllAsync<BlockRow>(
        `SELECT * FROM schedule_blocks WHERE phase_id = ? ORDER BY start_time ASC`,
        phase.id,
      );
      const blocks = rows.map(mapBlock);
      const wake = blocks.find((block) => block.title.toLowerCase().startsWith('wake up'));
      const oldWake = wake ? timeToMinutes(wake.startTime) : null;
      const nextWake = timeToMinutes(wakeTime);
      const delta = oldWake == null ? 0 : nextWake - oldWake;

      for (const block of blocks) {
        if (block.category === 'sleep') {
          const duration = Math.max(15, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
          const end = minutesToTime(timeToMinutes(bedtime) + duration);
          await db.runAsync(
            `UPDATE schedule_blocks SET start_time = ?, end_time = ?, updated_at = ? WHERE id = ?`,
            bedtime,
            end,
            now,
            block.id,
          );
          await queueChange(
            'schedule_block',
            block.id,
            { ...block, startTime: bedtime, endTime: end },
            null,
            now,
            db,
          );
          continue;
        }
        if (block.fixed || delta === 0) continue;
        if (block.id === wake?.id || timeToMinutes(block.startTime) > (oldWake ?? -1)) {
          const duration = Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
          const start = minutesToTime(timeToMinutes(block.startTime) + delta);
          const end = minutesToTime(timeToMinutes(block.startTime) + delta + duration);
          await db.runAsync(
            `UPDATE schedule_blocks SET start_time = ?, end_time = ?, updated_at = ? WHERE id = ?`,
            start,
            end,
            now,
            block.id,
          );
          await queueChange(
            'schedule_block',
            block.id,
            { ...block, startTime: start, endTime: end },
            null,
            now,
            db,
          );
        }
      }
    }
  });
}

export async function updateLearningDays(days: number[]): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM schedule_blocks WHERE category = 'career' AND phase_id = 'vacation'`,
  );
  for (const row of rows) {
    await db.runAsync(
      `UPDATE schedule_blocks SET days = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(days),
      now,
      row.id,
    );
  }
}
