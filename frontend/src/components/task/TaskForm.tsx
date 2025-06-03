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

    try {
      const payload = {
        goalId,
        name,
        description: description || undefined,
        timeBudget: parsedTimeBudget,
        deadline: deadline || undefined,
        status,
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
        <CardTitle>{task ? t('editTask') : t('createTask')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('taskName')}</Label>
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
            <Label htmlFor="description">{t('taskDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="timeBudget">{t('timeBudget')} ({t('minutes')})</Label>
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
            <Label htmlFor="deadline">{t('deadline')}</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="status">{t('status')}</Label>
            <Select value={status} onValueChange={(value: 'pending' | 'started' | 'failed' | 'done') => setStatus(value)} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('taskStatus.pending')}</SelectItem>
                <SelectItem value="started">{t('taskStatus.started')}</SelectItem>
                <SelectItem value="failed">{t('taskStatus.failed')}</SelectItem>
                <SelectItem value="done">{t('taskStatus.done')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked: boolean) => setIsRecurring(checked)}
              disabled={loading}
            />
            <Label htmlFor="isRecurring">{t('recurringTask')}</Label>
          </div>
          {error && <p className="text-red-500 text-sm">{t('error')}: {error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : (task ? t('saveChanges') : t('create'))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskForm;
