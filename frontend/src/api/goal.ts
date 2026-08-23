import { request } from './client';

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
  deadline?: string; // ISO date string
  status?: 'pending' | 'reached';
}

export interface UpdateGoalPayload {
  name?: string;
  description?: string;
  deadline?: string; // ISO date string
  status?: 'pending' | 'reached';
}

export const createGoal = async (payload: CreateGoalPayload): Promise<Goal> =>
  request<Goal>('/goals', { method: 'POST', body: payload, errorMessage: 'Failed to create goal' });

export const getGoalsByWorkspaceId = async (workspaceId: string): Promise<Goal[]> =>
  request<Goal[]>(`/goals?workspaceId=${workspaceId}`, {
    errorMessage: `Failed to fetch goals for workspace ID ${workspaceId}`,
  });

export const getGoalById = async (id: string): Promise<Goal> =>
  request<Goal>(`/goals/${id}`, {
    errorMessage: `Failed to fetch goal with ID ${id}`,
  });

export const updateGoal = async (id: string, payload: UpdateGoalPayload): Promise<Goal> =>
  request<Goal>(`/goals/${id}`, {
    method: 'PUT',
    body: payload,
    errorMessage: `Failed to update goal with ID ${id}`,
  });

export const deleteGoal = async (id: string): Promise<void> =>
  request<void>(`/goals/${id}`, {
    method: 'DELETE',
    errorMessage: `Failed to delete goal with ID ${id}`,
  });
