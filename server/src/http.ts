import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Some fields need attention.',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  const maybeMongo = error as { code?: number; name?: string; message?: string };
  if (maybeMongo?.code === 11000) {
    res.status(409).json({ error: 'That record already exists.' });
    return;
  }

  console.error('Unhandled request error', error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
};
