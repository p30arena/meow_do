import { request } from './client';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  groupName?: string | null; // New: Optional group name
  createdAt: string;
  updatedAt: string;
  goalCount?: number;
  taskCount?: number;
  totalProgress?: number;
  hasRunningTask?: boolean;
  isShared?: boolean; // Indicates if the workspace is shared
}

export interface WorkspaceGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const getWorkspaceGroups = async (): Promise<WorkspaceGroup[]> =>
  request<WorkspaceGroup[]>('/workspaces/groups', { errorMessage: 'Failed to fetch workspace groups' });

export const createWorkspaceGroup = async (name: string): Promise<WorkspaceGroup> =>
  request<WorkspaceGroup>('/workspaces/groups', {
    method: 'POST',
    body: { name },
    errorMessage: 'Failed to create group',
  });

export const renameWorkspaceGroup = async (id: string, name: string): Promise<WorkspaceGroup> =>
  request<WorkspaceGroup>(`/workspaces/groups/${id}`, {
    method: 'PUT',
    body: { name },
    errorMessage: 'Failed to rename group',
  });

export const deleteWorkspaceGroup = async (id: string): Promise<void> =>
  request<void>(`/workspaces/groups/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete group',
  });

interface CreateWorkspacePayload {
  name: string;
  description?: string;
  groupName?: string | null; // New: Optional group name
}

interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  groupName?: string | null; // New: Optional group name
}

export const createWorkspace = async (payload: CreateWorkspacePayload): Promise<Workspace> =>
  request<Workspace>('/workspaces', {
    method: 'POST',
    body: payload,
    errorMessage: 'Failed to create workspace',
  });

export const getUniqueGroupNames = async (): Promise<string[]> =>
  request<string[]>('/workspaces/groups/unique', {
    errorMessage: 'Failed to fetch unique group names',
  });

export const getWorkspaces = async (): Promise<Workspace[]> =>
  request<Workspace[]>('/workspaces', { errorMessage: 'Failed to fetch workspaces' });

export const getWorkspaceById = async (id: string): Promise<Workspace> =>
  request<Workspace>(`/workspaces/${id}`, {
    errorMessage: `Failed to fetch workspace with ID ${id}`,
  });

export const updateWorkspace = async (id: string, payload: UpdateWorkspacePayload): Promise<Workspace> =>
  request<Workspace>(`/workspaces/${id}`, {
    method: 'PUT',
    body: payload,
    errorMessage: `Failed to update workspace with ID ${id}`,
  });

export const deleteWorkspace = async (id: string): Promise<void> =>
  request<void>(`/workspaces/${id}`, {
    method: 'DELETE',
    errorMessage: `Failed to delete workspace with ID ${id}`,
  });
