import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getTasksByGoalId, startTaskTracking, stopTaskTracking, type Task } from '../../api/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';

interface TaskListProps {
  goalId: string;
  onCreateNew: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ goalId, onCreateNew, onEditTask, onDeleteTask }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTimeBudget, setTotalTimeBudget] = useState(0);
  const [activeTrackingTaskId, setActiveTrackingTaskId] = useState<string | null>(null);
  const [durationDisplay, setDurationDisplay] = useState<string>('00:00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const fetchTasks = async () => {
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
      const sum = data.reduce((acc, task) => acc + task.timeBudget, 0);
      setTotalTimeBudget(sum);
    } catch (err: any) {
      setError(err.message);
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
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const startTimer = (taskId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    startTimeRef.current = new Date();
    setActiveTrackingTaskId(taskId);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
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
    setDurationDisplay('00:00:00');
    startTimeRef.current = null;
  };

  const handleStartTracking = async (taskId: string) => {
    setError(null);
    try {
      await startTaskTracking(taskId);
      startTimer(taskId);
      // Optionally update task status to 'started' in local state or re-fetch
      setTasks(prevTasks => prevTasks.map(task =>
        task.id === taskId ? { ...task, status: 'started' } : task
      ));
    } catch (err: any) {
      setError(err.message);
      stopTimer(); // Stop timer if API call fails
    }
  };

  const handleStopTracking = async (taskId: string) => {
    setError(null);
    try {
      await stopTaskTracking(taskId);
      stopTimer();
      // Optionally update task status to 'done' or 'pending' in local state or re-fetch
      setTasks(prevTasks => prevTasks.map(task =>
        task.id === taskId ? { ...task, status: 'done' } : task
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(t('tasks.confirmDelete', { taskName: task.name }))) {
      setLoading(true);
      setError(null);
      try {
        await onDeleteTask(task.id);
        fetchTasks(); // Re-fetch tasks after deletion
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const isOver24Hours = totalTimeBudget > 24 * 60; // Convert 24 hours to minutes

  if (loading) {
    return <div>{t('loadingTasks')}</div>;
  }

  if (error) {
    return <div>{t('workspace.error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('tasks.title')}</h2>
      {isOver24Hours && (
        <p className="text-red-500 mb-4">
          {t('tasks.timeBudgetWarning', { hours: Math.floor(totalTimeBudget / 60), minutes: totalTimeBudget % 60 })}
        </p>
      )}
      <p className="mb-4">
        {t('tasks.totalTimeBudget')}: {Math.floor(totalTimeBudget / 60)}h {totalTimeBudget % 60}m
      </p>
      {tasks.length === 0 ? (
        <p>{t('tasks.noTasksYet')}</p>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{task.description || t('noDescription')}</p>
                <p><strong>{t('tasks.timeBudget')}:</strong> {task.timeBudget} {t('tasks.minutes')}</p>
                <p><strong>{t('tasks.status')}:</strong> {t(`tasks.taskStatus.${task.status}`)}</p>
                <p><strong>{t('tasks.priority')}:</strong> {task.priority}</p>
                {task.deadline && <p><strong>{t('tasks.deadline')}:</strong> {new Date(task.deadline).toLocaleDateString()}</p>}
                <p>
                  <strong>{t('tasks.recurringTask')}:</strong>{' '}
                  <Checkbox checked={task.isRecurring} disabled />
                </p>
                {activeTrackingTaskId === task.id && (
                  <p className="text-blue-500">
                    {t('tasks.tracking')}: {durationDisplay}
                  </p>
                )}
                <div className="mt-4 flex justify-end space-x-2">
                  {activeTrackingTaskId === task.id ? (
                    <Button variant="secondary" size="sm" onClick={() => handleStopTracking(task.id)} disabled={loading}>
                      {t('tasks.stopTracking')}
                    </Button>
                  ) : (
                    <Button variant="default" size="sm" onClick={() => handleStartTracking(task.id)} disabled={loading || activeTrackingTaskId !== null}>
                      {t('tasks.startTracking')}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onEditTask(task)} disabled={loading}>{t('workspace.edit')}</Button>
                  <Button variant="secondary" size="sm" disabled={loading}>{t('copyToNextDay')}</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task)} disabled={loading}>{t('workspace.delete')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew} disabled={loading}>{t('tasks.createTask')}</Button>
    </div>
  );
};

export default TaskList;
