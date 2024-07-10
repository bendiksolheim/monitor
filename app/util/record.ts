export function mapValues<T, U>(
  rec: Record<PropertyKey, T>,
  fn: (v: T) => U
): Record<PropertyKey, U> {
  return Object.keys(rec)
    .map((key) => {
      const value = rec[key];
      return [key, fn(value)] as [PropertyKey, U];
    })
    .reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});
}
