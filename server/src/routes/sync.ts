import { Router } from 'express';
import { z } from 'zod';
import { authedUserId, requireAuth } from '../auth';
import { asyncHandler } from '../http';
import { ENTITIES, SyncRecord, type SyncRecordInput } from '../models/SyncRecord';
import { Types } from 'mongoose';

const router = Router();

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Use an ISO timestamp');

const recordSchema = z.object({
  entity: z.enum(ENTITIES),
  id: z.string().min(1).max(120),
  day: z.string().max(10).nullish(),
  updatedAt: isoDate,
  deleted: z.boolean().default(false),
  payload: z.record(z.string(), z.unknown()).nullish(),
  deviceId: z.string().max(80).nullish(),
});

const pushSchema = z.object({
  records: z.array(recordSchema).max(500),
});

const pullQuery = z.object({
  since: isoDate.optional(),
  cursor: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
});

const parseCursor = (cursor: string) => {
  const [at, id] = cursor.split('|');
  if (!at || !id || Number.isNaN(Date.parse(at)) || !Types.ObjectId.isValid(id)) {
    throw new Error('Invalid sync cursor');
  }
  return { at: new Date(at), id: new Types.ObjectId(id) };
};

const cursorOf = (row: { clientUpdatedAt: Date; _id: unknown }) =>
  `${row.clientUpdatedAt.toISOString()}|${String(row._id)}`;

router.use(requireAuth);

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    const { records } = pushSchema.parse(req.body);
    const userId = authedUserId(req);
    let accepted = 0;
    let skipped = 0;

    for (const record of records as SyncRecordInput[]) {
      const when = new Date(record.updatedAt);
      try {
        const result = await SyncRecord.findOneAndUpdate(
          {
            userId,
            entity: record.entity,
            recordId: record.id,
            clientUpdatedAt: { $lte: when },
          },
          {
            $set: {
              day: record.day ?? null,
              deleted: record.deleted,
              payload: record.deleted ? null : (record.payload ?? {}),
              clientUpdatedAt: when,
              serverUpdatedAt: new Date(),
              deviceId: record.deviceId ?? null,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        if (result) accepted += 1;
        else skipped += 1;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    res.json({ accepted, skipped, serverTime: new Date().toISOString() });
  }),
);

router.get(
  '/pull',
  asyncHandler(async (req, res) => {
    const query = pullQuery.parse(req.query);
    const userId = authedUserId(req);
    const filter: Record<string, unknown> = { userId };
    if (query.cursor) {
      const { at, id } = parseCursor(query.cursor);
      filter.$or = [
        { clientUpdatedAt: { $gt: at } },
        { clientUpdatedAt: at, _id: { $gt: id } },
      ];
    } else if (query.since) {
      filter.clientUpdatedAt = { $gt: new Date(query.since) };
    }

    const rows = await SyncRecord.find(filter)
      .sort({ clientUpdatedAt: 1, _id: 1 })
      .limit(query.limit + 1)
      .lean();

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    res.json({
      records: page.map((row) => ({
        entity: row.entity,
        id: row.recordId,
        day: row.day,
        updatedAt: row.clientUpdatedAt.toISOString(),
        deleted: row.deleted,
        payload: row.payload,
        cursor: cursorOf(row),
      })),
      count: page.length,
      hasMore,
      nextCursor: last ? cursorOf(last) : (query.cursor ?? null),
      serverTime: new Date().toISOString(),
    });
  }),
);

export default router;
