const actionLastRunAt = new Map<string, number>();

export const DEFAULT_ACTION_GUARD_MS = 300;

/**
 * Global tap guard to prevent accidental double-trigger for navigation/modal actions.
 */
export function runWithActionGuard<T>(
  key: string,
  action: () => T,
  windowMs: number = DEFAULT_ACTION_GUARD_MS,
): T | undefined {
  const now = Date.now();
  const last = actionLastRunAt.get(key) || 0;

  if (now - last < windowMs) {
    return undefined;
  }

  actionLastRunAt.set(key, now);
  return action();
}

export function clearActionGuard(key?: string): void {
  if (key) {
    actionLastRunAt.delete(key);
    return;
  }

  actionLastRunAt.clear();
}
