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
 * Get a high-quality favicon for a URL using Google's modern favicon service
 */
export function getFaviconUrl(url) {
  try {
    if (!url) return null;
    const domain = new URL(url).hostname;
    // s2 is more resilient than V2 (it returns a default globe icon instead of a 404 error)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
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
