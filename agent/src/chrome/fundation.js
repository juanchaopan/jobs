import { setTimeout } from 'timers/promises';

/**
 * Waits for a random duration between min and max milliseconds.
 * @param {number} min - Minimum wait time in ms.
 * @param {number} max - Maximum wait time in ms.
 */
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomWait(min, max) {
  await setTimeout(random(min, max));
}

/**
 * Returns a random viewport position inside a DOM node's bounding box.
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {object} cdp - CDP client instance.
 * @returns {Promise<{x: number, y: number}|null>} Viewport coordinates, or null if unavailable.
 */
async function randomPosition(nodeId, cdp) {
  if (!nodeId) return null;
  const { model } = await cdp.DOM.getBoxModel({ nodeId });
  if (!model || !model.content) return null;
  const quad = model.content;
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY),
  };
}

/**
 * Moves the mouse from origPos to pos in human-like curved steps with ease-in-out
 * interpolation, perpendicular jitter, and random inter-step delays.
 * @param {{ x: number, y: number }} origPos - Starting viewport position.
 * @param {{ x: number, y: number }} pos - Target viewport position.
 * @param {object} cdp - CDP client instance.
 */
async function randomMove(origPos, pos, cdp) {
  const steps = 8 + Math.floor(Math.random() * 8);
  const dx = pos.x - origPos.x;
  const dy = pos.y - origPos.y;
  const dist = Math.hypot(dx, dy) || 1;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const jitter = (Math.random() - 0.5) * 12 * Math.sin(Math.PI * t);
    await cdp.Input.dispatchMouseEvent({
      type: 'mouseMoved',
      x: origPos.x + dx * ease + (-dy / dist) * jitter,
      y: origPos.y + dy * ease + (dx / dist) * jitter,
    });
    await randomWait(10, 40);
  }
}

/**
 * Returns true if the node has a non-zero bounding box (i.e. is visible in the layout).
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {object} cdp - CDP client instance.
 * @returns {Promise<boolean>}
 */
async function visible(nodeId, cdp) {
  if (!nodeId) return false;
  const box = await cdp.DOM.getBoxModel({ nodeId }).catch(() => null);
  const c = box?.model?.content;
  if (!c) return false;
  const xs = [c[0], c[2], c[4], c[6]], ys = [c[1], c[3], c[5], c[7]];
  return (Math.max(...xs) - Math.min(...xs)) > 0 && (Math.max(...ys) - Math.min(...ys)) > 0;
}

async function enabled(nodeId, cdp) {
  if (!nodeId) return false;
  const { object } = await cdp.DOM.resolveNode({ nodeId }).catch(() => ({ object: null }));
  if (!object) return false;
  const { result } = await cdp.Runtime.callFunctionOn({
    functionDeclaration: 'function(){return !this.disabled}',
    objectId: object.objectId,
  });
  return result.value === true;
}

/**
 * Polls until the given XPath query matches at least one element, then resolves.
 * Rejects if the element is not found within the timeout.
 * @param {object} cdp
 * @param {string} xpath
 */
async function waitForElements(cdp, xpath) {
  const deadline = Date.now() + random(8000, 10000);
  while (Date.now() < deadline) {
    const { searchId, resultCount } = await cdp.DOM.performSearch({ query: xpath });
    if (resultCount > 0) {
      const { nodeIds } = await cdp.DOM.getSearchResults({ searchId, fromIndex: 0, toIndex: resultCount });
      await cdp.DOM.discardSearchResults({ searchId });
      return nodeIds;
    }
    await cdp.DOM.discardSearchResults({ searchId });
    await randomWait(50, 150);
  }
  throw new Error(`Timed out waiting for element: ${xpath}`);
}

async function waitForElement(cdp, xpath) {
  return (await waitForElements(cdp, xpath))[0];
}

/**
 * Polls all xpaths each iteration and resolves with the first one that appears.
 * @param {object} cdp
 * @param {Array<{key: string, xpath: string}>} entries
 * @returns {Promise<{key: string, searchId: string, resultCount: number}>}
 */
async function waitForAnyElement(cdp, entries) {
  const deadline = Date.now() + random(8000, 10000);
  while (Date.now() < deadline) {
    for (const { key, xpath } of entries) {
      const { searchId, resultCount } = await cdp.DOM.performSearch({ query: xpath });
      if (resultCount > 0) {
        await cdp.DOM.discardSearchResults({ searchId });
        return key;
      }
      await cdp.DOM.discardSearchResults({ searchId });
    }
    await randomWait(50, 150);
  }
  throw new Error('Timed out waiting for elements');
}

/**
 * Polls until at least one element matching xpath is both present and visible,
 * then returns its nodeId.
 * @param {object} cdp
 * @param {string} xpath
 * @returns {Promise<number>} nodeId of the first visible matching element
 */
async function waitForVisibleElement(cdp, xpath) {
  const deadline = Date.now() + random(8000, 10000);
  while (Date.now() < deadline) {
    const { searchId, resultCount } = await cdp.DOM.performSearch({ query: xpath });
    if (resultCount > 0) {
      const { nodeIds } = await cdp.DOM.getSearchResults({ searchId, fromIndex: 0, toIndex: resultCount });
      await cdp.DOM.discardSearchResults({ searchId });
      const id = (await Promise.all(nodeIds.map(async id => (await visible(id, cdp)) && (await enabled(id, cdp)) ? id : null))).find(id => id != null);
      if (id != null) return id;
    } else {
      await cdp.DOM.discardSearchResults({ searchId });
    }
    await randomWait(100, 200);
  }
  throw new Error(`Timed out waiting for visible element: ${xpath}`);
}

async function waitForElementGone(cdp, xpath) {
  const deadline = Date.now() + random(8000, 10000);
  while (Date.now() < deadline) {
    const { searchId, resultCount } = await cdp.DOM.performSearch({ query: xpath });
    await cdp.DOM.discardSearchResults({ searchId });
    if (resultCount === 0) return;
    await randomWait(100, 200);
  }
  throw new Error(`Timed out waiting for element to disappear: ${xpath}`);
}

export { random, randomWait, randomPosition, randomMove, visible, enabled, waitForElement, waitForElements, waitForAnyElement, waitForVisibleElement, waitForElementGone };