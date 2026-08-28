import { DateTime } from "luxon";

/**
 * Build a monotonic elapsed-time formatter for a running tracking record.
 *
 * Why not simply `DateTime.fromISO(start).diffNow()` each tick?
 * 1. Clock skew: the server stamps start_time with its own clock; if it is
 *    even slightly ahead of the browser clock, diffNow() is negative and
 *    luxon renders nonsense like "00:00:-05" (counting UP toward zero).
 * 2. Mid-session clock jumps (NTP sync) would make the display jump.
 *
 * This captures the elapsed baseline ONCE and advances it with the
 * monotonic wall-clock delta, clamping negatives to zero.
 */
export function createElapsedFormatter(
  startTimeIso: string,
): () => string {
  const start = DateTime.fromISO(startTimeIso, { zone: "utc" });
  // Positive ms since start; a future start (skew) yields 0.
  const baseElapsedMs = Math.max(0, -start.diffNow().milliseconds);
  const wallStart = Date.now();

  return () => {
    const elapsedMs = Math.max(0, baseElapsedMs + (Date.now() - wallStart));
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
  };
}
