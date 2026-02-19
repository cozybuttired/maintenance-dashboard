/**
 * Format cost code for display
 * Converts DIESEL_2 -> DIESEL 2
 * Converts 05223_1 -> 05223 1
 */
export const formatCostCode = (code) => {
  if (!code) return '';
  return code
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount) => {
  if (!amount) return 'R0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-ZA').format(date);
};
