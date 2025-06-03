import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkspaces, type Workspace } from '../../api/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface WorkspaceListProps {
  onCreateNew: () => void;
  onSelectWorkspace: (workspace: Workspace) => void;
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({ onCreateNew, onSelectWorkspace }) => {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchWorkspaces();
  }, []);

  if (loading) {
    return <div>{t('loadingWorkspaces')}</div>;
  }

  if (error) {
    return <div>{t('error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('workspaces')}</h2>
      {workspaces.length === 0 ? (
        <p>{t('noWorkspacesYet')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} onClick={() => onSelectWorkspace(workspace)} className="cursor-pointer">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{workspace.description || t('noDescription')}</p>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); /* handle edit */ }}>{t('edit')}</Button>
                  <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); /* handle delete */ }}>{t('delete')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew}>{t('createWorkspace')}</Button>
    </div>
  );
};

export default WorkspaceList;
