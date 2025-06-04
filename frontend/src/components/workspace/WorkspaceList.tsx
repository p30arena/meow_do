import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkspaces, deleteWorkspace, type Workspace } from '../../api/workspace';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'; // Import AlertDialog components

interface WorkspaceListProps {
  onCreateNew: () => void;
  onSelectWorkspace: (workspace: Workspace) => void;
  onEditWorkspace: (workspace: Workspace) => void;
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({ onCreateNew, onSelectWorkspace, onEditWorkspace }) => {
  const { t } = useTranslation();
  const { token } = useAuth(); // Get token from useAuth
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null); // State to hold workspace to delete

  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) { // Only fetch if token is available
      fetchWorkspaces();
    }
  }, [token]); // Re-run when token changes

  const confirmDelete = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
  };

  const executeDelete = async () => {
    if (workspaceToDelete) {
      setLoading(true);
      setError(null);
      try {
        await deleteWorkspace(workspaceToDelete.id);
        fetchWorkspaces(); // Re-fetch workspaces after deletion
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setWorkspaceToDelete(null); // Clear the workspace to delete
      }
    }
  };

  if (loading) {
    return <div>{t('workspace.loadingWorkspaces')}</div>;
  }

  if (error) {
    return <div>{t('workspace.error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('workspace.workspaces')}</h2>
      {workspaces.length === 0 ? (
        <p>{t('workspace.noWorkspacesYet')}</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} onClick={() => onSelectWorkspace(workspace)} className="cursor-pointer w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{workspace.description || t('noDescription')}</p>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEditWorkspace(workspace); }}>{t('workspace.edit')}</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(workspace); }}
                      >
                        {t('workspace.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    {workspaceToDelete && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('workspace.confirmDelete', { workspaceName: workspaceToDelete.name })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('confirmDeleteDescription')} {/* Assuming a generic description key */}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={executeDelete}>{t('confirm')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew}>{t('workspace.createWorkspace')}</Button>
    </div>
  );
};

export default WorkspaceList;
