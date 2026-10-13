export function resolveUserTimezone(userTimezone?: string | null): string {
  if (userTimezone && userTimezone.trim().length > 0) return userTimezone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
