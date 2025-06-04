import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  createWorkspace,
  updateWorkspace,
  type Workspace,
} from "../../api/workspace";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || "");
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (workspace) {
        // Update existing workspace
        await updateWorkspace(workspace.id, { name, description });
      } else {
        // Create new workspace
        await createWorkspace({ name, description });
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
