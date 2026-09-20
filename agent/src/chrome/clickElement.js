import { randomWait, randomPosition, randomMove, waitForVisibleElement } from './fundation.js';
import { scroll } from './scroll.js';

/**
 * Clicks an element using a realistic mouse sequence (move → press → release).
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {{ x: number, y: number }} oriPos - Current mouse position to move from.
 * @param {object} cdp - CDP client instance.
 * @param {boolean} [waitForLoad=false] - Whether to wait for page load after click.
 * @returns {Promise<{x: number, y: number}>} The clicked position, or oriPos on failure.
 */
async function clickElement(nodeId, oriPos, cdp, waitForLoad = false) {
  if (!nodeId) return oriPos;
  try {
    await scroll(nodeId, cdp);
    const pos = await randomPosition(nodeId, cdp);
    if (pos) {
      await randomMove(oriPos, pos, cdp);
      await cdp.Input.dispatchMouseEvent({ type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
      await randomWait(200, 400);
      await cdp.Input.dispatchMouseEvent({ type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
      if (waitForLoad) {
        await Promise.race([
          cdp.Page.loadEventFired(),
          randomWait(8000, 10000)
        ]);
      }
      await randomWait(500, 1000);
      return pos;
    }
    console.log(`[clickElement] nodeId=${nodeId}: no bounding box available, click skipped`);
  } catch (e) {
    console.log(`[clickElement] nodeId=${nodeId}: click failed —`, e && e.message);
  }
  return oriPos;
}

/**
 * Resolves an xpath to a visible/enabled element and clicks it, re-resolving
 * on retry if the node's box model has gone stale between the visibility
 * check and the click (e.g. pages that render several duplicate/hidden
 * candidate buttons — like Indeed's "Continue" button variants — and swap
 * which one is live mid-transition).
 * @param {object} cdp - CDP client instance.
 * @param {string} xpath - XPath identifying the element (may match several nodes).
 * @param {{ x: number, y: number }} pos - Current mouse position to move from.
 * @param {{ waitForLoad?: boolean, attempts?: number }} [options]
 * @returns {Promise<{x: number, y: number}>} The clicked position, or pos on failure.
 */
async function waitAndClick(cdp, xpath, pos, { waitForLoad = false, attempts = 3 } = {}) {
  let nodeId = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    nodeId = await waitForVisibleElement(cdp, xpath);
    // re-check right before clicking: waitForVisibleElement's own check can
    // be stale by the time we get here, especially while the page is still
    // mid-transition
    const box = await cdp.DOM.getBoxModel({ nodeId }).catch(() => null);
    if (box) {
      return await clickElement(nodeId, pos, cdp, waitForLoad);
    }
    console.log(`[waitAndClick] xpath=${xpath}: nodeId=${nodeId} box model gone right before click (attempt ${attempt}/${attempts}), re-resolving`);
    await randomWait(200, 400);
  }
  // out of retries — try once more with whatever we last resolved;
  // clickElement will log if it still fails
  return await clickElement(nodeId, pos, cdp, waitForLoad);
}

export { clickElement, waitAndClick };