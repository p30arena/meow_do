import React from "react";
import { useTranslation } from "react-i18next";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../../api/task";
import TaskCard from "./TaskCard";

export type BoardStatus = Task["status"];
export const COLUMNS: BoardStatus[] = ["pending", "started", "done", "failed"];

interface BoardColumnProps {
  status: BoardStatus;
  tasks: Task[];
  activeId: string | null;
}

const BoardColumn: React.FC<BoardColumnProps> = ({ status, tasks, activeId }) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${t(`tasks.statuses.${status}`)} (${tasks.length})`}
      className={`flex min-h-40 flex-col gap-3 rounded-lg border p-3 ${isOver ? "border-primary bg-primary/5" : "bg-muted/30"}`}
    >
      <h2 className="flex items-center justify-between text-sm font-semibold">
        <span>{t(`tasks.statuses.${status}`)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums" aria-label={`${tasks.length}`}>
          {tasks.length}
        </span>
      </h2>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <SortableBoardCard key={task.id} task={task} dimmed={activeId === task.id} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              {t("board.dropHere")}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
};

const SortableBoardCard: React.FC<{ task: Task; dimmed: boolean }> = ({ task, dimmed }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || dimmed ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        spentTodayMinutes={0}
        isRunning={!!task.activeTracking && !task.activeTracking.endTime}
        canStart={false}
        onStart={() => undefined}
        onStop={() => undefined}
        onEdit={() => undefined}
      />
    </div>
  );
};

export default BoardColumn;
