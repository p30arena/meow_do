import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { DateTime } from 'luxon';
import { useAuth } from "../../context/AuthContext";
import { createTask, updateTask, getTaskById, type Task } from "../../api/task";
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

interface TaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { goalId, taskId } = useParams<{ goalId: string; taskId: string }>();
  const { user } = useAuth();
  const userTimezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [task, setTask] = useState<Task | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeBudget, setTimeBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<
    "pending" | "started" | "failed" | "done"
  >("pending");
  const [priority, setPriority] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      const fetchTask = async () => {
        setLoading(true);
        try {
          const fetchedTask = await getTaskById(taskId);
          setTask(fetchedTask);
          setName(fetchedTask.name);
          setDescription(fetchedTask.description || "");
          setTimeBudget(fetchedTask.timeBudget.toString());
          setDeadline(
            fetchedTask.deadline
              ? DateTime.fromISO(fetchedTask.deadline, { zone: 'utc' }).setZone(userTimezone).toFormat("yyyy-MM-dd")
              : ""
          );
          setStatus(fetchedTask.status);
          setPriority(fetchedTask.priority?.toString() || "1");
          // isRecurring is always false for now
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchTask();
    }
  }, [taskId, userTimezone]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!goalId) {
      setError("Goal ID is missing.");
      setLoading(false);
      return;
    }

    const parsedTimeBudget = parseInt(timeBudget);
    if (isNaN(parsedTimeBudget) || parsedTimeBudget <= 0) {
      setError(t("taskForm.invalidTimeBudget"));
      setLoading(false);
      return;
    }

    const parsedPriority = parseInt(priority);
    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
      setError(t("tasks.invalidPriority"));
      setLoading(false);
      return;
    }

    let deadlineToSend: string | undefined;
    if (deadline) {
      const localDeadline = DateTime.fromFormat(deadline, "yyyy-MM-dd", { zone: userTimezone });
      if (!localDeadline.isValid) {
        setError(t("tasks.invalidDeadlineFormat"));
        setLoading(false);
        return;
      }
      deadlineToSend = localDeadline.toUTC().toISO();
    }

    try {
      const payload = {
        goalId,
        name,
        description: description || undefined,
        timeBudget: parsedTimeBudget,
        deadline: deadlineToSend,
        status,
        priority: parsedPriority,
        isRecurring: false, // Always set to false
      };

      if (task) {
        await updateTask(task.id, payload);
      } else {
        await createTask(payload);
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
          {task ? t("tasks.editTask") : t("tasks.createTask")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("tasks.taskName")}</Label>
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
            <Label htmlFor="description">{t("tasks.taskDescription")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="timeBudget">
              {t("tasks.timeBudget")} ({t("tasks.minutes")})
            </Label>
            <Input
              id="timeBudget"
              type="number"
              value={timeBudget}
              onChange={(e) => setTimeBudget(e.target.value)}
              required
              min="1"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="deadline">{t("tasks.deadline")}</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="status">{t("tasks.status")}</Label>
            <Select
              value={status}
              onValueChange={(
                value: "pending" | "started" | "failed" | "done"
              ) => setStatus(value)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("tasks.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  {t("tasks.taskStatus.pending")}
                </SelectItem>
                <SelectItem value="started">
                  {t("tasks.taskStatus.started")}
                </SelectItem>
                <SelectItem value="failed">
                  {t("tasks.taskStatus.failed")}
                </SelectItem>
                <SelectItem value="done">
                  {t("tasks.taskStatus.done")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">{t("tasks.priority")}</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
              min="1"
              max="10"
              disabled={loading}
            />
          </div>
          {/* Removed Recurring Task checkbox as per user request */}
          {error && (
            <p className="text-red-500 text-sm">
              {t("workspace.error")}: {error}
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
                : task
                ? t("workspace.saveChanges")
                : t("workspace.create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskForm;
