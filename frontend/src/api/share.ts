import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

export interface ShareWorkspacePayload {
  identifier: string;
  canList?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface RespondToInvitationPayload {
  response: 'accept' | 'decline';
}

export interface UpdatePermissionsPayload {
  resourceId: string;
  resourceType: 'workspace' | 'goal' | 'task';
  canList: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddTask?: boolean;
  canSubmitRecord?: boolean;
}

export interface SharedUser {
  userId: string;
  username: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedByUserId: string;
  permission: {
    id: string;
    userId: string;
    resourceId: string;
    resourceType: 'workspace' | 'goal' | 'task';
    canList: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAddTask: boolean;
    canSubmitRecord: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export const shareWorkspace = async (workspaceId: string, payload: ShareWorkspacePayload): Promise<{ message: string; share: any; permission: any }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to share workspace');
  }

  return response.json();
};

export const respondToShareInvitation = async (workspaceId: string, shareId: string, payload: RespondToInvitationPayload): Promise<{ message: string; share: any }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/share/${shareId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to respond to share invitation');
  }

  return response.json();
};

export const updatePermissions = async (workspaceId: string, userId: string, payload: UpdatePermissionsPayload): Promise<{ message: string; permission: any }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/permissions/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update permissions');
  }

  return response.json();
};

export const revokeAccess = async (workspaceId: string, userId: string): Promise<{ message: string }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/share/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to revoke access');
  }

  return response.json();
};

export const getSharedUsers = async (workspaceId: string): Promise<SharedUser[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/shared-users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch shared users');
  }

  return response.json();
};
