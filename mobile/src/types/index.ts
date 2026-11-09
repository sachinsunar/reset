export type Category = 'study' | 'fitness' | 'career' | 'sleep' | 'personal';

export type GoalKind = 'core' | 'optional';
export type GoalStatus = 'pending' | 'completed' | 'skipped' | 'rescheduled';
export type GoalSource = 'routine' | 'manual' | 'workout' | 'study' | 'learning';

export type DayStatus =
  | 'completed'
  | 'partial'
  | 'rest'
  | 'recovery'
  | 'missed'
  | 'future'
  | 'none';

export type ThemeMode = 'system' | 'light' | 'dark';

export type TopicStatus =
  | 'not_started'
  | 'learning'
  | 'practiced'
  | 'needs_revision'
  | 'completed';

export type LearningStatus = 'not_started' | 'learning' | 'practiced' | 'completed';

export type EnergyLevel = 'low' | 'okay' | 'good' | 'excellent';
export type MoodLevel = 'low' | 'neutral' | 'good' | 'great';
export type SleepQuality = 'poor' | 'okay' | 'good';

export interface Profile {
  id: number;
  name: string;
  email: string | null;
  timezone: string;
  onboardingComplete: boolean;
  trackingSince: string;
  activePhaseId: string | null;
  streakThreshold: number;
  restDaysPerWeek: number;
  themeMode: ThemeMode;
  wakeTime: string;
  bedtime: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutinePhase {
  id: string;
  name: string;
  objective: string;
  startDate: string | null;
  endDate: string | null;
  auto: boolean;
  sortOrder: number;
  color: string;
}

export interface ScheduleBlock {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  category: Category;
  startTime: string;
  endTime: string;
  days: number[];
  trackable: boolean;
  fixed: boolean;
  kind: GoalKind;
  estMinutes: number;
  sortOrder: number;
  active: boolean;
}

export interface GoalSeed {
  blockId: string | null;
  title: string;
  description: string;
  category: Category;
  estMinutes: number;
  scheduledTime: string | null;
  kind: GoalKind;
  source: GoalSource;
}

export interface Goal {
  id: string;
  date: string;
  blockId: string | null;
  title: string;
  description: string;
  category: Category;
  estMinutes: number;
  scheduledTime: string | null;
  kind: GoalKind;
  status: GoalStatus;
  skipReason: string | null;
  completedAt: string | null;
  source: GoalSource;
  createdAt: string;
  updatedAt: string;
}

export interface DayLog {
  date: string;
  status: DayStatus;
  isRest: boolean;
  isRecovery: boolean;
  note: string | null;
  completedCore: number;
  totalCore: number;
  percent: number;
  updatedAt: string;
}

export interface GoalCompletion {
  goalId: string;
  date: string;
  completedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  priority: number;
  allocation: number;
  confidence: number;
  color: string;
  examDate: string | null;
  examTime: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusTopic {
  id: string;
  subjectId: string;
  title: string;
  status: TopicStatus;
  minutes: number;
  practiceDone: boolean;
  revisionDone: boolean;
  confidence: number;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  day: string;
  subjectId: string | null;
  topicId: string | null;
  kind: 'study' | 'practice' | 'revision' | 'mock';
  minutes: number;
  startedAt: string;
  endedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  day: string;
  label: string;
  subjectId: string | null;
  learningTopicId: string | null;
  minutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  workoutKey: string;
  title: string;
  kind: 'strength' | 'run' | 'walk' | 'mobility' | 'rest';
  durationMin: number;
  distanceKm: number | null;
  intensity: 'easy' | 'normal' | 'hard';
  completed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  status: LearningStatus;
  minutes: number;
  notes: string;
  codeDone: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSession {
  id: string;
  day: string;
  topicId: string | null;
  minutes: number;
  notes: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  accomplished: string;
  difficult: string;
  improve: string;
  freeText: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCheckIn {
  date: string;
  sleep: SleepQuality | null;
  energy: EnergyLevel | null;
  mood: MoodLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export interface StreakStats {
  current: number;
  longest: number;
  totalCompleted: number;
  weekPercent: number;
  monthPercent: number;
  todayStatus: DayStatus;
}

export interface NotificationPreference {
  key: string;
  label: string;
  enabled: boolean;
  time: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  quietStart: string;
  quietEnd: string;
  items: NotificationPreference[];
}

export interface SyncRecordInput {
  entity: string;
  id: string;
  day: string | null;
  updatedAt: string;
  deleted: boolean;
  payload: Record<string, unknown> | null;
}

export interface OutboxItem {
  id: string;
  entity: string;
  entityId: string;
  day: string | null;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}
