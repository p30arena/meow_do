import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      issues: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  const pgCode = (err as { code?: string } | null)?.code;
  if (pgCode === '23505') {
    res.status(409).json({ message: 'Resource already exists' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
