export function log(value: string) {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${value}`);
}
