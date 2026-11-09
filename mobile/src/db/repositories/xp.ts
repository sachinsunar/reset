import { getDb, nowIso } from '@/db/database';
import type { Goal } from '@/types';
import { MISSION_XP, missionXp, type XpAward } from '@/lib/xp';
import { queueChange } from './outbox';

interface XpAwardRow {
  id: string;
  source_type: XpAward['sourceType'];
  source_id: string;
  date: string;
  amount: number;
  awarded_at: string;
}

const mapAward = (row: XpAwardRow): XpAward => ({
  id: row.id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  date: row.date,
  amount: row.amount,
  awardedAt: row.awarded_at,
});

export async function getXpAwards(): Promise<XpAward[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<XpAwardRow>(
    `SELECT * FROM xp_awards ORDER BY awarded_at ASC`,
  );
  return rows.map(mapAward);
}

export async function awardMissionXp(goal: Goal): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const award: XpAward = {
    id: `mission:${goal.id}`,
    sourceType: 'mission',
    sourceId: goal.id,
    date: goal.date,
    amount: missionXp(goal),
    awardedAt: now,
  };
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO xp_awards
      (id, source_type, source_id, date, amount, awarded_at)
     VALUES (?, 'mission', ?, ?, ?, ?)`,
    award.id,
    award.sourceId,
    award.date,
    award.amount,
    award.awardedAt,
  );
  if (result.changes > 0) {
    await queueChange('xp_award', award.id, { ...award }, award.date, award.awardedAt, db);
  }
}

export async function awardDailyPlanXp(date: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const award: XpAward = {
    id: `daily_plan:${date}`,
    sourceType: 'daily_plan',
    sourceId: date,
    date,
    amount: MISSION_XP.dailyPlan,
    awardedAt: now,
  };
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO xp_awards
      (id, source_type, source_id, date, amount, awarded_at)
     VALUES (?, 'daily_plan', ?, ?, ?, ?)`,
    award.id,
    award.sourceId,
    award.date,
    award.amount,
    award.awardedAt,
  );
  if (result.changes > 0) {
    await queueChange('xp_award', award.id, { ...award }, award.date, award.awardedAt, db);
  }
}

export async function backfillXpAwards(
  completedGoals: Goal[],
  completedDays: string[],
): Promise<void> {
  const db = await getDb();
  const counts = await db.getFirstAsync<{ missions: number; plans: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN source_type = 'mission' THEN 1 ELSE 0 END), 0) as missions,
       COALESCE(SUM(CASE WHEN source_type = 'daily_plan' THEN 1 ELSE 0 END), 0) as plans
     FROM xp_awards`,
  );
  const uniqueDays = new Set(completedDays);
  if (
    (counts?.missions ?? 0) >= completedGoals.length &&
    (counts?.plans ?? 0) >= uniqueDays.size
  ) {
    return;
  }
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (const goal of completedGoals) {
      const award: XpAward = {
        id: `mission:${goal.id}`,
        sourceType: 'mission',
        sourceId: goal.id,
        date: goal.date,
        amount: missionXp(goal),
        awardedAt: goal.completedAt ?? now,
      };
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO xp_awards
          (id, source_type, source_id, date, amount, awarded_at)
         VALUES (?, 'mission', ?, ?, ?, ?)`,
        award.id,
        award.sourceId,
        award.date,
        award.amount,
        award.awardedAt,
      );
      if (result.changes > 0) {
        await queueChange('xp_award', award.id, { ...award }, award.date, award.awardedAt, db);
      }
    }
    for (const date of completedDays) {
      const award: XpAward = {
        id: `daily_plan:${date}`,
        sourceType: 'daily_plan',
        sourceId: date,
        date,
        amount: MISSION_XP.dailyPlan,
        awardedAt: now,
      };
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO xp_awards
          (id, source_type, source_id, date, amount, awarded_at)
         VALUES (?, 'daily_plan', ?, ?, ?, ?)`,
        award.id,
        award.sourceId,
        award.date,
        award.amount,
        award.awardedAt,
      );
      if (result.changes > 0) {
        await queueChange('xp_award', award.id, { ...award }, award.date, award.awardedAt, db);
      }
    }
  });
}
