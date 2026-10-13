import { request } from './client';

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignee {
  id: string;
  username: string;
  email: string;
}

export interface CardDetails {
  task: import('./task').Task;
  labels: Label[];
  assignees: Assignee[];
}

export const listLabels = async (goalId: string): Promise<Label[]> =>
  request<Label[]>(`/goals/${goalId}/labels`, { errorMessage: 'Failed to fetch labels' });

export const createLabel = async (goalId: string, payload: { name: string; color: string }): Promise<Label> =>
  request<Label>(`/goals/${goalId}/labels`, { method: 'POST', body: payload, errorMessage: 'Failed to create label' });

export const deleteLabel = async (labelId: string): Promise<void> =>
  request<void>(`/labels/${labelId}`, { method: 'DELETE', errorMessage: 'Failed to delete label' });

export const assignLabel = async (taskId: string, labelId: string): Promise<void> =>
  request<void>(`/tasks/${taskId}/labels`, { method: 'POST', body: { labelId }, errorMessage: 'Failed to assign label' });

export const unassignLabel = async (taskId: string, labelId: string): Promise<void> =>
  request<void>(`/tasks/${taskId}/labels/${labelId}`, { method: 'DELETE', errorMessage: 'Failed to remove label' });

export const listAssignees = async (taskId: string): Promise<Assignee[]> =>
  request<Assignee[]>(`/tasks/${taskId}/assignees`, { errorMessage: 'Failed to fetch assignees' });

export const assignUser = async (taskId: string, userId: string): Promise<void> =>
  request<void>(`/tasks/${taskId}/assignees`, { method: 'POST', body: { userId }, errorMessage: 'Failed to assign user' });

export const unassignUser = async (taskId: string, userId: string): Promise<void> =>
  request<void>(`/tasks/${taskId}/assignees/${userId}`, { method: 'DELETE', errorMessage: 'Failed to remove assignee' });

export const getCardDetails = async (taskId: string): Promise<CardDetails> =>
  request<CardDetails>(`/tasks/${taskId}/card`, { errorMessage: 'Failed to fetch card details' });
