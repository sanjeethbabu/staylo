import { z } from "zod";
import type { Logger } from "../logger";

/** Example on-demand job. Every job payload is validated with Zod before use. */
export const HELLO_QUEUE = "hello";

export const helloPayloadSchema = z.object({
  name: z.string().min(1).max(100),
});

export type HelloPayload = z.infer<typeof helloPayloadSchema>;

export function handleHello(data: unknown, logger: Logger): string {
  const { name } = helloPayloadSchema.parse(data);
  const message = `Hello, ${name}!`;
  logger.info("hello job processed", { queue: HELLO_QUEUE, message });
  return message;
}
