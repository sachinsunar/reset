import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Backup } from '../models/Backup';
import { RoutineConfig } from '../models/RoutineConfig';
import { SyncRecord } from '../models/SyncRecord';
import { asyncHandler, HttpError } from '../http';
import { authedUserId, requireAuth, signToken } from '../auth';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, 'Enter your name').max(80),
});

const publicUser = (user: { _id: unknown; name: string; email: string; createdAt?: Date }) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt ?? null,
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email }).lean();
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists.', 'email_taken');
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash,
    });
    const token = signToken(String(user._id), user.email);
    res.status(201).json({ token, user: publicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = credentialsSchema.parse(req.body);
    const user = await User.findOne({ email: body.email }).select('+passwordHash');
    if (!user) {
      throw new HttpError(401, 'Email or password is incorrect.');
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Email or password is incorrect.');
    }
    user.lastSeenAt = new Date();
    await user.save();
    const token = signToken(String(user._id), user.email);
    res.json({ token, user: publicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(authedUserId(req)).lean();
    if (!user) throw new HttpError(401, 'Account not found.');
    res.json({ user: publicUser(user) });
  }),
);

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = authedUserId(req);
    await Promise.all([
      SyncRecord.deleteMany({ userId }),
      Backup.deleteOne({ userId }),
      RoutineConfig.deleteOne({ userId }),
      User.deleteOne({ _id: userId }),
    ]);
    res.status(204).send();
  }),
);

export default router;
