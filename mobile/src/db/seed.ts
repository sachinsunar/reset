import type { SQLiteDatabase } from 'expo-sqlite';
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements';
import { NESTJS_ROADMAP, SUBJECT_SEEDS } from '@/lib/roadmap';
import { PHASE_IDS } from '@/lib/phases';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const LEARNING_DAYS = [1, 3, 5];

interface BlockSeed {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime: string;
  days?: number[];
  trackable?: boolean;
  fixed?: boolean;
  kind?: 'core' | 'optional';
  estMinutes?: number;
}

const VACATION_BLOCKS: BlockSeed[] = [
  {
    id: 'v1-wake',
    phaseId: PHASE_IDS.vacation,
    title: 'Wake up',
    description: 'Start gently. Water, daylight, a few slow breaths.',
    category: 'personal',
    startTime: '05:45',
    endTime: '05:55',
    estMinutes: 5,
  },
  {
    id: 'v1-movement',
    phaseId: PHASE_IDS.vacation,
    title: 'Morning movement',
    description: 'Follow today’s easy workout or take a gentle walk.',
    category: 'fitness',
    startTime: '06:00',
    endTime: '06:40',
    estMinutes: 25,
  },
  {
    id: 'v1-reset',
    phaseId: PHASE_IDS.vacation,
    title: 'Shower and breakfast',
    description: 'Shower, eat something nourishing, and ease into the day.',
    category: 'personal',
    startTime: '06:40',
    endTime: '07:30',
    estMinutes: 35,
  },
  {
    id: 'v1-numerical',
    phaseId: PHASE_IDS.vacation,
    title: 'Numerical Method',
    description: 'Work through problems slowly. One method at a time.',
    category: 'study',
    startTime: '07:30',
    endTime: '09:30',
    estMinutes: 120,
  },
  {
    id: 'v1-break-am',
    phaseId: PHASE_IDS.vacation,
    title: 'Break',
    description: 'Step away from the desk.',
    category: 'personal',
    startTime: '09:30',
    endTime: '10:00',
    trackable: false,
  },
  {
    id: 'v1-os',
    phaseId: PHASE_IDS.vacation,
    title: 'Operating System',
    description: 'Read, make short notes, then explain the idea in your own words.',
    category: 'study',
    startTime: '10:00',
    endTime: '11:30',
    estMinutes: 90,
  },
  {
    id: 'v1-lunch',
    phaseId: PHASE_IDS.vacation,
    title: 'Lunch and rest',
    description: 'Eat, rest your eyes, avoid turning lunch into more screen time.',
    category: 'personal',
    startTime: '11:30',
    endTime: '14:00',
    trackable: false,
  },
  {
    id: 'v1-se',
    phaseId: PHASE_IDS.vacation,
    title: 'Software Engineering',
    description: 'Concepts, diagrams, and past-question practice.',
    category: 'study',
    startTime: '14:00',
    endTime: '15:00',
    estMinutes: 60,
  },
  {
    id: 'v1-break-pm',
    phaseId: PHASE_IDS.vacation,
    title: 'Break and personal time',
    description: 'Move, hydrate, or do nothing for a while.',
    category: 'personal',
    startTime: '15:00',
    endTime: '16:00',
    trackable: false,
  },
  {
    id: 'v1-nestjs',
    phaseId: PHASE_IDS.vacation,
    title: 'NestJS Project Time',
    description: 'Build and improve my NestJS project. One small feature at a time.',
    category: 'career',
    startTime: '16:00',
    endTime: '16:40',
    days: LEARNING_DAYS,
    kind: 'optional',
    estMinutes: 40,
  },
  {
    id: 'v1-family',
    phaseId: PHASE_IDS.vacation,
    title: 'Free time, family, dinner',
    description: 'Close the laptop. This time belongs to life.',
    category: 'personal',
    startTime: '16:40',
    endTime: '19:30',
    trackable: false,
  },
  {
    id: 'v1-revision',
    phaseId: PHASE_IDS.vacation,
    title: 'Light revision and next-day planning',
    description: 'Recall a few key ideas and choose tomorrow’s first task.',
    category: 'study',
    startTime: '20:00',
    endTime: '20:30',
    estMinutes: 30,
  },
  {
    id: 'v1-bed',
    phaseId: PHASE_IDS.vacation,
    title: 'Wind down for 9:30 bedtime',
    description: 'Screens down, lights low, tomorrow can wait.',
    category: 'sleep',
    startTime: '21:30',
    endTime: '22:00',
    estMinutes: 10,
  },
];

const COLLEGE_BLOCKS: BlockSeed[] = [
  {
    id: 'v2-wake',
    phaseId: PHASE_IDS.college,
    title: 'Wake up',
    description: 'Up and moving. Keep the morning simple.',
    category: 'personal',
    startTime: '05:15',
    endTime: '05:25',
    estMinutes: 5,
  },
  {
    id: 'v2-ready',
    phaseId: PHASE_IDS.college,
    title: 'Get ready and leave',
    description: 'Clothes, breakfast, water, out the door.',
    category: 'personal',
    startTime: '05:30',
    endTime: '06:00',
    estMinutes: 30,
  },
  {
    id: 'v2-college',
    phaseId: PHASE_IDS.college,
    title: 'College',
    description: 'Attend, take brief notes, and note anything to review later.',
    category: 'study',
    startTime: '06:30',
    endTime: '10:00',
    fixed: true,
    estMinutes: 180,
  },
  {
    id: 'v2-reset',
    phaseId: PHASE_IDS.college,
    title: 'Return, breakfast, recovery',
    description: 'Eat and let your attention recover before deep study.',
    category: 'personal',
    startTime: '10:00',
    endTime: '11:00',
    estMinutes: 40,
  },
  {
    id: 'v2-deep',
    phaseId: PHASE_IDS.college,
    title: 'BCA deep study',
    description: 'One subject, one focused block. Numericals first.',
    category: 'study',
    startTime: '11:00',
    endTime: '13:00',
    estMinutes: 120,
  },
  {
    id: 'v2-lunch',
    phaseId: PHASE_IDS.college,
    title: 'Lunch and rest',
    description: 'A real pause. Rest is part of the schedule.',
    category: 'personal',
    startTime: '13:00',
    endTime: '14:00',
    trackable: false,
  },
  {
    id: 'v2-practice',
    phaseId: PHASE_IDS.college,
    title: 'BCA practice and questions',
    description: 'Past questions, active recall, and fixing mistakes.',
    category: 'study',
    startTime: '14:00',
    endTime: '15:30',
    estMinutes: 90,
  },
  {
    id: 'v2-break',
    phaseId: PHASE_IDS.college,
    title: 'Break',
    description: 'Walk, hydrate, breathe.',
    category: 'personal',
    startTime: '15:30',
    endTime: '16:30',
    trackable: false,
  },
  {
    id: 'v2-walk',
    phaseId: PHASE_IDS.college,
    title: 'Light walk or fitness',
    description: 'Optional on tired days. A short walk is enough.',
    category: 'fitness',
    startTime: '16:30',
    endTime: '17:00',
    kind: 'optional',
    estMinutes: 20,
  },
  {
    id: 'v2-family',
    phaseId: PHASE_IDS.college,
    title: 'Free time and dinner',
    description: 'Family, food, and time away from study.',
    category: 'personal',
    startTime: '17:00',
    endTime: '19:00',
    trackable: false,
  },
  {
    id: 'v2-revision',
    phaseId: PHASE_IDS.college,
    title: 'Revision',
    description: 'Short, active revision. Stop while you still feel okay.',
    category: 'study',
    startTime: '19:00',
    endTime: '19:45',
    estMinutes: 45,
  },
  {
    id: 'v2-prep',
    phaseId: PHASE_IDS.college,
    title: 'Prepare for next day',
    description: 'Pack materials, choose tomorrow’s top three, dim the lights.',
    category: 'personal',
    startTime: '19:45',
    endTime: '20:30',
    estMinutes: 30,
  },
  {
    id: 'v2-bed',
    phaseId: PHASE_IDS.college,
    title: 'Wind down for 9:15 bedtime',
    description: 'Protect sleep. It is the foundation for exam preparation.',
    category: 'sleep',
    startTime: '21:15',
    endTime: '21:30',
    estMinutes: 10,
  },
];

const EXAM_BLOCKS: BlockSeed[] = [
  {
    id: 'v3-wake',
    phaseId: PHASE_IDS.exam,
    title: 'Wake up',
    description: 'No rush. Water, light, and a calm start.',
    category: 'personal',
    startTime: '05:30',
    endTime: '05:40',
    estMinutes: 5,
  },
  {
    id: 'exam-am',
    phaseId: PHASE_IDS.exam,
    title: 'High-focus revision',
    description: 'Active recall first. Start with the least clear topic.',
    category: 'study',
    startTime: '06:00',
    endTime: '07:30',
    estMinutes: 90,
  },
  {
    id: 'v3-breakfast',
    phaseId: PHASE_IDS.exam,
    title: 'Breakfast and reset',
    description: 'Eat properly. Step outside for a few minutes.',
    category: 'personal',
    startTime: '07:30',
    endTime: '08:30',
    trackable: false,
  },
  {
    id: 'exam-pm',
    phaseId: PHASE_IDS.exam,
    title: 'Practice questions',
    description: 'Past questions or a timed section, then review mistakes.',
    category: 'study',
    startTime: '09:00',
    endTime: '11:00',
    estMinutes: 120,
  },
  {
    id: 'v3-break',
    phaseId: PHASE_IDS.exam,
    title: 'Break',
    description: 'Rest your eyes and move a little.',
    category: 'personal',
    startTime: '11:00',
    endTime: '12:00',
    trackable: false,
  },
  {
    id: 'exam-recall',
    phaseId: PHASE_IDS.exam,
    title: 'Flashcards and recall',
    description: 'Optional. Keep it short and low-pressure.',
    category: 'study',
    startTime: '12:00',
    endTime: '13:00',
    kind: 'optional',
    estMinutes: 45,
  },
  {
    id: 'v3-lunch',
    phaseId: PHASE_IDS.exam,
    title: 'Lunch and rest',
    description: 'A proper pause. Do not trade rest for more notes.',
    category: 'personal',
    startTime: '13:00',
    endTime: '14:30',
    trackable: false,
  },
  {
    id: 'exam-mock',
    phaseId: PHASE_IDS.exam,
    title: 'Practice paper or mock',
    description: 'Optional timed practice. Choose one area, then stop.',
    category: 'study',
    startTime: '15:00',
    endTime: '16:30',
    kind: 'optional',
    estMinutes: 90,
  },
  {
    id: 'v3-walk',
    phaseId: PHASE_IDS.exam,
    title: 'Light walk or stretch',
    description: 'Movement is optional today. A short walk is plenty.',
    category: 'fitness',
    startTime: '17:00',
    endTime: '17:20',
    kind: 'optional',
    estMinutes: 20,
  },
  {
    id: 'v3-wind',
    phaseId: PHASE_IDS.exam,
    title: 'Prepare for tomorrow',
    description: 'Pack materials and write tomorrow’s top three.',
    category: 'personal',
    startTime: '20:30',
    endTime: '21:00',
    kind: 'optional',
    estMinutes: 15,
  },
  {
    id: 'v3-bed',
    phaseId: PHASE_IDS.exam,
    title: 'Wind down for 10:00 bedtime',
    description: 'Sleep is exam preparation. Close the books now.',
    category: 'sleep',
    startTime: '22:00',
    endTime: '22:15',
    estMinutes: 10,
  },
];

const POST_EXAM_BLOCKS: BlockSeed[] = [
  {
    id: 'v4-wake',
    phaseId: PHASE_IDS.postExam,
    title: 'Wake up without an alarm race',
    description: 'A softer morning while you recover.',
    category: 'personal',
    startTime: '07:00',
    endTime: '07:15',
    estMinutes: 5,
  },
  {
    id: 'v4-walk',
    phaseId: PHASE_IDS.postExam,
    title: 'Morning walk',
    description: 'Optional. Sunlight and easy movement.',
    category: 'fitness',
    startTime: '07:30',
    endTime: '08:00',
    kind: 'optional',
    estMinutes: 20,
  },
  {
    id: 'v4-breakfast',
    phaseId: PHASE_IDS.postExam,
    title: 'Breakfast',
    description: 'Slow start, no rush.',
    category: 'personal',
    startTime: '08:15',
    endTime: '09:00',
    trackable: false,
  },
  {
    id: 'v4-nestjs',
    phaseId: PHASE_IDS.postExam,
    title: 'NestJS Project Time',
    description: 'Optional. Build and improve my NestJS project.',
    category: 'career',
    startTime: '10:00',
    endTime: '11:00',
    kind: 'optional',
    estMinutes: 60,
  },
  {
    id: 'v4-lms',
    phaseId: PHASE_IDS.postExam,
    title: 'NestJS project deep work',
    description: 'Optional. One meaningful step on the NestJS project.',
    category: 'career',
    startTime: '11:15',
    endTime: '12:15',
    kind: 'optional',
    estMinutes: 60,
  },
  {
    id: 'v4-lunch',
    phaseId: PHASE_IDS.postExam,
    title: 'Lunch and rest',
    description: 'Rest is still part of rebuilding.',
    category: 'personal',
    startTime: '12:30',
    endTime: '14:00',
    trackable: false,
  },
  {
    id: 'v4-rn',
    phaseId: PHASE_IDS.postExam,
    title: 'Explore React Native',
    description: 'Optional. Small experiments and reading, no pressure.',
    category: 'career',
    startTime: '15:00',
    endTime: '16:00',
    kind: 'optional',
    estMinutes: 60,
  },
  {
    id: 'v4-workout',
    phaseId: PHASE_IDS.postExam,
    title: 'Return to workouts',
    description: 'Optional. Choose an easy run or strength session.',
    category: 'fitness',
    startTime: '17:30',
    endTime: '18:00',
    kind: 'optional',
    estMinutes: 25,
  },
  {
    id: 'v4-reflect',
    phaseId: PHASE_IDS.postExam,
    title: 'Review and reset',
    description: 'Reflect on the exams and choose one gentle next goal.',
    category: 'personal',
    startTime: '20:00',
    endTime: '20:15',
    estMinutes: 10,
  },
  {
    id: 'v4-bed',
    phaseId: PHASE_IDS.postExam,
    title: 'Wind down for 10:30 bedtime',
    description: 'Rest and rebuild.',
    category: 'sleep',
    startTime: '22:30',
    endTime: '22:45',
    estMinutes: 10,
  },
];

export const DEFAULT_BLOCKS = [
  ...VACATION_BLOCKS,
  ...COLLEGE_BLOCKS,
  ...EXAM_BLOCKS,
  ...POST_EXAM_BLOCKS,
];

export const DEFAULT_PHASES = [
  {
    id: PHASE_IDS.vacation,
    name: 'Vacation reset',
    objective:
      'Restore routine, rebuild study consistency, improve fitness, and prepare for exams.',
    startDate: '2026-11-01',
    endDate: '2026-11-16',
    auto: 1,
    sortOrder: 10,
    color: '#B94DF2',
  },
  {
    id: PHASE_IDS.college,
    name: 'College days',
    objective:
      'Maintain academic consistency while attending college and preparing for exams.',
    startDate: '2026-11-17',
    endDate: '2026-11-24',
    auto: 1,
    sortOrder: 20,
    color: '#008F8D',
  },
  {
    id: PHASE_IDS.exam,
    name: 'Exam season',
    objective:
      'Prioritise the three backlogs, protect sleep, and keep everything else light.',
    startDate: '2026-11-25',
    endDate: null,
    auto: 1,
    sortOrder: 30,
    color: '#806F00',
  },
  {
    id: PHASE_IDS.postExam,
    name: 'Recovery & rebuild',
    objective:
      'Recover, return to workouts, resume NestJS, and rebuild at a sustainable pace.',
    startDate: null,
    endDate: null,
    auto: 0,
    sortOrder: 40,
    color: '#7A28A8',
  },
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  apiBaseUrl: '',
  authToken: '',
  syncEmail: '',
  lastSyncAt: '',
  autoSync: 'true',
  notificationPrefs: JSON.stringify({
    enabled: false,
    quietStart: '22:00',
    quietEnd: '05:30',
    items: [
      { key: 'wake', label: 'Wake-up reminder', enabled: true, time: '05:45' },
      { key: 'movement', label: 'Morning movement', enabled: true, time: '06:00' },
      { key: 'study', label: 'First study block', enabled: true, time: '07:30' },
      { key: 'revision', label: 'Evening revision', enabled: true, time: '20:00' },
      { key: 'journal', label: 'Evening reflection', enabled: true, time: '21:00' },
      { key: 'bedtime', label: 'Bedtime wind-down', enabled: true, time: '21:15' },
    ],
  }),
};

export async function seedDatabase(db: SQLiteDatabase, now: string): Promise<void> {
  const seedVersion = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'seed_version'`,
  );
  if (seedVersion?.value === '1') {
    await seedDefaults(db, now);
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const phase of DEFAULT_PHASES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO routine_phases
          (id, name, objective, start_date, end_date, auto, sort_order, color, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        phase.id,
        phase.name,
        phase.objective,
        phase.startDate,
        phase.endDate,
        phase.auto,
        phase.sortOrder,
        phase.color,
        now,
      );
    }
    for (const [index, block] of DEFAULT_BLOCKS.entries()) {
      await db.runAsync(
        `INSERT OR IGNORE INTO schedule_blocks
          (id, phase_id, title, description, category, start_time, end_time, days,
           trackable, fixed, kind, est_minutes, sort_order, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        block.id,
        block.phaseId,
        block.title,
        block.description ?? '',
        block.category,
        block.startTime,
        block.endTime,
        JSON.stringify(block.days ?? ALL_DAYS),
        block.trackable === false ? 0 : 1,
        block.fixed ? 1 : 0,
        block.kind ?? 'core',
        block.estMinutes ?? 0,
        index,
        now,
      );
    }
    for (const subject of SUBJECT_SEEDS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO subjects
          (id, name, code, priority, allocation, confidence, color, exam_date, exam_time, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, '', ?)`,
        subject.id,
        subject.name,
        subject.code,
        subject.priority,
        subject.allocation,
        subject.priority === 1 ? 2 : 3,
        subject.color,
        now,
      );
    }
    for (const [index, topic] of NESTJS_ROADMAP.entries()) {
      await db.runAsync(
        `INSERT OR IGNORE INTO learning_topics
          (id, title, description, status, minutes, notes, code_done, sort_order, updated_at)
         VALUES (?, ?, ?, 'not_started', 0, '', 0, ?, ?)`,
        `nest-${index + 1}`,
        topic.title,
        topic.description,
        index,
        now,
      );
    }
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO achievements (key, title, description, icon, unlocked_at)
         VALUES (?, ?, ?, ?, NULL)`,
        achievement.key,
        achievement.title,
        achievement.description,
        achievement.icon,
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('seed_version', '1', ?)`,
      now,
    );
  });

  await seedDefaults(db, now);
}

async function seedDefaults(db: SQLiteDatabase, now: string): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      key,
      value,
      now,
    );
  }
}
