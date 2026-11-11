import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// connection string")
    .default("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): WorkerEnv {
  return envSchema.parse(source);
}
