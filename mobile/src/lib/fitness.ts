import { weekdayOfKey } from './date';

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  easyReps: string;
  note?: string;
}

export interface WorkoutPlan {
  key: string;
  title: string;
  kind: 'run' | 'walk' | 'strength' | 'mobility' | 'rest';
  focus: string;
  durationMin: number;
  exercises: Exercise[];
  guidance: string;
}

const STRENGTH_A: Exercise[] = [
  { name: 'Squats', sets: 2, reps: '12', easyReps: '8' },
  { name: 'Push-ups', sets: 2, reps: '8', easyReps: '5', note: 'Knees or wall variation is fine' },
  { name: 'Glute bridges', sets: 2, reps: '12', easyReps: '8' },
  { name: 'Plank', sets: 2, reps: '20 sec', easyReps: '12 sec' },
];

const STRENGTH_B: Exercise[] = [
  { name: 'Reverse lunges', sets: 2, reps: '8 / leg', easyReps: '5 / leg', note: 'Hold a wall if balance feels shaky' },
  { name: 'Incline push-ups', sets: 2, reps: '10', easyReps: '6' },
  { name: 'Bird dogs', sets: 2, reps: '10 / side', easyReps: '6 / side' },
  { name: 'Dead bugs', sets: 2, reps: '10', easyReps: '6' },
  { name: 'Side plank', sets: 2, reps: '15 sec / side', easyReps: '8 sec / side' },
];

const MOBILITY: Exercise[] = [
  { name: 'Neck and shoulder rolls', sets: 1, reps: '1 min', easyReps: '1 min' },
  { name: 'Hip circles', sets: 1, reps: '1 min', easyReps: '1 min' },
  { name: 'Cat–cow', sets: 1, reps: '10 slow', easyReps: '6 slow' },
  { name: 'Hamstring stretch', sets: 1, reps: '45 sec / side', easyReps: '30 sec / side' },
  { name: 'Easy walk', sets: 1, reps: '10–15 min', easyReps: '8 min' },
];

export const WEEKLY_WORKOUTS: Record<number, WorkoutPlan> = {
  0: {
    key: 'sunday-rest',
    title: 'Rest and reset',
    kind: 'rest',
    focus: 'Full recovery',
    durationMin: 0,
    exercises: [],
    guidance:
      'No workout needed. A short walk, stretching, or simply resting all count. Recovery is training.',
  },
  1: {
    key: 'monday-easy-run',
    title: 'Easy run or walk',
    kind: 'run',
    focus: 'Aerobic base · conversational pace',
    durationMin: 22,
    exercises: [],
    guidance:
      'Keep it easy enough that you could speak in full sentences. Alternate walking and jogging whenever you like. 20–25 minutes is plenty.',
  },
  2: {
    key: 'tuesday-strength-a',
    title: 'Bodyweight strength A',
    kind: 'strength',
    focus: 'Legs, push, core',
    durationMin: 20,
    exercises: STRENGTH_A,
    guidance:
      'Rest 45–60 seconds between sets. Stop a rep or two before failure. Form first, numbers later.',
  },
  3: {
    key: 'wednesday-run',
    title: 'Run or walk',
    kind: 'run',
    focus: 'Steady movement',
    durationMin: 22,
    exercises: [],
    guidance:
      'A relaxed run or brisk walk. If your legs feel heavy, choose the walk. Consistency beats intensity.',
  },
  4: {
    key: 'thursday-mobility',
    title: 'Mobility and recovery',
    kind: 'mobility',
    focus: 'Gentle range of motion',
    durationMin: 15,
    exercises: MOBILITY,
    guidance:
      'Move slowly and never push into pain. This is a recovery session, not a workout to win.',
  },
  5: {
    key: 'friday-strength-b',
    title: 'Bodyweight strength B',
    kind: 'strength',
    focus: 'Unilateral legs, posture, core',
    durationMin: 22,
    exercises: STRENGTH_B,
    guidance:
      'Quality over quantity. If balance is difficult, hold a wall or chair. Breathing should stay calm.',
  },
  6: {
    key: 'saturday-run',
    title: 'Run or walk',
    kind: 'run',
    focus: 'Easy distance',
    durationMin: 25,
    exercises: [],
    guidance:
      'A comfortable 20–25 minutes. You can go a little longer than Monday if you feel good, but there is no need to race.',
  },
};

export function workoutForDate(dateKey: string): WorkoutPlan {
  return WEEKLY_WORKOUTS[weekdayOfKey(dateKey)];
}

export function exercisesForIntensity(plan: WorkoutPlan, easy: boolean): Exercise[] {
  return plan.exercises.map((exercise) => ({
    ...exercise,
    reps: easy ? exercise.easyReps : exercise.reps,
  }));
}

export const BODY_FAT_NOTE =
  'You cannot target belly fat with specific exercises. Sustainable fat loss comes from overall activity, strength, sleep, stress, and a gentle calorie deficit — not from crunches or crash diets. This plan focuses on strength, energy, and consistency instead.';

export const SAFETY_NOTE =
  'Stop if you feel dizzy, sharp pain, or unusual shortness of breath. Skipping or shortening a workout on a low-energy day is a valid choice, not a failure.';
