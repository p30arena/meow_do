import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTasksByGoalId, type Task } from '../../api/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox'; // Assuming checkbox is available after shadcn install

interface TaskListProps {
  goalId: string;
  onCreateNew: () => void;
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ goalId, onCreateNew, onEditTask }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTimeBudget, setTotalTimeBudget] = useState(0);

  useEffect(() => {
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

    fetchTasks();
  }, [goalId]);

  const isOver24Hours = totalTimeBudget > 24 * 60; // Convert 24 hours to minutes

  if (loading) {
    return <div>{t('loadingTasks')}</div>;
  }

  if (error) {
    return <div>{t('error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('tasks')}</h2>
      {isOver24Hours && (
        <p className="text-red-500 mb-4">
          {t('timeBudgetWarning', { hours: Math.floor(totalTimeBudget / 60), minutes: totalTimeBudget % 60 })}
        </p>
      )}
      <p className="mb-4">
        {t('totalTimeBudget')}: {Math.floor(totalTimeBudget / 60)}h {totalTimeBudget % 60}m
      </p>
      {tasks.length === 0 ? (
        <p>{t('noTasksYet')}</p>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{task.description || t('noDescription')}</p>
                <p><strong>{t('timeBudget')}:</strong> {task.timeBudget} {t('minutes')}</p>
                <p><strong>{t('status')}:</strong> {t(`taskStatus.${task.status}`)}</p>
                {task.deadline && <p><strong>{t('deadline')}:</strong> {new Date(task.deadline).toLocaleDateString()}</p>}
                <p>
                  <strong>{t('recurring')}:</strong>{' '}
                  <Checkbox checked={task.isRecurring} disabled />
                </p>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onEditTask(task)}>{t('edit')}</Button>
                  <Button variant="secondary" size="sm">{t('copyToNextDay')}</Button>
                  <Button variant="destructive" size="sm">{t('delete')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew}>{t('createTask')}</Button>
    </div>
  );
};

export default TaskList;
