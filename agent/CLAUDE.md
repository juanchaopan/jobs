# CLAUDE.md — Session Changelog

This file documents all changes made during the AI-assisted development session on 2026-06-01.

---

## 1. `src/chrome/security.js` — Persistent bframe session across all challenge rounds

### Problem

Between every challenge round, the reCAPTCHA image grid was CSS-hidden for ~2 seconds. The log showed the pattern:

```
17:32:10.762  processOneRound detached          ← finally block in processOneRound
                                                  ← reCAPTCHA hides grid immediately
17:32:12.992  isChallengeActive attach/detach   ← own session, own detach
17:32:12.995  processOneRound phase1 attached   ← new session, grid reappears
```

**Root cause:** reCAPTCHA JS interprets every CDP session disconnect as "user left" and immediately CSS-moves the challenge container to `top: -9999px`. The old `processOneRound` attached its own session in `try` and detached it unconditionally in `finally`, causing a detach/reattach cycle for every single round.

### Solution

**`handleChallenge`** now owns the bframe CDP session for the **entire challenge** (all rounds):

- Attaches to bframe **once** (`cdp.Target.attachToTarget`) after finding `bframeTargetId`, **before** entering the round loop.
- Calls `DOM.enable` and `Runtime.enable` **once** on the session.
- The round-loop grid poll uses the **existing session** — no `isChallengeActive` call (which was attaching/detaching its own session each time). Instead, `DOM.getDocument` + `DOM.querySelectorAll` run directly through the persistent session.
- Passes `sessionId` as the 6th argument to `processOneRound`.
- Detaches **only once**, in a `finally` block at the end of `handleChallenge` (after all rounds complete or the challenge is solved).

```js
// NEW: handleChallenge owns the session
let sessionId = null;
try {
  ({ sessionId } = await cdp.Target.attachToTarget({ targetId: bframeTargetId, flatten: true }));
  await cdp.send('DOM.enable',     {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  for (let round = 0; round < 8; round++) {
    // Poll using existing session — no attach/detach, no flicker
    const { root: gr } = await cdp.send('DOM.getDocument', {}, sessionId);
    // ... querySelectorAll for table.rc-imageselect-table[-33|-44] ...

    origPos = await processOneRound(origPos, bframeOwnerNodeId, bframeTargetId, cdp, callback, sessionId);
    await randomWait(2000, 4000); // post-verify pause — session stays open
  }
} finally {
  if (sessionId) await cdp.Target.detachFromTarget({ sessionId }).catch(() => {});
}
```

**`processOneRound`** no longer owns a session:

- Signature changed from `(origPos, bframeOwnerNodeId, bframeTargetId, cdp, callback)` to `(origPos, bframeOwnerNodeId, bframeTargetId, cdp, callback, sessionId)`.
- Removed: internal `cdp.Target.attachToTarget` call.
- Removed: `DOM.enable` / `Runtime.enable` calls (done once by `handleChallenge`).
- Removed: the `finally` block that called `cdp.Target.detachFromTarget` — this was the direct cause of the inter-round flicker.
- All tile reading, callback invocation, tile clicks, and Verify button click are unchanged; they continue to use `Input.dispatchMouseEvent` with bframe-relative coordinates.

**`isChallengeActive`** is kept in the file for reference but is no longer called in the main round loop.

### Result

The bframe session stays connected for all 8 possible rounds. reCAPTCHA never detects a disconnect during the challenge, so the image grid never disappears between rounds.

---

## 2. `src/agents/solveCaptchaAgent.ts` — Redesigned vision model strategy

### Problem (old design)

The old agent looped over every tile individually. For **composite grids** (where all N×N tiles share a single sprite-sheet URL), it was making 9 or 16 identical model API calls, each with the full sprite image and "focus ONLY on the single cell at row R, column C" in the prompt. The vision model could not reliably perform mental cropping, leading to poor accuracy.

Additionally, the **mixed-round case** (after some tiles are clicked and refreshed with new individual URLs) was broken: sprite tiles still sent the full sprite image to `solveIndividualTiles`, which asked "does this image contain X?" — the model saw the entire sprite (which does contain the target) and said yes for every remaining sprite tile.

### Key insight — reCAPTCHA sprite sheets

reCAPTCHA bundles all tile photos into a single sprite image as one HTTP request. Each tile `<img>` element has:
- The **same `src` URL** as all other tiles in the same grid.
- A unique `style` attribute (`top: -100%; left: -200%` etc.) that uses CSS percentage-based panning to crop the appropriate region of the large sprite.

The sprite image itself is an N×N composite of individual tile photos arranged in a regular grid. A single model call with the full sprite image can identify all matching cells at once.

### New design

**Detection** — group tiles by URL instead of a single composite boolean:

```typescript
const urlToTiles = new Map<string, Array<{ id: number; url: string }>>();
for (const tile of images) {
    const group = urlToTiles.get(tile.url) ?? [];
    group.push(tile);
    urlToTiles.set(tile.url, group);
}
// group.length > 1 → sprite group → Case A
// group.length === 1 → individual/refreshed tile → Case B
```

This correctly handles all three scenarios:
- **Round 1 (pure composite):** All 9 or 16 tiles share one URL → one group → one Case A call.
- **Round 2+ (mixed):** Clicked tiles refreshed with unique URLs → one sprite group (remaining original tiles) + N individual groups (refreshed tiles). Sprite group gets one Case A call; each refreshed tile gets one Case B call.
- **All-individual grid:** Every tile has a unique URL → all single-tile groups → Case B for each.

**Case A — `solveCompositeGrid(prompt, gridSize, spriteUrl, cellIds)`**

Fetches the sprite image once, then makes a **single model call**:

```
reCAPTCHA challenge: "Select all images with cars"

This image is a 3×3 grid of equal cells numbered 0 to 8,
reading left to right, top to bottom (cell 0 = top-left, cell 8 = bottom-right).
List ALL cell numbers where the subject is visible, even partially.
Reply with ONLY a JSON array of integers, e.g. [0, 3, 7]. If none match, reply [].
```

When `cellIds` is a **subset** (mixed round, some cells replaced), the prompt restricts the model:

```
Evaluate ONLY cells [1, 3, 4, 5, 7, 8] — the other cells have been replaced and must be ignored.
From those cells only, list which ones contain the subject, even partially.
```

This matches the approach the user successfully tested with ChatGPT: one image + "divide into N×N grid, which cells contain X?"

**Case B — `solveIndividualTiles(prompt, images)`**

One model call per tile with a stricter prompt that forces JSON-only output:

```
reCAPTCHA challenge: "Select all images with cars"

Does this image contain the subject described in the challenge?
Reply with ONLY [4] if yes, or [] if no. Do not include any other text.
```

The previous prompt (`"Reply [id] if yes, or [] if no."`) allowed free-text responses like `"Yes, this image matches the challenge."` which `parseIds` could not parse.

**`parseIds`** is unchanged — extracts the first `[...]` JSON array from the model response.

### Result

- **Case A (composite):** 1 model API call instead of 9 or 16. Model sees the full grid in context, giving accurate cell identification.
- **Case B (individual/refreshed):** Per-tile calls with enforced JSON format.
- **Mixed rounds:** Sprite tiles handled by Case A (restricted to surviving cells), refreshed tiles handled by Case B — no false positives from showing the full sprite to a per-tile question.

---

## 3. Observation — "independent images" are actually sprite sheets

The user observed that the "cars" challenge tiles looked visually independent (9 different car photos) but the code classified them as composite. This is correct behaviour.

reCAPTCHA always delivers the initial grid as a sprite sheet — a single large image (~378×378px for 3×3 at 126px per tile) containing all 9 (or 16) tile photos arranged in a grid. The CSS `style` attribute on each `<img>` uses negative percentage offsets to pan the viewport to the right photo:

| Tile | `style`                      | Maps to     |
|------|------------------------------|-------------|
| 0    | `top:0%; left:0%`            | Row 0, Col 0 |
| 1    | `top:0%; left:-100%`         | Row 0, Col 1 |
| 2    | `top:0%; left:-200%`         | Row 0, Col 2 |
| 3    | `top:-100%; left:0%`         | Row 1, Col 0 |
| 4    | `top:-100%; left:-100%`      | Row 1, Col 1 |
| ...  | ...                          | ...         |

`left:-100%` means shift left by 100% of the img element's own width (= one tile width), exposing the second column of the sprite. The tiles only get unique URLs when they are refreshed after being clicked (dynamic 3×3 challenges).
