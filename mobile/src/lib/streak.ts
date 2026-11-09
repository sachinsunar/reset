import type { DayStatus } from '@/types';
import { addDays, datesBetween } from './date';

export interface DayInput {
  date: string;
  status: DayStatus;
  completedCore: number;
  totalCore: number;
  isRest: boolean;
  isRecovery: boolean;
}

export interface StreakResult {
  current: number;
  longest: number;
  totalCompleted: number;
  weekPercent: number;
  monthPercent: number;
  todayStatus: DayStatus;
}

const isSkipped = (status: DayStatus) =>
  status === 'rest' || status === 'recovery' || status === 'none' || status === 'future';

const isFailed = (status: DayStatus) => status === 'missed' || status === 'partial';

/**
 * A day is complete when at least `threshold` of its core goals are done.
 * Rest and recovery days keep a streak alive but do not add to it.
 */
export function evaluateDayStatus(input: {
  date: string;
  today: string;
  completedCore: number;
  totalCore: number;
  isRest: boolean;
  isRecovery: boolean;
  threshold: number;
}): DayStatus {
  const { date, today, completedCore, totalCore, isRest, isRecovery, threshold } = input;
  if (date > today) return 'future';
  if (totalCore > 0 && completedCore / totalCore >= threshold) return 'completed';
  if (isRest) return 'rest';
  if (isRecovery) return 'recovery';
  if (totalCore <= 0) return 'none';
  if (date === today) return 'partial';
  return completedCore > 0 ? 'partial' : 'missed';
}

export function completionPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, completed / total));
}

function consistency(days: DayInput[], dateSet: Set<string>, end: string, span: number): number {
  let scheduled = 0;
  let complete = 0;
  for (let i = 0; i < span; i++) {
    const key = addDays(end, -i);
    const day = dateSet.has(key) ? days.find((d) => d.date === key) : undefined;
    if (!day) continue;
    if (isSkipped(day.status)) continue;
    scheduled++;
    if (day.status === 'completed') complete++;
  }
  return scheduled === 0 ? 0 : complete / scheduled;
}

export function computeStreak(
  days: DayInput[],
  today: string,
  _threshold = 0.7,
): StreakResult {
  const deduped = new Map<string, DayInput>();
  for (const day of days) deduped.set(day.date, day);
  const sorted = [...deduped.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const byDate = new Map(sorted.map((d) => [d.date, d]));
  const todayStatus = byDate.get(today)?.status ?? 'none';

  let longest = 0;
  let run = 0;
  for (const day of sorted) {
    if (day.date > today) break;
    if (day.status === 'completed') {
      run++;
      longest = Math.max(longest, run);
    } else if (isFailed(day.status)) {
      run = 0;
    }
  }

  let current = 0;
  let cursor = today;
  const todayDay = byDate.get(today);
  if (todayDay && todayDay.status === 'completed') {
    current = 1;
    cursor = addDays(today, -1);
  } else {
    cursor = addDays(today, -1);
  }
  let guard = 0;
  while (guard < 3650) {
    const day = byDate.get(cursor);
    if (!day) break;
    if (day.status === 'completed') {
      current++;
    } else if (isFailed(day.status)) {
      break;
    }
    cursor = addDays(cursor, -1);
    guard++;
  }
  longest = Math.max(longest, current);

  const totalCompleted = sorted.filter((d) => d.status === 'completed').length;
  const dateSet = new Set(sorted.map((d) => d.date));

  return {
    current,
    longest,
    totalCompleted,
    weekPercent: consistency(sorted, dateSet, today, 7),
    monthPercent: consistency(sorted, dateSet, today, 30),
    todayStatus,
  };
}

export function weekRecoveryUsage(
  days: DayInput[],
  today: string,
  weekStartsOn = 1,
): { used: number; limitWarning: boolean } {
  const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const delta = (todayDow - weekStartsOn + 7) % 7;
  const start = addDays(today, -delta);
  const week = datesBetween(start, today);
  const set = new Set(week);
  const used = days.filter(
    (d) => set.has(d.date) && (d.status === 'rest' || d.status === 'recovery'),
  ).length;
  return { used, limitWarning: false };
}

export function canTakeRecovery(
  days: DayInput[],
  today: string,
  restDaysPerWeek: number,
): { allowed: boolean; used: number; limit: number } {
  const { used } = weekRecoveryUsage(days, today);
  return { allowed: used < restDaysPerWeek, used, limit: restDaysPerWeek };
}
