import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { LearningSession, LearningTopic } from '@/types';
import { addDays, todayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import { queueChange } from './outbox';

interface LearningTopicRow {
  id: string;
  title: string;
  description: string;
  status: LearningTopic['status'];
  minutes: number;
  notes: string;
  code_done: number;
  sort_order: number;
  updated_at: string;
}

interface LearningSessionRow {
  id: string;
  day: string;
  topic_id: string | null;
  minutes: number;
  notes: string;
  created_at: string;
}

const mapTopic = (row: LearningTopicRow): LearningTopic => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  minutes: row.minutes,
  notes: row.notes,
  codeDone: row.code_done === 1,
  sortOrder: row.sort_order,
  createdAt: row.updated_at,
  updatedAt: row.updated_at,
});

const mapSession = (row: LearningSessionRow): LearningSession => ({
  id: row.id,
  day: row.day,
  topicId: row.topic_id,
  minutes: row.minutes,
  notes: row.notes,
  createdAt: row.created_at,
});

export async function getLearningTopics(): Promise<LearningTopic[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LearningTopicRow>(
    `SELECT * FROM learning_topics ORDER BY sort_order ASC`,
  );
  return rows.map(mapTopic);
}

export async function getLearningTopic(id: string): Promise<LearningTopic | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LearningTopicRow>(
    `SELECT * FROM learning_topics WHERE id = ?`,
    id,
  );
  return row ? mapTopic(row) : null;
}

export async function updateLearningTopic(
  id: string,
  patch: Partial<LearningTopic>,
): Promise<LearningTopic | null> {
  const current = await getLearningTopic(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updatedAt: nowIso() };
  const db = await getDb();
  await db.runAsync(
    `UPDATE learning_topics
     SET title = ?, description = ?, status = ?, minutes = ?, notes = ?, code_done = ?,
         sort_order = ?, updated_at = ?
     WHERE id = ?`,
    next.title,
    next.description,
    next.status,
    next.minutes,
    next.notes,
    next.codeDone ? 1 : 0,
    next.sortOrder,
    next.updatedAt,
    id,
  );
  await queueChange(
    'learning_topic',
    id,
    next as unknown as Record<string, unknown>,
    null,
    next.updatedAt,
    db,
  );
  return next;
}

export async function addLearningSession(input: {
  topicId: string | null;
  minutes: number;
  notes?: string;
  day?: string;
}): Promise<LearningSession> {
  const db = await getDb();
  const id = newId('learn');
  const now = nowIso();
  const day = input.day ?? todayKey();
  const session: LearningSession = {
    id,
    day,
    topicId: input.topicId,
    minutes: Math.max(1, Math.round(input.minutes)),
    notes: input.notes ?? '',
    createdAt: now,
  };
  await db.runAsync(
    `INSERT INTO learning_sessions (id, day, topic_id, minutes, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    session.id,
    session.day,
    session.topicId,
    session.minutes,
    session.notes,
    session.createdAt,
  );
  await queueChange(
    'learning_session',
    id,
    session as unknown as Record<string, unknown>,
    day,
    now,
    db,
  );
  if (input.topicId) {
    const topic = await getLearningTopic(input.topicId);
    if (topic) {
      await updateLearningTopic(topic.id, {
        minutes: topic.minutes + session.minutes,
        status: topic.status === 'not_started' ? 'learning' : topic.status,
      });
    }
  }
  return session;
}

export async function getLearningSessions(limit = 100): Promise<LearningSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LearningSessionRow>(
    `SELECT * FROM learning_sessions ORDER BY created_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(mapSession);
}

export interface LearningStats {
  minutesToday: number;
  minutesWeek: number;
  minutesTotal: number;
  sessionsTotal: number;
  completedTopics: number;
  totalTopics: number;
  currentStreak: number;
}

export async function getLearningStats(): Promise<LearningStats> {
  const db = await getDb();
  const today = todayKey();
  const weekStart = addDays(today, -6);
  const todayRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM learning_sessions WHERE day = ?`,
    today,
  );
  const weekRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM learning_sessions WHERE day >= ? AND day <= ?`,
    weekStart,
    today,
  );
  const totalRow = await db.getFirstAsync<{ minutes: number; sessions: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes, COUNT(*) as sessions FROM learning_sessions`,
  );
  const topicRow = await db.getFirstAsync<{ total: number; completed: number }>(
    `SELECT COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed
     FROM learning_topics`,
  );
  const days = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT day FROM learning_sessions ORDER BY day DESC LIMIT 120`,
  );
  const daySet = new Set(days.map((d) => d.day));
  let currentStreak = 0;
  let cursor = today;
  if (!daySet.has(cursor)) cursor = addDays(today, -1);
  while (daySet.has(cursor) && currentStreak < 365) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  return {
    minutesToday: todayRow?.minutes ?? 0,
    minutesWeek: weekRow?.minutes ?? 0,
    minutesTotal: totalRow?.minutes ?? 0,
    sessionsTotal: totalRow?.sessions ?? 0,
    completedTopics: topicRow?.completed ?? 0,
    totalTopics: topicRow?.total ?? 0,
    currentStreak,
  };
}

export async function applyRemoteLearningTopic(
  db: SQLiteDatabase,
  topic: LearningTopic,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO learning_topics
      (id, title, description, status, minutes, notes, code_done, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, description = excluded.description, status = excluded.status,
       minutes = excluded.minutes, notes = excluded.notes, code_done = excluded.code_done,
       sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
    topic.id,
    topic.title,
    topic.description,
    topic.status,
    topic.minutes,
    topic.notes,
    topic.codeDone ? 1 : 0,
    topic.sortOrder,
    topic.updatedAt,
  );
}

export async function applyRemoteLearningSession(
  db: SQLiteDatabase,
  session: LearningSession,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO learning_sessions (id, day, topic_id, minutes, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       day = excluded.day, topic_id = excluded.topic_id, minutes = excluded.minutes,
       notes = excluded.notes`,
    session.id,
    session.day,
    session.topicId,
    session.minutes,
    session.notes,
    session.createdAt,
  );
}
