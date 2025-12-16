export function formatNotificationMessage(
  events: Array<{ service: string; ok: boolean }>,
): string | null {
  const failing = events.filter((e) => !e.ok);

  if (failing.length === 0) return null;

  const serviceNames = failing.map((e) => e.service);
  const count = serviceNames.length;
  const plural = count === 1 ? "service" : "services";

  let namesList: string;
  if (count === 1) {
    namesList = serviceNames[0];
  } else if (count === 2) {
    namesList = `${serviceNames[0]} and ${serviceNames[1]}`;
  } else {
    const last = serviceNames[serviceNames.length - 1];
    const rest = serviceNames.slice(0, -1).join(", ");
    namesList = `${rest} and ${last}`;
  }

  return `${count} ${plural} down: ${namesList}`;
}
