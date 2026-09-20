import CDP from 'chrome-remote-interface';

/**
 * Connects to a Chrome DevTools Protocol instance.
 * 
 * @param {object} options - Optional connection options.
 * @param {string} options.host - The host of the CDP instance.
 * @param {number} options.port - The port of the CDP instance.
 * @returns {Promise<object>} Resolves to a CDP client instance.
 */
async function connectCDP(options = {}) {
  const host = options.host || process.env.DEVTOOLS_HOST || '127.0.0.1';
  const port = options.port || parseInt(process.env.DEVTOOLS_PORT) || 9222;
  return CDP({ ...options, host, port });
}

/**
 * Resolves a potentially relative href against the Indeed base URL.
 * @param {string} href - The URL or path to normalize.
 * @returns {string} Absolute URL string.
 */
function normalizeUrl(href) {
  try {
    return new URL(href, 'https://www.indeed.com').toString();
  } catch (e) {
    return href;
  }
}

export { connectCDP, normalizeUrl };