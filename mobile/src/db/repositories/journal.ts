import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, nowIso } from '@/db/database';
import type { DailyCheckIn, JournalEntry } from '@/types';
import { newId } from '@/lib/id';
import { queueChange } from './outbox';

interface CheckInRow {
  date: string;
  sleep: DailyCheckIn['sleep'];
  energy: DailyCheckIn['energy'];
  mood: DailyCheckIn['mood'];
  created_at: string;
  updated_at: string;
}

interface JournalRow {
  id: string;
  date: string;
  accomplished: string;
  difficult: string;
  improve: string;
  free_text: string;
  created_at: string;
  updated_at: string;
}

const mapCheckIn = (row: CheckInRow): DailyCheckIn => ({
  date: row.date,
  sleep: row.sleep,
  energy: row.energy,
  mood: row.mood,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapJournal = (row: JournalRow): JournalEntry => ({
  id: row.id,
  date: row.date,
  accomplished: row.accomplished,
  difficult: row.difficult,
  improve: row.improve,
  freeText: row.free_text,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getCheckIn(date: string): Promise<DailyCheckIn | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CheckInRow>(`SELECT * FROM checkins WHERE date = ?`, date);
  return row ? mapCheckIn(row) : null;
}

export async function getCheckIns(from: string, to: string): Promise<DailyCheckIn[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CheckInRow>(
    `SELECT * FROM checkins WHERE date >= ? AND date <= ? ORDER BY date ASC`,
    from,
    to,
  );
  return rows.map(mapCheckIn);
}

export async function saveCheckIn(
  date: string,
  patch: Partial<Pick<DailyCheckIn, 'sleep' | 'energy' | 'mood'>>,
): Promise<DailyCheckIn> {
  const db = await getDb();
  const existing = await getCheckIn(date);
  const now = nowIso();
  const next: DailyCheckIn = {
    date,
    sleep: patch.sleep !== undefined ? patch.sleep : (existing?.sleep ?? null),
    energy: patch.energy !== undefined ? patch.energy : (existing?.energy ?? null),
    mood: patch.mood !== undefined ? patch.mood : (existing?.mood ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO checkins (date, sleep, energy, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       sleep = excluded.sleep, energy = excluded.energy, mood = excluded.mood,
       updated_at = excluded.updated_at`,
    next.date,
    next.sleep,
    next.energy,
    next.mood,
    next.createdAt,
    next.updatedAt,
  );
  await queueChange('checkin', date, next as unknown as Record<string, unknown>, date, now, db);
  return next;
}

export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<JournalRow>(`SELECT * FROM journal_entries WHERE date = ?`, date);
  return row ? mapJournal(row) : null;
}

export async function getJournalEntries(limit = 60): Promise<JournalEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JournalRow>(
    `SELECT * FROM journal_entries ORDER BY date DESC LIMIT ?`,
    limit,
  );
  return rows.map(mapJournal);
}

export async function saveJournalEntry(
  date: string,
  fields: Partial<Pick<JournalEntry, 'accomplished' | 'difficult' | 'improve' | 'freeText'>>,
): Promise<JournalEntry> {
  const db = await getDb();
  const existing = await getJournalEntry(date);
  const now = nowIso();
  const next: JournalEntry = {
    id: existing?.id ?? newId('journal'),
    date,
    accomplished: fields.accomplished ?? existing?.accomplished ?? '',
    difficult: fields.difficult ?? existing?.difficult ?? '',
    improve: fields.improve ?? existing?.improve ?? '',
    freeText: fields.freeText ?? existing?.freeText ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO journal_entries
      (id, date, accomplished, difficult, improve, free_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       accomplished = excluded.accomplished, difficult = excluded.difficult,
       improve = excluded.improve, free_text = excluded.free_text,
       updated_at = excluded.updated_at`,
    next.id,
    next.date,
    next.accomplished,
    next.difficult,
    next.improve,
    next.freeText,
    next.createdAt,
    next.updatedAt,
  );
  await queueChange('journal', next.id, next as unknown as Record<string, unknown>, date, now, db);
  return next;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<JournalRow>(`SELECT * FROM journal_entries WHERE id = ?`, id);
  await db.runAsync(`DELETE FROM journal_entries WHERE id = ?`, id);
  if (row) await queueChange('journal', id, null, row.date, nowIso(), db);
}

export async function applyRemoteCheckIn(db: SQLiteDatabase, checkIn: DailyCheckIn): Promise<void> {
  await db.runAsync(
    `INSERT INTO checkins (date, sleep, energy, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       sleep = excluded.sleep, energy = excluded.energy, mood = excluded.mood,
       updated_at = excluded.updated_at`,
    checkIn.date,
    checkIn.sleep,
    checkIn.energy,
    checkIn.mood,
    checkIn.createdAt,
    checkIn.updatedAt,
  );
}

export async function applyRemoteJournal(db: SQLiteDatabase, entry: JournalEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO journal_entries
      (id, date, accomplished, difficult, improve, free_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date, accomplished = excluded.accomplished, difficult = excluded.difficult,
       improve = excluded.improve, free_text = excluded.free_text, updated_at = excluded.updated_at`,
    entry.id,
    entry.date,
    entry.accomplished,
    entry.difficult,
    entry.improve,
    entry.freeText,
    entry.createdAt,
    entry.updatedAt,
  );
}
