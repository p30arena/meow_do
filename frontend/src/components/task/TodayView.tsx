import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { getAllTasks, startTaskTracking, stopTaskTracking, getTaskTrackingSummary, type Task } from "../../api/task";
import { useAuth } from "../../context/AuthContext";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Coffee } from "lucide-react";

interface TodayViewProps {
  onOpenTask: (task: Task) => void;
}

/**
 * The front door of the app. Answers "what should I work on now?" in one screen:
 * running timer pinned at top (one-tap stop), then overdue -> due today -> upcoming,
 * across all workspaces, with a day budget ring.
 */
const TodayView: React.FC<TodayViewProps> = ({ onOpenTask }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userTimezone =
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spentTodaySecondsByTask, setSpentTodaySecondsByTask] = useState<Record<string, number>>({});
  const [spentTotalSecondsByTask, setSpentTotalSecondsByTask] = useState<Record<string, number>>({});
  const [dayBudgetMinutes, setDayBudgetMinutes] = useState(0);
  const [spentTodayMinutes, setSpentTodayMinutes] = useState(0);

  // Live ticker for the currently running task.
  const [now, setNow] = useState(() => DateTime.now());
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // One-tap-stop dialog state ("adjust end time" demoted to optional refinement).
  const [pendingStop, setPendingStop] = useState<Task | null>(null);
  const [adjustingStop, setAdjustingStop] = useState(false);
  const [selectedStopTime, setSelectedStopTime] = useState("");
  const stopLockRef = useRef(false);

  const loadSummaries = async () => {
    try {
      const [dailySummary, totalSummary] = await Promise.all([
        getTaskTrackingSummary("day"),
        getTaskTrackingSummary("total"),
      ]);
      const todayStart = DateTime.now().setZone(userTimezone).startOf("day");

      // Key summaries by task NAME first (API returns names), then resolve to
      // task ids below — ids are what the UI looks up.
      const dailyByName: Record<string, number> = {};
      dailySummary.forEach((s) => {
        dailyByName[s.taskName] = s.totalDurationSeconds;
      });
      const totalByName: Record<string, number> = {};
      totalSummary.forEach((s) => {
        totalByName[s.taskName] = s.totalDurationSeconds;
      });

      const dailyById: Record<string, number> = {};
      const totalById: Record<string, number> = {};
      let todayMinutes = 0;
      tasks.forEach((task) => {
        let seconds = dailyByName[task.name] ?? 0;
        // Add the live portion of the currently running record.
        if (task.activeTracking && !task.activeTracking.endTime) {
          const startedAt = DateTime.fromISO(task.activeTracking.startTime, { zone: "utc" });
          if (startedAt > todayStart) {
            seconds += Math.floor(now.diff(startedAt).as("seconds"));
          }
        }
        dailyById[task.id] = seconds;
        totalById[task.id] = totalByName[task.name] ?? 0;
        todayMinutes += seconds / 60;
      });
      setSpentTodaySecondsByTask(dailyById);
      setSpentTotalSecondsByTask(totalById);

      const budgetFromTasks = tasks.reduce(
        (acc, task) => acc + (task.status === "done" ? 0 : task.timeBudget),
        0,
      );
      setDayBudgetMinutes(budgetFromTasks);
      setSpentTodayMinutes(Math.floor(todayMinutes));
    } catch {
      /* summary is enhancement-only; never block the list on it */
    }
  };

  const fetchTasks = async () => {
    setError(null);
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loading, tasks.length, now.hour]);

  const runningTask = useMemo(
    () =>
      tasks.find(
        (task) => task.activeTracking && !task.activeTracking.endTime,
      ) ?? null,
    [tasks],
  );

  const { overdue, dueToday, upcoming } = useMemo(() => {
    const todayEnd = DateTime.now().setZone(userTimezone).endOf("day");
    const buckets = { overdue: [] as Task[], dueToday: [] as Task[], upcoming: [] as Task[] };
    tasks.forEach((task) => {
      if (task.status === "done") return;
      if (runningTask && task.id === runningTask.id) return; // shown pinned at top
      if (!task.deadline) {
        buckets.upcoming.push(task);
        return;
      }
      const deadline = DateTime.fromISO(task.deadline, { zone: "utc" }).setZone(userTimezone);
      if (deadline < todayEnd) {
        if (deadline < todayEnd.startOf("day")) buckets.overdue.push(task);
        else buckets.dueToday.push(task);
      } else {
        buckets.upcoming.push(task);
      }
    });
    const byPriority = (a: Task, b: Task) => b.priority - a.priority;
    buckets.overdue.sort(byPriority);
    buckets.dueToday.sort(byPriority);
    buckets.upcoming.sort(byPriority);
    buckets.upcoming = buckets.upcoming.slice(0, 6); // keep the front door calm
    return buckets;
  }, [tasks, userTimezone, runningTask]);

  const handleStart = async (taskId: string) => {
    setError(null);
    try {
      await startTaskTracking(taskId);
      await fetchTasks();
    } catch (err: any) {
      if (err?.status === 400 && err?.data?.activeTask) {
        setError(t("tasks.anotherTaskActive", { taskName: err.data.activeTask.taskName }));
      } else {
        setError(err.message ?? t("workspace.error"));
      }
    }
  };

  /** One tap stops the timer NOW; "adjust time" is an opt-in refinement inside the same dialog. */
  const confirmStop = async () => {
    if (!pendingStop?.activeTracking || stopLockRef.current) return;
    stopLockRef.current = true;
    setError(null);
    try {
      if (adjustingStop) {
        const local = DateTime.fromFormat(selectedStopTime, "yyyy-MM-dd'T'HH:mm", { zone: userTimezone });
        if (!local.isValid) throw new Error(t("tasks.invalidStopDateTimeFormat"));
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
    } finally {
      stopLockRef.current = false;
    }
  };

  const openStopDialog = (taskId: string) => {
    const task = tasks.find((t2) => t2.id === taskId);
    if (!task?.activeTracking) return;
    setSelectedStopTime(DateTime.now().setZone(userTimezone).toFormat("yyyy-MM-dd'T'HH:mm"));
    setAdjustingStop(false);
    setPendingStop(task);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4" role="status" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const dayBudgetPct = dayBudgetMinutes > 0 ? Math.min(100, Math.round((spentTodayMinutes / dayBudgetMinutes) * 100)) : 0;

  const renderSection = (titleKey: string, items: Task[], tone?: string) =>
    items.length > 0 && (
      <section aria-labelledby={`today-${titleKey}`} className="mt-6 first:mt-0">
        <h2 id={`today-${titleKey}`} className={`mb-3 text-sm font-semibold uppercase tracking-wide ${tone ?? "text-muted-foreground"}`}>
          {t(`today.${titleKey}`)} · {items.length}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              spentTodayMinutes={Math.floor((spentTodaySecondsByTask[task.id] ?? 0) / 60)}
              spentOverallMinutes={Math.floor((spentTotalSecondsByTask[task.id] ?? 0) / 60)}
              isRunning={runningTask?.id === task.id}
              canStart={!runningTask}
              startBlockedReason={t("tasks.anotherTaskActiveShort")}
              onStart={(id) => void handleStart(id)}
              onStop={openStopDialog}
              onEdit={() => onOpenTask(task)}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {DateTime.now().setZone(userTimezone).toLocaleString(DateTime.DATE_HUGE)}
          </p>
          <h1 className="text-3xl font-bold">{t("today.title")}</h1>
        </div>
        {/* Day budget ring */}
        {dayBudgetMinutes > 0 && (
          <div className="min-w-[220px] flex-1 md:max-w-xs">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium">{t("today.dayBudget")}</span>
              <span className="tabular-nums text-muted-foreground">{spentTodayMinutes}m / {dayBudgetMinutes}m</span>
            </div>
            <Progress value={dayBudgetPct} className="h-2" aria-label={`${dayBudgetPct}%`} />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>{t("close")}</Button>
        </div>
      )}

      {/* Pinned running card */}
      {runningTask && (
        <section aria-labelledby="today-runningNow" className="mb-6">
          <h2 id="today-runningNow" className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
            {t("today.runningNow")}
          </h2>
          <TaskCard
            task={runningTask}
            spentTodayMinutes={Math.floor((spentTodaySecondsByTask[runningTask.id] ?? 0) / 60)}
            spentOverallMinutes={Math.floor((spentTotalSecondsByTask[runningTask.id] ?? 0) / 60)}
            isRunning
            canStart={false}
            onStart={() => undefined}
            onStop={openStopDialog}
            onEdit={() => onOpenTask(runningTask)}
          />
        </section>
      )}

      {renderSection("overdue", overdue, "text-destructive")}
      {renderSection("dueToday", dueToday)}
      {renderSection("upcoming", upcoming)}

      {!runningTask && overdue.length === 0 && dueToday.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-semibold">{t("today.allClearTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("today.allClearHint")}</p>
        </div>
      )}

      {tasks.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">{t("today.empty")}</p>
      )}

      {/* Stop dialog: one-tap stop primary; adjusting time is opt-in */}
      <Dialog open={!!pendingStop} onOpenChange={(open) => { if (!open) { setPendingStop(null); setAdjustingStop(false); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("tasks.stopTrackingTitle")}</DialogTitle>
            <DialogDescription>
              {adjustingStop ? t("tasks.stopTrackingDescription") : pendingStop?.name}
            </DialogDescription>
          </DialogHeader>
          {adjustingStop && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stopTime" className="text-start">{t("tasks.stopTime")}</Label>
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
              <Button variant="destructive" onClick={() => void confirmStop()}>{t("tasks.stopNow")}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodayView;
