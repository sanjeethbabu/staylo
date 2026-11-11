import { describe, expect, it } from "vitest";
import { DB_PACKAGE } from "./index";

describe("@staylo/db", () => {
  it("is wired up", () => {
    expect(DB_PACKAGE).toBe("@staylo/db");
  });
});
