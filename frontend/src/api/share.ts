import { request } from './client';

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

export const shareWorkspace = async (workspaceId: string, payload: ShareWorkspacePayload): Promise<{ message: string; share: unknown; permission: unknown }> =>
  request(`/workspaces-sharing/${workspaceId}/share`, {
    method: 'POST',
    body: payload,
    errorMessage: 'Failed to share workspace',
  });

export const respondToShareInvitation = async (workspaceId: string, shareId: string, payload: RespondToInvitationPayload): Promise<{ message: string; share: unknown }> =>
  request(`/workspaces-sharing/${workspaceId}/share/${shareId}/respond`, {
    method: 'POST',
    body: payload,
    errorMessage: 'Failed to respond to share invitation',
  });

export const updatePermissions = async (workspaceId: string, userId: string, payload: UpdatePermissionsPayload): Promise<{ message: string; permission: unknown }> =>
  request(`/workspaces-sharing/${workspaceId}/permissions/${userId}`, {
    method: 'PUT',
    body: payload,
    errorMessage: 'Failed to update permissions',
  });

export const revokeAccess = async (workspaceId: string, userId: string): Promise<{ message: string }> =>
  request(`/workspaces-sharing/${workspaceId}/share/${userId}`, {
    method: 'DELETE',
    errorMessage: 'Failed to revoke access',
  });

export const getSharedUsers = async (workspaceId: string): Promise<SharedUser[]> =>
  request<SharedUser[]>(`/workspaces-sharing/${workspaceId}/shared-users`, {
    errorMessage: 'Failed to fetch shared users',
  });

export interface WorkspaceInvitation {
  shareId: string;
  workspaceId: string;
  sharedWithUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  workspace: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    groupName: string | null;
    createdAt: string;
    updatedAt: string;
  };
  invitedBy: {
    id: string;
    username: string;
  };
}

export const getMyInvitations = async (): Promise<{ status: string; data: WorkspaceInvitation[] }> =>
  request('/workspaces-sharing/my-invitations', {
    errorMessage: 'Failed to fetch invitations',
  });
