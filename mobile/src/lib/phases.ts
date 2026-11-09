import type { GoalSeed, RoutinePhase, ScheduleBlock } from '@/types';
import { weekdayOfKey } from './date';
import { workoutForDate } from './fitness';
import { SUBJECT_SEEDS } from './roadmap';

export const PHASE_IDS = {
  vacation: 'vacation',
  college: 'college',
  exam: 'exam',
  postExam: 'post-exam',
} as const;

export function resolveActivePhase(
  phases: RoutinePhase[],
  dateKey: string,
  overrideId: string | null,
): RoutinePhase | null {
  if (overrideId && overrideId !== 'auto') {
    const override = phases.find((p) => p.id === overrideId);
    if (override) return override;
  }
  const autoPhases = phases.filter((p) => p.auto).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const phase of autoPhases) {
    const afterStart = !phase.startDate || dateKey >= phase.startDate;
    const beforeEnd = !phase.endDate || dateKey <= phase.endDate;
    if (afterStart && beforeEnd) return phase;
  }
  return null;
}

export function blocksForDate(blocks: ScheduleBlock[], dateKey: string): ScheduleBlock[] {
  const weekday = weekdayOfKey(dateKey);
  return blocks
    .filter((b) => b.active && b.days.includes(weekday))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function examSubjectFor(dateKey: string, subjectNames: string[], offset = 0): string {
  const names = subjectNames.length ? subjectNames : SUBJECT_SEEDS.map((s) => s.name);
  return names[(weekdayOfKey(dateKey) + offset) % names.length];
}

/**
 * Builds today's goals from routine blocks. Pure so it can be unit tested and
 * reused for backfilling missed days.
 */
export function generateGoalSeeds(
  dateKey: string,
  phase: RoutinePhase | null,
  blocks: ScheduleBlock[],
  options: { examSubjects?: string[]; learningDays?: number[] } = {},
): GoalSeed[] {
  if (!phase) return [];
  const weekday = weekdayOfKey(dateKey);
  const subjectNames = options.examSubjects ?? SUBJECT_SEEDS.map((s) => s.name);
  return blocksForDate(blocks, dateKey)
    .filter((block) => block.phaseId === phase.id)
    .filter((block) => block.trackable)
    .filter((block) => !(phase.id === PHASE_IDS.exam && block.category === 'career'))
    .map((block) => {
      let title = block.title;
      let description = block.description;
      let kind = block.kind;
      let category = block.category;
      let estMinutes = block.estMinutes;

      if (block.id === 'v1-movement' || block.id === 'v2-walk' || block.id === 'v3-walk' || block.id === 'v4-walk') {
        const workout = workoutForDate(dateKey);
        if (block.id === 'v1-movement') {
          title = workout.title;
          description =
            workout.kind === 'rest'
              ? 'No workout required. A short walk or gentle stretch is enough.'
              : workout.guidance;
          if (workout.kind === 'rest') kind = 'optional';
          estMinutes = workout.durationMin || 10;
          category = 'fitness';
        }
      }

      if (phase.id === PHASE_IDS.exam && block.category === 'study' && block.id.startsWith('exam-')) {
        const offset = block.id === 'exam-pm' ? 1 : 0;
        const subject = examSubjectFor(dateKey, subjectNames, offset);
        if (block.id === 'exam-am') {
          title = `Revise ${subject}`;
          description = 'Active recall and concise notes. Start with the topic that feels least clear.';
        } else if (block.id === 'exam-pm') {
          title = `Practice ${subject}`;
          description = 'Past questions or a timed section. Review mistakes gently, then stop.';
        }
      }

      return {
        blockId: block.id,
        title,
        description,
        category,
        estMinutes,
        scheduledTime: block.startTime,
        kind,
        source: 'routine' as const,
      };
    });
}

export function currentBlock(
  blocks: ScheduleBlock[],
  dateKey: string,
  nowMinutes: number,
): ScheduleBlock | null {
  const todays = blocksForDate(blocks, dateKey);
  for (const block of todays) {
    const [sh, sm] = block.startTime.split(':').map(Number);
    const [eh, em] = block.endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (nowMinutes >= start && nowMinutes < end) return block;
  }
  return null;
}

export function nextBlock(
  blocks: ScheduleBlock[],
  dateKey: string,
  nowMinutes: number,
): ScheduleBlock | null {
  return (
    blocksForDate(blocks, dateKey).find((block) => {
      const [h, m] = block.startTime.split(':').map(Number);
      return h * 60 + m > nowMinutes;
    }) ?? null
  );
}

export const PHASE_LABELS: Record<string, string> = {
  vacation: 'Vacation reset',
  college: 'College days',
  exam: 'Exam season',
  'post-exam': 'Recovery & rebuild',
};
