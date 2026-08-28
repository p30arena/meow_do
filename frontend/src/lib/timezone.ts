export function resolveUserTimezone(userTimezone?: string | null): string {
  return userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}
