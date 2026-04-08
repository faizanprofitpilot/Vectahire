export function markSessionStartTime(ref: { current: number }) {
  ref.current = performance.now();
}

export function elapsedSecondsSince(ref: { current: number }): number {
  return (performance.now() - ref.current) / 1000;
}
