/**
 * Sprite Scanner — captures a live game frame and identifies unknown sprites.
 * Use this to find updated sprite hashes when Jagex changes sprite appearances.
 *
 * Usage: call scanSprites(glapi, spriteCache) and check the console output.
 */
import * as patchrs from "./patchrs_napi";
import { AtlasTracker, getUIState, RenderRect } from "../reflect2d/reflect2d";
import { SpriteCache, imgcrc } from "../reflect2d/spritecache";

export interface ScannedSprite {
  hash: number;
  width: number;
  height: number;
  screenX: number;
  screenY: number;
  atlasX: number;
  atlasY: number;
  knownId: number | undefined;
  isFont: boolean;
  imageDataUrl: string | null;
}

/**
 * Scan all sprites in the current game frame.
 * Returns both known and unknown sprites with their computed hashes.
 */
export async function scanSprites(
  glapi: patchrs.Alt1GlClient,
  spriteCache: SpriteCache
): Promise<{
  known: ScannedSprite[];
  unknown: ScannedSprite[];
  nearXpDrop: ScannedSprite[];
}> {
  const renders = await glapi.recordRenderCalls({
    maxframes: 1,
    features: ['texturesnapshot', 'vertexarray', 'uniforms'],
    framebufferId: 0,
  });

  const atlas = new AtlasTracker(spriteCache);
  const state = getUIState(renders, atlas);

  const known: ScannedSprite[] = [];
  const unknown: ScannedSprite[] = [];
  const seenHashes = new Set<number>();

  for (const el of state.elements) {
    const frag = el.sprite;
    const hash = frag.pixelhash;

    // Skip duplicates
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    // Skip tiny fragments (1x1, 2x2 etc)
    if (frag.width < 3 || frag.height < 3) continue;

    // Try to capture image for preview
    let imageDataUrl: string | null = null;
    if (typeof frag.basetex.capture === 'function' && frag.width <= 64 && frag.height <= 64) {
      try {
        const imgData = frag.basetex.capture(frag.x, frag.y, frag.width, frag.height);
        if (imgData && typeof document !== 'undefined') {
          const canvas = document.createElement('canvas');
          canvas.width = frag.width;
          canvas.height = frag.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.putImageData(imgData, 0, 0);
            imageDataUrl = canvas.toDataURL();
          }
        }
      } catch { /* capture failed */ }
    }

    const sprite: ScannedSprite = {
      hash,
      width: frag.width,
      height: frag.height,
      screenX: Math.round(el.x),
      screenY: Math.round(el.y),
      atlasX: frag.x,
      atlasY: frag.y,
      knownId: frag.known?.id,
      isFont: !!frag.known?.fontchr,
      imageDataUrl,
    };

    if (frag.known?.id !== undefined) {
      known.push(sprite);
    } else {
      unknown.push(sprite);
    }
  }

  // Find unknown sprites near where XP drops appear (x: 850-920, y: 750-1050)
  const nearXpDrop = unknown.filter(s =>
    s.screenX >= 800 && s.screenX <= 950 &&
    s.screenY >= 700 && s.screenY <= 1100 &&
    !s.isFont &&
    s.width >= 5 && s.height >= 5
  );

  // Clean up
  for (const r of renders) {
    if (typeof r.dispose === 'function') r.dispose();
  }

  // Console output for easy identification
  console.log('=== SPRITE SCAN RESULTS ===');
  console.log(`Known sprites: ${known.length}, Unknown: ${unknown.length}`);
  console.log(`\n--- Unknown sprites near XP drop area (${nearXpDrop.length}) ---`);
  for (const s of nearXpDrop) {
    console.log(`  hash=${s.hash}, size=${s.width}x${s.height}, screen=(${s.screenX},${s.screenY}), atlas=(${s.atlasX},${s.atlasY})`);
    if (s.imageDataUrl) {
      console.log(`  Preview: %c `, `background: url(${s.imageDataUrl}) no-repeat; padding: ${s.height/2}px ${s.width/2}px; background-size: contain;`);
    }
  }

  console.log(`\n--- All unknown non-font sprites (${unknown.filter(s => !s.isFont).length}) ---`);
  const nonFont = unknown.filter(s => !s.isFont).sort((a, b) => b.width * b.height - a.width * a.height);
  for (const s of nonFont.slice(0, 50)) {
    console.log(`  hash=${s.hash}, size=${s.width}x${s.height}, screen=(${s.screenX},${s.screenY})`);
  }

  return { known, unknown, nearXpDrop };
}
