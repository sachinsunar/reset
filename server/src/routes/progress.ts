import { Router } from 'express';
import { z } from 'zod';
import { authedUserId, requireAuth } from '../auth';
import { asyncHandler } from '../http';
import { SyncRecord } from '../models/SyncRecord';

const router = Router();
const TIMEZONE = 'Asia/Kathmandu';

const querySchema = z.object({
  threshold: z.coerce.number().min(0).max(1).default(0.7),
});

const todayKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
};

const shiftDays = (key: string, offset: number) => {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

interface RemoteDay {
  date: string;
  status: string;
  completedCore: number;
  totalCore: number;
  isRest: boolean;
  isRecovery: boolean;
}

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { threshold } = querySchema.parse(req.query);
    const rows = await SyncRecord.find({
      userId: authedUserId(req),
      entity: 'day_log',
      deleted: false,
    }).lean();

    const days: RemoteDay[] = rows
      .map((row) => row.payload as Partial<RemoteDay> | null)
      .filter((payload): payload is Partial<RemoteDay> => Boolean(payload?.date))
      .map((payload) => ({
        date: String(payload.date),
        status: String(payload.status ?? 'none'),
        completedCore: Number(payload.completedCore ?? 0),
        totalCore: Number(payload.totalCore ?? 0),
        isRest: Boolean(payload.isRest),
        isRecovery: Boolean(payload.isRecovery),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const today = todayKey();
    const byDate = new Map(days.map((day) => [day.date, day]));
    const completed = (day: RemoteDay | undefined) => {
      if (!day) return false;
      if (day.totalCore > 0) return day.completedCore / day.totalCore >= threshold;
      return day.status === 'completed';
    };
    const failed = (day: RemoteDay | undefined) =>
      Boolean(day && (day.status === 'missed' || day.status === 'partial'));

    const current = (() => {
      let run = 0;
      let cursor = completed(byDate.get(today)) ? today : shiftDays(today, -1);
      for (let i = 0; i < 3650; i++) {
        const day = byDate.get(cursor);
        if (!day) break;
        if (completed(day)) run += 1;
        else if (failed(day)) break;
        cursor = shiftDays(cursor, -1);
      }
      return run;
    })();

    let longest = 0;
    let run = 0;
    for (const day of days) {
      if (day.date > today) break;
      if (completed(day)) {
        run += 1;
        longest = Math.max(longest, run);
      } else if (failed(day)) {
        run = 0;
      }
    }

    const consistency = (span: number) => {
      let scheduled = 0;
      let done = 0;
      for (let i = 0; i < span; i++) {
        const day = byDate.get(shiftDays(today, -i));
        if (!day) continue;
        if (day.status === 'rest' || day.status === 'recovery' || day.status === 'none') continue;
        scheduled += 1;
        if (completed(day)) done += 1;
      }
      return scheduled === 0 ? 0 : Math.round((done / scheduled) * 1000) / 1000;
    };

    res.json({
      timezone: TIMEZONE,
      today,
      threshold,
      daysTracked: days.length,
      totalCompleted: days.filter((day) => completed(day)).length,
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      weekConsistency: consistency(7),
      monthConsistency: consistency(30),
      todayStatus: byDate.get(today)?.status ?? 'none',
      generatedAt: new Date().toISOString(),
    });
  }),
);

export default router;
