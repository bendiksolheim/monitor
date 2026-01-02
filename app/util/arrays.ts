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
