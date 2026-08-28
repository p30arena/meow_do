import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { useAuth } from "../../context/AuthContext";
import {
  getTasksByGoalId,
  startTaskTracking,
  stopTaskTracking,
  updateTask,
  getTaskTrackingSummary,
  type Task,
  type TaskTrackingSummary,
} from "../../api/task";
import { ManualTimeRecordForm } from "./ManualTimeRecordForm";
import TaskCard from "./TaskCard";
import { createElapsedFormatter } from "../../lib/elapsed";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface TaskListProps {
  workspaceId: string;
  goalId: string;
  onCreateNew: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  workspaceId,
  goalId,
  onCreateNew,
  onEditTask,
  onDeleteTask,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userTimezone =
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTimeBudget, setTotalTimeBudget] = useState(0);
  const [totalTimeSpentToday, setTotalTimeSpentToday] = useState(0);
  const [dailyByName, setDailyByName] = useState<Record<string, number>>({});
  const [overallByName, setOverallByName] = useState<Record<string, number>>({});
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showManualRecordForm, setShowManualRecordForm] = useState(false);
  const [selectedTaskIdForManualRecord, setSelectedTaskIdForManualRecord] = useState<string | null>(null);

  // Live ticker for the currently running task.
  const [now, setNow] = useState(() => DateTime.now());
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // One-tap stop dialog ("adjust end time" is an opt-in refinement inside it).
  const [pendingStop, setPendingStop] = useState<Task | null>(null);
  const [adjustingStop, setAdjustingStop] = useState(false);
  const [selectedStopTime, setSelectedStopTime] = useState("");

  const fetchTasks = async () => {
    setError(null);
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
      setTotalTimeBudget(data.reduce((acc, task) => acc + task.timeBudget, 0));

      // Summaries are keyed by task name by the API; resolved to ids at render.
      const [dailySummary, overallSummary] = await Promise.all([
        getTaskTrackingSummary("day", workspaceId, goalId),
        getTaskTrackingSummary("total", workspaceId, goalId),
      ]);
      const daily: Record<string, number> = {};
      dailySummary.forEach((s: TaskTrackingSummary) => {
        daily[s.taskName] = s.totalDurationSeconds;
      });
      const overall: Record<string, number> = {};
      overallSummary.forEach((s: TaskTrackingSummary) => {
        overall[s.taskName] = s.totalDurationSeconds;
      });
      setDailyByName(daily);
      setOverallByName(overall);

      let todaySeconds = 0;
      data.forEach((task) => {
        todaySeconds += liveDailySeconds(task);
      });
      setTotalTimeSpentToday(Math.floor(todaySeconds / 60));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, [goalId, workspaceId]);

  const runningTask = useMemo(
    () => tasks.find((task) => task.activeTracking && !task.activeTracking.endTime) ?? null,
    [tasks],
  );

  /** Recorded-today seconds plus the live portion of any open record. */
  const liveDailySeconds = (task: Task): number => {
    let seconds = dailyByName[task.name] ?? 0;
    if (task.activeTracking && !task.activeTracking.endTime) {
      const startedAt = DateTime.fromISO(task.activeTracking.startTime, { zone: "utc" }).setZone(userTimezone);
      if (startedAt > now.startOf("day")) {
        seconds += Math.floor(now.diff(startedAt).as("seconds"));
      }
    }
    return seconds;
  };

  /** One tap stops NOW; adjusting the end time is opt-in inside the same dialog. */
  const confirmStop = async () => {
    if (!pendingStop?.activeTracking) return;
    setError(null);
    try {
      if (adjustingStop) {
        const local = DateTime.fromFormat(selectedStopTime, "yyyy-MM-dd'T'HH:mm", {
          zone: userTimezone,
        });
        if (!local.isValid) throw new Error(t("tasks.invalidStopDateTimeFormat"));
        if (
          DateTime.fromISO(pendingStop.activeTracking.startTime, { zone: "utc" })
            .setZone(userTimezone)
            .diff(local, "minutes").minutes > 1
        ) {
          throw new Error(t("tasks.stopTimeBeforeStartTime"));
        }
        await stopTaskTracking(pendingStop.activeTracking.id, local.toUTC().toISO());
      } else {
        await stopTaskTracking(pendingStop.activeTracking.id); // server-side "now"
      }
      setPendingStop(null);
      setAdjustingStop(false);
      setSelectedStopTime("");
      await fetchTasks();
    } catch (err: any) {
      setError(err.message ?? t("workspace.error"));
    }
  };

  const openStopDialog = (taskId: string) => {
    const task = tasks.find((t2) => t2.id === taskId);
    if (!task?.activeTracking) return;
    setSelectedStopTime(DateTime.now().setZone(userTimezone).toFormat("yyyy-MM-dd'T'HH:mm"));
    setAdjustingStop(false);
    setPendingStop(task);
  };

  const handleMarkDone = async (taskId: string) => {
    setError(null);
    try {
      await updateTask(taskId, { status: "done" });
      await fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    }
  };

  const handleStartTracking = async (taskId: string) => {
    setError(null);
    try {
      await startTaskTracking(taskId);
      await fetchTasks();
    } catch (err: any) {
      if (err?.status === 400 && err?.data?.activeTask) {
        setError(
          t("tasks.anotherTaskActive", { taskName: err.data.activeTask.taskName }),
        );
      } else {
        setError(err.message ?? t("workspace.error"));
      }
    }
  };

  const executeDelete = async () => {
    if (!taskToDelete) return;
    setLoading(true);
    setError(null);
    try {
      await onDeleteTask(taskToDelete.id);
      await fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setLoading(false);
      setTaskToDelete(null);
    }
  };

  const isOver24Hours = totalTimeBudget > 24 * 60;

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-4 p-4" role="status" aria-live="polite">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-4" role="alert">
        <p>{t("workspace.error")}: {error}</p>
        <Button variant="outline" onClick={() => void fetchTasks()}>{t("retry")}</Button>
      </div>
    );
  }

  const renderGroup = (statusKey: string, tone?: string) => {
    const items =
      statusKey === "running"
        ? runningTask
          ? [runningTask]
          : []
        : tasks.filter((task) => task.status === statusKey && task.id !== runningTask?.id);
    if (items.length === 0) return null;
    return (
      <section key={statusKey} aria-labelledby={`group-${statusKey}`} className="mt-6 first:mt-0">
        <h2
          id={`group-${statusKey}`}
          className={`mb-3 text-sm font-semibold uppercase tracking-wide ${tone ?? "text-muted-foreground"}`}
        >
          {t(`tasks.statuses.${statusKey}`)} · {items.length}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              spentTodayMinutes={Math.floor(liveDailySeconds(task) / 60)}
              spentOverallMinutes={Math.floor((overallByName[task.name] ?? 0) / 60)}
              isRunning={runningTask?.id === task.id}
              userTimezone={userTimezone}
              runningDisplay={
                task.activeTracking
                  ? createElapsedFormatter(task.activeTracking.startTime)()
                  : undefined
              }
              canStart={!runningTask}
              startBlockedReason={t("tasks.anotherTaskActiveShort")}
              onStart={(id) => void handleStartTracking(id)}
              onStop={openStopDialog}
              onEdit={() => onEditTask(task)}
              onMarkDone={(id) => void handleMarkDone(id)}
              onManualRecord={() => {
                setSelectedTaskIdForManualRecord(task.id);
                setShowManualRecordForm(true);
              }}
              onDelete={() => setTaskToDelete(task)}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>{t("close")}</Button>
        </div>
      )}
      <h2 className="mb-4 text-2xl font-bold">{t("tasks.title")}</h2>
      {isOver24Hours && (
        <p className="mb-4 text-destructive" role="alert">
          {t("tasks.timeBudgetWarning", {
            hours: Math.floor(totalTimeBudget / 60),
            minutes: totalTimeBudget % 60,
          })}
        </p>
      )}

      {/* Goal-level totals as a compact progress bar with human durations */}
      {(totalTimeBudget > 0 || totalTimeSpentToday > 0) && (
        <div className="mb-6 max-w-md">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">{t("tasks.dailyProgress")}</span>
            <span
              className={`tabular-nums ${
                totalTimeBudget > 0 && totalTimeSpentToday > totalTimeBudget
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {formatHM(totalTimeSpentToday)} / {formatHM(totalTimeBudget)}
              {totalTimeBudget > 0 &&
                ` (${Math.round((totalTimeSpentToday / totalTimeBudget) * 100)}%)`}
            </span>
          </div>
          {totalTimeBudget > 0 && (
            <Progress
              value={Math.min(100, (totalTimeSpentToday / totalTimeBudget) * 100)}
              className="h-2"
              aria-label={`${t("tasks.dailyProgress")} ${totalTimeSpentToday}/${totalTimeBudget}`}
            />
          )}
        </div>
      )}

      <Button className="my-4" onClick={onCreateNew} disabled={loading}>
        {t("tasks.createTask")}
      </Button>

      {tasks.length === 0 ? (
        <p>{t("tasks.noTasksYet")}</p>
      ) : (
        <div>
          {renderGroup("running")}
          {renderGroup("started")}
          {renderGroup("pending")}
          {renderGroup("failed")}
          {renderGroup("done")}
        </div>
      )}

      {/* Stop dialog: one-tap stop primary; adjust time opt-in */}
      <Dialog
        open={!!pendingStop}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStop(null);
            setAdjustingStop(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("tasks.stopTrackingTitle")}</DialogTitle>
            <DialogDescription>
              {adjustingStop ? t("tasks.stopTrackingDescription") : pendingStop?.name}
            </DialogDescription>
          </DialogHeader>
          {adjustingStop && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stopTime" className="text-start">
                {t("tasks.stopTime")}
              </Label>
              <Input
                id="stopTime"
                type="datetime-local"
                value={selectedStopTime}
                onChange={(e) => setSelectedStopTime(e.target.value)}
                className="col-span-3"
                inputMode="numeric"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="link" size="sm" onClick={() => setAdjustingStop((v) => !v)}>
              {t("tasks.adjustStopTime")}
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => void confirmStop()}>
                {t("tasks.stopNow")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("tasks.confirmDelete", { taskName: taskToDelete?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setTaskToDelete(null); setError(null); }}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void executeDelete()}
            >                                {t("tasks.deleteTask")}

            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showManualRecordForm && selectedTaskIdForManualRecord && (
        <ManualTimeRecordForm
          taskId={selectedTaskIdForManualRecord}
          isOpen={showManualRecordForm}
          onClose={() => setShowManualRecordForm(false)}
          onRecordCreated={fetchTasks}
        />
      )}
    </div>
  );
};

/** Minutes -> "1h 30m" human duration (shared formatting rules). */
function formatHM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default TaskList;
