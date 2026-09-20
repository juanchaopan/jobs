import { randomWait } from './fundation.js';
import { verifyHuman } from './security.js';
/**
 * Navigates to a URL, waits for load, then moves the mouse to a random viewport position.
 * @param {string} url - URL to navigate to.
 * @param {object} cdp - CDP client instance.
 * @returns {Promise<{x: number, y: number}>} The random mouse position after navigation.
 */
async function navigateTo(url, cdp) {
  await cdp.Page.navigate({ url });
  await Promise.race([
    cdp.Page.loadEventFired(),
    randomWait(8000, 10000)
  ]);
  await randomWait(500, 1000);

  const { visualViewport } = await cdp.Page.getLayoutMetrics();
  const x = Math.random() * visualViewport.clientWidth;
  const y = Math.random() * visualViewport.clientHeight;
  await cdp.Input.dispatchMouseEvent({ type: 'mouseMoved', x, y });
  await verifyHuman({ x, y }, cdp);

  await randomWait(500, 1000);

  return { x, y };
}

/**
 * Navigates back in the browser history, waits for the page to load,
 * moves the mouse to a random viewport position, and returns that position.
 * @param {{x: number, y: number}} origPos - Original mouse position before navigation.
 * @param {object} cdp - CDP client instance (must have Page and Input domains enabled).
 * @returns {Promise<{x: number, y: number}>} Random mouse position after navigation.
 */
async function navigateBack(origPos, cdp) {
  const { currentIndex, entries } = await cdp.Page.getNavigationHistory();
  const prev = entries[currentIndex - 1];
  if (!prev) return origPos;
  await cdp.Page.navigateToHistoryEntry({ entryId: prev.id });
  await randomWait(500, 1000);

  const { visualViewport } = await cdp.Page.getLayoutMetrics();
  const x = Math.random() * visualViewport.clientWidth;
  const y = Math.random() * visualViewport.clientHeight;
  await cdp.Input.dispatchMouseEvent({ type: 'mouseMoved', x, y });
  await randomWait(500, 1000);

  return { x, y };
}

export { navigateTo, navigateBack };