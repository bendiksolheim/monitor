import { type Event } from "~/events";

export function formatNotificationMessage(
  services: Array<Event>
): string | null {
  const numberDown = services.filter((e) => !e.ok).length;
  if (numberDown === 0) {
    return null;
  } else {
    const joinedNames = services
      .filter((e) => !e.ok)
      .map((service) => service.service)
      .join(", ");
    const names = joinedNames.replace(/, (?!.*,)/g, " and ");
    return `${numberDown} service${numberDown > 1 ? "s" : ""} down: ${names}`;
  }
}
