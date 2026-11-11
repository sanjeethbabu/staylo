/**
 * Minimal structured logger. Rule: never log guest PII, tokens or secrets.
 * Swapped for Sentry-aware logging in Phase 18.
 */
type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(minLevel: Level = "info") {
  const log = (level: Level, msg: string, meta?: Record<string, unknown>) => {
    if (order[level] < order[minLevel]) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
