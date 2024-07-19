import { type Event } from "~/events";

export function formatNotificationMessage(
  services: Array<Event>
): string | null {
  const numberDown = services.filter((e) => !e.ok).length;
  if (numberDown === 0) {
    return null;
  } else {
    return `${numberDown} service${numberDown > 1 ? "s" : ""} down`;
  }
}
