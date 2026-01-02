import { test, expect, describe } from "vitest";
import { heartbeats } from "../server/config";

describe("Heartbeat config parsing", () => {
  test("accepts healthchecks.io type with uuid", () => {
    const config = {
      type: "healthchecks.io",
      uuid: "12345678-1234-1234-1234-123456789012",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(true);
  });

  test("accepts httpbin type without uuid", () => {
    const config = {
      type: "httpbin",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(true);
  });

  test("rejects healthchecks.io without uuid", () => {
    const config = {
      type: "healthchecks.io",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });

  test("rejects invalid heartbeat type", () => {
    const config = {
      type: "invalid",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });

  test("rejects healthchecks.io with invalid uuid format", () => {
    const config = {
      type: "healthchecks.io",
      uuid: "not-a-valid-uuid",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });
});
