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

export function range(size: number, step: number = 1): Array<number> {
  return [...Array(size).keys()]
    .map((_, i) => i * step)
    .filter((value) => value < size);
}

export function zip<T, U>(a: Array<T>, b: Array<U>): Array<[T, U]> {
  return a.map((x, i) => {
    return [x, b[i]];
  });
}

export function max<T>(a: Array<T>): T | undefined {
  if (a.length === 0) {
    return undefined;
  } else {
    return a.reduce((max, cur) => (cur > max ? cur : max), a[0]);
  }
}
