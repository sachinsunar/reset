import type { Achievement } from '@/types';

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    key: 'first_step',
    title: 'First Step',
    description: 'Complete your first daily plan.',
    icon: 'footprints',
  },
  {
    key: 'three_days',
    title: 'Three Days Strong',
    description: 'Complete three consecutive days.',
    icon: 'sprout',
  },
  {
    key: 'one_week',
    title: 'One Week of Progress',
    description: 'Complete seven consecutive days.',
    icon: 'calendar-check',
  },
  {
    key: 'consistency_builder',
    title: 'Consistency Builder',
    description: 'Complete fourteen consecutive days.',
    icon: 'layers',
  },
  {
    key: 'study_focus',
    title: 'Study Focus',
    description: 'Complete ten academic study sessions.',
    icon: 'book-open',
  },
  {
    key: 'moving_forward',
    title: 'Moving Forward',
    description: 'Complete ten workouts or runs.',
    icon: 'activity',
  },
  {
    key: 'exam_ready',
    title: 'Exam Ready',
    description: 'Complete every configured syllabus topic.',
    icon: 'graduation-cap',
  },
];

export interface AchievementStats {
  longestStreak: number;
  totalCompletedDays: number;
  studySessions: number;
  workouts: number;
  topicsTotal: number;
  topicsCompleted: number;
  subjectsWithTopics: number;
}

export function evaluateAchievements(stats: AchievementStats): string[] {
  const unlocked: string[] = [];
  if (stats.totalCompletedDays >= 1) unlocked.push('first_step');
  if (stats.longestStreak >= 3) unlocked.push('three_days');
  if (stats.longestStreak >= 7) unlocked.push('one_week');
  if (stats.longestStreak >= 14) unlocked.push('consistency_builder');
  if (stats.studySessions >= 10) unlocked.push('study_focus');
  if (stats.workouts >= 10) unlocked.push('moving_forward');
  if (
    stats.topicsTotal > 0 &&
    stats.topicsCompleted === stats.topicsTotal &&
    stats.subjectsWithTopics >= 3
  ) {
    unlocked.push('exam_ready');
  }
  return unlocked;
}
