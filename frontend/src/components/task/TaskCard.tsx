import React from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical, Play, Square, Pencil, Clock, Trash2, Check } from "lucide-react";
import DescriptionViewer from "../common/DescriptionViewer";
import {
  formatMinutes,
  STATUS_BADGE_CLASSES,
  priorityFlames,
} from "../../lib/format";

export interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description?: string;
    timeBudget: number;
    deadline?: string;
    status: "pending" | "started" | "failed" | "done";
    priority: number;
    activeTracking?: { startTime: string; endTime?: string | null } | null;
  };
  /** Minutes spent today on this task (for the daily progress bar). */
  spentTodayMinutes: number;
  /** Overall minutes ever spent (shown in caption when available). */
  spentOverallMinutes?: number;
  isRunning: boolean;
  runningDisplay?: string;
  canStart: boolean;
  startBlockedReason?: string;
  onStart: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onEdit: () => void;
  onMarkDone?: (taskId: string) => void;
  userTimezone?: string;
  /** Optional extra actions surfaced in the card's overflow menu. */
  onManualRecord?: () => void;
  onDelete?: () => void;
}

/**
 * Compact, scannable task card:
 * - status as colored badge (not label:value prose)
 * - priority as flame count
 * - budget/spent as a single progress bar with human durations
 * - deadline only surfaced when near/overdue
 */
const TaskCard: React.FC<TaskCardProps> = ({
  task,
  spentTodayMinutes,
  spentOverallMinutes,
  isRunning,
  runningDisplay,
  canStart,
  startBlockedReason,
  onStart,
  onStop,
  onEdit,
  onMarkDone,
  userTimezone: timezone,
  onManualRecord,
  onDelete,
}) => {
  const { t } = useTranslation();
  const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const pct =
    task.timeBudget > 0 ? Math.round((spentTodayMinutes / task.timeBudget) * 100) : 0;
  const overBudget = pct > 100;

  // Deadline urgency: only surface when within 3 days or overdue.
  let deadlineNode: React.ReactNode = null;
  if (task.deadline) {
    const deadline = DateTime.fromISO(task.deadline, { zone: "utc" }).setZone(userTimezone);
    const daysLeft = Math.ceil(deadline.diffNow("days").days);
    if (daysLeft < 0) {
      deadlineNode = (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive" title={deadline.toLocaleString(DateTime.DATE_SHORT)}>
          <span aria-hidden="true">⚠</span>
          {t("today.overdue")}
          {" · "}
          {deadline.toRelative()}
        </span>
      );
    } else if (daysLeft <= 3) {
      deadlineNode = (
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          {deadline.toRelative()} · {deadline.toLocaleString(DateTime.DATE_SHORT)}
        </span>
      );
    }
  }

  const flames = priorityFlames(task.priority);
  const startedAt = isRunning && task.activeTracking?.startTime
    ? DateTime.fromISO(task.activeTracking.startTime, { zone: "utc" }).setZone(userTimezone)
    : null;

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, [role=menuitem], input, textarea, select")) return;
    onEdit();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <Card
      data-testid="task-card"
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={task.name}
      className={`cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isRunning ? "border-green-500/50 shadow-sm" : ""}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold leading-snug">{task.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`capitalize ${STATUS_BADGE_CLASSES[isRunning ? "running" : task.status] ?? ""}`}>
              {t(`tasks.statuses.${isRunning ? "running" : task.status}`)}
            </Badge>
            <span
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
              title={`${t("tasks.priority")}: ${task.priority}/10`}
            >
              {Array.from({ length: flames }).map((_, i) => (
                <Flame key={i} className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
              ))}
              <span className="sr-only">{`${t("tasks.priority")} ${task.priority}`}</span>
            </span>
            {deadlineNode}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 p-0" onClick={(event) => event.stopPropagation()}>
              <span className="sr-only">{t("workspace.openMenu")}</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="me-2 h-4 w-4" aria-hidden="true" />
              {t("workspace.edit")}
            </DropdownMenuItem>
            {onMarkDone && task.status !== "done" && !isRunning && (
              <DropdownMenuItem onClick={() => onMarkDone(task.id)}>
                <Check className="me-2 h-4 w-4" aria-hidden="true" />
                {t("tasks.markDone")}
              </DropdownMenuItem>
            )}
            {onManualRecord && (
              <DropdownMenuItem onClick={onManualRecord}>
                <Clock className="me-2 h-4 w-4" aria-hidden="true" />
                {t("tasks.manualRecord.add")}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                {t("workspace.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        {task.description && (
          <div className="text-sm text-muted-foreground">
            <DescriptionViewer description={task.description} />
          </div>
        )}

        {/* Budget vs today's spend */}
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium">{formatMinutes(spentTodayMinutes)}</span>
            <span className={`tabular-nums ${overBudget ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
              {formatMinutes(spentOverallMinutes ?? 0)} · {pct}%
              {overBudget && <span className="ms-1">({t("tasks.overBudget")})</span>}
            </span>
          </div>
          <Progress
            value={Math.min(100, pct)}
            aria-label={`${task.name}: ${formatMinutes(spentTodayMinutes)} / ${formatMinutes(task.timeBudget)}`}
            className={`h-2 ${overBudget ? "[&>div]:bg-destructive" : ""}`}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("tasks.timeBudget")}: {formatMinutes(task.timeBudget)}
          </p>
        </div>

        {/* Running banner with inline stop */}
        {isRunning && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-green-500/10 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-mono text-lg font-bold tabular-nums leading-none" role="timer" aria-live="off">
                {runningDisplay ?? "00:00:00"}
              </p>
              {startedAt && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("tasks.startedAt", { time: startedAt.toLocaleString(DateTime.TIME_SIMPLE) })}
                </p>
              )}
            </div>
            <Button size="sm" variant="destructive" onClick={() => onStop(task.id)} disabled={!task.activeTracking}>
              <Square className="me-1 h-3.5 w-3.5" aria-hidden="true" />
              {t("tasks.stopNow")}
            </Button>
          </div>
        )}

        {/* Primary action row for non-running cards */}
        {!isRunning && task.status !== "done" && (
          <div className="flex justify-end">
            {canStart ? (
              <Button size="sm" onClick={() => onStart(task.id)}>
                <Play className="me-1 h-3.5 w-3.5" aria-hidden="true" />
                {t("tasks.startTracking")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                title={startBlockedReason}
                aria-describedby={`${task.id}-start-blocked`}
              >
                <Play className="me-1 h-3.5 w-3.5" aria-hidden="true" />
                {t("tasks.startTracking")}
              </Button>
            )}
            {!isRunning && !canStart && (
              <span id={`${task.id}-start-blocked`} className="sr-only">{startBlockedReason}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
