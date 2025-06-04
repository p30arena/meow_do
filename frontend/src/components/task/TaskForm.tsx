import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createTask, updateTask, type Task } from '../../api/task';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';

interface TaskFormProps {
  goalId: string;
  task?: Task; // Optional, for editing existing task
  onSuccess: () => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ goalId, task, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [timeBudget, setTimeBudget] = useState(task?.timeBudget.toString() || '');
  const [deadline, setDeadline] = useState(task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
  const [status, setStatus] = useState<'pending' | 'started' | 'failed' | 'done'>(task?.status || 'pending');
  const [priority, setPriority] = useState<string>(task?.priority?.toString() || '1'); // New state for priority
  const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setTimeBudget(task.timeBudget.toString());
      setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
      setStatus(task.status);
      setPriority(task.priority?.toString() || '1'); // Set priority from task
      setIsRecurring(task.isRecurring);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedTimeBudget = parseInt(timeBudget);
    if (isNaN(parsedTimeBudget) || parsedTimeBudget <= 0) {
      setError(t('taskForm.invalidTimeBudget'));
      setLoading(false);
      return;
    }

    const parsedPriority = parseInt(priority);
    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
      setError(t('tasks.invalidPriority')); // New translation key needed
      setLoading(false);
      return;
    }

    try {
      const payload = {
        goalId,
        name,
        description: description || undefined,
        timeBudget: parsedTimeBudget,
        deadline: deadline || undefined,
        status,
        priority: parsedPriority, // Include priority in payload
        isRecurring,
      };

      if (task) {
        // Update existing task
        await updateTask(task.id, payload);
      } else {
        // Create new task
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
        <CardTitle>{task ? t('tasks.editTask') : t('tasks.createTask')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('tasks.taskName')}</Label>
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
            <Label htmlFor="description">{t('tasks.taskDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="timeBudget">{t('tasks.timeBudget')} ({t('tasks.minutes')})</Label>
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
            <Label htmlFor="deadline">{t('tasks.deadline')}</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="status">{t('tasks.status')}</Label>
            <Select value={status} onValueChange={(value: 'pending' | 'started' | 'failed' | 'done') => setStatus(value)} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('tasks.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('tasks.taskStatus.pending')}</SelectItem>
                <SelectItem value="started">{t('tasks.taskStatus.started')}</SelectItem>
                <SelectItem value="failed">{t('tasks.taskStatus.failed')}</SelectItem>
                <SelectItem value="done">{t('tasks.taskStatus.done')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">{t('tasks.priority')}</Label>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked: boolean) => setIsRecurring(checked)}
              disabled={loading}
            />
            <Label htmlFor="isRecurring">{t('tasks.recurringTask')}</Label>
          </div>
          {error && <p className="text-red-500 text-sm">{t('workspace.error')}: {error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {t('workspace.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('workspace.saving') : (task ? t('workspace.saveChanges') : t('workspace.create'))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskForm;
