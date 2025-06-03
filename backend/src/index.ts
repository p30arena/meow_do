import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import workspaceRoutes from './routes/workspace.routes';
import goalRoutes from './routes/goal.routes';
import taskRoutes from './routes/task.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MeowDo Backend is running!');
});

// Workspace routes
app.use('/api/workspaces', workspaceRoutes);

// Goal routes
app.use('/api/goals', goalRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
