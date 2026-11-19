/** Only same-site paths: blocks open redirects like ?next=//evil.com or ?next=https://evil.com. */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || /\p{Cc}/u.test(next)) return fallback;
  return next;
}
