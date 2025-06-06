import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  createWorkspace,
  updateWorkspace,
  getUniqueGroupNames, // Import the new API function
  type Workspace,
} from "../../api/workspace";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const EMPTY_VALUE = "$null"; // Define magic string for no group

interface WorkspaceFormProps {
  workspace?: Workspace; // Optional, for editing existing workspace
  onSuccess: () => void;
  onCancel: () => void;
}

const WorkspaceForm: React.FC<WorkspaceFormProps> = ({
  workspace,
  onSuccess,
  onCancel,
}: WorkspaceFormProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(workspace?.name || "");
  const [description, setDescription] = useState(workspace?.description || "");
  const [groupName, setGroupName] = useState<string>(workspace?.groupName || EMPTY_VALUE); // Initialize with EMPTY_VALUE
  const [availableGroups, setAvailableGroups] = useState<string[]>([]); // New state for available groups
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || "");
      setGroupName(workspace.groupName || EMPTY_VALUE); // Initialize with EMPTY_VALUE
    }
  }, [workspace]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groups = await getUniqueGroupNames();
        setAvailableGroups(groups);
      } catch (err: any) {
        console.error("Failed to fetch unique group names:", err);
        // Optionally set an error state for the user
      }
    };
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { 
        name, 
        description, 
        groupName: groupName === EMPTY_VALUE ? null : groupName.trim() === '' ? null : groupName.trim() 
      };
      if (workspace) {
        // Update existing workspace
        await updateWorkspace(workspace.id, payload);
      } else {
        // Create new workspace
        await createWorkspace(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>
          {workspace
            ? t("workspace.editWorkspace")
            : t("workspace.createWorkspace")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("workspace.workspaceName")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="description">
              {t("workspace.workspaceDescription")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="groupName">{t("workspace.groupName")}</Label>
            <Select onValueChange={setGroupName} value={groupName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("workspace.optionalGroupName")} />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
                {groupName !== EMPTY_VALUE && !availableGroups.includes(groupName) && (
                  <SelectItem key={groupName} value={groupName}>
                    {groupName} (New)
                  </SelectItem>
                )}
                <SelectItem value={EMPTY_VALUE}>{t("workspace.noGroup")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="groupNameInput"
              type="text"
              value={groupName === EMPTY_VALUE ? "" : groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
              placeholder={t("workspace.typeNewGroup")}
              className="mt-2"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">
              {t("error")}: {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {t("workspace.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? t("workspace.saving")
                : workspace
                ? t("workspace.saveChanges")
                : t("workspace.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default WorkspaceForm;
