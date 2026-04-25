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
    // Normalize URL for the service
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    // Using FaviconV2 for better quality and higher resolution (128px)
    return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${targetUrl}&size=128`;
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
