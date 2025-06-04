import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGoalsByWorkspaceId, type Goal } from '../../api/goal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface GoalListProps {
  workspaceId: string;
  onCreateNew: () => void;
  onEditGoal: (goal: Goal) => void;
  onSelectGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

const GoalList: React.FC<GoalListProps> = ({ workspaceId, onCreateNew, onEditGoal, onSelectGoal, onDeleteGoal }) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      const data = await getGoalsByWorkspaceId(workspaceId);
      setGoals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [workspaceId]);

  const handleDeleteGoal = async (goal: Goal) => {
    if (window.confirm(t('goal.confirmDelete', { goalName: goal.name }))) {
      setLoading(true);
      setError(null);
      try {
        await onDeleteGoal(goal.id);
        fetchGoals(); // Re-fetch goals after deletion
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div>{t('loadingGoals')}</div>;
  }

  if (error) {
    return <div>{t('workspace.error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('goals.title')}</h2>
      {goals.length === 0 ? (
        <p>{t('goals.noGoalsYet')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} onClick={() => onSelectGoal(goal)} className="cursor-pointer">
              <CardHeader>
                <CardTitle>{goal.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{goal.description || t('noDescription')}</p>
                <p><strong>{t('status')}:</strong> {t(`goalStatus.${goal.status}`)}</p>
                {goal.deadline && <p><strong>{t('deadline')}:</strong> {new Date(goal.deadline).toLocaleDateString()}</p>}
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEditGoal(goal); }}>{t('workspace.edit')}</Button>
                  <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal); }}>{t('workspace.delete')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-4" onClick={onCreateNew}>{t('createGoal')}</Button>
    </div>
  );
};

export default GoalList;
