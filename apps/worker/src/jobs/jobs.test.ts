import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";
import { handleHello } from "./hello";
import { handleHeartbeat } from "./heartbeat";
import { parseEnv } from "../env";

const silentLogger = () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  return createLogger("info");
};

describe("hello job", () => {
  it("greets with a valid payload", () => {
    expect(handleHello({ name: "Staylo" }, silentLogger())).toBe("Hello, Staylo!");
  });

  it("rejects an invalid payload", () => {
    expect(() => handleHello({ name: "" }, silentLogger())).toThrow();
    expect(() => handleHello(null, silentLogger())).toThrow();
  });
});

describe("heartbeat job", () => {
  it("reports the time in IST", () => {
    // 2026-01-01T00:00:00Z is 05:30 in Asia/Kolkata
    const ist = handleHeartbeat(silentLogger(), new Date("2026-01-01T00:00:00Z"));
    expect(ist).toContain("05:30:00");
  });
});

describe("worker env", () => {
  it("defaults DATABASE_URL to local Supabase", () => {
    expect(parseEnv({}).DATABASE_URL).toContain("127.0.0.1:54322");
  });

  it("rejects a non-postgres URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow();
  });
});
