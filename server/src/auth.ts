import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env';

interface TokenPayload {
  sub: string;
  email: string;
}

export const signToken = (userId: string, email: string) =>
  jwt.sign({ sub: userId, email } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'reset-api',
    audience: 'reset-app',
  });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'reset-api',
    audience: 'reset-app',
  });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Malformed token');
  }
  return { sub: String(decoded.sub), email: String(decoded.email ?? '') };
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
};

export const authedUserId = (req: Request): string => {
  if (!req.userId) throw new Error('requireAuth must run before this handler');
  return req.userId;
};
