/**
 * Generate a unique payment amount by adding random piasters.
 *
 * This helps verify manual payments (InstaPay, Vodafone Cash) by making
 * each transaction amount unique, so it can be matched against bank records.
 *
 * Example: 200 EGP → 200.37 EGP (unique per transaction)
 *
 * The piasters range is 01-99 to avoid .00 amounts (which look like
 * the user just rounded) and to ensure uniqueness within a reasonable window.
 */
export function generateUniqueAmount(baseAmount: number): number {
  // Generate random piasters between 1 and 99
  const piasters = Math.floor(Math.random() * 99) + 1;
  // Combine: e.g., 200 + 0.37 = 200.37
  return Math.round((Math.floor(baseAmount) + piasters / 100) * 100) / 100;
}

/**
 * Format a unique amount for display, always showing 2 decimal places.
 * Example: 200.37 → "200.37"
 */
export function formatUniqueAmount(amount: number): string {
  return amount.toFixed(2);
}
