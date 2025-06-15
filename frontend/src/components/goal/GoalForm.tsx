import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { createGoal, updateGoal, getGoalById, type Goal } from "../../api/goal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface GoalFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { workspaceId, goalId } = useParams<{ workspaceId: string; goalId: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"pending" | "reached">("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalId) {
      const fetchGoal = async () => {
        setLoading(true);
        try {
          const fetchedGoal = await getGoalById(goalId);
          setGoal(fetchedGoal);
          setName(fetchedGoal.name);
          setDescription(fetchedGoal.description || "");
          setDeadline(
            fetchedGoal.deadline
              ? new Date(fetchedGoal.deadline).toISOString().split("T")[0]
              : ""
          );
          setStatus(fetchedGoal.status);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchGoal();
    }
  }, [goalId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!workspaceId) {
      setError("Workspace ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        workspaceId,
        name,
        description: description || undefined,
        deadline: deadline ? deadline + "T00:00:00.000Z" : undefined,
        status,
      };

      if (goal) {
        await updateGoal(goal.id, payload);
      } else {
        await createGoal(payload);
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
        <CardTitle>{goal ? t("editGoal") : t("createGoal")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("goalName")}</Label>
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
            <Label htmlFor="description">{t("goalDescription")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="deadline">{t("deadline")}</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="status">{t("status")}</Label>
            <Select
              value={status}
              onValueChange={(value: "pending" | "reached") => setStatus(value)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  {t("goalStatus.pending")}
                </SelectItem>
                <SelectItem value="reached">
                  {t("goalStatus.reached")}
                </SelectItem>
              </SelectContent>
            </Select>
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
                : goal
                ? t("workspace.saveChanges")
                : t("workspace.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GoalForm;
