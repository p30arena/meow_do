import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

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
}

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

export const createWorkspace = async (payload: CreateWorkspacePayload): Promise<Workspace> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized'); // Throw an error to stop further execution
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create workspace');
  }
  return response.json();
};

export const getUniqueGroupNames = async (): Promise<string[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/groups/unique`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch unique group names');
  }

  return response.json();
};

export const getWorkspaces = async (): Promise<Workspace[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces`, {
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
    throw new Error(errorData.message || 'Failed to fetch workspaces');
  }
  return response.json();
};

export const getWorkspaceById = async (id: string): Promise<Workspace> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
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
    throw new Error(errorData.message || `Failed to fetch workspace with ID ${id}`);
  }
  return response.json();
};

export const updateWorkspace = async (id: string, payload: UpdateWorkspacePayload): Promise<Workspace> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
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
    throw new Error(errorData.message || `Failed to update workspace with ID ${id}`);
  }
  return response.json();
};

export const deleteWorkspace = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
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
    throw new Error(errorData.message || `Failed to delete workspace with ID ${id}`);
  }
};
