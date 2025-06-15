import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { registerUserSchema, loginUserSchema, updateUserTimezoneSchema } from '../validation/user.validation';
import { catchAsync } from '../utils/catchAsync';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '90d',
  });
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const validatedData = registerUserSchema.parse(req.body);
  const { username, email, password } = validatedData;

  const existingUser = await db.select().from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await db.insert(users).values({ username, email, passwordHash }).returning();
  const token = generateToken(newUser[0].id);

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: newUser[0].id,
      username: newUser[0].username,
      email: newUser[0].email,
    },
    token,
  });
});

export const updateTimezone = catchAsync(async (req: Request, res: Response) => {
  const validatedData = updateUserTimezoneSchema.parse(req.body);
  const { timezone } = validatedData;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID missing' });
  }

  const updatedUsers = await db.update(users)
    .set({ timezone, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, username: users.username, email: users.email, timezone: users.timezone });

  if (updatedUsers.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'Timezone updated successfully',
    user: updatedUsers[0],
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const validatedData = loginUserSchema.parse(req.body);
  const { email, password } = validatedData;

  const user = await db.select().from(users).where(eq(users.email, email));
  if (user.length === 0) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user[0].passwordHash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = generateToken(user[0].id);

  res.status(200).json({
    message: 'Logged in successfully',
    user: {
      id: user[0].id,
      username: user[0].username,
      email: user[0].email,
    },
    token,
  });
});
