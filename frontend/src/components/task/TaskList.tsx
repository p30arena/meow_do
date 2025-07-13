import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { useAuth } from "../../context/AuthContext";
import {
  getTasksByGoalId,
  startTaskTracking,
  stopTaskTracking,
  getTaskTrackingSummary,
  type Task,
  type TaskTrackingSummary,
} from "../../api/task";
import { ManualTimeRecordForm } from "./ManualTimeRecordForm";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import DescriptionViewer from "../common/DescriptionViewer";

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
  const [totalTimeSpentOverall, setTotalTimeSpentOverall] = useState(0);
  const [dailyTaskSummaries, setDailyTaskSummaries] = useState<
    TaskTrackingSummary[]
  >([]);
  const [overallTaskSummaries, setOverallTaskSummaries] = useState<
    TaskTrackingSummary[]
  >([]);
  const [activeTrackingTaskId, setActiveTrackingTaskId] = useState<
    string | null
  >(null);
  const [durationDisplay, setDurationDisplay] = useState<string>("00:00:00");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<DateTime | null>(null);
  const [showStopTrackingDialog, setShowStopTrackingDialog] = useState(false);
  const [selectedStopTime, setSelectedStopTime] = useState("");
  const [currentTrackingRecordIdToStop, setCurrentTrackingRecordIdToStop] =
    useState<string | null>(null);
  const [currentTrackingRecordStartTime, setCurrentTrackingRecordStartTime] =
    useState<DateTime | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showManualRecordForm, setShowManualRecordForm] = useState(false);
  const [selectedTaskIdForManualRecord, setSelectedTaskIdForManualRecord] =
    useState<string | null>(null);

  const groupTasks = (tasks: Task[]) => {
    const groupedTasks: { [key: string]: Task[] } = {
      Running: [],
      Started: [],
      Pending: [],
      Failed: [],
      Done: [],
    };

    tasks.forEach((task) => {
      if (task.activeTracking && task.activeTracking.endTime === null) {
        groupedTasks["Running"].push(task);
      } else {
        groupedTasks[
          task.status.charAt(0).toUpperCase() + task.status.slice(1)
        ].push(task);
      }
    });

    return groupedTasks;
  };

  const TaskListDivider = ({ title }: { title: string }) => {
    const { t } = useTranslation();

    const statusColors: { [key: string]: string } = {
      Running: "bg-green-500",
      Started: "bg-yellow-500",
      Pending: "bg-blue-500",
      Failed: "bg-red-500",
      Done: "bg-gray-500",
    };

    const bgColorClass = statusColors[title] || "bg-gray-300"; // Default to gray if status is not found

    return (
      <div className="w-full flex items-center my-4">
        <div className="bg-gray-300 h-0.5 w-full"></div>
        <div
          className={`${bgColorClass} text-white px-2 py-1 rounded rtl:mr-2 ltr:ml-2`}
        >
          {t(`tasks.statuses.${title.toLowerCase()}`)}
        </div>
      </div>
    );
  };

  const fetchTasks = async () => {
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
      const sum = data.reduce((acc, task) => acc + task.timeBudget, 0);
      setTotalTimeBudget(sum);

      const dailySummary = await getTaskTrackingSummary(
        "day",
        workspaceId,
        goalId,
      );
      setDailyTaskSummaries(dailySummary);
      const totalSpentTodaySeconds = dailySummary.reduce(
        (acc, record) => acc + record.totalDurationSeconds,
        0,
      );
      setTotalTimeSpentToday(Math.floor(totalSpentTodaySeconds / 60));

      const overallSummary = await getTaskTrackingSummary(
        "total",
        workspaceId,
        goalId,
      );
      const totalSpentOverallSeconds = overallSummary.reduce(
        (acc, record) => acc + record.totalDurationSeconds,
        0,
      );
      setTotalTimeSpentOverall(Math.floor(totalSpentOverallSeconds / 60));

      const individualOverallSummaries = await getTaskTrackingSummary(
        "total",
        workspaceId,
        goalId,
      );
      setOverallTaskSummaries(individualOverallSummaries);

      const activeTask = data.find(
        (task) => task.activeTracking && task.activeTracking.endTime === null,
      );

      if (activeTask && activeTask.activeTracking) {
        setActiveTrackingTaskId(activeTask.id);
        startTimeRef.current = DateTime.fromISO(
          activeTask.activeTracking.startTime,
          { zone: "utc" },
        ).setZone(userTimezone);
        startTimer(activeTask.id);
      } else {
        stopTimer();
      }
    } catch (err: any) {
      setError(err.message);
      stopTimer();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [goalId, workspaceId, userTimezone]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const startTimer = (taskId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (!startTimeRef.current) {
      startTimeRef.current = DateTime.now().setZone(userTimezone);
    }
    setActiveTrackingTaskId(taskId);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor(
          DateTime.now()
            .setZone(userTimezone)
            .diff(startTimeRef.current, "seconds")
            .toObject().seconds || 0,
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
      fetchTasks();
    } catch (err: any) {
      if (
        err.response &&
        err.response.status === 400 &&
        err.response.data &&
        err.response.data.activeTask
      ) {
        setError(
          t("tasks.anotherTaskActive", {
            taskName: err.response.data.activeTask.taskName,
          }),
        );
      } else {
        setError(err.message);
      }
      stopTimer();
    }
  };

  const handleStopTracking = (task: Task) => {
    setError(null);
    if (task.activeTracking) {
      setCurrentTrackingRecordIdToStop(task.activeTracking.id);
      setCurrentTrackingRecordStartTime(
        DateTime.fromISO(task.activeTracking.startTime, {
          zone: "utc",
        }).setZone(userTimezone),
      );
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

    const localStopTime = DateTime.fromFormat(
      selectedStopTime,
      "yyyy-MM-dd'T'HH:mm",
      { zone: userTimezone },
    );

    if (!localStopTime.isValid) {
      setError(t("tasks.missingStopTimeInfo"));
      return;
    }

    if (
      currentTrackingRecordStartTime.diff(localStopTime, "minutes").minutes > 1
    ) {
      setError(t("tasks.stopTimeBeforeStartTime"));
      return;
    }

    const isoStopTime = localStopTime.toUTC().toISO();

    try {
      await stopTaskTracking(currentTrackingRecordIdToStop, isoStopTime);
      setShowStopTrackingDialog(false);
      setSelectedStopTime("");
      setCurrentTrackingRecordIdToStop(null);
      setCurrentTrackingRecordStartTime(null);
      fetchTasks();
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
        fetchTasks();
      } catch (err: any) {
        setError(err.message || t("deleteError"));
      } finally {
        setLoading(false);
        setTaskToDelete(null);
      }
    }
  };

  const isOver24Hours = totalTimeBudget > 24 * 60;

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
        <strong>{t("tasks.totalDailyBudget")}:</strong>{" "}
        {Math.floor(totalTimeBudget / 60)}h {totalTimeBudget % 60}m
      </p>
      <p className="mb-4">
        <strong>{t("tasks.totalOverallSpent")}:</strong>{" "}
        {Math.floor(totalTimeSpentOverall / 60)}h {totalTimeSpentOverall % 60}m
      </p>

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
            value={Math.min(100, (totalTimeSpentToday / totalTimeBudget) * 100)}
            className="h-2"
          />
        </div>
      )}

      <Button className="mt-4" onClick={onCreateNew} disabled={loading}>
        {t("tasks.createTask")}
      </Button>

      {tasks.length === 0 ? (
        <p>{t("tasks.noTasksYet")}</p>
      ) : (
        <div>
          {Object.entries(groupTasks(tasks)).map(
            ([group, tasks]) =>
              tasks.length > 0 && (
                <div key={group}>
                  <TaskListDivider title={group} />
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
                          <DescriptionViewer description={task.description} />
                          <p>
                            <strong>{t("tasks.timeBudget")}:</strong>{" "}
                            {task.timeBudget} {t("tasks.minutes")}
                          </p>
                          {(() => {
                            const dailySummary = dailyTaskSummaries.find(
                              (s) => s.taskName === task.name,
                            );
                            const individualDailyTimeSpent = dailySummary
                              ? Math.floor(
                                  dailySummary.totalDurationSeconds / 60,
                                )
                              : 0;
                            const individualDailyPercentage =
                              task.timeBudget > 0
                                ? (individualDailyTimeSpent / task.timeBudget) *
                                  100
                                : 0;

                            return (
                              <div className="mb-2">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">
                                    {t("tasks.dailyProgress")}:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {individualDailyTimeSpent}{" "}
                                    {t("tasks.minutes")} / {task.timeBudget}{" "}
                                    {t("tasks.minutes")} (
                                    {individualDailyPercentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(
                                    100,
                                    individualDailyPercentage,
                                  )}
                                  className="h-2"
                                />
                              </div>
                            );
                          })()}
                          {(() => {
                            const overallSummary = overallTaskSummaries.find(
                              (s) => s.taskName === task.name,
                            );
                            const individualOverallTimeSpent = overallSummary
                              ? Math.floor(
                                  overallSummary.totalDurationSeconds / 60,
                                )
                              : 0;

                            return (
                              <p className="mb-2">
                                <strong>{t("tasks.overallSpent")}:</strong>{" "}
                                {individualOverallTimeSpent}{" "}
                                {t("tasks.minutes")}
                              </p>
                            );
                          })()}
                          <p>
                            <strong>{t("tasks.status")}:</strong>{" "}
                            {t(`tasks.statuses.${task.status}`)}
                          </p>
                          <p>
                            <strong>{t("tasks.priority")}:</strong>{" "}
                            {task.priority}
                          </p>
                          {task.deadline && (
                            <p>
                              <strong>{t("tasks.deadline")}:</strong>{" "}
                              {DateTime.fromISO(task.deadline, { zone: "utc" })
                                .setZone(userTimezone)
                                .toLocaleString(DateTime.DATE_SHORT)}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStopTracking(task);
                                    }}
                                    disabled={loading}
                                    className="flex-shrink"
                                  >
                                    {t("tasks.stopTracking")}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartTracking(task.id);
                                    }}
                                    disabled={
                                      loading || activeTrackingTaskId !== null
                                    }
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
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
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
                                    onEditTask(task);
                                  }}
                                >
                                  {t("workspace.edit")}
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDelete(task);
                                      }}
                                      className="text-red-600"
                                    >
                                      {t("workspace.delete")}
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
                                        <AlertDialogCancel
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTaskToDelete(null);
                                            setError(null);
                                          }}
                                        >
                                          {t("cancel")}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            executeDelete();
                                          }}
                                        >
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
                </div>
              ),
          )}
        </div>
      )}

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
          onRecordCreated={fetchTasks}
        />
      )}
    </div>
  );
};

export default TaskList;
