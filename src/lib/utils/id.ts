/**
 * Generate a unique ID using crypto.randomUUID()
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a UUID v4 using crypto.randomUUID()
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
