import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkspaces, type Workspace } from '../../api/workspace';
import { respondToShareInvitation, getSharedUsers, type SharedUser } from '../../api/share';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const WorkspaceInvitations: React.FC = () => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const currentUserId = user?.id || '';
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sharedUsers, setSharedUsers] = useState<Record<string, SharedUser[]>>({}); // Map workspace ID to shared users
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const data = await getWorkspaces();
        setWorkspaces(data);

        // Fetch shared users to check for pending invitations for each workspace
        const sharedData: Record<string, SharedUser[]> = {};
        for (const workspace of data) {
          try {
            const users = await getSharedUsers(workspace.id);
            sharedData[workspace.id] = users.filter((user: SharedUser) => user.status === 'pending' && user.userId === currentUserId); // Use current user's ID
          } catch (err) {
            console.error(`Failed to fetch shared users for workspace ${workspace.id}:`, err);
          }
        }
        setSharedUsers(sharedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleRespond = async (workspaceId: string, shareId: string, response: 'accept' | 'decline') => {
    try {
      setLoading(true);
      await respondToShareInvitation(workspaceId, shareId, { response });
      // Refresh data after response
      const data = await getWorkspaces();
      setWorkspaces(data);
      // Update shared users or remove the invitation
      setSharedUsers(prev => {
        const updated = { ...prev };
        if (updated[workspaceId]) {
          updated[workspaceId] = updated[workspaceId].filter(user => user.userId !== currentUserId || user.status !== 'pending');
        }
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>{t('workspace.loadingInvitations')}</div>;
  }

  if (error) {
    return <div>{t('workspace.error')}: {error}</div>;
  }

  // Filter workspaces to show only those with pending invitations for the current user
  const pendingInvitations = Object.entries(sharedUsers).filter(([_, users]) => users.length > 0);

  if (pendingInvitations.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('workspace.invitations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('workspace.noPendingInvitations')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t('workspace.invitations')}</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvitations.map(([workspaceId, users]) => {
          const workspace = workspaces.find(w => w.id === workspaceId);
          if (!workspace) return null;

          return (
            <div key={workspaceId} className="mb-4">
              <h3 className="text-lg font-medium mb-2">{t('workspace.invitationFor', { name: workspace.name })}</h3>
              <p className="text-sm text-muted-foreground mb-2">{workspace.description || t('workspace.noDescription')}</p>
              {users.map(user => (
                <div key={user.userId} className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <p>{t('workspace.invitedBy')}: {user.invitedByUserId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleRespond(workspaceId, user.userId, 'accept')}>{t('workspace.accept')}</Button>
                    <Button variant="destructive" onClick={() => handleRespond(workspaceId, user.userId, 'decline')}>{t('workspace.decline')}</Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WorkspaceInvitations;
