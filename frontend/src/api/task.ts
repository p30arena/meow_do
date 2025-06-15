import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

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
  duration: number; // in seconds
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

export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create task');
  }
  return response.json();
};

export const createManualTaskRecord = async (taskId: string, payload: CreateManualTaskRecordPayload): Promise<TaskTrackingRecord> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/manual-record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to create manual record for task ID ${taskId}`);
  }
  return response.json();
};

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

export const startTaskTracking = async (taskId: string): Promise<TaskTrackingRecord> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to start tracking for task ID ${taskId}`);
  }
  return response.json();
};

export const stopTaskTracking = async (trackingId: string, stopTime?: string): Promise<TaskTrackingRecord> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${trackingId}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ stopTime }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to stop tracking for record ID ${trackingId}`);
  }
  return response.json();
};

export const getTaskTrackingSummary = async (
  period: 'day' | 'month' | 'year' | 'total', // Add 'total' as a valid period
  workspaceId?: string,
  goalId?: string
): Promise<TaskTrackingSummary[]> => {
  const token = localStorage.getItem('token');
  let queryString = `period=${period}`;
  if (workspaceId) {
    queryString += `&workspaceId=${workspaceId}`;
  }
  if (goalId) {
    queryString += `&goalId=${goalId}`;
  }

  const response = await fetch(`${API_BASE_URL}/tasks/summary?${queryString}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch task tracking summary for period ${period}`);
  }
  return response.json();
};

export const getTasksByGoalId = async (goalId: string): Promise<Task[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks?goalId=${goalId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch tasks for goal ID ${goalId}`);
  }
  return response.json();
};

export const getTaskById = async (id: string): Promise<Task> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch task with ID ${id}`);
  }
  return response.json();
};

export const updateTask = async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to update task with ID ${id}`);
  }
  return response.json();
};

export const deleteTask = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to delete task with ID ${id}`);
  }
};

export const copyTaskToNextDay = async (id: string): Promise<Task> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/copy-to-next-day`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to copy task with ID ${id} to next day`);
  }
  return response.json();
};
