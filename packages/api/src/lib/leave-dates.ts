const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns an error message, or null when the leave range is valid.
 * Round-trips through Date to catch rollovers like "2024-02-30".
 */
export function validateLeaveRange(startDate: string, endDate: string): string | null {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return "Dates must be in YYYY-MM-DD format";
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) {
    return `"${startDate}" is not a real date`;
  }
  if (Number.isNaN(end.getTime()) || end.toISOString().slice(0, 10) !== endDate) {
    return `"${endDate}" is not a real date`;
  }
  if (end < start) return "End date must be on or after start date";
  return null;
}
