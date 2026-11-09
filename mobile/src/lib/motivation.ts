function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = (list: string[], dateKey: string): string => list[hash(dateKey) % list.length];

export function dailyMessage(params: {
  dateKey: string;
  percent: number;
  streak: number;
  isRest: boolean;
  isExamPhase: boolean;
}): string {
  const { dateKey, percent, streak, isRest, isExamPhase } = params;
  if (isRest) {
    return pick(
      [
        'Rest is part of the plan. Your streak is safe.',
        'Recovery today. Come back with a little more energy.',
        'A gentler day still counts as showing up.',
      ],
      dateKey,
    );
  }
  if (percent >= 1) {
    return pick(
      [
        'A full day. Let yourself feel good about it.',
        'Everything done — now let the day be done.',
        'Quiet consistency looks good on you.',
      ],
      dateKey,
    );
  }
  if (percent >= 0.7) {
    return pick(
      [
        'The important things are done. The rest can wait.',
        'Today counts. That is what matters.',
        'You showed up where it counted.',
      ],
      dateKey,
    );
  }
  if (percent > 0) {
    return pick(
      [
        'You have already started. That is the hard part.',
        'Small progress is still progress. Keep it gentle.',
        'One step at a time is a real pace.',
      ],
      dateKey,
    );
  }
  if (isExamPhase) {
    return pick(
      [
        'One focused block is enough to begin.',
        'Pick the next small step, not the whole syllabus.',
        'Protect your sleep. It is part of exam preparation.',
      ],
      dateKey,
    );
  }
  if (streak > 0) {
    return pick(
      [
        'Your streak is alive. Start with the easiest goal.',
        'Momentum is built by beginning, not by being ready.',
        'Come as you are. Just begin with one thing.',
      ],
      dateKey,
    );
  }
  return pick(
    [
      'Today is another opportunity to show up for yourself.',
      'You do not need a perfect day. Just a real one.',
      'Start small. Momentum will meet you there.',
      'Aim for steady, not intense.',
    ],
    dateKey,
  );
}

const CONFIRMATIONS = [
  'One step done.',
  'That counts.',
  'Nice — keep it light.',
  'Done. Move gently.',
  'Progress, quietly.',
];

export function completionMessage(dateKey: string, index: number): string {
  return CONFIRMATIONS[(hash(dateKey) + index) % CONFIRMATIONS.length];
}

export function thresholdMessage(streak: number): string {
  return streak > 1
    ? `${streak} days of showing up. Today counts too.`
    : 'Today counts. That is how it starts.';
}

export function missedDayMessage(): string {
  return "Yesterday didn't go as planned. That's okay. Let's focus on today.";
}

export function restDayMessage(used: number, limit: number): string {
  if (used === 0) return 'Marked as rest. Your streak is protected.';
  if (used >= limit) return "This week's recovery day is used. Be kind to yourself.";
  return 'Recovery day noted. Your streak is protected.';
}
