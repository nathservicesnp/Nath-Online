import { describe, expect, it, vi } from "vitest";
import { createTrackingId } from "./requestStore";

describe("createTrackingId", () => {
  it("creates the expected public format", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(createTrackingId(new Date("2026-09-19T00:00:00Z"))).toBe("NOS-20260919-1000");
  });
});
