import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkspaces, deleteWorkspace, updateWorkspace, type Workspace } from '../../api/workspace';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input'; // Import Input component
import { Label } from '../ui/label'; // Import Label component
import { XCircle, Pencil } from 'lucide-react'; // Import XCircle and Pencil icons
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
import { WorkspaceSharing } from './WorkspaceSharing';

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
  const [editingGroup, setEditingGroup] = useState<string | null>(null); // State to track which group is being edited
  const [editedGroupName, setEditedGroupName] = useState<string>(''); // State for the edited group name
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null); // State for selected workspace

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

  const handleEditGroup = (groupName: string) => {
    setEditingGroup(groupName);
    setEditedGroupName(groupName);
  };

  const handleSaveGroupRename = async (oldGroupName: string) => {
    if (editedGroupName.trim() === '' || editedGroupName.trim() === oldGroupName) {
      setEditingGroup(null); // Cancel edit if name is empty or unchanged
      return;
    }

    if (groups.includes(editedGroupName.trim())) {
      setError(t('workspace.groupNameExists')); // New i18n key needed
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const workspacesInGroup = workspaces.filter(ws => ws.groupName === oldGroupName);
      for (const ws of workspacesInGroup) {
        await updateWorkspace(ws.id, { groupName: editedGroupName.trim() });
      }
      fetchWorkspaces(); // Re-fetch all workspaces to update UI
      setEditingGroup(null);
      setEditedGroupName('');
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

  const handleWorkspaceSelect = (workspace: Workspace) => {
    onSelectWorkspace(workspace);
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
                {editingGroup === groupName ? (
                  <div className="flex items-center gap-2 flex-grow">
                    <Input
                      value={editedGroupName}
                      onChange={(e) => setEditedGroupName(e.target.value)}
                      onBlur={() => handleSaveGroupRename(groupName)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveGroupRename(groupName);
                        }
                      }}
                      className="text-xl font-semibold"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleSaveGroupRename(groupName)}>
                      <span className="sr-only">{t('workspace.saveRename')}</span>
                      <Pencil className="h-5 w-5" /> {/* Reusing Pencil for save icon */}
                    </Button>
                  </div>
                ) : (
                  <h3 className="text-xl font-semibold">
                    {groupName === 'Ungrouped' ? t('workspace.ungrouped') : groupName}
                  </h3>
                )}
                {groupName !== 'Ungrouped' && (
                  <div className="flex gap-2">
                    {editingGroup !== groupName && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditGroup(groupName)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Pencil className="h-5 w-5" />
                        <span className="sr-only">{t('workspace.editGroup')}</span>
                      </Button>
                    )}
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
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 justify-start min-h-[100px] p-2 border border-dashed rounded-md border-gray-300 dark:border-gray-700">
                {groupedWorkspaces[groupName]?.map((workspace) => (
                  <Card
                    key={workspace.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, workspace.id)}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className="cursor-pointer w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(30%-0.7rem)]"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">{workspace.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {/* Placeholder for shared workspace indicator */}
                        {workspace.hasRunningTask && (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" title={t('workspace.runningTask')}></span>
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{workspace.description || t('workspace.noDescription')}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>{t('workspace.goals')}: {workspace.goalCount ?? 0}</p>
                        <p>{t('workspace.tasks')}: {workspace.taskCount ?? 0}</p>
                        <p>{t('workspace.progress')}: {workspace.totalProgress != null && !isNaN(workspace.totalProgress) ? `${workspace.totalProgress.toFixed(0)}%` : '0%'}</p>
                        {workspace.groupName && (
                          <p className="mt-1">
                            {t('workspace.group')}: {workspace.groupName}
                          </p>
                        )}
                      </div>
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedWorkspace(workspace); }}>
                              {t('workspace.share')}
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
                                    <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setWorkspaceToDelete(null); setError(null); }}>{t('cancel')}</AlertDialogCancel>
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
      
      {selectedWorkspace && (
        <AlertDialog open={!!selectedWorkspace} onOpenChange={() => setSelectedWorkspace(null)}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('workspace.shareWorkspace', { name: selectedWorkspace.name })}</AlertDialogTitle>
            </AlertDialogHeader>
            <WorkspaceSharing 
              workspaceId={selectedWorkspace.id} 
              isOwner={true} // Placeholder, adjust based on actual API data
            />
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default WorkspaceList;
