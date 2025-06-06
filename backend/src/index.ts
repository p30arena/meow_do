import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import workspaceRoutes from './routes/workspace.routes';
import goalRoutes from './routes/goal.routes';
import taskRoutes from './routes/task.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MeowDo Backend is running!');
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

import { protect } from './middleware/auth.middleware';

// Workspace routes
app.use('/api/v1/workspaces', protect, workspaceRoutes);

// Goal routes
app.use('/api/v1/goals', protect, goalRoutes);

// Task routes
app.use('/api/v1/tasks', protect, taskRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
