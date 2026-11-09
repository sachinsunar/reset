import type { Category, GoalKind } from '@/types';

export const MISSION_XP = {
  wake: 10,
  sleep: 10,
  revision: 20,
  study: 25,
  fitness: 30,
  career: 20,
  personal: 15,
  optional: 10,
  dailyPlan: 50,
} as const;

export const LEVELS = [
  { level: 1, title: 'Beginner', minXp: 0 },
  { level: 2, title: 'Getting Started', minXp: 100 },
  { level: 3, title: 'Routine Builder', minXp: 220 },
  { level: 4, title: 'Consistency Builder', minXp: 350 },
  { level: 5, title: 'Focused Learner', minXp: 600 },
  { level: 6, title: 'Discipline Builder', minXp: 900 },
  { level: 7, title: 'Growth Mode', minXp: 1300 },
] as const;

export interface XpMission {
  id: string;
  date: string;
  title: string;
  category: Category;
  kind: GoalKind;
}

export type XpSourceType = 'mission' | 'daily_plan';

export interface XpAward {
  id: string;
  sourceType: XpSourceType;
  sourceId: string;
  date: string;
  amount: number;
  awardedAt: string;
}

export interface LevelProgress {
  level: number;
  title: string;
  minXp: number;
  nextLevelXp: number | null;
  xpToNext: number;
  progress: number;
}

export interface XpSummary extends LevelProgress {
  totalXp: number;
  missionXp: number;
  planBonusXp: number;
  todayXp: number;
  todayMissionXp: number;
  todayPlanXp: number;
  completedMissions: number;
  todayCompletedMissions: number;
}

export function missionXp(goal: Pick<XpMission, 'title' | 'category' | 'kind'>): number {
  const title = goal.title.toLowerCase();
  if (/wake up|sunrise|^wake\b/.test(title)) return MISSION_XP.wake;
  if (/revis|recall|flashcard/.test(title)) return MISSION_XP.revision;
  if (/workout|run|walk|strength|mobility|yoga|stretch/.test(title)) {
    return MISSION_XP.fitness;
  }
  if (goal.category === 'fitness') return MISSION_XP.fitness;
  if (goal.category === 'study') return MISSION_XP.study;
  if (goal.category === 'career') return MISSION_XP.career;
  if (goal.category === 'sleep') return MISSION_XP.sleep;
  if (goal.category === 'personal') {
    return goal.kind === 'optional' ? MISSION_XP.optional : MISSION_XP.personal;
  }
  return goal.kind === 'optional' ? MISSION_XP.optional : MISSION_XP.personal;
}

export function levelForXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.round(totalXp));
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const nextLevelXp = next?.minXp ?? null;
  const progress = nextLevelXp
    ? Math.max(0, Math.min(1, (xp - current.minXp) / (nextLevelXp - current.minXp)))
    : 1;
  return {
    level: current.level,
    title: current.title,
    minXp: current.minXp,
    nextLevelXp,
    xpToNext: nextLevelXp ? Math.max(0, nextLevelXp - xp) : 0,
    progress,
  };
}

export function computeXpSummary(awards: XpAward[], today: string): XpSummary {
  const unique = new Map<string, XpAward>();
  for (const award of awards) {
    if (!unique.has(award.id)) unique.set(award.id, award);
  }

  let missionXpTotal = 0;
  let planBonusXp = 0;
  let todayMissionXp = 0;
  let todayPlanXp = 0;
  let completedMissions = 0;
  let todayCompletedMissions = 0;

  for (const award of unique.values()) {
    if (award.sourceType === 'mission') {
      missionXpTotal += award.amount;
      completedMissions += 1;
      if (award.date === today) {
        todayMissionXp += award.amount;
        todayCompletedMissions += 1;
      }
    } else {
      planBonusXp += award.amount;
      if (award.date === today) todayPlanXp += award.amount;
    }
  }

  const totalXp = missionXpTotal + planBonusXp;
  const level = levelForXp(totalXp);

  return {
    ...level,
    totalXp,
    missionXp: missionXpTotal,
    planBonusXp,
    todayXp: todayMissionXp + todayPlanXp,
    todayMissionXp,
    todayPlanXp,
    completedMissions,
    todayCompletedMissions,
  };
}

export const emptyXpSummary: XpSummary = {
  ...levelForXp(0),
  totalXp: 0,
  missionXp: 0,
  planBonusXp: 0,
  todayXp: 0,
  todayMissionXp: 0,
  todayPlanXp: 0,
  completedMissions: 0,
  todayCompletedMissions: 0,
};
