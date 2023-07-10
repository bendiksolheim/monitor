const HOUR = 60 * 60;
const MINUTE = 60;

export function relativeTimeSince(date: Date): string {
  // TODO: This is insane, but it seems Prisma types to a Date but actually
  // returns a string
  const d = new Date(date);
  let since = Math.round((Date.now() - d.getTime()) / 1000);
  let parts = [];
  if (since >= HOUR) {
    const hours = Math.floor(since / HOUR);
    since = since - hours * HOUR;
    parts.push(`${hours} hours`);
  }
  if (since >= MINUTE) {
    const minutes = Math.floor(since / MINUTE);
    since = since - minutes * MINUTE;
    parts.push(`${minutes} minutes`);
  }
  if (since > 0) {
    parts.push(`${since} seconds`);
  }

  return parts.join(", ") + " ago";
}
