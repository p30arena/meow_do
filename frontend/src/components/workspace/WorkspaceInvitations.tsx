import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { respondToShareInvitation, getMyInvitations, type WorkspaceInvitation } from '../../api/share';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const WorkspaceInvitations: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await getMyInvitations();
        setInvitations(response.data.filter(invitation => invitation.status === 'pending'));
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
      // Remove the invitation from the list after response
      setInvitations(prev => prev.filter(inv => inv.id !== shareId));
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

  if (invitations.length === 0) {
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
        {invitations.map(invitation => (
          <div key={invitation.id} className="mb-4">
            <h3 className="text-lg font-medium mb-2">{t('workspace.invitationFor', { name: invitation.workspace.name })}</h3>
            <p className="text-sm text-muted-foreground mb-2">{invitation.workspace.description || t('workspace.noDescription')}</p>
            <div className="flex justify-between items-center p-2 border rounded-md">
              <div>
                <p>{t('workspace.invitedBy')}: {invitation.invitedBy.username}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleRespond(invitation.workspaceId, invitation.id, 'accept')}>{t('workspace.accept')}</Button>
                <Button variant="destructive" onClick={() => handleRespond(invitation.workspaceId, invitation.id, 'decline')}>{t('workspace.decline')}</Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WorkspaceInvitations;
