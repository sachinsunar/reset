import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { allowedOrigins, env } from './env';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import backupRoutes from './routes/backup';
import progressRoutes from './routes/progress';
import routineRoutes from './routes/routine';
import { errorHandler, notFound } from './http';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in a few minutes.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 10_000 : 240,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Slow down a little and try again.' },
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'reset-api', time: new Date().toISOString() });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/routine', routineRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
