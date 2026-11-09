import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { FocusSession } from '@/types';
import { addDays, todayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import { queueChange } from './outbox';
import { addStudySession } from './academic';
import { addLearningSession } from './learning';

interface FocusRow {
  id: string;
  day: string;
  label: string;
  subject_id: string | null;
  learning_topic_id: string | null;
  minutes: number;
  started_at: string;
  ended_at: string;
  completed: number;
  created_at: string;
  updated_at: string;
}

const mapFocus = (row: FocusRow): FocusSession => ({
  id: row.id,
  day: row.day,
  label: row.label,
  subjectId: row.subject_id,
  learningTopicId: row.learning_topic_id,
  minutes: row.minutes,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function saveFocusSession(input: {
  label: string;
  subjectId?: string | null;
  learningTopicId?: string | null;
  minutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
}): Promise<FocusSession> {
  const db = await getDb();
  const id = newId('focus');
  const now = nowIso();
  const minutes = Math.max(0, Math.round(input.minutes));
  const session: FocusSession = {
    id,
    day: todayKey(new Date(input.endedAt)),
    label: input.label.trim() || 'Focus session',
    subjectId: input.subjectId ?? null,
    learningTopicId: input.learningTopicId ?? null,
    minutes,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    completed: input.completed,
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO focus_sessions
      (id, day, label, subject_id, learning_topic_id, minutes, started_at, ended_at, completed,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.day,
    session.label,
    session.subjectId,
    session.learningTopicId,
    session.minutes,
    session.startedAt,
    session.endedAt,
    session.completed ? 1 : 0,
    session.createdAt,
    session.updatedAt,
  );
  await queueChange(
    'focus_session',
    id,
    session as unknown as Record<string, unknown>,
    session.day,
    now,
    db,
  );

  if (input.completed && minutes > 0) {
    if (session.subjectId) {
      await addStudySession({
        subjectId: session.subjectId,
        kind: 'study',
        minutes,
        notes: session.label,
        day: session.day,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      });
    } else if (session.learningTopicId) {
      await addLearningSession({
        topicId: session.learningTopicId,
        minutes,
        notes: session.label,
        day: session.day,
      });
    }
  }
  return session;
}

export async function getFocusSessions(limit = 50): Promise<FocusSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FocusRow>(
    `SELECT * FROM focus_sessions ORDER BY started_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(mapFocus);
}

export async function getFocusStats(): Promise<{
  minutesToday: number;
  minutesWeek: number;
  totalSessions: number;
}> {
  const db = await getDb();
  const today = todayKey();
  const weekStart = addDays(today, -6);
  const todayRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM focus_sessions
     WHERE completed = 1 AND day = ?`,
    today,
  );
  const weekRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM focus_sessions
     WHERE completed = 1 AND day >= ? AND day <= ?`,
    weekStart,
    today,
  );
  const totalRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM focus_sessions WHERE completed = 1`,
  );
  return {
    minutesToday: todayRow?.minutes ?? 0,
    minutesWeek: weekRow?.minutes ?? 0,
    totalSessions: totalRow?.count ?? 0,
  };
}

export async function getFocusMinutesByDay(
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: string; minutes: number }>(
    `SELECT day, COALESCE(SUM(minutes), 0) as minutes FROM focus_sessions
     WHERE completed = 1 AND day >= ? AND day <= ? GROUP BY day`,
    from,
    to,
  );
  return Object.fromEntries(rows.map((r) => [r.day, r.minutes]));
}

export async function applyRemoteFocusSession(
  db: SQLiteDatabase,
  session: FocusSession,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO focus_sessions
      (id, day, label, subject_id, learning_topic_id, minutes, started_at, ended_at, completed,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       day = excluded.day, label = excluded.label, subject_id = excluded.subject_id,
       learning_topic_id = excluded.learning_topic_id, minutes = excluded.minutes,
       started_at = excluded.started_at, ended_at = excluded.ended_at,
       completed = excluded.completed, updated_at = excluded.updated_at`,
    session.id,
    session.day,
    session.label,
    session.subjectId,
    session.learningTopicId,
    session.minutes,
    session.startedAt,
    session.endedAt,
    session.completed ? 1 : 0,
    session.createdAt,
    session.updatedAt,
  );
}
