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
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  goalId: string;
  name: string;
  description?: string;
  timeBudget: number;
  deadline?: string;
  isRecurring?: boolean;
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string;
  timeBudget?: number;
  deadline?: string;
  status?: 'pending' | 'started' | 'failed' | 'done';
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
