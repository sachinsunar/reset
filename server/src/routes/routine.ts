import { Router } from 'express';
import { z } from 'zod';
import { authedUserId, requireAuth } from '../auth';
import { asyncHandler, HttpError } from '../http';
import { RoutineConfig } from '../models/RoutineConfig';

const router = Router();

const configSchema = z.object({
  version: z.number().int().min(1).max(100).default(1),
  config: z.record(z.string(), z.unknown()),
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const record = await RoutineConfig.findOne({ userId: authedUserId(req) }).lean();
    if (!record) throw new HttpError(404, 'No routine snapshot saved yet.', 'no_routine');
    res.json({ version: record.version, config: record.config, updatedAt: record.updatedAt });
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const body = configSchema.parse(req.body);
    const record = await RoutineConfig.findOneAndUpdate(
      { userId: authedUserId(req) },
      { $set: { version: body.version, config: body.config } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ version: record.version, config: record.config, updatedAt: record.updatedAt });
  }),
);

export default router;
