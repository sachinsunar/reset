import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { StudySession, Subject, SyllabusTopic, TopicStatus } from '@/types';
import { addDays, todayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import { queueChange } from './outbox';

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  priority: number;
  allocation: number;
  confidence: number;
  color: string;
  exam_date: string | null;
  exam_time: string | null;
  notes: string;
  updated_at: string;
}

interface TopicRow {
  id: string;
  subject_id: string;
  title: string;
  status: TopicStatus;
  minutes: number;
  practice_done: number;
  revision_done: number;
  confidence: number;
  notes: string;
  sort_order: number;
  updated_at: string;
}

interface SessionRow {
  id: string;
  day: string;
  subject_id: string | null;
  topic_id: string | null;
  kind: StudySession['kind'];
  minutes: number;
  started_at: string;
  ended_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const mapSubject = (row: SubjectRow): Subject => ({
  id: row.id,
  name: row.name,
  code: row.code,
  priority: row.priority,
  allocation: row.allocation,
  confidence: row.confidence,
  color: row.color,
  examDate: row.exam_date,
  examTime: row.exam_time,
  notes: row.notes,
  createdAt: row.updated_at,
  updatedAt: row.updated_at,
});

const mapTopic = (row: TopicRow): SyllabusTopic => ({
  id: row.id,
  subjectId: row.subject_id,
  title: row.title,
  status: row.status,
  minutes: row.minutes,
  practiceDone: row.practice_done === 1,
  revisionDone: row.revision_done === 1,
  confidence: row.confidence,
  notes: row.notes,
  sortOrder: row.sort_order,
  createdAt: row.updated_at,
  updatedAt: row.updated_at,
});

const mapSession = (row: SessionRow): StudySession => ({
  id: row.id,
  day: row.day,
  subjectId: row.subject_id,
  topicId: row.topic_id,
  kind: row.kind,
  minutes: row.minutes,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getSubjects(): Promise<Subject[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SubjectRow>(`SELECT * FROM subjects ORDER BY priority ASC`);
  return rows.map(mapSubject);
}

export async function getSubject(id: string): Promise<Subject | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SubjectRow>(`SELECT * FROM subjects WHERE id = ?`, id);
  return row ? mapSubject(row) : null;
}

export async function updateSubject(id: string, patch: Partial<Subject>): Promise<Subject | null> {
  const current = await getSubject(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updatedAt: nowIso() };
  const db = await getDb();
  await db.runAsync(
    `UPDATE subjects SET name = ?, code = ?, priority = ?, allocation = ?, confidence = ?,
       color = ?, exam_date = ?, exam_time = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    next.name,
    next.code,
    next.priority,
    next.allocation,
    next.confidence,
    next.color,
    next.examDate,
    next.examTime,
    next.notes,
    next.updatedAt,
    id,
  );
  await queueChange('subject', id, next as unknown as Record<string, unknown>, null, next.updatedAt, db);
  return next;
}

export async function getTopics(subjectId?: string): Promise<SyllabusTopic[]> {
  const db = await getDb();
  const rows = subjectId
    ? await db.getAllAsync<TopicRow>(
        `SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC, updated_at ASC`,
        subjectId,
      )
    : await db.getAllAsync<TopicRow>(
        `SELECT * FROM topics ORDER BY subject_id ASC, sort_order ASC`,
      );
  return rows.map(mapTopic);
}

export async function getTopic(id: string): Promise<SyllabusTopic | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TopicRow>(`SELECT * FROM topics WHERE id = ?`, id);
  return row ? mapTopic(row) : null;
}

export async function createTopic(input: {
  subjectId: string;
  title: string;
  status?: TopicStatus;
  confidence?: number;
}): Promise<SyllabusTopic> {
  const db = await getDb();
  const max = await db.getFirstAsync<{ max: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as max FROM topics WHERE subject_id = ?`,
    input.subjectId,
  );
  const id = newId('topic');
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO topics
      (id, subject_id, title, status, minutes, practice_done, revision_done, confidence, notes,
       sort_order, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, 0, ?, '', ?, ?)`,
    id,
    input.subjectId,
    input.title.trim(),
    input.status ?? 'not_started',
    input.confidence ?? 3,
    (max?.max ?? -1) + 1,
    now,
  );
  const topic = (await getTopic(id))!;
  await queueChange('topic', id, topic as unknown as Record<string, unknown>, null, now, db);
  return topic;
}

export async function updateTopic(id: string, patch: Partial<SyllabusTopic>): Promise<SyllabusTopic | null> {
  const current = await getTopic(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updatedAt: nowIso() };
  const db = await getDb();
  await db.runAsync(
    `UPDATE topics SET title = ?, status = ?, minutes = ?, practice_done = ?, revision_done = ?,
       confidence = ?, notes = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
    next.title,
    next.status,
    next.minutes,
    next.practiceDone ? 1 : 0,
    next.revisionDone ? 1 : 0,
    next.confidence,
    next.notes,
    next.sortOrder,
    next.updatedAt,
    id,
  );
  await queueChange('topic', id, next as unknown as Record<string, unknown>, null, next.updatedAt, db);
  return next;
}

export async function deleteTopic(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM topics WHERE id = ?`, id);
  await queueChange('topic', id, null, null, nowIso(), db);
}

export async function addStudySession(input: {
  subjectId: string | null;
  topicId?: string | null;
  kind?: StudySession['kind'];
  minutes: number;
  notes?: string;
  day?: string;
  startedAt?: string;
  endedAt?: string;
}): Promise<StudySession> {
  const db = await getDb();
  const id = newId('study');
  const now = nowIso();
  const minutes = Math.max(1, Math.round(input.minutes));
  const endedAt = input.endedAt ?? now;
  const startedAt =
    input.startedAt ?? new Date(new Date(endedAt).getTime() - minutes * 60_000).toISOString();
  const day = input.day ?? todayKey();
  const row: StudySession = {
    id,
    day,
    subjectId: input.subjectId,
    topicId: input.topicId ?? null,
    kind: input.kind ?? 'study',
    minutes,
    startedAt,
    endedAt,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO study_sessions
      (id, day, subject_id, topic_id, kind, minutes, started_at, ended_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.day,
    row.subjectId,
    row.topicId,
    row.kind,
    row.minutes,
    row.startedAt,
    row.endedAt,
    row.notes,
    row.createdAt,
    row.updatedAt,
  );
  await queueChange('study_session', id, row as unknown as Record<string, unknown>, day, now, db);
  return row;
}

export async function getStudySessions(from?: string, to?: string): Promise<StudySession[]> {
  const db = await getDb();
  const rows =
    from && to
      ? await db.getAllAsync<SessionRow>(
          `SELECT * FROM study_sessions WHERE day >= ? AND day <= ? ORDER BY started_at DESC`,
          from,
          to,
        )
      : await db.getAllAsync<SessionRow>(
          `SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT 200`,
        );
  return rows.map(mapSession);
}

export interface SubjectStudyStat {
  subjectId: string;
  minutes: number;
  sessions: number;
}

export async function getStudyMinutesBySubject(from: string, to: string): Promise<SubjectStudyStat[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ subject_id: string; minutes: number; sessions: number }>(
    `SELECT subject_id, COALESCE(SUM(minutes), 0) as minutes, COUNT(*) as sessions
     FROM study_sessions WHERE day >= ? AND day <= ? AND subject_id IS NOT NULL
     GROUP BY subject_id`,
    from,
    to,
  );
  return rows.map((r) => ({ subjectId: r.subject_id, minutes: r.minutes, sessions: r.sessions }));
}

export async function getStudyMinutesByDay(
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: string; minutes: number }>(
    `SELECT day, COALESCE(SUM(minutes), 0) as minutes FROM study_sessions
     WHERE day >= ? AND day <= ? GROUP BY day`,
    from,
    to,
  );
  return Object.fromEntries(rows.map((r) => [r.day, r.minutes]));
}

export async function getStudySessionCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM study_sessions`);
  return row?.count ?? 0;
}

export interface AcademicStats {
  minutesToday: number;
  minutesWeek: number;
  minutesTotal: number;
  sessionsTotal: number;
  bySubject: SubjectStudyStat[];
  topicsTotal: number;
  topicsCompleted: number;
  subjectsWithTopics: number;
}

export async function getAcademicStats(): Promise<AcademicStats> {
  const db = await getDb();
  const today = todayKey();
  const weekStart = addDays(today, -6);
  const todayRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM study_sessions WHERE day = ?`,
    today,
  );
  const weekRow = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes FROM study_sessions WHERE day >= ? AND day <= ?`,
    weekStart,
    today,
  );
  const totalRow = await db.getFirstAsync<{ minutes: number; sessions: number }>(
    `SELECT COALESCE(SUM(minutes), 0) as minutes, COUNT(*) as sessions FROM study_sessions`,
  );
  const topicsRow = await db.getFirstAsync<{ total: number; completed: number; subjects: number }>(
    `SELECT COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
            COUNT(DISTINCT subject_id) as subjects
     FROM topics`,
  );
  return {
    minutesToday: todayRow?.minutes ?? 0,
    minutesWeek: weekRow?.minutes ?? 0,
    minutesTotal: totalRow?.minutes ?? 0,
    sessionsTotal: totalRow?.sessions ?? 0,
    bySubject: await getStudyMinutesBySubject(weekStart, today),
    topicsTotal: topicsRow?.total ?? 0,
    topicsCompleted: topicsRow?.completed ?? 0,
    subjectsWithTopics: topicsRow?.subjects ?? 0,
  };
}

export async function applyRemoteSubject(db: SQLiteDatabase, subject: Subject): Promise<void> {
  await db.runAsync(
    `INSERT INTO subjects
      (id, name, code, priority, allocation, confidence, color, exam_date, exam_time, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, code = excluded.code, priority = excluded.priority,
       allocation = excluded.allocation, confidence = excluded.confidence,
       color = excluded.color, exam_date = excluded.exam_date, exam_time = excluded.exam_time,
       notes = excluded.notes, updated_at = excluded.updated_at`,
    subject.id,
    subject.name,
    subject.code,
    subject.priority,
    subject.allocation,
    subject.confidence,
    subject.color,
    subject.examDate,
    subject.examTime,
    subject.notes,
    subject.updatedAt,
  );
}

export async function applyRemoteTopic(db: SQLiteDatabase, topic: SyllabusTopic): Promise<void> {
  await db.runAsync(
    `INSERT INTO topics
      (id, subject_id, title, status, minutes, practice_done, revision_done, confidence, notes,
       sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       subject_id = excluded.subject_id, title = excluded.title, status = excluded.status,
       minutes = excluded.minutes, practice_done = excluded.practice_done,
       revision_done = excluded.revision_done, confidence = excluded.confidence,
       notes = excluded.notes, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
    topic.id,
    topic.subjectId,
    topic.title,
    topic.status,
    topic.minutes,
    topic.practiceDone ? 1 : 0,
    topic.revisionDone ? 1 : 0,
    topic.confidence,
    topic.notes,
    topic.sortOrder,
    topic.updatedAt,
  );
}

export async function applyRemoteStudySession(
  db: SQLiteDatabase,
  session: StudySession,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO study_sessions
      (id, day, subject_id, topic_id, kind, minutes, started_at, ended_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       day = excluded.day, subject_id = excluded.subject_id, topic_id = excluded.topic_id,
       kind = excluded.kind, minutes = excluded.minutes, started_at = excluded.started_at,
       ended_at = excluded.ended_at, notes = excluded.notes, updated_at = excluded.updated_at`,
    session.id,
    session.day,
    session.subjectId,
    session.topicId,
    session.kind,
    session.minutes,
    session.startedAt,
    session.endedAt,
    session.notes,
    session.createdAt,
    session.updatedAt,
  );
}
