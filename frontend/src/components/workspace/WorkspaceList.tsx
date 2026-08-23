import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  createWorkspaceGroup,
  deleteWorkspaceGroup,
  getWorkspaceGroups,
  getWorkspaces,
  renameWorkspaceGroup,
  deleteWorkspace,
  updateWorkspace,
  type Workspace,
} from "../../api/workspace";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input"; // Import Input component
import { Label } from "@/components/ui/label";
import { MoreVertical, Pencil, XCircle } from "lucide-react";
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
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { WorkspaceSharing } from "./WorkspaceSharing";
import DescriptionViewer from "../common/DescriptionViewer";
interface WorkspaceGroup {
  id: string;
  name: string;
}

interface WorkspaceListProps {
  onCreateNew: () => void;
  onEditWorkspace: (workspace: Workspace) => void;
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  onCreateNew,
  onEditWorkspace,
}) => {
  const { t } = useTranslation();
  const { token } = useAuth(); // Get token from useAuth
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  ); // State to hold workspace to delete
  const [groups, setGroups] = useState<string[]>([]); // State to manage frontend groups
  const [groupRecords, setGroupRecords] = useState<WorkspaceGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>(""); // State for new group input
  const [draggingWorkspaceId, setDraggingWorkspaceId] = useState<string | null>(
    null,
  ); // State for dragged workspace ID
  const [editingGroup, setEditingGroup] = useState<string | null>(null); // State to track which group is being edited
  const [editedGroupName, setEditedGroupName] = useState<string>(""); // State for the edited group name
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null); // Workspace shown in the share dialog
  const fetchWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, persistedGroups] = await Promise.all([getWorkspaces(), getWorkspaceGroups()]);
      setWorkspaces(data);
      setGroupRecords(persistedGroups);
      const workspaceGroupNames = data.map((ws) => ws.groupName).filter(Boolean) as string[];
      const uniqueGroups = Array.from(new Set([...persistedGroups.map((group) => group.name), ...workspaceGroupNames]));
      setGroups(["Ungrouped", ...uniqueGroups.sort()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void fetchWorkspaces();
  }, [token]);
  const updateWorkspaceGroup = async (
    workspaceId: string,
    groupName: string | null,
  ) => {
    setLoading(true);
    setError(null);
    try {
      await updateWorkspace(workspaceId, { groupName });
      await fetchWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
      setLoading(false);
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    workspaceId: string,
  ) => {
    setDraggingWorkspaceId(workspaceId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", workspaceId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetGroupName: string,
  ) => {
    e.preventDefault();
    const workspaceId = e.dataTransfer.getData("text/plain");
    if (workspaceId) {
      const newGroupName =
        targetGroupName === "Ungrouped" ? null : targetGroupName;
      updateWorkspaceGroup(workspaceId, newGroupName);
    }
    setDraggingWorkspaceId(null);
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name || groups.includes(name)) return;
    setLoading(true);
    setError(null);
    try {
      await createWorkspaceGroup(name);
      setNewGroupName("");
      await fetchWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupToDelete: string) => {
    const group = groupRecords.find((record) => record.name === groupToDelete);
    if (!group) return;
    setLoading(true);
    setError(null);
    try {
      await deleteWorkspaceGroup(group.id);
      await fetchWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
      setLoading(false);
    }
  };

  const handleEditGroup = (groupName: string) => {
    setEditingGroup(groupName);
    setEditedGroupName(groupName);
  };

  const handleSaveGroupRename = async (oldGroupName: string) => {
    if (
      editedGroupName.trim() === "" ||
      editedGroupName.trim() === oldGroupName
    ) {
      setEditingGroup(null); // Cancel edit if name is empty or unchanged
      return;
    }

    if (groups.includes(editedGroupName.trim())) {
      setError(t("workspace.groupNameExists")); // New i18n key needed
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const group = groupRecords.find((record) => record.name === oldGroupName);
      if (!group) throw new Error(t("workspace.error"));
      await renameWorkspaceGroup(group.id, editedGroupName.trim());
      await fetchWorkspaces();
      setEditingGroup(null);
      setEditedGroupName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
      setLoading(false);
    }
  };

  const confirmDelete = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
  };

  const executeDelete = async () => {
    if (!workspaceToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await deleteWorkspace(workspaceToDelete.id);
      await fetchWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
      setWorkspaceToDelete(null);
    }
  };

  if (loading && workspaces.length === 0) {
    return <div role="status" aria-live="polite">{t("workspace.loadingWorkspaces")}</div>;
  }
  if (error && workspaces.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p>{t("workspace.error")}: {error}</p>
        <Button variant="outline" onClick={() => void fetchWorkspaces()}>{t("retry")}</Button>
      </div>
    );
  }
  const groupedWorkspaces = workspaces.reduce(
    (acc, workspace) => {
      const group = workspace.groupName || "Ungrouped";
      if (!acc[group]) acc[group] = [];
      acc[group].push(workspace);
      return acc;
    },
    {} as Record<string, Workspace[]>,
  );

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span>{t("workspace.error")}: {error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>{t("close")}</Button>
        </div>
      )}
      <h2 className="mb-4 text-2xl font-bold">{t("workspace.workspaces")}</h2>
      <Button className="my-4" onClick={onCreateNew} disabled={loading}>
        {t("workspace.createWorkspace")}
      </Button>

      {/* Group Creation UI */}
      <div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <h3 className="text-xl font-semibold mb-3">
          {t("workspace.createGroup")}
        </h3>
        <div className="flex gap-2 items-end">
          <div className="grid gap-1.5 flex-grow">
            <Label htmlFor="new-group-name">{t("workspace.groupName")}</Label>
            <Input
              id="new-group-name"
              placeholder={t("workspace.enterGroupName")}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddGroup();
                }
              }}
            />
          </div>
          <Button onClick={handleAddGroup}>{t("workspace.addGroup")}</Button>
        </div>
      </div>

      {workspaces.length === 0 && groups.length <= 1 ? ( // Only 'Ungrouped' exists initially
        <p>{t("workspace.noWorkspacesYet")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((groupName) => (
            <div
              key={groupName}
              className={`border rounded-lg p-4 ${draggingWorkspaceId ? "bg-accent/50" : "bg-card"} transition-colors duration-200`}
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
                        if (e.key === "Enter") {
                          handleSaveGroupRename(groupName);
                        }
                      }}
                      className="text-xl font-semibold"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveGroupRename(groupName)}
                    >
                      <span className="sr-only">
                        {t("workspace.saveRename")}
                      </span>
                      <Pencil className="h-5 w-5" />{" "}
                      {/* Reusing Pencil for save icon */}
                    </Button>
                  </div>
                ) : (
                  <h3 className="text-xl font-semibold">
                    {groupName === "Ungrouped"
                      ? t("workspace.ungrouped")
                      : groupName}
                  </h3>
                )}
                {groupName !== "Ungrouped" && (
                  <div className="flex gap-2">
                    {editingGroup !== groupName && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditGroup(groupName)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-5 w-5" />
                        <span className="sr-only">
                          {t("workspace.editGroup")}
                        </span>
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80"
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="sr-only">
                            {t("workspace.deleteGroup")}
                          </span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("workspace.confirmDeleteGroup", {
                              groupName: groupName,
                            })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("confirmDeleteDescription")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteGroup(groupName)}>
                            {t("workspace.deleteGroup")}
                          </AlertDialogAction>
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
                    className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(30%-0.7rem)]"
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="break-words text-lg font-medium">
                        <Link className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={`/workspaces/${workspace.id}`}>
                          {workspace.name}
                        </Link>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {workspace.isShared && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t("workspace.shared")}>
                            <span aria-hidden="true" className="inline-flex h-3 w-3 rounded-full bg-primary" />
                            <span className="sr-only">{t("workspace.shared")}</span>
                          </span>
                        )}
                        {workspace.hasRunningTask && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t("workspace.runningTask")}>
                            <span aria-hidden="true" className="inline-flex h-3 w-3 rounded-full bg-green-500" />
                            <span className="sr-only">{t("workspace.runningTask")}</span>
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DescriptionViewer description={workspace.description} />
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>
                          {t("workspace.goals")}: {workspace.goalCount ?? 0}
                        </p>
                        <p>
                          {t("workspace.tasks")}: {workspace.taskCount ?? 0}
                        </p>
                        <p>
                          {t("workspace.progress")}:{" "}
                          {workspace.totalProgress != null &&
                          !isNaN(workspace.totalProgress)
                            ? `${workspace.totalProgress.toFixed(0)}%`
                            : "0%"}
                        </p>
                        {workspace.groupName && (
                          <p className="mt-1">
                            {t("workspace.group")}: {workspace.groupName}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">
                                {t("workspace.openMenu")}
                              </span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditWorkspace(workspace);
                              }}
                            >
                              {t("workspace.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkspace(workspace);
                              }}
                            >
                              {t("workspace.share")}
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>{t("workspace.moveToGroup")}</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {groups.map((targetGroup) => (
                                  <DropdownMenuItem
                                    key={targetGroup}
                                    onClick={() => void updateWorkspaceGroup(workspace.id, targetGroup === "Ungrouped" ? null : targetGroup)}
                                  >
                                    {targetGroup === "Ungrouped" ? t("workspace.ungrouped") : targetGroup}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(workspace);
                                  }}
                                  className="text-destructive"
                                >
                                  {t("workspace.delete")}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {workspaceToDelete && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("workspace.confirmDelete", { workspaceName: workspaceToDelete.name })}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("confirmDeleteDescription")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => { setWorkspaceToDelete(null); setError(null); }}>
                                      {t("cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => void executeDelete()}
                                    >
                                      {t("workspace.delete")}
                                    </AlertDialogAction>
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
                  <p className="w-full py-4 text-center text-muted-foreground">
                    {t("workspace.dragWorkspacesHere")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorkspace && (
        <AlertDialog
          open={!!selectedWorkspace}
          onOpenChange={() => setSelectedWorkspace(null)}
        >
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("workspace.shareWorkspace", {
                  name: selectedWorkspace.name,
                })}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <WorkspaceSharing
              workspaceId={selectedWorkspace.id}
              isOwner={true} // Placeholder, adjust based on actual API data
              workspaceName={selectedWorkspace.name}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default WorkspaceList;
