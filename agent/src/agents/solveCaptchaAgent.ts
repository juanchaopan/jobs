import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import sharp from 'sharp';

// ── Image cache ──────────────────────────────────────────────────────────────
// Sprite URLs are single-use on the reCAPTCHA CDN: our first fetch succeeds,
// any subsequent fetch returns 410. We cache raw Buffers (not base64 strings)
// so annotateSprite can re-process the bytes without an extra network round-trip
// and so the cache stays compact in memory.
const imageCache = new Map<string, Buffer>();

async function fetchImage(url: string): Promise<Buffer> {
  const hit = imageCache.get(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  imageCache.set(url, buf);
  return buf;
}

// ── Sprite annotation (Case A only) ─────────────────────────────────────────
// Cuts the sprite into tiles and re-composites them with a real gap between
// each one, matching the reCAPTCHA iframe's own CSS padding between tiles:
//   .rc-imageselect-table-33 td { padding: 2px }  → 4 px between tiles
//   .rc-imageselect-table-44 td { padding: 1px }  → 2 px between tiles
async function annotateSprite(buf: Buffer, gridSize: number): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return buf;

  const gap = gridSize <= 3 ? 4 : 2;
  // Exact partition boundaries (not a fixed rounded tile size) so the last
  // row/column can't overflow the source image when w/h isn't a multiple of gridSize.
  const xBounds = Array.from({ length: gridSize + 1 }, (_, i) => Math.round((i * w) / gridSize));
  const yBounds = Array.from({ length: gridSize + 1 }, (_, i) => Math.round((i * h) / gridSize));

  const tiles = await Promise.all(
    Array.from({ length: gridSize * gridSize }, (_, n) => {
      const row = Math.floor(n / gridSize);
      const col = n % gridSize;
      const left = xBounds[col]!;
      const top = yBounds[row]!;
      return sharp(buf)
        .extract({ left, top, width: xBounds[col + 1]! - left, height: yBounds[row + 1]! - top })
        .toBuffer()
        .then((tile) => ({ input: tile, left: left + col * gap, top: top + row * gap }));
    }),
  );

  return sharp({
    create: {
      width: w + (gridSize - 1) * gap,
      height: h + (gridSize - 1) * gap,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(tiles)
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ── Debug dump ───────────────────────────────────────────────────────────────
// Saves the image as an actual JPEG file and a compact JSON sidecar (text only,
// no base64 blob). Much smaller and more inspectable than the previous approach
// of embedding the full data URL inside the invoke JSON.
function debugDump(tag: string, promptText: string, imgBuf: Buffer): void {
  const id = Date.now().toString(36);
  const imgFile = `/tmp/invoke-${id}-${tag}.jpg`;
  const jsonFile = `/tmp/invoke-${id}-${tag}.json`;
  fs.writeFileSync(imgFile, imgBuf);
  fs.writeFileSync(jsonFile, JSON.stringify({ tag, prompt: promptText, image: imgFile }, null, 2));
  console.log(`h: debugDump ${tag} → ${imgFile}`);
}

// ── Model ────────────────────────────────────────────────────────────────────
// Image content is sent as a base64 data URL inside the JSON payload. This is
// the only inline-binary format the OpenAI-compatible chat-completions API
// accepts. Passing the original reCAPTCHA URL directly would save a fetch+encode
// round-trip but is not viable: the CDN marks URLs single-use and the browser
// has already consumed them before scrape.js reads the src attributes.
const model = new ChatOpenAI({
  model: process.env.VISION_MODEL ?? '',
  apiKey: process.env.VISION_MODEL_API_KEY,
  configuration: { baseURL: process.env.VISION_MODEL_BASE_URL ?? '' },
});

function bufToDataUrl(buf: Buffer, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function parseIds(text: string): number[] {
  const match = text.match(/\[[\s\d,]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (Array.isArray(arr)) return arr.filter((x): x is number => typeof x === 'number');
  } catch { /* ignore */ }
  return [];
}

// ── Case A: sprite sheet ─────────────────────────────────────────────────────
// All tiles in the group share one URL → fetch the sprite once, annotate it
// with grid lines, and ask the model which numbered cells match in a single call.
//
// cellIds: cells still showing this sprite. On round 1 this is the full grid;
// on later rounds it is a shrinking subset as clicked tiles get individual URLs.
async function solveCompositeGrid(
  prompt: string,
  gridSize: number,
  spriteUrl: string,
  cellIds: number[],
): Promise<number[]> {
  let raw: Buffer;
  try {
    raw = await fetchImage(spriteUrl);
  } catch (e: any) {
    console.log('h: solveCaptcha Case A fetch failed', e?.message);
    return [];
  }

  const annotated = await annotateSprite(raw, gridSize);
  const total = gridSize * gridSize;
  const allCells = cellIds.length === total;
  const cellsDesc = allCells ? `0–${total - 1}` : cellIds.join(', ');

  const scope = allCells
    ? `List ALL cell numbers where the subject appears, even partially.`
    : `Evaluate ONLY cells [${cellsDesc}] — the other cells have been replaced and must be ignored. ` +
      `From those cells only, list which ones show the subject, even partially.`;

  const numbering = `Cells are numbered 0 to ${total - 1}, left to right then top to bottom ` +
    `(cell 0 = top-left, cell ${total - 1} = bottom-right).`;

  const promptText = gridSize === 3
    ? `reCAPTCHA: "${prompt}"\n\n` +
      `The image shows 9 independent photos arranged in a 3×3 grid, separated by gaps. ` +
      `Each cell is a separate, unrelated photo. ${numbering} ` +
      `${scope} ` +
      `Reply with ONLY a JSON array, e.g. [0, 3, 7]. If none match, reply [].`
    : `reCAPTCHA: "${prompt}"\n\n` +
      `The image is a single scene divided into a ${gridSize}×${gridSize} grid by gaps. ` +
      `${numbering} ` +
      `${scope} ` +
      `Reply with ONLY a JSON array, e.g. [0, 3, 7]. If none match, reply [].`;

  const tag = `case-a-cells-${cellsDesc.replace(/[–,\s]+/g, '_')}`;
  debugDump(tag, promptText, annotated);
  console.log(`h: solveCaptcha Case A gridSize=${gridSize} cells=[${cellsDesc}]`);

  const response = await model.invoke([{
    role: 'user',
    content: [
      { type: 'text', text: promptText },
      { type: 'image_url', image_url: { url: bufToDataUrl(annotated) } },
    ],
  }]);

  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  console.log(`h: solveCaptcha Case A cells=[${cellsDesc}] →`, text);
  return parseIds(text);
}

// ── Case B: individual / refreshed tile ──────────────────────────────────────
// The tile has its own unique URL (it was clicked and refreshed by reCAPTCHA).
// No grid lines needed — the image is already a single isolated photo.
// One model call per tile.
async function solveIndividualTile(
  prompt: string,
  tile: { id: number; url: string },
): Promise<number[]> {
  let buf: Buffer;
  try {
    buf = await fetchImage(tile.url);
  } catch (e: any) {
    console.log(`h: solveCaptcha Case B tile ${tile.id} fetch failed`, e?.message);
    return [];
  }

  const promptText =
    `reCAPTCHA: "${prompt}"\n\n` +
    `Does this image show the subject? ` +
    `Reply ONLY [${tile.id}] if yes, or [] if no. No other text.`;

  debugDump(`case-b-tile-${tile.id}`, promptText, buf);
  console.log(`h: solveCaptcha Case B tile ${tile.id}`);

  const response = await model.invoke([{
    role: 'user',
    content: [
      { type: 'text', text: promptText },
      { type: 'image_url', image_url: { url: bufToDataUrl(buf) } },
    ],
  }]);

  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  console.log(`h: solveCaptcha Case B tile ${tile.id} →`, text);
  return parseIds(text);
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function solveCaptchaChallenge(
  prompt: string,
  images: Array<{ id: number; url: string; done?: boolean; selected?: boolean }>,
): Promise<number[]> {
  // Derive gridSize from the full tile count (9 → 3×3, 16 → 4×4).
  // Must NOT use activeTiles.length: done-tiles still occupy grid positions.
  const gridSize = Math.round(Math.sqrt(images.length));
  const activeTiles = images.filter(t => !t.done);

  console.log(`h: solveCaptcha gridSize=${gridSize} tiles=${images.length} active=${activeTiles.length} done=${images.length - activeTiles.length}`);
  if (activeTiles.length === 0) return [];

  // Group by URL:
  //   >1 tile sharing a URL → sprite sheet  → Case A (one composite call)
  //    1 tile for a URL     → refreshed tile → Case B (per-tile call)
  const urlToTiles = new Map<string, Array<{ id: number; url: string }>>();
  for (const tile of activeTiles) {
    const group = urlToTiles.get(tile.url) ?? [];
    group.push(tile);
    urlToTiles.set(tile.url, group);
  }

  const results: number[] = [];
  for (const [url, group] of urlToTiles) {
    if (group.length > 1) {
      results.push(...await solveCompositeGrid(prompt, gridSize, url, group.map(t => t.id)));
    } else {
      if (group[0]) results.push(...await solveIndividualTile(prompt, group[0]));
    }
  }
  return results;
}
