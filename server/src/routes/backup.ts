import { Router } from 'express';
import { z } from 'zod';
import { authedUserId, requireAuth } from '../auth';
import { asyncHandler, HttpError } from '../http';
import { Backup } from '../models/Backup';

const router = Router();

const snapshotSchema = z.object({
  version: z.number().int().min(1).max(100),
  exportedAt: z.string().min(1).max(40),
  tables: z.record(z.string().max(60), z.array(z.unknown())),
});

router.use(requireAuth);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const snapshot = snapshotSchema.parse(req.body);
    const userId = authedUserId(req);
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 9_000_000) {
      throw new HttpError(413, 'Backup is too large. Reduce attachment-style notes.');
    }

    const backup = await Backup.findOneAndUpdate(
      { userId },
      {
        $set: {
          version: snapshot.version,
          exportedAt: snapshot.exportedAt,
          snapshot,
          sizeBytes: Buffer.byteLength(serialized, 'utf8'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.status(201).json({
      backup: {
        version: backup.version,
        exportedAt: backup.exportedAt,
        sizeBytes: backup.sizeBytes,
        updatedAt: backup.updatedAt,
      },
    });
  }),
);

router.get(
  '/latest',
  asyncHandler(async (req, res) => {
    const backup = await Backup.findOne({ userId: authedUserId(req) }).lean();
    if (!backup) throw new HttpError(404, 'No backup has been uploaded yet.', 'no_backup');
    res.json({
      version: backup.version,
      exportedAt: backup.exportedAt,
      sizeBytes: backup.sizeBytes,
      updatedAt: backup.updatedAt,
      snapshot: backup.snapshot,
    });
  }),
);

export default router;
