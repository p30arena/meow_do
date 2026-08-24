/**
 * Shared display helpers — single source of truth so every screen formats
 * durations and status colors identically.
 */

/** 90 -> "1h 30m", 45 -> "45m", 0 -> "0m" */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Seconds -> "HH:MM:SS" (live tracker display). */
export function formatSecondsAsClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

/**
 * Tailwind classes per task status. Semantic tokens (green/yellow/blue/red/muted)
 * consistent with the section dividers previously hardcoded in TaskList.
 */
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  running: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  started: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  pending: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  done: "bg-muted text-muted-foreground border-border",
};

/** Priority 1..10 -> flame icon count (visual weight instead of raw numbers). */
export function priorityFlames(priority: number): number {
  if (priority >= 9) return 3;
  if (priority >= 5) return 2;
  return 1;
}
