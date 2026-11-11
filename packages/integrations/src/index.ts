/**
 * Adapters for external providers live here (payments, messaging, email, KYC, channel manager).
 * Each adapter = interface + mock implementation + real implementation selected by env.
 */
export type AdapterMode = "mock" | "live";

export function resolveAdapterMode(value: string | undefined): AdapterMode {
  return value === "live" ? "live" : "mock";
}
