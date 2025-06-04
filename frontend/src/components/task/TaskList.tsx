import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getTasksByGoalId,
  startTaskTracking,
  stopTaskTracking,
  type Task,
} from "../../api/task";
import { ManualTimeRecordForm } from "./ManualTimeRecordForm"; // Import the new component
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
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

interface TaskListProps {
  goalId: string;
  onCreateNew: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  goalId,
  onCreateNew,
  onEditTask,
  onDeleteTask,
}) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTimeBudget, setTotalTimeBudget] = useState(0);
  const [activeTrackingTaskId, setActiveTrackingTaskId] = useState<
    string | null
  >(null);
  const [durationDisplay, setDurationDisplay] = useState<string>("00:00:00");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const [showStopTrackingDialog, setShowStopTrackingDialog] = useState(false);
  const [selectedStopTime, setSelectedStopTime] = useState("");
  const [currentTrackingRecordIdToStop, setCurrentTrackingRecordIdToStop] =
    useState<string | null>(null);
  const [currentTrackingRecordStartTime, setCurrentTrackingRecordStartTime] =
    useState<Date | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null); // State to hold task to delete
  const [showManualRecordForm, setShowManualRecordForm] = useState(false); // State for manual record form
  const [selectedTaskIdForManualRecord, setSelectedTaskIdForManualRecord] = useState<string | null>(null); // State for selected task ID

  const fetchTasks = async () => {
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
      const sum = data.reduce((acc, task) => acc + task.timeBudget, 0);
      setTotalTimeBudget(sum);

      // Find if any task has an active tracking record
      const activeTask = data.find(
        (task) => task.activeTracking && task.activeTracking.endTime === null
      );

      if (activeTask && activeTask.activeTracking) {
        setActiveTrackingTaskId(activeTask.id);
        startTimeRef.current = new Date(activeTask.activeTracking.startTime);
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
  }, [goalId]);

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
    // do not reset it. Otherwise, set it to the current time (for newly started tasks).
    if (!startTimeRef.current) {
      startTimeRef.current = new Date();
    }
    setActiveTrackingTaskId(taskId);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor(
          (new Date().getTime() - startTimeRef.current.getTime()) / 1000
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
      setError(err.message);
      stopTimer(); // Stop timer if API call fails
    }
  };

  const handleStopTracking = (task: Task) => {
    setError(null);
    if (task.activeTracking) {
      setCurrentTrackingRecordIdToStop(task.activeTracking.id);
      setCurrentTrackingRecordStartTime(
        new Date(task.activeTracking.startTime)
      );
      // Pre-fill with current time, formatted for datetime-local input
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setSelectedStopTime(`${year}-${month}-${day}T${hours}:${minutes}`);
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

    // Create a Date object from the local datetime string
    const localStopTime = new Date(selectedStopTime);

    if (isNaN(localStopTime.getTime())) {
      setError(t("tasks.invalidStopDateTimeFormat"));
      return;
    }

    if (localStopTime < currentTrackingRecordStartTime) {
      setError(t("tasks.stopTimeBeforeStartTime"));
      return;
    }

    // Convert to ISO 8601 string for backend validation
    const isoStopTime = localStopTime.toISOString();

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
        setError(err.message);
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
      <p className="mb-4">
        {t("tasks.totalTimeBudget")}: {Math.floor(totalTimeBudget / 60)}h{" "}
        {totalTimeBudget % 60}m
      </p>
      {tasks.length === 0 ? (
        <p>{t("tasks.noTasksYet")}</p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-start">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]"
            >
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
              </CardHeader>
              <CardContent className="w-full overflow-hidden">
                <p>{task.description || t("noDescription")}</p>
                <p>
                  <strong>{t("tasks.timeBudget")}:</strong> {task.timeBudget}{" "}
                  {t("tasks.minutes")}
                </p>
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
                    {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}
                <p>
                  <strong>{t("tasks.recurringTask")}:</strong>{" "}
                  <Checkbox checked={task.isRecurring} disabled />
                </p>
                {activeTrackingTaskId === task.id && (
                  <p className="text-blue-500">
                    {t("tasks.tracking")}: {durationDisplay}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2 min-w-0">
                  {activeTrackingTaskId === task.id ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStopTracking(task)}
                      disabled={loading}
                      className="flex-shrink"
                    >
                      {t("tasks.stopTracking")}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartTracking(task.id)}
                      disabled={loading || activeTrackingTaskId !== null}
                      className="flex-shrink"
                    >
                      {t("tasks.startTracking")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTaskIdForManualRecord(task.id);
                      setShowManualRecordForm(true);
                    }}
                    disabled={loading}
                    className="flex-shrink"
                  >
                    {t("tasks.manualRecord.add")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditTask(task)}
                    disabled={loading}
                    className="flex-shrink"
                  >
                    {t("workspace.edit")}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={loading} className="flex-shrink">
                    {t("copyToNextDay")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(task);
                        }}
                        disabled={loading}
                        className="flex-shrink"
                      >
                        {t("workspace.delete")}
                      </Button>
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
                            {t("confirmDeleteDescription")}{" "}
                            {/* Assuming a generic description key */}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={executeDelete}>
                            {t("confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
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
              <Label htmlFor="stopTime" className="text-end">
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
