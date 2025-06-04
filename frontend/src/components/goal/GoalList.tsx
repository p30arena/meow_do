import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGoalsByWorkspaceId, type Goal } from "../../api/goal";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
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

interface GoalListProps {
  workspaceId: string;
  onCreateNew: () => void;
  onEditGoal: (goal: Goal) => void;
  onSelectGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

const GoalList: React.FC<GoalListProps> = ({
  workspaceId,
  onCreateNew,
  onEditGoal,
  onSelectGoal,
  onDeleteGoal,
}) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null); // State to hold goal to delete

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

  const confirmDelete = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const executeDelete = async () => {
    if (goalToDelete) {
      setLoading(true);
      setError(null);
      try {
        await onDeleteGoal(goalToDelete.id);
        fetchGoals(); // Re-fetch goals after deletion
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setGoalToDelete(null); // Clear the goal to delete
      }
    }
  };

  if (loading) {
    return <div>{t("loadingGoals")}</div>;
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
      <h2 className="text-2xl font-bold mb-4">{t("goals.title")}</h2>
      {goals.length === 0 ? (
        <p>{t("goals.noGoalsYet")}</p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-start">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              onClick={() => onSelectGoal(goal)}
              className="cursor-pointer w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)]"
            >
              <CardHeader>
                <CardTitle>{goal.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{goal.description || t("goals.noDescription")}</p>
                <p>
                  <strong>{t("status")}:</strong>{" "}
                  {t(`goalStatus.${goal.status}`)}
                </p>
                {goal.deadline && (
                  <p>
                    <strong>{t("deadline")}:</strong>{" "}
                    {new Date(goal.deadline).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditGoal(goal);
                    }}
                  >
                    {t("workspace.edit")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(goal);
                        }}
                      >
                        {t("workspace.delete")}
                      </Button>
                    </AlertDialogTrigger>
                    {goalToDelete && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("goals.confirmDelete", {
                              goalName: goalToDelete.name,
                            })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("confirmDeleteDescription")}{" "}
                            {/* Assuming a generic description key */}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("cancel")}</AlertDialogCancel>
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
      <Button className="mt-4" onClick={onCreateNew}>
        {t("createGoal")}
      </Button>
    </div>
  );
};

export default GoalList;
