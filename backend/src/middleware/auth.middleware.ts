import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { catchAsync } from '../utils/catchAsync';

// Extend the Request interface to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      // Get user from the token
      const user = await db.select().from(users).where(eq(users.id, decoded.id));

      if (user.length === 0) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      req.user = { id: user[0].id };
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
});
