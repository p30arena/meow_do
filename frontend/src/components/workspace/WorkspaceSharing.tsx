import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { shareWorkspace, getSharedUsers, updatePermissions, revokeAccess, type SharedUser } from '../../api/share';

interface WorkspaceSharingProps {
  workspaceId: string;
  isOwner: boolean;
  workspaceName?: string;
}

export const WorkspaceSharing: React.FC<WorkspaceSharingProps> = ({ workspaceId, isOwner, workspaceName }) => {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [canList, setCanList] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await getSharedUsers(workspaceId);
        setSharedUsers(users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shared users');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedUsers();
  }, [workspaceId]);

  const handleShareWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = { identifier, canList, canEdit, canDelete };
      const result = await shareWorkspace(workspaceId, payload);
      setSuccessMessage(result.message);
      setIdentifier('');
      setCanList(true);
      setCanEdit(false);
      setCanDelete(false);
      // Refresh shared users list
      const users = await getSharedUsers(workspaceId);
      setSharedUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (userId: string, permission: any) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        resourceId: permission.resourceId,
        resourceType: permission.resourceType as 'workspace' | 'goal' | 'task',
        canList: permission.canList,
        canEdit: permission.canEdit,
        canDelete: permission.canDelete,
        canAddTask: permission.canAddTask,
        canSubmitRecord: permission.canSubmitRecord,
      };
      const result = await updatePermissions(workspaceId, userId, payload);
      setSuccessMessage(result.message);
      // Refresh shared users list
      const users = await getSharedUsers(workspaceId);
      setSharedUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await revokeAccess(workspaceId, userId);
      setSuccessMessage(result.message);
      // Refresh shared users list
      const users = await getSharedUsers(workspaceId);
      setSharedUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (userId: string, field: string, value: boolean) => {
    setSharedUsers(users => users.map(user => {
      if (user.userId === userId && user.permission) {
        return {
          ...user,
          permission: {
            ...user.permission,
            [field]: value,
          },
        };
      }
      return user;
    }));
  };

  return (
    <div className="space-y-6">
      {isOwner && (
        <Card>
            <CardHeader>
              <CardTitle>{t('workspace.shareWorkspace', { name: workspaceName || "" })}</CardTitle>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleShareWorkspace} className="space-y-4">
              <div>
                <Label htmlFor="identifier">{t('workspace.shareWith')}</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('workspace.enterUsernameOrEmail')}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canList"
                    checked={canList}
                    onCheckedChange={(checked) => setCanList(checked === true)}
                  />
                  <Label htmlFor="canList">{t('workspace.permissions.canList')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEdit"
                    checked={canEdit}
                    onCheckedChange={(checked) => setCanEdit(checked === true)}
                  />
                  <Label htmlFor="canEdit">{t('workspace.permissions.canEdit')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canDelete"
                    checked={canDelete}
                    onCheckedChange={(checked) => setCanDelete(checked === true)}
                  />
                  <Label htmlFor="canDelete">{t('workspace.permissions.canDelete')}</Label>
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? t('workspace.sharing') : t('workspace.share')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.sharedUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{t('workspace.loading')}</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : successMessage ? (
            <p className="text-green-500">{successMessage}</p>
          ) : sharedUsers.length === 0 ? (
            <p>{t('workspace.noSharedUsers')}</p>
          ) : (
            <div className="space-y-4">
              {sharedUsers.map(user => (
                <div key={user.userId} className="border-b pb-4">
                  <p className="font-semibold">{user.username} ({user.email})</p>
                  <p className="text-sm text-gray-500">Status: {user.status}</p>
                  {user.permission && isOwner && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`canList-${user.userId}`}
                          checked={user.permission.canList}
                          onCheckedChange={(checked) => handlePermissionChange(user.userId, 'canList', checked === true)}
                        />
                        <Label htmlFor={`canList-${user.userId}`}>{t('workspace.permissions.canList')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`canEdit-${user.userId}`}
                          checked={user.permission.canEdit}
                          onCheckedChange={(checked) => handlePermissionChange(user.userId, 'canEdit', checked === true)}
                        />
                        <Label htmlFor={`canEdit-${user.userId}`}>{t('workspace.permissions.canEdit')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`canDelete-${user.userId}`}
                          checked={user.permission.canDelete}
                          onCheckedChange={(checked) => handlePermissionChange(user.userId, 'canDelete', checked === true)}
                        />
                        <Label htmlFor={`canDelete-${user.userId}`}>{t('workspace.permissions.canDelete')}</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdatePermissions(user.userId, user.permission)}
                          disabled={loading}
                        >
                          {t('workspace.updatePermissions')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeAccess(user.userId)}
                          disabled={loading}
                        >
                          {t('workspace.revokeAccess')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
