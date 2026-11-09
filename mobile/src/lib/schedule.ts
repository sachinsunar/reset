import type { Category, Goal, GoalKind, GoalStatus, ScheduleBlock } from '@/types';
import { addDays, formatTime12h, timeToMinutes, weekdayOfKey } from '@/lib/date';
import { missionXp } from '@/lib/xp';

export type ScheduleState = 'completed' | 'active' | 'pending' | 'skipped' | 'open';

export interface ScheduleItem {
  id: string;
  blockId: string;
  goalId: string | null;
  date: string | null;
  title: string;
  description: string;
  category: Category;
  kind: GoalKind;
  trackable: boolean;
  fixed: boolean;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  timeLabel: string;
  status: GoalStatus | null;
  state: ScheduleState;
  isNow: boolean;
  xp: number;
}

export interface DateStripItem {
  date: string;
  dayNumber: number;
  weekdayShort: string;
  isToday: boolean;
}

export function buildDateStrip(
  anchor: string,
  today: string,
  past = 2,
  future = 11,
): DateStripItem[] {
  const out: DateStripItem[] = [];
  for (let offset = -past; offset <= future; offset += 1) {
    const date = addDays(anchor, offset);
    out.push({
      date,
      dayNumber: Number(date.slice(8, 10)),
      weekdayShort: WEEKDAY[weekdayOfKey(date)],
      isToday: date === today,
    });
  }
  return out;
}

export function buildScheduleItems(
  blocks: ScheduleBlock[],
  goals: Goal[],
  nowMinutes?: number | null,
): ScheduleItem[] {
  const goalByBlock = new Map<string, Goal>();
  for (const goal of goals) {
    if (!goal.blockId || goalByBlock.has(goal.blockId)) continue;
    goalByBlock.set(goal.blockId, goal);
  }

  const seenBlocks = new Set<string>();
  return blocks
    .filter((block) => {
      if (seenBlocks.has(block.id)) return false;
      seenBlocks.add(block.id);
      return true;
    })
    .map((block) => {
      const goal = goalByBlock.get(block.id) ?? null;
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      const isWithin = nowMinutes != null && nowMinutes >= startMinutes && nowMinutes < endMinutes;
      const state = resolveState(block, goal, isWithin);
      return {
        id: block.id,
        blockId: block.id,
        goalId: goal?.id ?? null,
        date: goal?.date ?? null,
        title: goal?.title || block.title,
        description: goal?.description || block.description,
        category: block.category,
        kind: block.kind,
        trackable: block.trackable,
        fixed: block.fixed,
        startTime: block.startTime,
        endTime: block.endTime,
        startMinutes,
        endMinutes,
        timeLabel: formatTime12h(block.startTime),
        status: goal?.status ?? null,
        state,
        isNow: isWithin,
        xp: goal ? missionXp(goal) : missionXp(block),
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || a.id.localeCompare(b.id));
}

function resolveState(
  block: ScheduleBlock,
  goal: Goal | null,
  isWithin: boolean,
): ScheduleState {
  if (goal?.status === 'completed') return 'completed';
  if (goal?.status === 'skipped') return 'skipped';
  if (isWithin && block.trackable) return 'active';
  if (goal) return 'pending';
  return 'open';
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
