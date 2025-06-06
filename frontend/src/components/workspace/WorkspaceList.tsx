import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkspaces, deleteWorkspace, updateWorkspace, type Workspace } from '../../api/workspace';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input'; // Import Input component
import { Label } from '../ui/label'; // Import Label component
import { XCircle } from 'lucide-react'; // Import XCircle icon for deleting groups
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
} from '../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

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
  const [groups, setGroups] = useState<string[]>([]); // State to manage frontend groups
  const [newGroupName, setNewGroupName] = useState<string>(''); // State for new group input
  const [draggingWorkspaceId, setDraggingWorkspaceId] = useState<string | null>(null); // State for dragged workspace ID

  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
      // Extract unique group names from fetched workspaces
      const uniqueGroups = Array.from(new Set(data.map(ws => ws.groupName).filter(Boolean) as string[]));
      setGroups(['Ungrouped', ...uniqueGroups.sort()]); // Add 'Ungrouped' and sort
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

  const updateWorkspaceGroup = async (workspaceId: string, groupName: string | null) => {
    setLoading(true);
    setError(null);
    try {
      await updateWorkspace(workspaceId, { groupName });
      fetchWorkspaces(); // Re-fetch workspaces after update
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, workspaceId: string) => {
    setDraggingWorkspaceId(workspaceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', workspaceId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetGroupName: string) => {
    e.preventDefault();
    const workspaceId = e.dataTransfer.getData('text/plain');
    if (workspaceId) {
      const newGroupName = targetGroupName === 'Ungrouped' ? null : targetGroupName;
      updateWorkspaceGroup(workspaceId, newGroupName);
    }
    setDraggingWorkspaceId(null);
  };

  const handleAddGroup = () => {
    if (newGroupName.trim() && !groups.includes(newGroupName.trim())) {
      setGroups(prev => [...prev, newGroupName.trim()].sort());
      setNewGroupName('');
    }
  };

  const handleDeleteGroup = async (groupToDelete: string) => {
    // Find all workspaces in this group and set their groupName to null
    const workspacesInGroup = workspaces.filter(ws => ws.groupName === groupToDelete);
    setLoading(true);
    setError(null);
    try {
      for (const ws of workspacesInGroup) {
        await updateWorkspace(ws.id, { groupName: null });
      }
      fetchWorkspaces(); // Re-fetch all workspaces to update UI
      setGroups(prev => prev.filter(group => group !== groupToDelete)); // Remove group from frontend state
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const groupedWorkspaces = workspaces.reduce((acc, workspace) => {
    const group = workspace.groupName || 'Ungrouped';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(workspace);
    return acc;
  }, {} as Record<string, Workspace[]>);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('workspace.workspaces')}</h2>

      {/* Group Creation UI */}
      <div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <h3 className="text-xl font-semibold mb-3">{t('workspace.createGroup')}</h3>
        <div className="flex gap-2 items-end">
          <div className="grid gap-1.5 flex-grow">
            <Label htmlFor="new-group-name">{t('workspace.groupName')}</Label>
            <Input
              id="new-group-name"
              placeholder={t('workspace.enterGroupName')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddGroup();
                }
              }}
            />
          </div>
          <Button onClick={handleAddGroup}>{t('workspace.addGroup')}</Button>
        </div>
      </div>

      {workspaces.length === 0 && groups.length <= 1 ? ( // Only 'Ungrouped' exists initially
        <p>{t('workspace.noWorkspacesYet')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((groupName) => (
            <div
              key={groupName}
              className={`border rounded-lg p-4 ${draggingWorkspaceId ? 'bg-accent/50' : 'bg-card'} transition-colors duration-200`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, groupName)}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {groupName === 'Ungrouped' ? t('workspace.ungrouped') : groupName}
                </h3>
                {groupName !== 'Ungrouped' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="sr-only">{t('workspace.deleteGroup')}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('workspace.confirmDeleteGroup', { groupName: groupName })}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('confirmDeleteDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteGroup(groupName)}>{t('confirm')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex flex-wrap gap-4 justify-start min-h-[100px] p-2 border border-dashed rounded-md border-gray-300 dark:border-gray-700">
                {groupedWorkspaces[groupName]?.map((workspace) => (
                  <Card
                    key={workspace.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, workspace.id)}
                    onClick={() => onSelectWorkspace(workspace)}
                    className="cursor-pointer w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(30%-0.7rem)]"
                  >
                    <CardHeader>
                      <CardTitle>{workspace.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{workspace.description || t('workspace.noDescription')}</p>
                      <p className="text-sm text-gray-500">
                        {t('workspace.goals')}: {workspace.goalCount ?? 0}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('workspace.tasks')}: {workspace.taskCount ?? 0}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('workspace.progress')}: {workspace.totalProgress != null && !isNaN(workspace.totalProgress) ? `${workspace.totalProgress.toFixed(0)}%` : '0%'}
                      </p>
                      {workspace.groupName && (
                        <p className="text-sm text-gray-500 mt-2">
                          {t('workspace.group')}: {workspace.groupName}
                        </p>
                      )}
                      <div className="mt-4 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t('workspace.openMenu')}</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditWorkspace(workspace); }}>
                              {t('workspace.edit')}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(workspace); }}
                                  className="text-red-600"
                                >
                                  {t('workspace.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {workspaceToDelete && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('workspace.confirmDelete', { workspaceName: workspaceToDelete.name })}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('confirmDeleteDescription')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); executeDelete(); }}>{t('confirm')}</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {groupedWorkspaces[groupName]?.length === 0 && (
                  <p className="text-gray-500 text-center w-full py-4">{t('workspace.dragWorkspacesHere')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew}>{t('workspace.createWorkspace')}</Button>
    </div>
  );
};

export default WorkspaceList;
