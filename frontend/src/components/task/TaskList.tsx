import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from 'luxon'; // Import luxon
import { useAuth } from "../../context/AuthContext"; // Import useAuth
import {
  getTasksByGoalId,
  startTaskTracking,
  stopTaskTracking,
  getTaskTrackingSummary, // Import getTaskTrackingSummary
  type Task,
  type TaskTrackingSummary, // Import TaskTrackingSummary
} from "../../api/task";
import { ManualTimeRecordForm } from "./ManualTimeRecordForm"; // Import the new component
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress"; // Import Progress component
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
  AlertDialogTrigger,
} from "../ui/alert-dialog"; // Import AlertDialog components
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface TaskListProps {
  workspaceId: string; // Add workspaceId to props
  goalId: string;
  onCreateNew: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  workspaceId, // Destructure workspaceId
  goalId,
  onCreateNew,
  onEditTask,
  onDeleteTask,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth(); // Access user from AuthContext
  const userTimezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone; // Get user's timezone or system default

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTimeBudget, setTotalTimeBudget] = useState(0);
  const [totalTimeSpentToday, setTotalTimeSpentToday] = useState(0); // State for time spent today
  const [totalTimeSpentOverall, setTotalTimeSpentOverall] = useState(0); // New state for total time spent overall
  const [dailyTaskSummaries, setDailyTaskSummaries] = useState<TaskTrackingSummary[]>([]); // State for individual task summaries (daily)
  const [overallTaskSummaries, setOverallTaskSummaries] = useState<TaskTrackingSummary[]>([]); // State for individual task summaries (overall)
  const [activeTrackingTaskId, setActiveTrackingTaskId] = useState<
    string | null
  >(null);
  const [durationDisplay, setDurationDisplay] = useState<string>("00:00:00");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<DateTime | null>(null); // Change to DateTime
  const [showStopTrackingDialog, setShowStopTrackingDialog] = useState(false);
  const [selectedStopTime, setSelectedStopTime] = useState("");
  const [currentTrackingRecordIdToStop, setCurrentTrackingRecordIdToStop] =
    useState<string | null>(null);
  const [currentTrackingRecordStartTime, setCurrentTrackingRecordStartTime] =
    useState<DateTime | null>(null); // Change to DateTime
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null); // State to hold task to delete
  const [showManualRecordForm, setShowManualRecordForm] = useState(false); // State for manual record form
  const [selectedTaskIdForManualRecord, setSelectedTaskIdForManualRecord] = useState<string | null>(null); // State for selected task ID

  const fetchTasks = async () => {
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
      const sum = data.reduce((acc, task) => acc + task.timeBudget, 0);
      setTotalTimeBudget(sum);

      // Fetch daily task tracking summary
      const dailySummary = await getTaskTrackingSummary("day", workspaceId, goalId);
      setDailyTaskSummaries(dailySummary); // Store individual task summaries (daily)
      const totalSpentTodaySeconds = dailySummary.reduce(
        (acc, record) => acc + record.totalDurationSeconds,
        0
      );
      setTotalTimeSpentToday(Math.floor(totalSpentTodaySeconds / 60)); // Convert seconds to minutes

      // Fetch overall task tracking summary (for the top-level display)
      const overallSummary = await getTaskTrackingSummary("total", workspaceId, goalId);
      const totalSpentOverallSeconds = overallSummary.reduce(
        (acc, record) => acc + record.totalDurationSeconds,
        0
      );
      setTotalTimeSpentOverall(Math.floor(totalSpentOverallSeconds / 60)); // Convert seconds to minutes

      // Fetch overall task summaries for individual tasks
      const individualOverallSummaries = await getTaskTrackingSummary("total", workspaceId, goalId);
      setOverallTaskSummaries(individualOverallSummaries); // Store individual task summaries (overall)

      // Find if any task has an active tracking record
      const activeTask = data.find(
        (task) => task.activeTracking && task.activeTracking.endTime === null
      );

      if (activeTask && activeTask.activeTracking) {
        setActiveTrackingTaskId(activeTask.id);
        // Convert UTC startTime from backend to user's local timezone for timer
        startTimeRef.current = DateTime.fromISO(activeTask.activeTracking.startTime, { zone: 'utc' }).setZone(userTimezone);
        startTimer(activeTask.id); // Restart the timer with the correct start time
      } else {
        stopTimer(); // No active task, ensure timer is stopped
      }
    } catch (err: any) {
      setError(err.message);
      stopTimer(); // Ensure timer is stopped on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Cleanup interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [goalId, workspaceId, userTimezone]); // Add userTimezone to dependency array

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const startTimer = (taskId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // If startTimeRef.current is already set by fetchTasks (meaning an active task was found),
    // do not reset it. Otherwise, set it to the current time in user's timezone (for newly started tasks).
    if (!startTimeRef.current) {
      startTimeRef.current = DateTime.now().setZone(userTimezone);
    }
    setActiveTrackingTaskId(taskId);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor(
          (DateTime.now().setZone(userTimezone).diff(startTimeRef.current, 'seconds').toObject().seconds || 0)
        );
        setDurationDisplay(formatDuration(elapsedSeconds));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveTrackingTaskId(null);
    setDurationDisplay("00:00:00");
    startTimeRef.current = null;
  };

  const handleStartTracking = async (taskId: string) => {
    setError(null);
    try {
      await startTaskTracking(taskId);
      fetchTasks(); // Re-fetch tasks to update active tracking status and timer
    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data && err.response.data.activeTask) {
        setError(t("tasks.anotherTaskActive", { taskName: err.response.data.activeTask.taskName }));
      } else {
        setError(err.message);
      }
      stopTimer(); // Stop timer if API call fails
    }
  };

  const handleStopTracking = (task: Task) => {
    setError(null);
    if (task.activeTracking) {
      setCurrentTrackingRecordIdToStop(task.activeTracking.id);
      // Convert UTC startTime from backend to user's local timezone for comparison
      setCurrentTrackingRecordStartTime(
        DateTime.fromISO(task.activeTracking.startTime, { zone: 'utc' }).setZone(userTimezone)
      );
      // Pre-fill with current time in user's timezone, formatted for datetime-local input
      const nowInUserTimezone = DateTime.now().setZone(userTimezone);
      setSelectedStopTime(nowInUserTimezone.toFormat("yyyy-MM-dd'T'HH:mm"));
      setShowStopTrackingDialog(true);
    } else {
      setError(t("tasks.noActiveTrackingRecord"));
    }
  };

  const handleConfirmStopTracking = async () => {
    setError(null);
    if (
      !currentTrackingRecordIdToStop ||
      !currentTrackingRecordStartTime ||
      !selectedStopTime
    ) {
      setError(t("tasks.missingStopTimeInfo"));
      return;
    }

    // Parse the selected stop time string as a DateTime object in the user's timezone
    const localStopTime = DateTime.fromFormat(selectedStopTime, "yyyy-MM-dd'T'HH:mm", { zone: userTimezone });

    if (!localStopTime.isValid) {
      setError(t("tasks.invalidStopDateTimeFormat"));
      return;
    }

    // Compare in user's timezone
    if (currentTrackingRecordStartTime.diff(localStopTime, 'minutes').minutes > 1) { // Allow for 1 minute difference
      setError(t("tasks.stopTimeBeforeStartTime"));
      return;
    }

    // Convert to ISO 8601 string (UTC) for backend validation
    const isoStopTime = localStopTime.toUTC().toISO();

    try {
      await stopTaskTracking(currentTrackingRecordIdToStop, isoStopTime);
      setShowStopTrackingDialog(false);
      setSelectedStopTime("");
      setCurrentTrackingRecordIdToStop(null);
      setCurrentTrackingRecordStartTime(null);
      fetchTasks(); // Re-fetch tasks to update active tracking status and timer
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = (task: Task) => {
    setTaskToDelete(task);
  };

  const executeDelete = async () => {
    if (taskToDelete) {
      setLoading(true);
      setError(null);
      try {
        await onDeleteTask(taskToDelete.id);
        fetchTasks(); // Re-fetch tasks after deletion
      } catch (err: any) {
        setError(err.message || t("deleteError"));
      } finally {
        setLoading(false);
        setTaskToDelete(null); // Clear the task to delete
      }
    }
  };

  const isOver24Hours = totalTimeBudget > 24 * 60; // Convert 24 hours to minutes

  if (loading) {
    return <div>{t("loadingTasks")}</div>;
  }

  if (error) {
    return (
      <div>
        {t("workspace.error")}: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t("tasks.title")}</h2>
      {isOver24Hours && (
        <p className="text-red-500 mb-4">
          {t("tasks.timeBudgetWarning", {
            hours: Math.floor(totalTimeBudget / 60),
            minutes: totalTimeBudget % 60,
          })}
        </p>
      )}
      <p className="mb-2">
        <strong>{t("tasks.totalDailyBudget")}:</strong> {Math.floor(totalTimeBudget / 60)}h{" "}
        {totalTimeBudget % 60}m
      </p>
      <p className="mb-4">
        <strong>{t("tasks.totalOverallSpent")}:</strong> {Math.floor(totalTimeSpentOverall / 60)}h{" "}
        {totalTimeSpentOverall % 60}m
      </p>

      {/* Progress Bar for Daily Budget */}
      {totalTimeBudget > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">
              {t("tasks.dailyProgress")}:
            </span>
            <span className="text-sm font-medium">
              {totalTimeSpentToday} {t("tasks.minutes")} / {totalTimeBudget}{" "}
              {t("tasks.minutes")} (
              {((totalTimeSpentToday / totalTimeBudget) * 100).toFixed(0)}%)
            </span>
          </div>
          <Progress
            value={Math.min(
              100,
              (totalTimeSpentToday / totalTimeBudget) * 100
            )}
            className="h-2"
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <p>{t("tasks.noTasksYet")}</p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-start">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="w-full md:w-[calc(50%-0.5rem)]"
            >
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
              </CardHeader>
              <CardContent className="w-full overflow-hidden">
                <p>{task.description || t("workspace.noDescription")}</p>
                <p>
                  <strong>{t("tasks.timeBudget")}:</strong> {task.timeBudget}{" "}
                  {t("tasks.minutes")}
                </p>
                {/* Individual Task Progress Bar (Daily) */}
                {(() => {
                  const dailySummary = dailyTaskSummaries.find(
                    (s) => s.taskName === task.name
                  );
                  const individualDailyTimeSpent = dailySummary
                    ? Math.floor(dailySummary.totalDurationSeconds / 60)
                    : 0;
                  const individualDailyPercentage =
                    task.timeBudget > 0
                      ? (individualDailyTimeSpent / task.timeBudget) * 100
                      : 0;

                  return (
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">
                          {t("tasks.dailyProgress")}:
                        </span>
                        <span className="text-sm font-medium">
                          {individualDailyTimeSpent} {t("tasks.minutes")} /{" "}
                          {task.timeBudget} {t("tasks.minutes")} (
                          {individualDailyPercentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, individualDailyPercentage)}
                        className="h-2"
                      />
                    </div>
                  );
                })()}
                {/* Individual Task Overall Spent Time */}
                {(() => {
                  const overallSummary = overallTaskSummaries.find(
                    (s) => s.taskName === task.name
                  );
                  const individualOverallTimeSpent = overallSummary
                    ? Math.floor(overallSummary.totalDurationSeconds / 60)
                    : 0;

                  return (
                    <p className="mb-2">
                      <strong>{t("tasks.overallSpent")}:</strong>{" "}
                      {individualOverallTimeSpent} {t("tasks.minutes")}
                    </p>
                  );
                })()}
                <p>
                  <strong>{t("tasks.status")}:</strong>{" "}
                  {t(`tasks.taskStatus.${task.status}`)}
                </p>
                <p>
                  <strong>{t("tasks.priority")}:</strong> {task.priority}
                </p>
                {task.deadline && (
                  <p>
                    <strong>{t("tasks.deadline")}:</strong>{" "}
                    {DateTime.fromISO(task.deadline, { zone: 'utc' }).setZone(userTimezone).toLocaleString(DateTime.DATE_SHORT)}
                  </p>
                )}
                {activeTrackingTaskId === task.id && (
                  <p className="text-blue-500">
                    {t("tasks.tracking")}: {durationDisplay}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2 min-w-0">
                  {task.status !== "done" && (
                    <>
                      {activeTrackingTaskId === task.id ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleStopTracking(task); }}
                          disabled={loading}
                          className="flex-shrink"
                        >
                          {t("tasks.stopTracking")}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleStartTracking(task.id); }}
                          disabled={loading || activeTrackingTaskId !== null}
                          className="flex-shrink"
                        >
                          {t("tasks.startTracking")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskIdForManualRecord(task.id);
                          setShowManualRecordForm(true);
                        }}
                        disabled={loading}
                        className="flex-shrink"
                      >
                        {t("tasks.manualRecord.add")}
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <span className="sr-only">{t('workspace.openMenu')}</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                        {t('workspace.edit')}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={(e) => { e.stopPropagation(); confirmDelete(task); }}
                            className="text-red-600"
                          >
                            {t('workspace.delete')}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        {taskToDelete && (
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("tasks.confirmDelete", {
                                  taskName: taskToDelete.name,
                                })}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("confirmDeleteDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setTaskToDelete(null); setError(null); }}>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => { e.stopPropagation(); executeDelete(); }}>
                                {t("confirm")}
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
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew} disabled={loading}>
        {t("tasks.createTask")}
      </Button>

      <Dialog
        open={showStopTrackingDialog}
        onOpenChange={setShowStopTrackingDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("tasks.stopTrackingTitle")}</DialogTitle>
            <DialogDescription>
              {t("tasks.stopTrackingDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={handleConfirmStopTracking}>{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showManualRecordForm && selectedTaskIdForManualRecord && (
        <ManualTimeRecordForm
          taskId={selectedTaskIdForManualRecord}
          isOpen={showManualRecordForm}
          onClose={() => setShowManualRecordForm(false)}
          onRecordCreated={fetchTasks} // Re-fetch tasks after a manual record is created
        />
      )}
    </div>
  );
};

export default TaskList;
