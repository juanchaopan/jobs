import { randomWait } from './fundation.js';

/**
 * Scrolls the page so the node's center is near the viewport center.
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {object} cdp - CDP client instance.
 * @returns {Promise<{x:number,y:number}|void>} viewport-center coords after scroll.
 */
async function scroll(nodeId, cdp) {
  if (!nodeId) return;
  const box = await cdp.DOM.getBoxModel({ nodeId }).catch(() => null);
  const c = box?.model?.content;
  if (!c) return;
  const xs = [c[0], c[2], c[4], c[6]];
  const ys = [c[1], c[3], c[5], c[7]];

  const lm = await cdp.Page.getLayoutMetrics();
  const lv = lm.cssLayoutViewport || {};
  const vw = lv.clientWidth || 0;
  const vh = lv.clientHeight || 0;

  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // skip scroll if element is already fully visible in viewport
  if (minX >= 0 && maxX <= vw && minY >= 0 && maxY <= vh) return;

  const centerX = (minX + maxX) / 2 + (lv.pageX || 0);
  const centerY = (minY + maxY) / 2 + (lv.pageY || 0);

  const targetX = Math.max(0, Math.round(centerX - vw / 2));
  const targetY = Math.max(0, Math.round(centerY - vh / 2));

  await cdp.Runtime.evaluate({ expression: `window.scrollTo({ left: ${targetX}, top: ${targetY}, behavior: 'instant' })` });
  await randomWait(150, 300);
}

export { scroll };
