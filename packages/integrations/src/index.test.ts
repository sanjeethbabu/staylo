import { describe, expect, it } from "vitest";
import { resolveAdapterMode } from "./index";

describe("resolveAdapterMode", () => {
  it("defaults to mock unless explicitly live", () => {
    expect(resolveAdapterMode(undefined)).toBe("mock");
    expect(resolveAdapterMode("anything")).toBe("mock");
    expect(resolveAdapterMode("live")).toBe("live");
  });
});
