import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { LayoutGrid } from "lucide-react";
import { getTasksByGoalId, updateTask, type Task } from "../../api/task";
import TaskCard from "./TaskCard";
import BoardColumn, { type BoardStatus, COLUMNS } from "./BoardColumn";

interface BoardViewProps {
  workspaceId: string;
  goalId: string;
}

/**
 * Phase A kanban board: one board per goal, columns = task status.
 * Touch-capable drag-and-drop (Pointer + Touch sensors); drops persist
 * status + position through updateTask with optimistic rollback.
 */
const BoardView: React.FC<BoardViewProps> = ({ workspaceId, goalId }) => {
  void workspaceId;
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const fetchTasks = async () => {
    setError(null);
    try {
      const data = await getTasksByGoalId(goalId);
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchTasks();
  }, [goalId]);

  const byColumn = useMemo(() => {
    const map = new Map<BoardStatus, Task[]>(COLUMNS.map((s) => [s, []]));
    for (const task of tasks) map.get(task.status)?.push(task);
    for (const list of map.values()) list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) ?? null : null;

  const persistMove = async (taskId: string, toStatus: BoardStatus, toIndex: number) => {
    const prev = tasks;
    const moving = prev.find((task) => task.id === taskId);
    if (!moving) return;
    const siblings = (byColumn.get(toStatus) ?? [])
      .filter((task) => task.id !== taskId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const clamped = Math.max(0, Math.min(toIndex, siblings.length));
    const reordered = [...siblings.slice(0, clamped), { ...moving, status: toStatus }, ...siblings.slice(clamped)];
    const positionOf = new Map(reordered.map((task, i) => [task.id, i]));
    setTasks(prev.map((task) => {
      if (task.id === taskId) return { ...task, status: toStatus, position: positionOf.get(taskId) ?? clamped };
      if (task.status === toStatus) return { ...task, position: positionOf.get(task.id) ?? task.position ?? 0 };
      return task;
    }));
    setAnnouncement(t("board.moved", { name: moving.name, status: t(`tasks.statuses.${toStatus}`) }));
    try {
      await updateTask(taskId, { status: toStatus, position: positionOf.get(taskId) ?? clamped });
      await Promise.all(
        reordered.filter((task) => task.id !== taskId)
          .map((task) => updateTask(task.id, { position: positionOf.get(task.id) ?? 0 })),
      );
      await fetchTasks();
    } catch (err: unknown) {
      setTasks(prev);
      setError(err instanceof Error ? err.message : t("workspace.error"));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    // over.id is either a column ("col:pending") or another task id.
    if (overId.startsWith("col:")) {
      const toStatus = overId.slice(4) as BoardStatus;
      const list = byColumn.get(toStatus) ?? [];
      const fromStatus = tasks.find((task) => task.id === taskId)?.status;
      const toIndex = fromStatus === toStatus
        ? Math.max(0, list.findIndex((task) => task.id === taskId))
        : list.length;
      void persistMove(taskId, toStatus, toIndex);
      return;
    }
    const overTask = tasks.find((task) => task.id === overId);
    if (!overTask) return;
    const column = byColumn.get(overTask.status) ?? [];
    void persistMove(taskId, overTask.status, Math.max(0, column.findIndex((task) => task.id === overId)));
  };

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        {t("loading")}
      </div>
    );
  }

  return (
    <div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span>{t("workspace.error")}: {error}</span>
          <button type="button" className="underline underline-offset-4" onClick={() => void fetchTasks()}>
            {t("retry")}
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status) => (
            <BoardColumn key={status} status={status} tasks={byColumn.get(status) ?? []} activeId={activeId} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="opacity-90" aria-hidden="true">
              <TaskCard
                task={activeTask}
                spentTodayMinutes={0}
                isRunning={false}
                canStart={false}
                onStart={() => undefined}
                onStop={() => undefined}
                onEdit={() => undefined}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {tasks.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-semibold">{t("board.title")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("board.empty")}</p>
        </div>
      )}
    </div>
  );
};

export default BoardView;
