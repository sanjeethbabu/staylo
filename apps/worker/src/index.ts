import { PgBoss } from "pg-boss";
import { parseEnv } from "./env";
import { createLogger } from "./logger";
import { HELLO_QUEUE, handleHello, type HelloPayload } from "./jobs/hello";
import { HEARTBEAT_CRON, HEARTBEAT_QUEUE, HEARTBEAT_TZ, handleHeartbeat } from "./jobs/heartbeat";

const env = parseEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);

async function main(): Promise<void> {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
  boss.on("error", (err: Error) => logger.error("pg-boss error", { error: err.message }));

  await boss.start();
  logger.info("worker started", { schema: "pgboss" });

  // Queues must exist before sending / scheduling.
  await boss.createQueue(HELLO_QUEUE);
  await boss.createQueue(HEARTBEAT_QUEUE);

  await boss.work<HelloPayload>(HELLO_QUEUE, async (jobs) => {
    for (const job of jobs) handleHello(job.data, logger);
  });

  await boss.work(HEARTBEAT_QUEUE, async () => {
    handleHeartbeat(logger);
  });

  await boss.schedule(HEARTBEAT_QUEUE, HEARTBEAT_CRON, null, { tz: HEARTBEAT_TZ });
  logger.info("scheduled job registered", { queue: HEARTBEAT_QUEUE, cron: HEARTBEAT_CRON });

  // Example: enqueue one hello job on startup.
  await boss.send(HELLO_QUEUE, { name: "Staylo" } satisfies HelloPayload);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker stopping", { signal });
    await boss.stop({ graceful: true, timeout: 10_000 });
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  logger.error("worker failed to start", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
