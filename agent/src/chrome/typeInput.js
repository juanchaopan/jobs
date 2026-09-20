import { randomWait, randomPosition } from './fundation.js';
import { clickElement } from './clickElement.js';

/** Maps shifted symbols to their unshifted base key. */
const SHIFT_SYMBOL_MAP = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
  '~': '`',
};

/**
 * Dispatches a single character as keyDown → char → keyUp, holding Shift when needed.
 * @param {string} ch - Single character to type.
 * @param {object} cdp - CDP client instance.
 */
async function dispatchChar(ch, cdp) {
  const isUpperLetter = /^[A-Z]$/.test(ch);
  const isShiftSymbol = ch in SHIFT_SYMBOL_MAP;
  const needsShift = isUpperLetter || isShiftSymbol;

  const baseCh = isUpperLetter ? ch.toLowerCase()
    : isShiftSymbol ? SHIFT_SYMBOL_MAP[ch]
      : ch;

  const code = /^[a-z]$/i.test(baseCh) ? `Key${baseCh.toUpperCase()}`
    : /^[0-9]$/.test(baseCh) ? `Digit${baseCh}`
      : '';

  if (needsShift) {
    await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Shift', code: 'ShiftLeft', modifiers: 8 });
    await randomWait(50, 150);
  }
  await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: ch, code, modifiers: needsShift ? 8 : 0 });
  await cdp.Input.dispatchKeyEvent({ type: 'char', text: ch, modifiers: needsShift ? 8 : 0 });
  await randomWait(50, 150);
  await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: ch, code, modifiers: needsShift ? 8 : 0 });
  await randomWait(50, 150);
  if (needsShift) {
    await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Shift', code: 'ShiftLeft', modifiers: 0 });
    await randomWait(50, 150);
  }
}

/**
 * Checks whether the given node is document.activeElement.
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {object} cdp - CDP client instance.
 * @returns {Promise<boolean>}
 */
async function isFocused(nodeId, cdp) {
  const { object } = await cdp.DOM.resolveNode({ nodeId }).catch(() => ({ object: null }));
  if (!object) return false;
  const { result } = await cdp.Runtime.callFunctionOn({
    objectId: object.objectId,
    functionDeclaration: 'function(){ return document.activeElement === this; }',
  }).catch(() => ({ result: { value: false } }));
  return result.value === true;
}

/**
 * Clicks an input node then types text with realistic key events and random delays.
 *
 * cdp.Input.dispatchKeyEvent is a page-level event, not bound to nodeId — it goes
 * wherever document.activeElement currently is. Typing a long answer character by
 * character can take tens of seconds, and if something else on the page (e.g. an
 * unexpected popup) steals focus mid-type, the remaining keystrokes would silently
 * leak into whatever now has focus instead of the intended field. To guard against
 * that, focus is re-verified before every character; a one-time re-click is
 * attempted to recover it, and typing aborts loudly if that doesn't work.
 *
 * @param {number} nodeId - CDP DOM nodeId.
 * @param {string} text - Text to type.
 * @param {{ x: number, y: number }} origPos - Current mouse position to move from.
 * @param {object} cdp - CDP client instance.
 * @param {{ pressTab?: boolean }} [options] - Set pressTab to false to skip the trailing Tab press, e.g. for filter inputs inside a popup that closes on blur.
 * @returns {Promise<{x: number, y: number}>} Final mouse position after clicking.
 */
async function typeInput(nodeId, text, origPos, cdp, { pressTab = true } = {}) {
  let pos = await clickElement(nodeId, origPos, cdp);
  if (!pos) return origPos;

  const ensureFocused = async (context) => {
    if (await isFocused(nodeId, cdp)) return;
    console.log(`[typeInput] nodeId=${nodeId}: not focused (${context}), attempting to re-click`);
    pos = await clickElement(nodeId, pos, cdp);
    if (await isFocused(nodeId, cdp)) return;
    console.log(`[typeInput] nodeId=${nodeId}: still not focused after re-click (${context}) — another element likely stole focus, aborting to avoid leaking text into it`);
    throw new Error(JSON.stringify({ status: 'Aborted', reason: `Lost input focus while typing (${context}) and could not recover — an unexpected element (e.g. a popup) likely stole focus` }));
  };

  await ensureFocused('before clearing existing value');

  await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Control', code: 'ControlLeft', modifiers: 2 });
  await randomWait(200, 400);
  await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 });
  await randomWait(200, 400);
  await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 });
  await randomWait(200, 400);
  await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Control', code: 'ControlLeft', modifiers: 0 });
  await randomWait(200, 400);
  // CDP synthetic key events don't trigger native browser text-selection (Ctrl+A).
  // Call select() directly to put the field into a selected state so Backspace can clear it.
  const { object } = await cdp.DOM.resolveNode({ nodeId });
  await cdp.Runtime.callFunctionOn({ objectId: object.objectId, functionDeclaration: 'function() { this.select(); }' });

  await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Delete', code: 'Delete', modifiers: 0 });
  await randomWait(200, 400);
  await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Delete', code: 'Delete', modifiers: 0 });
  await randomWait(200, 400);

  for (const ch of text) {
    await ensureFocused('mid-typing');
    await dispatchChar(ch, cdp);
  }

  if (pressTab) {
    await cdp.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 0 });
    await randomWait(200, 400);
    await cdp.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 0 });
    await randomWait(200, 400);
  }

  return pos;
}

export { typeInput };