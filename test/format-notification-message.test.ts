import { type Event } from "../app/events";
import { expect, test } from "vitest";
import { formatNotificationMessage } from "../server/format-notification-message";
import { range } from "~/util/arrays";

test("no services down", () => {
  const events = randomEvents(0);
  const message = formatNotificationMessage(events);
  expect(message).toBeNull();
});

test("single service down", () => {
  const events = randomEvents(1);
  const message = formatNotificationMessage(events);
  expect(message).toBe("1 service down: my-service-0");
});

test("two services down", () => {
  const events = randomEvents(2);
  const message = formatNotificationMessage(events);
  expect(message).toBe("2 services down: my-service-0 and my-service-1");
});

test("three services down", () => {
  const events = randomEvents(3);
  const message = formatNotificationMessage(events);
  expect(message).toBe(
    "3 services down: my-service-0, my-service-1 and my-service-2"
  );
});

test("one down, one up", () => {
  const events = randomEvents(2);
  events[1].ok = true;
  const message = formatNotificationMessage(events);
  expect(message).toBe("1 service down: my-service-0");
});

function randomEvents(n: number): Array<Event> {
  return range(n).map((m) => {
    return {
      id: 0,
      service: `my-service-${m}`,
      ok: false,
      created: new Date(),
      latency: 100,
    };
  });
}
