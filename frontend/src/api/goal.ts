import { API_BASE_URL } from '../config';

export interface Goal {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  deadline?: string; // ISO date string
  status: 'pending' | 'reached';
  createdAt: string;
  updatedAt: string;
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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create goal');
  }
  return response.json();
};

export const getGoalsByWorkspaceId = async (workspaceId: string): Promise<Goal[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/goals`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to delete goal with ID ${id}`);
  }
};
