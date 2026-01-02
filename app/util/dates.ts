export function oneDayAgo(): Date {
  const now = Date.now();
  return new Date(now - 24 * 60 * 60 * 1000);
}
