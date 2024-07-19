import { type Event } from "../app/events";
import { expect, test } from "vitest";
import { formatNotificationMessage } from "../server/healthchecks/format-notification-message";
import { range } from "~/util/arrays";

test("single services down", () => {
  const events = randomEvents(1);
  const message = formatNotificationMessage(events);
  expect(message).toBe("1 service down");
});

test("multiple services down", () => {
  const events = randomEvents(2);
  const message = formatNotificationMessage(events);
  expect(message).toBe("2 services down");
});

test("no services down", () => {
  const events = randomEvents(0);
  const message = formatNotificationMessage(events);
  expect(message).toBeNull();
});

function randomEvents(n: number): Array<Event> {
  return range(n).map((_) => {
    return {
      id: 0,
      service: "my-service",
      ok: false,
      created: new Date(),
      latency: 100,
    };
  });
}
