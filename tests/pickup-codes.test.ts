import { describe, expect, it } from "vitest";
import { createPickupCodeValue, getExpiryDate } from "@/lib/pickup-codes";

describe("pickup code helpers", () => {
  it("creates readable random codes with no ambiguous characters", () => {
    const code = createPickupCodeValue();

    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it("sets expiry seven days later", () => {
    const base = new Date("2026-05-02T00:00:00.000Z");

    const expires = getExpiryDate(base);

    expect(expires.toISOString()).toBe("2026-05-09T00:00:00.000Z");
  });
});
