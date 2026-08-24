import { request } from './client';

export interface Task {
  id: string;
  goalId: string;
  name: string;
  description?: string;
  timeBudget: number; // in minutes
  deadline?: string; // ISO date string
  status: 'pending' | 'started' | 'failed' | 'done';
  priority: number; // Add priority to Task interface
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  activeTracking?: TaskTrackingRecord | null; // Add activeTracking property
}

export interface CreateTaskPayload {
  goalId: string;
  name: string;
  description?: string;
  timeBudget: number;
  deadline?: string;
  status?: 'pending' | 'started' | 'failed' | 'done'; // Status can be optional for creation
  priority?: number; // Add priority to CreateTaskPayload
  isRecurring?: boolean;
}

export interface CreateManualTaskRecordPayload {
  startTime: string; // ISO date string
  stopTime: string; // ISO date string
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string;
  timeBudget?: number;
  deadline?: string;
  status?: 'pending' | 'started' | 'failed' | 'done';
  priority?: number; // Add priority to UpdateTaskPayload
  isRecurring?: boolean;
}

export const createTask = async (payload: CreateTaskPayload): Promise<Task> =>
  request<Task>('/tasks', { method: 'POST', body: payload, errorMessage: 'Failed to create task' });

export const createManualTaskRecord = async (taskId: string, payload: CreateManualTaskRecordPayload): Promise<{ message: string; record: TaskTrackingRecord }> =>
  request(`/tasks/${taskId}/manual-record`, {
    method: 'POST',
    body: payload,
    errorMessage: `Failed to create manual record for task ID ${taskId}`,
  });

export interface TaskTrackingRecord {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

export interface TaskTrackingSummary {
  taskName: string;
  totalDurationSeconds: number;
  period?: string; // ISO date string for the start of the period (day, month, year), optional for 'total'
}

export const startTaskTracking = async (taskId: string): Promise<{ message: string; record: TaskTrackingRecord }> =>
  request(`/tasks/${taskId}/start`, {
    method: 'POST',
    body: {},
    errorMessage: `Failed to start tracking for task ID ${taskId}`,
  });

export const stopTaskTracking = async (trackingId: string, stopTime?: string): Promise<{ message: string; record: TaskTrackingRecord }> =>
  request(`/tasks/${trackingId}/stop`, {
    method: 'POST',
    body: { stopTime },
    errorMessage: `Failed to stop tracking for record ID ${trackingId}`,
  });

export const getTaskTrackingSummary = async (
  period: 'day' | 'month' | 'year' | 'total', // Add 'total' as a valid period
  workspaceId?: string,
  goalId?: string
): Promise<TaskTrackingSummary[]> => {
  let queryString = `period=${period}`;
  if (workspaceId) {
    queryString += `&workspaceId=${workspaceId}`;
  }
  if (goalId) {
    queryString += `&goalId=${goalId}`;
  }
  return request<TaskTrackingSummary[]>(`/tasks/summary?${queryString}`, {
    errorMessage: `Failed to fetch task tracking summary for period ${period}`,
  });
};

export const getTasksByGoalId = async (goalId: string): Promise<Task[]> =>
  request<Task[]>(`/tasks?goalId=${goalId}`, {
    errorMessage: `Failed to fetch tasks for goal ID ${goalId}`,
  });

/** All of the user's tasks across every workspace (owned + shared), with active tracking state. */
export const getAllTasks = async (): Promise<Task[]> =>
  request<Task[]>('/tasks', {
    errorMessage: 'Failed to fetch tasks',
  });

export const getTaskById = async (id: string): Promise<Task> =>
  request<Task>(`/tasks/${id}`, {
    errorMessage: `Failed to fetch task with ID ${id}`,
  });

export const updateTask = async (id: string, payload: UpdateTaskPayload): Promise<Task> =>
  request<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: payload,
    errorMessage: `Failed to update task with ID ${id}`,
  });

export const deleteTask = async (id: string): Promise<void> =>
  request<void>(`/tasks/${id}`, {
    method: 'DELETE',
    errorMessage: `Failed to delete task with ID ${id}`,
  });
