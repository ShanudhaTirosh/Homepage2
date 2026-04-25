/**
 * Utility helpers used across the app.
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extract hostname from a URL for display
 */
export function shortUrl(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url || '';
  }
}

/**
 * Get the Google Favicon URL for a domain
 */
export function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

/**
 * Validate a URL string
 */
export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
