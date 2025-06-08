import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

export interface Goal {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  deadline?: string; // ISO date string
  status: 'pending' | 'reached';
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  totalProgress?: number;
  hasRunningTask?: boolean;
}

export interface CreateGoalPayload {
  workspaceId: string;
  name: string;
  description?: string;
  deadline?: string;
}

export interface UpdateGoalPayload {
  name?: string;
  description?: string;
  deadline?: string;
  status?: 'pending' | 'reached';
}

export const createGoal = async (payload: CreateGoalPayload): Promise<Goal> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/goals`, {
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
    throw new Error(errorData.message || 'Failed to create goal');
  }
  return response.json();
};

export const getGoalsByWorkspaceId = async (workspaceId: string): Promise<Goal[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/goals?workspaceId=${workspaceId}`, {
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
    throw new Error(errorData.message || `Failed to fetch goals for workspace ID ${workspaceId}`);
  }
  return response.json();
};

export const getGoalById = async (id: string): Promise<Goal> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
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
    throw new Error(errorData.message || `Failed to fetch goal with ID ${id}`);
  }
  return response.json();
};

export const updateGoal = async (id: string, payload: UpdateGoalPayload): Promise<Goal> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
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
    throw new Error(errorData.message || `Failed to update goal with ID ${id}`);
  }
  return response.json();
};

export const deleteGoal = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
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
    throw new Error(errorData.message || `Failed to delete goal with ID ${id}`);
  }
};
