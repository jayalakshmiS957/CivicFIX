/**
 * CivicResolve Date & Time Formatting Utilities
 * Standardized locale date formatting across citizen and administrative dashboards.
 */

/**
 * Formats an ISO date string into a human-readable civic timestamp.
 * @param {string|Date} dateVal - Valid Date instance or ISO timestamp string
 * @param {object} [options]
 * @param {boolean} [options.includeTime=false] - Whether to include hours and minutes
 * @returns {string} Formatted date string
 */
export function formatCivicDate(dateVal, { includeTime = false } = {}) {
  if (!dateVal) return 'Recently';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Recently';
    if (includeTime) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}
