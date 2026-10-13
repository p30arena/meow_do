import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { getAllTasks, type Task } from "../../api/task";
import { resolveUserTimezone } from "../../lib/timezone";
import { useAuth } from "../../context/AuthContext";

interface CalendarViewProps {
  onOpenTask: (task: Task) => void;
}

/**
 * Phase C (frontend-first slice): month grid fed by existing getAllTasks,
 * filtered on deadline in the user's timezone. No new schema.
 */
const CalendarView: React.FC<CalendarViewProps> = ({ onOpenTask }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userTimezone = resolveUserTimezone(user?.timezone);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => DateTime.now().startOf("month"));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllTasks();
        if (!cancelled) setTasks(data.filter((task) => task.status !== "done" && task.deadline));
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("workspace.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [t]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.deadline) continue;
      const key = DateTime.fromISO(task.deadline, { zone: "utc" }).setZone(userTimezone).toISODate() ?? "";
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks, userTimezone]);

  const weeks = useMemo(() => {
    const start = cursor.setZone(userTimezone).startOf("week");
    return Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => start.plus({ weeks: w, days: d })),
    );
  }, [cursor, userTimezone]);

  const todayKey = DateTime.now().setZone(userTimezone).toISODate();
  const selectedTasks = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  if (loading) return <div role="status" aria-live="polite">{t("loading")}</div>;

  return (
    <div>
      {error && <p className="mb-4 text-sm text-destructive" role="alert">{t("workspace.error")}: {error}</p>}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" aria-label={t("calendar.prevMonth")} onClick={() => setCursor((c) => c.minus({ months: 1 }))}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
        <h2 className="text-lg font-semibold" aria-live="polite">
          {cursor.setZone(userTimezone).toLocaleString({ month: "long", year: "numeric" })}
        </h2>
        <Button variant="outline" size="icon" aria-label={t("calendar.nextMonth")} onClick={() => setCursor((c) => c.plus({ months: 1 }))}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weeks[0].map((day) => (
          <span key={day.toISODate()}>{day.toLocaleString({ weekday: "short" })}</span>
        ))}
      </div>
      <CalendarGrid weeks={weeks} byDay={byDay} cursor={cursor} todayKey={todayKey ?? ""} userTimezone={userTimezone} selectedDay={selectedDay} onSelect={setSelectedDay} />
      {selectedDay && (
        <DayTasks day={selectedDay} tasks={selectedTasks} onOpenTask={onOpenTask} />
      )}
    </div>
  );
};

const CalendarGrid: React.FC<{
  weeks: DateTime[][];
  byDay: Map<string, Task[]>;
  cursor: DateTime;
  todayKey: string;
  userTimezone: string;
  selectedDay: string | null;
  onSelect: (day: string) => void;
}> = ({ weeks, byDay, cursor, todayKey, userTimezone, selectedDay, onSelect }) => (
  <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="calendar">
    {weeks.flat().map((day) => {
      const key = day.toISODate() ?? "";
      const items = byDay.get(key) ?? [];
      const inMonth = day.month === cursor.month;
      const isToday = key === todayKey;
      const overdue = items.some((task) => task.deadline && DateTime.fromISO(task.deadline, { zone: "utc" }).setZone(userTimezone) < DateTime.now().setZone(userTimezone).startOf("day"));
      return (
        <button
          key={`${key}-${day.weekNumber}`}
          type="button"
          onClick={() => onSelect(key)}
          aria-label={`${day.toLocaleString(DateTime.DATE_FULL)} (${items.length})`}
          aria-pressed={selectedDay === key}
          className={`flex min-h-14 flex-col items-center justify-start gap-1 rounded-md border p-1 text-xs ${!inMonth ? "opacity-40" : ""} ${isToday ? "border-primary bg-primary/5 font-bold" : ""} ${overdue ? "border-destructive/50" : ""}`}
        >
          <span className="tabular-nums">{day.day}</span>
          {items.length > 0 && (
            <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${overdue ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
              {items.length}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

const DayTasks: React.FC<{ day: string; tasks: Task[]; onOpenTask: (task: Task) => void }> = ({ day, tasks, onOpenTask }) => {
  const { t } = useTranslation();
  return (
    <section aria-label={day} className="mt-4 rounded-lg border p-3">
      <h3 className="mb-2 text-sm font-semibold">{day}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("calendar.noTasks")}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <button type="button" className="w-full truncate text-start text-sm underline underline-offset-4" onClick={() => onOpenTask(task)}>
                {task.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CalendarView;
