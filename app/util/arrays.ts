export function group<T>(
  array: Array<T>,
  fn: (v: T) => string
): Record<string, Array<T>> {
  const initial: Record<string, Array<T>> = {};
  return array.reduce((groups, v) => {
    const group = fn(v);
    groups[group] = groups[group] ?? [];
    groups[group].push(v);
    return groups;
  }, initial);
}

export function last<T>(array: Array<T>): T | null {
  if (array.length === 0) {
    return null;
  } else {
    return array[array.length - 1];
  }
}
