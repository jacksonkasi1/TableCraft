/**
 * Format date to YYYY-MM-DD using local date components.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validate a YYYY-MM-DD date string.
 */
export function validateDateString(dateString: string): boolean {
  if (!dateString) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime());
}

/**
 * Parse a YYYY-MM-DD string to a Date object.
 */
export function parseDateFromUrl(dateString: string): Date | undefined {
  if (!validateDateString(dateString)) return undefined;
  return new Date(dateString);
}