export function sanitizeSensitiveError(error: unknown): string {
  const details = error instanceof Error ? error.stack || error.message : String(error);

  return details
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1[credentials-redacted]@")
    .replace(/((?:DATABASE_URL|password|token|secret)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[redacted]");
}