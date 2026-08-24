import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { DateTime } from "luxon";
import DescriptionViewer from "../common/DescriptionViewer";

interface GoalListProps {
  workspaceId: string;
  onCreateNew: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

const GoalList: React.FC<GoalListProps> = ({
  workspaceId,
  onCreateNew,
  onEditGoal,
  onDeleteGoal,
}) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null); // State to hold goal to delete

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGoalsByWorkspaceId(workspaceId);
      setGoals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGoals();
  }, [workspaceId]);

  const confirmDelete = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const executeDelete = async () => {
    if (!goalToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await onDeleteGoal(goalToDelete.id);
      await fetchGoals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setLoading(false);
      setGoalToDelete(null);
    }
  };

  if (loading && goals.length === 0) {
    return <div role="status" aria-live="polite">{t("loadingGoals")}</div>;
  }

  if (error && goals.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p>{t("workspace.error")}: {error}</p>
        <Button variant="outline" onClick={() => void fetchGoals()}>{t("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span>{t("workspace.error")}: {error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>{t("close")}</Button>
        </div>
      )}
      <h2 className="mb-4 text-2xl font-bold">{t("goals.title")}</h2>
      <Button className="my-4" onClick={onCreateNew} disabled={loading}>
        {t("createGoal")}
      </Button>
      {goals.length === 0 ? (
        <p>{t("goals.noGoalsYet")}</p>
      ) : (
        <div className="flex flex-wrap justify-start gap-4">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(30%-0.7rem)]"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  <Link className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={`/workspaces/${workspaceId}/goals/${goal.id}`}>
                    {goal.name}
                  </Link>
                </CardTitle>
                {goal.hasRunningTask && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span
                      className="relative inline-flex rounded-full h-3 w-3 bg-green-500"
                      title={t("goals.runningTask")}
                    ></span>
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <DescriptionViewer description={goal.description} />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      goal.status === "reached"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                    }
                  >
                    {t(`goalStatus.${goal.status}`)}
                  </Badge>
                  {goal.deadline && (() => {
                    const deadline = DateTime.fromISO(goal.deadline).setZone(
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                    );
                    const daysLeft = Math.ceil(deadline.diffNow("days").days);
                    if (daysLeft < 0) {
                      return (
                        <span className="text-xs font-medium text-destructive">
                          ⚠ {deadline.toRelative()}
                        </span>
                      );
                    }
                    if (daysLeft <= 3) {
                      return (
                        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                          {deadline.toRelative()} · {deadline.toLocaleString(DateTime.DATE_SHORT)}
                        </span>
                      );
                    }
                    return null; // far-out deadlines stay off the card
                  })()}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("goals.tasks")}: {goal.taskCount ?? 0}
                    </span>
                    <span className={`tabular-nums ${((goal.totalProgress ?? 0) >= 100) ? "font-semibold text-green-600 dark:text-green-400" : "font-medium"}`}>
                      {goal.totalProgress != null && !isNaN(goal.totalProgress)
                        ? `${goal.totalProgress.toFixed(0)}%`
                        : "0%"}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, goal.totalProgress ?? 0)}
                    className="h-2"
                    aria-label={`${goal.name}: ${goal.totalProgress?.toFixed(0) ?? 0}%`}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 w-9 p-0">
                        <span className="sr-only">{t("workspace.openMenu")}</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditGoal(goal)}>{t("workspace.edit")}</DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => confirmDelete(goal)} className="text-destructive">
                            {t("workspace.delete")}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        {goalToDelete && (
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("goals.confirmDelete", { goalName: goalToDelete.name })}</AlertDialogTitle>
                              <AlertDialogDescription>{t("confirmDeleteDescription")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => { setGoalToDelete(null); setError(null); }}>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void executeDelete()}>
                                {t("workspace.delete")}
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
    </div>
  );
};

export default GoalList;
