import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import workspaceRoutes from './routes/workspace.routes';
import goalRoutes from './routes/goal.routes';
import taskRoutes from './routes/task.routes';
import authRoutes from './routes/auth.routes';
import shareRoutes from './routes/share.routes';
import { updateTimezone } from './controllers/auth.controller'; // Import updateTimezone
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.trim().length === 0) {
  throw new Error('JWT_SECRET is not set. Provide it via the JWT_SECRET environment variable.');
}
const KNOWN_WEAK_SECRETS = new Set(['random_key', 'your_jwt_secret_key', 'change-me', 'secret']);
if (jwtSecret.length < 32 || KNOWN_WEAK_SECRETS.has(jwtSecret)) {
  console.warn('[security] JWT_SECRET is short or a known placeholder — generate a strong secret for production deployments.');
}

const app = express();
const port = process.env.PORT || 3000;

// Restrict allowed origins via CORS_ORIGIN (comma-separated). Defaults to the
// previous permissive behavior so local development keeps working.
const corsOrigin = process.env.CORS_ORIGIN?.trim();
app.use(cors({ origin: corsOrigin ? corsOrigin.split(',').map((origin) => origin.trim()) : true }));
app.use(helmet());
app.use(express.json());

// Throttle credential endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/v1/auth', authLimiter);

app.get('/', (req, res) => {
  res.send('MeowDo Backend is running!');
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

import { protect } from './middleware/auth.middleware';

// User-specific protected routes
app.put('/api/v1/me/timezone', protect, updateTimezone);

// Share routes for workspace sharing and permissions
app.use('/api/v1/workspaces-sharing', protect, shareRoutes);

// Workspace routes
app.use('/api/v1/workspaces', protect, workspaceRoutes);

// Goal routes
app.use('/api/v1/goals', protect, goalRoutes);

// Task routes
app.use('/api/v1/tasks', protect, taskRoutes);

// Centralized error handler: maps ZodError -> 400 and hides stack traces.
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
