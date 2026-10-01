const buckets = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

export function withinDailyLimit(timestamps: number[], now: number, limit = 5): boolean {
  const cutoff = now - 86_400_000;
  return timestamps.filter((t) => t >= cutoff).length < limit;
}
