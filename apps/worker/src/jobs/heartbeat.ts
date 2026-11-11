import type { Logger } from "../logger";
import { formatINR } from "@staylo/core";

/**
 * Example scheduled job: runs every minute and only logs.
 * Real schedules (night audit, reminders) follow this pattern with a hotel timezone.
 */
export const HEARTBEAT_QUEUE = "heartbeat";
export const HEARTBEAT_CRON = "* * * * *";
export const HEARTBEAT_TZ = "Asia/Kolkata";

export function handleHeartbeat(logger: Logger, now: Date = new Date()): string {
  const istTime = now.toLocaleString("en-IN", { timeZone: HEARTBEAT_TZ, hour12: false });
  logger.info("heartbeat", { queue: HEARTBEAT_QUEUE, ist: istTime, sample: formatINR(100) });
  return istTime;
}
