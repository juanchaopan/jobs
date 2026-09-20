import { randomWait, randomMove } from './fundation.js';
import fs from 'fs';

// ── Logging & diagnostics ─────────────────────────────────────────────────────

function log(...args) {
  try {
    const line = `[${new Date().toISOString()}] ` + args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    fs.appendFileSync('/tmp/security.log', line + '\n');
  } catch (e) {
    try { console.error('log write error', e && e.message); } catch (_) {}
  }
}

// Structured log — [key] prefix matches dump filenames for correlation:
//   log line  → [key] ...
//   dump file → /tmp/bframe_<ts>_<key>.html
function logd(key, ...args) {
  log(`[${key}]`, ...args);
}

// Snapshot the bframe <body>. The bframe session has Runtime.enable called,
// so one cdpEval replaces the old DOM.getDocument→querySelectorAll→getOuterHTML chain.
async function dump(key, sessionId, cdp) {
  if (!sessionId) return;
  try {
    const ts = Date.now();
    const safe = String(key).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
    const html = await cdpEval(cdp, sessionId, 'document.body.outerHTML');
    const path = `/tmp/bframe_${ts}_${safe}.html`;
    fs.writeFileSync(path, html);
    log(`[dump:${key}]`, path);
  } catch (e) {
    log(`[${key}] dump error`, e && e.message);
  }
}

// ── CDP helpers ───────────────────────────────────────────────────────────────

// Evaluate a JS expression in a CDP flatten session and return the result value.
async function cdpEval(cdp, sessionId, expression) {
  const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
  return result.value;
}

// ── Cloudflare Turnstile ──────────────────────────────────────────────────────

// Walk CDP DOM nodes + shadow roots to collect INPUT nodeIds.
function collectInputs(node) {
  const ids = [];
  if (node.nodeName === 'INPUT') ids.push(node.nodeId);
  for (const c of node.children || []) ids.push(...collectInputs(c));
  for (const sr of node.shadowRoots || []) {
    for (const c of sr.children || []) ids.push(...collectInputs(c));
  }
  return ids;
}

async function verifyHuman(origPos, cdp) {
  try {
    const { result } = await cdp.Runtime.evaluate({
      expression: `document.querySelector('h1#heading')?.innerText?.trim()`,
      returnByValue: true,
    });
    if (result.value !== 'Additional Verification Required') return origPos;
    logd('vh_detected');

    // The Turnstile iframe lives inside <template shadowrootmode="closed"> on the main page,
    // so DOM.getFrameOwner/getBoxModel can't reach it. Find it via Target API instead.
    await cdp.Target.setDiscoverTargets({ discover: true });
    let cfTargetId = null;
    const findDeadline = Date.now() + 15000;
    while (!cfTargetId && Date.now() < findDeadline) {
      await randomWait(500, 1000);
      const { targetInfos } = await cdp.Target.getTargets();
      const t = targetInfos.find(t => t.type === 'iframe' && t.url.includes('challenges.cloudflare.com'));
      logd('vh_cfTarget', t ? t.url.substring(0, 80) : null);
      if (t) cfTargetId = t.targetId;
    }
    if (!cfTargetId) { logd('vh_targetNotFound'); return origPos; }

    let sessionId = null;
    try {
      ({ sessionId } = await cdp.Target.attachToTarget({ targetId: cfTargetId, flatten: true }));
      await cdp.send('DOM.enable', {}, sessionId);
      logd('vh_sessionAttached');
      await dump('vh_sessionAttached', sessionId, cdp);

      // The widget renders inside a closed shadow root on document.body — Runtime.evaluate can't
      // see it. DOM.getDocument with pierce:true traverses closed shadow roots via CDP.
      let cbRect = null;
      const cbDeadline = Date.now() + 15000;
      while (!cbRect && Date.now() < cbDeadline) {
        await randomWait(500, 1000);
        const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true }, sessionId);
        const inputIds = collectInputs(root);
        logd('vh_inputIds', inputIds);
        for (const nodeId of inputIds) {
          try {
            const { model } = await cdp.send('DOM.getBoxModel', { nodeId }, sessionId);
            if (!model || model.width === 0) continue;
            const q = model.content;
            cbRect = { x: (q[0]+q[2]+q[4]+q[6])/4, y: (q[1]+q[3]+q[5]+q[7])/4 };
          } catch (_) {}
          if (cbRect) break;
        }
      }

      if (!cbRect) {
        logd('vh_checkboxNotFound');
        await dump('vh_checkboxNotFound', sessionId, cdp);
        return origPos;
      }

      const { x, y } = cbRect;
      logd('vh_clicking', x, y);
      await randomWait(1000, 3000);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
      await randomWait(200, 400);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
      logd('vh_clicked');
    } finally {
      if (sessionId) await cdp.Target.detachFromTarget({ sessionId }).catch(() => {});
    }

    await Promise.race([cdp.Page.loadEventFired(), randomWait(10000, 12000)]);
    console.log('[VH:16] page loaded / timeout, returning');
    return origPos;
  } catch (e) {
    console.log('[VH:ERR]', e && e.message);
    logd('vh_error', e && e.message);
    return origPos;
  }
}

// ── reCAPTCHA helpers ─────────────────────────────────────────────────────────

// Check if the anchor iframe shows the green checkmark.
// Attaches a fresh session — safety-net call only (see reCaptcha()).
async function anchorIsChecked(anchorTargetId, cdp) {
  let sid = null;
  try {
    ({ sessionId: sid } = await cdp.Target.attachToTarget({ targetId: anchorTargetId, flatten: true }));
    await cdp.send('Runtime.enable', {}, sid);
    const checked = await cdpEval(cdp, sid,
      `!!document.querySelector('#recaptcha-anchor[aria-checked="true"]')`);
    return !!checked;
  } catch { return false; }
  finally { if (sid) await cdp.Target.detachFromTarget({ sessionId: sid }).catch(() => {}); }
}

// ── Challenge solver ──────────────────────────────────────────────────────────

async function readTiles(cdp, sessionId) {
  return await cdpEval(cdp, sessionId,
    `Array.from(document.querySelectorAll('td.rc-imageselect-tile')).map(td => ({
      id: parseInt(td.id, 10),
      url: (td.querySelector('img') || {src: ''}).src,
      selected: td.classList.contains('rc-imageselect-checked'),
      fading:   td.classList.contains('rc-imageselect-dynamic-selected'),
    }))`
  ) ?? [];
}

async function clickTile(cdp, sessionId, clickId) {
  const r = await cdpEval(cdp, sessionId,
    `(() => { const el = document.querySelector('td[id="${Number(clickId)}"]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left, t: b.top, w: b.width, h: b.height }; })()`
  );
  if (!r || !r.w) { logd(`por_tileNotFound_${clickId}`); return; }
  const x = r.l + r.w * (0.3 + Math.random() * 0.4);
  const y = r.t + r.h * (0.3 + Math.random() * 0.4);
  await randomWait(300, 700);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
  await randomWait(100, 300);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
  logd(`por_tileClicked_${clickId}`, x, y);
  await randomWait(200, 500);
}

// Poll until every clicked tile is fully settled:
//   4×4 static  → tile gets rc-imageselect-checked (selected, no new image coming)
//   3×3 dynamic → tile fade completes (rc-imageselect-dynamic-selected removed) AND URL changed
// The 4-second CSS opacity transition means we need up to ~6 s for 3×3 replacements.
async function waitForTileReplacements(cdp, sessionId, clickedUrls) {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    const tiles = await readTiles(cdp, sessionId);
    const byId = new Map(tiles.map(t => [t.id, t]));
    const allSettled = [...clickedUrls.entries()].every(([id, origUrl]) => {
      const t = byId.get(id);
      if (!t) return true;
      if (t.selected) return true;             // 4×4: tile selected, no replacement coming
      return !t.fading && t.url !== origUrl;   // 3×3: fade done + new image URL loaded
    });
    if (allSettled) return;
    await randomWait(300, 500);
  }
  logd('por_replacementTimeout');
}

async function clickVerify(cdp, sessionId) {
  await randomWait(500, 1000);
  const vr = await cdpEval(cdp, sessionId,
    `(() => { const el = document.getElementById('recaptcha-verify-button');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left, t: b.top, w: b.width, h: b.height }; })()`
  );
  if (!vr || !vr.w) { logd('por_verifyNotFound'); await dump('por_verifyNotFound', sessionId, cdp); return; }
  const vx = vr.l + vr.w * (0.3 + Math.random() * 0.4);
  const vy = vr.t + vr.h * (0.3 + Math.random() * 0.4);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: vx, y: vy, button: 'left', clickCount: 1 }, sessionId);
  await randomWait(100, 300);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: vx, y: vy, button: 'left', clickCount: 1 }, sessionId);
  logd('por_verifyClicked');
  await dump('por_verifyClicked', sessionId, cdp);
}

// Poll for the image grid. If the challenge expired, reCAPTCHA shows a reload button —
// click it so a fresh grid loads rather than hanging on the expiry screen.
// Returns true once the grid is visible, false if the timeout elapses.
async function waitForGrid(cdp, sessionId, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const gridVisible = await cdpEval(cdp, sessionId,
      `!!document.querySelector('table.rc-imageselect-table-33,table.rc-imageselect-table-44')`
    ).catch(() => false);
    if (gridVisible) return true;
    await cdpEval(cdp, sessionId,
      `document.getElementById('recaptcha-reload-button')?.click()`
    ).catch(() => {});
    await randomWait(500, 500);
  }
  return false;
}

// Evaluate and click matching tiles in a loop until no new tiles need clicking, then verify.
// Handles dynamic 3×3 (tiles replace immediately after each click) and static 4×4.
// Returns without verifying if the grid disappears mid-round (challenge expired) —
// handleChallenge recovers by calling waitForGrid, which reloads the fresh grid.
// sessionId is owned by handleChallenge — do not attach or detach here.
async function processOneRound(cdp, callback, sessionId) {
  try {
    const prompt = String(await cdpEval(cdp, sessionId,
      `(document.querySelector('.rc-imageselect-desc-no-canonical,.rc-imageselect-desc')||{innerText:''}).innerText.trim()`
    ) ?? '');
    logd('por_prompt', prompt);

    // Track URLs already sent to the AI this round. After clicking a tile its URL changes
    // (reCAPTCHA replaces it), so the new URL will not be in this set and will be re-evaluated.
    // Unchanged tiles (same URL) are marked done and skipped — no redundant AI calls.
    const evaluatedUrls = new Set();

    for (let iter = 0; iter < 8; iter++) {
      // Guard: do not call the AI if the grid has already disappeared (challenge expired).
      const gridVisible = await cdpEval(cdp, sessionId,
        `!!document.querySelector('table.rc-imageselect-table-33,table.rc-imageselect-table-44')`
      );
      if (!gridVisible) { logd(`por_gridGone_iter${iter}`); return; }

      const rawTiles = await readTiles(cdp, sessionId);
      // selected  → 4×4 tile already chosen, skip (no replacement coming)
      // fading    → 3×3 tile mid-transition, do NOT skip — wait for the new URL in the next iter
      // evaluatedUrls → URL already sent to AI this round; skip unless it was replaced (new URL)
      const images = rawTiles.map(t => ({ ...t, done: t.selected || evaluatedUrls.has(t.url) }));
      const active = images.filter(t => !t.done);
      logd(`por_iter${iter}`, { total: images.length, active: active.length });
      await dump(`por_iter${iter}`, sessionId, cdp);

      if (active.length === 0) break;

      const toClick = await callback({ prompt, images });
      logd(`por_iter${iter}_toClick`, toClick);

      // Mark all tiles we just evaluated so they are skipped next iteration.
      // Clicked tiles will get new URLs after replacement — those new URLs won't be
      // in evaluatedUrls, so they will be re-evaluated correctly.
      for (const t of active) evaluatedUrls.add(t.url);

      if (!toClick || toClick.length === 0) break;

      const clickedUrls = new Map(
        toClick.map(id => [id, (images.find(t => t.id === id) || {}).url ?? null])
      );

      for (const clickId of toClick) {
        await clickTile(cdp, sessionId, clickId);
      }

      await waitForTileReplacements(cdp, sessionId, clickedUrls);
    }

    await clickVerify(cdp, sessionId);
  } catch (e) {
    logd('por_error', e && e.message);
    await dump('por_error', sessionId, cdp);
  }
}

// Drive all challenge rounds until the anchor confirms solved or rounds exhaust.
// Returns true if solved (confirmed via persistent anchor session),
// false otherwise (reCaptcha() will safety-net recheck and retry).
async function handleChallenge(cdp, callback, anchorTargetId) {
  logd('hc_start');

  let bframeTargetId = null;
  for (let i = 0; i < 16; i++) {
    const { targetInfos } = await cdp.Target.getTargets();
    const bframe = targetInfos.find(t => t.type === 'iframe' && t.url.includes('bframe'));
    if (bframe) { bframeTargetId = bframe.targetId; break; }
    await randomWait(500, 500);
  }
  if (!bframeTargetId) {
    logd('hc_bframeNotFound');
    // Instant pass: reCAPTCHA skipped the challenge and checked the box silently.
    if (anchorTargetId && await anchorIsChecked(anchorTargetId, cdp).catch(() => false)) {
      logd('hc_instantPass');
      return true;
    }
    // Checkbox did not open a challenge — widget is locked (expired session or rate-limit).
    throw new Error(JSON.stringify({ status: 'Aborted', reason: 'ReCaptcha locked' }));
  }

  // Attach to bframe and anchor once for the entire challenge lifetime.
  // Keeping both sessions alive prevents reCAPTCHA from detecting a CDP disconnect
  // between rounds and CSS-moving the grid to top:-9999px.
  let sessionId = null;
  let anchorSessionId = null;
  let solved = false;
  let abort = null;
  try {
    ({ sessionId } = await cdp.Target.attachToTarget({ targetId: bframeTargetId, flatten: true }));
    await cdp.send('DOM.enable',     {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    logd('hc_sessionAttached');
    await dump('hc_sessionAttached', sessionId, cdp);

    // If the verify button is disabled, this is a stale/error challenge from a previous session.
    // A fresh challenge always has the verify button enabled.
    const verifyDisabled = await cdpEval(cdp, sessionId,
      `!!document.querySelector('#recaptcha-verify-button[disabled]')`
    ).catch(() => false);
    logd('hc_verifyCheck', verifyDisabled);
    if (verifyDisabled) {
      abort = new Error(JSON.stringify({ status: 'Aborted', reason: 'ReCaptcha locked' }));
    }

    if (anchorTargetId) {
      try {
        ({ sessionId: anchorSessionId } = await cdp.Target.attachToTarget({ targetId: anchorTargetId, flatten: true }));
        await cdp.send('Runtime.enable', {}, anchorSessionId);
        logd('hc_anchorSessionAttached');
      } catch (e) {
        logd('hc_anchorSessionAttachError', e && e.message);
      }
    }

    // Pre-check: if anchor is already checked (instant pass), skip rounds.
    if (anchorSessionId) {
      const preChecked = await cdpEval(cdp, anchorSessionId,
        `!!document.querySelector('#recaptcha-anchor[aria-checked="true"]')`
      ).catch(() => false);
      logd('hc_anchorPreCheck', preChecked);
      if (preChecked) solved = true;
    }

    if (!solved && !abort) for (let round = 0; round < 8; round++) {
      logd(`hc_round${round}_waitForGrid`);
      if (!await waitForGrid(cdp, sessionId)) { logd(`hc_gridNotFound_r${round}`); break; }
      await dump(`hc_gridReady_r${round}`, sessionId, cdp);

      await processOneRound(cdp, callback, sessionId);
      await randomWait(2000, 4000);

      if (anchorSessionId) {
        try {
          const anchorState = await cdpEval(cdp, anchorSessionId,
            `(() => {
              const checked = !!document.querySelector('#recaptcha-anchor[aria-checked="true"]');
              const text = document.body ? document.body.innerText : '';
              const expired = !checked && typeof text === 'string' && text.toLowerCase().includes('expired');
              return { checked, expired, text: text.substring(0, 100) };
            })()`
          );
          solved = !!(anchorState && anchorState.checked);
          logd(`hc_anchorCheck_r${round}`, anchorState);
          if (anchorState && anchorState.expired) { logd(`hc_anchorExpired_r${round}`); break; }
        } catch (e) {
          logd(`hc_anchorCheckError_r${round}`, e && e.message);
        }
      } else {
        logd(`hc_anchorCheck_r${round}`, solved);
      }
      if (solved) break;
    }
  } catch (e) {
    logd('hc_error', e && e.message);
    await dump('hc_error', sessionId, cdp);
  } finally {
    if (anchorSessionId) await cdp.Target.detachFromTarget({ sessionId: anchorSessionId }).catch(() => {});
    if (sessionId)       await cdp.Target.detachFromTarget({ sessionId }).catch(() => {});
    logd('hc_done', solved);
  }
  if (abort) throw abort;
  return solved;
}

// ── Main entry point ──────────────────────────────────────────────────────────

// One attempt = one checkbox click + up to 8 challenge rounds inside handleChallenge.
// reCAPTCHA's risk score is tied to persistent signals (fingerprint/cookies/IP), not to
// this session — repeated failures raise that score and reCAPTCHA responds by escalating
// (harder grids, more rounds) rather than ever issuing a passing token. Retrying the same
// session forever just grinds against an escalating wall, so give up after a few attempts
// and let the caller decide (e.g. mark the job Aborted, rotate identity, try later).
const RECAPTCHA_MAX_ATTEMPTS = 3;

async function reCaptcha(origPos, cdp, callback) {
  logd('rc_start');
  // Set once here — findAnchorTargetId and handleChallenge share this session.
  await cdp.Target.setDiscoverTargets({ discover: true });

  let attempt = 0;
  try {
    while (true) {
      attempt++;
      // Single JS eval: find the visible 304×78 checkbox iframe (not the 256×60 badge),
      // scroll it into view (synchronous with behavior:'instant'), return post-scroll
      // viewport coordinates and sitekey k= — all in one round-trip.
      const { result: { value: cf } } = await cdp.Runtime.evaluate({
        expression: `(() => {
          for (const f of document.querySelectorAll('iframe[title="reCAPTCHA"]')) {
            const r = f.getBoundingClientRect();
            if (r.width >= 280 && r.height >= 60 && r.height <= 100) {
              f.scrollIntoView({ block: 'nearest', behavior: 'instant' });
              const r2 = f.getBoundingClientRect();
              return { left: r2.left, top: r2.top, right: r2.right, bottom: r2.bottom,
                       k: (f.src.match(/[?&]k=([^&]+)/) || [])[1] || '' };
            }
          }
          return null;
        })()`,
        returnByValue: true,
      });
      if (!cf) { logd('rc_noIframe'); return origPos; }

      // Find the anchor target — both anchors coexist when a page has multiple reCAPTCHAs,
      // so we match by the sitekey k= extracted above.
      const { targetInfos } = await cdp.Target.getTargets();
      const anchorTarget = targetInfos.find(t =>
        t.type === 'iframe' && t.url.includes('anchor') && (!cf.k || t.url.includes(cf.k))
      );
      const anchorTargetId = anchorTarget ? anchorTarget.targetId : null;
      logd('rc_anchorTargetId', anchorTargetId);

      // Click the checkbox circle (≈ 10% from left, 50% from top of the iframe).
      const x = cf.left + (cf.right  - cf.left) * 0.1;
      const y = cf.top  + (cf.bottom - cf.top)  * 0.5;
      await randomWait(1000, 3000);
      await randomMove(origPos, { x, y }, cdp);
      await cdp.Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await randomWait(200, 400);
      await cdp.Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      origPos = { x, y };
      logd('rc_checkboxClicked', origPos);

      // Brief pause for reCAPTCHA to decide: instant-pass or trigger a challenge.
      await randomWait(2000, 3000);

      let solved = false;
      if (callback) {
        // handleChallenge returns true only when it confirmed solved via the persistent anchor session.
        // It returns false on round-exhaustion or when anchorSessionId was unavailable.
        solved = await handleChallenge(cdp, callback, anchorTargetId);
      } else {
        await Promise.race([cdp.Page.loadEventFired(), randomWait(10000, 12000)]);
      }

      await randomWait(1500, 2500);

      // Safety-net recheck: only needed when handleChallenge didn't confirm solved itself
      // (round exhaustion or missing anchor session). Skip the extra attach when already sure.
      if (!solved && anchorTargetId) {
        solved = await anchorIsChecked(anchorTargetId, cdp);
      }
      logd('rc_solved', solved);
      if (solved) return origPos;

      if (attempt >= RECAPTCHA_MAX_ATTEMPTS) {
        logd('rc_giveUp', { attempt });
        throw new Error(JSON.stringify({
          status: 'Aborted',
          reason: `ReCaptcha stuck in escalation after ${attempt} failed attempts`,
        }));
      }

      logd('rc_retrying', { attempt });
      await randomWait(3000, 5000);
    }
  } catch (e) {
    logd('rc_error', e && e.message);
    throw e;
  }
}

export { verifyHuman, reCaptcha };
