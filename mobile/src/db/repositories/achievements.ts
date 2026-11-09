import { getDb, nowIso } from '@/db/database';
import type { Achievement } from '@/types';
import { computeStreak } from '@/lib/streak';
import { evaluateAchievements } from '@/lib/achievements';
import { getAllDayInputs } from './days';
import { getStudySessionCount } from './academic';
import { getWorkoutCount } from './fitness';
import { getAcademicStats } from './academic';
import { getProfile } from './settings';

interface AchievementRow {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
}

const mapAchievement = (row: AchievementRow): Achievement => ({
  key: row.key,
  title: row.title,
  description: row.description,
  icon: row.icon,
  unlockedAt: row.unlocked_at,
});

export async function getAchievements(): Promise<Achievement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AchievementRow>(
    `SELECT * FROM achievements ORDER BY rowid ASC`,
  );
  return rows.map(mapAchievement);
}

export async function unlockAchievements(
  today: string,
): Promise<{ newlyUnlocked: Achievement[]; all: Achievement[] }> {
  const [profile, days, studySessions, workouts, academic] = await Promise.all([
    getProfile(),
    getAllDayInputs(),
    getStudySessionCount(),
    getWorkoutCount(),
    getAcademicStats(),
  ]);
  const streak = computeStreak(days, today, profile?.streakThreshold ?? 0.7);
  const unlockedKeys = evaluateAchievements({
    longestStreak: streak.longest,
    totalCompletedDays: streak.totalCompleted,
    studySessions,
    workouts,
    topicsTotal: academic.topicsTotal,
    topicsCompleted: academic.topicsCompleted,
    subjectsWithTopics: academic.subjectsWithTopics,
  });

  const db = await getDb();
  const rows = await db.getAllAsync<AchievementRow>(`SELECT * FROM achievements`);
  const newlyUnlocked: Achievement[] = [];
  const unlockedAt = nowIso();
  for (const row of rows) {
    if (!row.unlocked_at && unlockedKeys.includes(row.key)) {
      await db.runAsync(`UPDATE achievements SET unlocked_at = ? WHERE key = ?`, unlockedAt, row.key);
      newlyUnlocked.push({ ...mapAchievement(row), unlockedAt });
    }
  }
  const all = (await getAchievements()).sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1;
    if (!a.unlockedAt && b.unlockedAt) return 1;
    return 0;
  });
  return { newlyUnlocked, all };
}
