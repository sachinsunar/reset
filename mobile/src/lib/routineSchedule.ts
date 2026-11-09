import type { ScheduleBlock } from '@/types';
import { minutesToTime, timeToMinutes } from '@/lib/date';
import type { ScheduleItem } from '@/lib/schedule';

export interface RoutineConflict {
  blockId: string;
  otherBlockId: string;
  message: string;
}

export interface RoutineScheduleResult {
  blocks: ScheduleBlock[];
  conflicts: RoutineConflict[];
}

export type RoutineFocusKind =
  | 'current'
  | 'upcoming'
  | 'overdue'
  | 'break'
  | 'done'
  | 'empty'
  | 'rest';

export interface RoutineFocus {
  kind: RoutineFocusKind;
  item: ScheduleItem | null;
  next: ScheduleItem | null;
  overdueCount: number;
}

export function blockDuration(block: ScheduleBlock): number {
  const raw = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
  const minutes = raw > 0 ? raw : raw + 24 * 60;
  if (minutes > 0) return minutes;
  if (block.estMinutes > 0) return block.estMinutes;
  return 30;
}

export function withDuration(block: ScheduleBlock, minutes: number): ScheduleBlock {
  const safe = Math.max(5, Math.round(minutes));
  return {
    ...block,
    endTime: minutesToTime(timeToMinutes(block.startTime) + safe),
    estMinutes: safe,
  };
}

export function reorderBlocks(
  blocks: ScheduleBlock[],
  fromIndex: number,
  toIndex: number,
): ScheduleBlock[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex >= blocks.length
  ) {
    return blocks;
  }
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Recalculates flexible times in the supplied order while keeping fixed-time
 * activities pinned. Conflicts are returned rather than silently hidden so the
 * editor can ask the person to resolve them before saving.
 */
export function recomputeRoutineTimes(
  blocks: ScheduleBlock[],
  startMinutes?: number,
): RoutineScheduleResult {
  if (!blocks.length) return { blocks: [], conflicts: [] };

  const anchor =
    startMinutes ??
    blocks.reduce(
      (earliest, block) => Math.min(earliest, timeToMinutes(block.startTime)),
      Number.POSITIVE_INFINITY,
    );

  let cursor = anchor;
  const recalculated = blocks.map((block, index) => {
    const duration = blockDuration(block);
    let next: ScheduleBlock;
    if (block.fixed) {
      next = {
        ...block,
        endTime: minutesToTime(timeToMinutes(block.startTime) + duration),
        estMinutes: duration,
        sortOrder: index,
      };
      cursor = Math.max(cursor, timeToMinutes(block.startTime) + duration);
    } else {
      next = {
        ...block,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + duration),
        estMinutes: duration,
        sortOrder: index,
      };
      cursor += duration;
    }
    return next;
  });

  return { blocks: recalculated, conflicts: findConflicts(recalculated) };
}

export function findConflicts(blocks: ScheduleBlock[]): RoutineConflict[] {
  const conflicts: RoutineConflict[] = [];
  const seen = new Set<string>();
  const ordered = [...blocks].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const currentStart = timeToMinutes(current.startTime);
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = ordered[previousIndex];
      const previousEnd = timeToMinutes(previous.startTime) + blockDuration(previous);
      if (currentStart >= previousEnd) continue;
      const key = [previous.id, current.id].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      const first = previous.fixed ? previous : current;
      const second = first.id === previous.id ? current : previous;
      conflicts.push({
        blockId: first.id,
        otherBlockId: second.id,
        message: `${first.title} overlaps ${second.title}. Move one of them or shorten a flexible block.`,
      });
    }
  }
  return conflicts;
}

export function selectRoutineFocus(
  items: ScheduleItem[],
  nowMinutes: number,
  isRest = false,
): RoutineFocus {
  if (isRest) return { kind: 'rest', item: null, next: null, overdueCount: 0 };
  if (!items.length) return { kind: 'empty', item: null, next: null, overdueCount: 0 };

  const isOpen = (item: ScheduleItem) =>
    item.state !== 'completed' && item.state !== 'skipped';
  const isNow = (item: ScheduleItem) =>
    nowMinutes >= item.startMinutes && nowMinutes < item.endMinutes;
  const trackable = items.filter((item) => item.trackable);
  const pending = trackable
    .filter(isOpen)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (trackable.length > 0 && pending.length === 0) {
    return { kind: 'done', item: null, next: null, overdueCount: 0 };
  }

  const activeBreak = items.find((item) => isNow(item) && !item.trackable);
  const nextAfter = (item: ScheduleItem | null) =>
    pending.find(
      (candidate) =>
        candidate.id !== item?.id && candidate.startMinutes >= (item?.startMinutes ?? -1),
    ) ??
    pending.find((candidate) => candidate.id !== item?.id) ??
    null;

  if (activeBreak) {
    return {
      kind: 'break',
      item: activeBreak,
      next: nextAfter(activeBreak),
      overdueCount: 0,
    };
  }

  const active = pending.find((item) => isNow(item));
  if (active) {
    return { kind: 'current', item: active, next: nextAfter(active), overdueCount: 0 };
  }

  const overdue = pending.filter((item) => item.endMinutes <= nowMinutes);
  if (overdue.length) {
    return {
      kind: 'overdue',
      item: overdue[0],
      next: nextAfter(overdue[0]),
      overdueCount: overdue.length,
    };
  }

  const upcoming = pending.find((item) => item.startMinutes > nowMinutes) ?? pending[0];
  if (upcoming) {
    return { kind: 'upcoming', item: upcoming, next: nextAfter(upcoming), overdueCount: 0 };
  }

  return { kind: 'done', item: null, next: null, overdueCount: 0 };
}
