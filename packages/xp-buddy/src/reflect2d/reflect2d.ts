import * as patchrs from "../util/patchrs_napi";
import { getProgramMeta, getRenderFunc } from "../render/renderprogram";
import { emptySpriteInfo, imgcrc, KnownSpriteSheet, SpriteCache, SpriteInfo } from "./spritecache";
import { RectLike } from "alt1";
import * as a1lib from "alt1";

export type GameUIState = ReturnType<typeof getUIState>;


export type AtlasSnapshotFragment = {
	x: number,
	y: number,
	width: number,
	height: number,
	pixelhash: number,
	basetex: patchrs.TextureSnapshot,
	known: SpriteInfo | null,
}

export type RenderRect = {
	sprite: AtlasSnapshotFragment,
	x: number,
	y: number,
	width: number,
	height: number,
	samplex: number,
	sampley: number,
	samplewidth: number,
	sampleheight: number,
	m12: number,
	m21: number,
	color: [number, number, number, number]
};

export function rectsHaveOverlap(a: a1lib.RectLike, b: a1lib.RectLike) {
	let overlapx = (a.x >= b.x && a.x < b.x + b.width || b.x >= a.x && b.x < a.x + a.width);
	let overlapy = (a.y >= b.y && a.y < b.y + b.height || b.y >= a.y && b.y < a.y + a.height);
	return overlapx && overlapy;
}

export function rectContainsPoint(rect: a1lib.RectLike, px: number, py: number) {
	return (px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height);
}

export function pointBoxDistance(x1: number, y1: number, x2: number, y2: number) {
	return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

class AtlasTextureSnapshotCache {
	sprites = new Map<number, AtlasSnapshotFragment>();
	fontsheets: { font: KnownSpriteSheet, frag: AtlasSnapshotFragment }[] = [];
	whitesprite: AtlasSnapshotFragment;
	lastChanges: RectLike[] = [];
	snapshot: patchrs.TextureSnapshot;

	constructor(snap: patchrs.TextureSnapshot) {
		this.snapshot = snap;
		this.whitesprite = {
			x: -1, y: -1, height: 1, width: 1,
			pixelhash: 0,
			basetex: snap,
			known: emptySpriteInfo,
		}
	}

	cacheKey(x: number, y: number) {
		return (x << 16) | y;
	}

	adsorbKnowns(old: AtlasTextureSnapshotCache) {
		if (typeof this.snapshot.isChild !== 'function' || typeof this.snapshot.changesSince !== 'function') {
			return false;
		}
		try {
			if (!this.snapshot.isChild(old.snapshot)) {
				return false;
			}
		} catch {
			// old.snapshot is detached/invalid — treat as unrelated texture
			return false;
		}
		let edits: RectLike[];
		try {
			edits = this.snapshot.changesSince(old.snapshot);
		} catch {
			return false;
		}
		this.lastChanges = edits;
		// keep known sprites that do not overlap edits
		for (let [key, val] of old.sprites.entries()) {
			if (!edits.some(edit => rectsHaveOverlap(edit, val))) {
				val.basetex = this.snapshot;
				this.sprites.set(key, val);
			}
		}
		for (let sheet of old.fontsheets) {
			if (!edits.some(edit => rectsHaveOverlap(edit, sheet.frag))) {
				this.fontsheets.push(sheet);
			}
		}
		return true;
	}

	removeFragment(frag: AtlasSnapshotFragment) {
		let oldkey = this.cacheKey(frag.x, frag.y);
		this.sprites.delete(oldkey);
	}

	findFragment(sprites: SpriteCache, x: number, y: number, w: number, h: number) {
		let key = this.cacheKey(x, y);
		// let frag = this.sprites.find(q => q.x == x && q.y == y && q.width == w && q.height == h);
		let frag = this.sprites.get(key);
		if (frag && (frag.width != w || frag.height != h)) {
			console.log("overwrote atlas sprite with different size");
			frag = undefined;
		}
		if (!frag) {
			frag = this.getFragment(sprites, x, y, w, h, null)!;
		}
		return frag;
	}

	getHash(x: number, y: number, w: number, h: number) {
		if (w <= 0 || h <= 0) return 0;
		// Must match old code exactly — no extra bounds checks that silently reject captures
		let buf = (typeof this.snapshot.capture === 'function'
			? (() => { try { return this.snapshot.capture!(x, y, w, h); } catch { return new ImageData(w, h); } })()
			: new ImageData(w, h));
		return imgcrc(buf);
	}

	makeFragment(x: number, y: number, w: number, h: number, known: SpriteInfo | null = null) {
		let frag: AtlasSnapshotFragment = {
			x: x, y: y, width: w, height: h,
			pixelhash: this.getHash(x, y, w, h),
			basetex: this.snapshot,
			known: known,
		}
		return frag;
	}

	getFragment(sprites: SpriteCache, x: number, y: number, w: number, h: number, ifmatched: SpriteInfo | null) {
		let key = this.cacheKey(x, y);
		let hash = this.getHash(x, y, w, h);
		if (ifmatched && ifmatched.hash != hash) {
			return null;
		}
		let frag: AtlasSnapshotFragment = {
			x: x, y: y, width: w, height: h,
			pixelhash: hash,
			basetex: this.snapshot,
			known: null,
		}
		this.sprites.set(key, frag);
		if (ifmatched) {
			frag.known = ifmatched;
		} else {
			let spritematch = sprites.hashes.get(hash);
			if (spritematch) {
				frag.known = spritematch;
			} else {
				this.tryMatchFontChar(sprites, frag);
			}
		}

		if (frag.known && frag.known.font) {
			if (frag.known.fontchr) {
				this.tryIdentifyFont(sprites, frag);
			}
		}

		return frag;
	}

	tryMatchFontChar(sprites: SpriteCache, frag: AtlasSnapshotFragment) {
		if (frag.known) { return; }
		for (let { frag: fontfrag, font } of this.fontsheets) {
			if (!rectsHaveOverlap(fontfrag, frag)) { continue; }
			let match = font.unknownsubs.find(unk => rectContainsPoint(frag, fontfrag.x + unk.x, fontfrag.y + unk.y));
			let charcode = match?.charcode ?? "�".charCodeAt(0);
			frag.known = font.identifyMissingCharacter(charcode, frag.x - fontfrag.x, frag.y - fontfrag.y, frag.width, frag.height, frag.pixelhash);
			// Only register real pixel hashes — in stream mode pixelhash is blank-image CRC
			// and registering it would cause all same-dimension chars to collide.
			if (typeof this.snapshot.capture === 'function') {
				sprites.hashes.set(frag.pixelhash, frag.known);
			}
			break;
		}
	}

	tryIdentifyFont(sprites: SpriteCache, charfrag: AtlasSnapshotFragment) {
		if (!charfrag.known || !charfrag.known.fontchr || !charfrag.known.font) {
			return;
		}
		let font = charfrag.known.font;
		let fontchr = charfrag.known.fontchr;
		let fontx = charfrag.x - fontchr.x;
		let fonty = charfrag.y - fontchr.y;
		if (this.fontsheets.some(f => f.frag.x == fontx && f.frag.y == fonty)) {
			return;
		}

		let basekey = this.cacheKey(fontx, fonty);
		let basesprite = this.sprites.get(basekey);
		if (!basesprite || basesprite.known != charfrag.known.font?.basesprite) {
			let fontw = font.sheetwidth;
			let fonth = font.sheetheight;
			if (fontw == -1 || fonth == -1) {
				throw new Error("incomplete font");
			}
			let hash = this.getHash(fontx, fonty, fontw, fonth);
			if (hash == font.basesprite.hash) {
				let basefrag = this.makeFragment(fontx, fonty, fontw, fonth, font.basesprite);
				this.fontsheets.push({ font: font, frag: basefrag });
				// font base matched (silent)
				// detect fragments that belong to this font
				for (let chr of font.subs.values()) {
					let fontchr = chr.fontchr!
					this.getFragment(sprites, fontx + fontchr.x, fonty + fontchr.y, fontchr.width, fontchr.height, chr);
				}
				// try find fragments 
				for (let frag of this.sprites.values()) {
					if (frag.known || !rectsHaveOverlap(frag, basefrag)) { continue; }
					let match = font.unknownsubs.find(unkchr => rectContainsPoint(frag, fontx + unkchr.x, fonty + unkchr.y));
					let charcode = match?.charcode ?? "�".charCodeAt(0);
					let known = font.identifyMissingCharacter(charcode, frag.x - fontx, frag.y - fonty, frag.width, frag.height, frag.pixelhash);
					frag.known = known;
					sprites.hashes.set(frag.pixelhash, known);
				}
			}
		}
	}
	/**
	 * Position-based font identification for stream mode.
	 * When capture() is unavailable, hash-based matching fails because all fragments
	 * of the same dimensions hash to the same empty-image value. Instead, identify
	 * characters by their atlas coordinates relative to a discovered font sheet base.
	 *
	 * For chars at (0,0) in the JSON (digits 2,5,7,8, letters b,n,o,u, etc.), positions
	 * are interpolated from known neighbors in ASCII order — fonts lay out chars
	 * sequentially, so interpolation is reliable within the same row.
	 */
	bootstrapFontPositions(sprites: SpriteCache, fontBaseCache: Map<number, { x: number, y: number }>) {
		// Only needed when capture is unavailable (stream mode)
		if (typeof this.snapshot.capture === 'function') return;

		// Only bootstrap the 9x11 XP drop font (spriteid -1)
		const font = sprites.fonts.get(-1);
		if (!font || font.sheetwidth <= 0 || font.sheetheight <= 0) return;

		// Collect font-sized fragments for position-based identification.
		// In stream mode, hash-based matching is unreliable (blank-image collisions
		// cause e.g. '+' to be misidentified as 'n' because both are 8x9). Include
		// ALL font-sized fragments — even those with hash matches — so position-based
		// matching can override wrong identifications.
		const unidentified: AtlasSnapshotFragment[] = [];
		for (const frag of this.sprites.values()) {
			if (frag.width >= 2 && frag.width <= 15 && frag.height >= 2 && frag.height <= 25) {
				unidentified.push(frag);
			}
		}
		if (unidentified.length < 2) return;

		let baseX: number | undefined;
		let baseY: number | undefined;

		// Collect ALL chars with known positions (from font.subs + unknownsubs)
		// Used for both base detection and interpolation
		const allKnownPos: { charcode: number, x: number, y: number, w: number, h: number }[] = [];
		for (const sub of font.subs) {
			if (!sub.fontchr) continue;
			if (sub.fontchr.x === 0 && sub.fontchr.y === 0) continue;
			allKnownPos.push({
				charcode: sub.fontchr.charcode, x: sub.fontchr.x, y: sub.fontchr.y,
				w: sub.fontchr.width, h: sub.fontchr.height
			});
		}
		for (const unk of font.unknownsubs) {
			allKnownPos.push({ charcode: unk.charcode, x: unk.x, y: unk.y, w: 0, h: 0 });
		}
		allKnownPos.sort((a, b) => a.charcode - b.charcode);

		// Build interpolated positions for (0,0) chars using ASCII-order neighbors
		const interpolated = new Map<number, { x: number, y: number, w: number, h: number }>();
		for (const sub of font.subs) {
			if (!sub.fontchr) continue;
			if (!(sub.fontchr.x === 0 && sub.fontchr.y === 0)) continue;
			const cc = sub.fontchr.charcode;
			// Find nearest lower and upper neighbors with known positions
			let lower: typeof allKnownPos[0] | null = null;
			let upper: typeof allKnownPos[0] | null = null;
			for (const c of allKnownPos) {
				if (c.charcode < cc) lower = c;
				if (c.charcode > cc && !upper) upper = c;
			}
			if (lower && upper) {
				const range = upper.charcode - lower.charcode;
				const t = (cc - lower.charcode) / range;
				interpolated.set(cc, {
					x: Math.round(lower.x + t * (upper.x - lower.x)),
					y: Math.round(lower.y + t * (upper.y - lower.y)),
					w: sub.fontchr.width,
					h: sub.fontchr.height,
				});
			}
		}

		// Always re-detect base position each frame — atlas may reorganize between frames,
		// making a cached base stale. The vote is O(unidentified × votable) ≈ trivial at 50Hz.
		{
			const votableChars = allKnownPos.filter(c => c.w > 0 && c.h > 0);
			if (votableChars.length === 0) return;

			const baseVotes = new Map<string, { x: number, y: number, count: number }>();
			for (const frag of unidentified) {
				for (const chr of votableChars) {
					if (frag.width !== chr.w || frag.height !== chr.h) continue;
					const bx = frag.x - chr.x;
					const by = frag.y - chr.y;
					if (bx < 0 || by < 0) continue;
					const key = `${bx},${by}`;
					const existing = baseVotes.get(key);
					if (existing) existing.count++;
					else baseVotes.set(key, { x: bx, y: by, count: 1 });
				}
			}

			// Fuzzy vote clustering: votes within ±2 of each other are the same base
			let bestBase: { x: number, y: number, count: number } | null = null;
			const voteList = [...baseVotes.values()];
			for (const v of voteList) {
				let clustered = 0;
				for (const o of voteList) {
					if (Math.abs(v.x - o.x) <= 2 && Math.abs(v.y - o.y) <= 2) clustered += o.count;
				}
				if (!bestBase || clustered > bestBase.count) {
					bestBase = { x: v.x, y: v.y, count: clustered };
				}
			}

			if (bestBase && bestBase.count >= 2) {
				baseX = bestBase.x;
				baseY = bestBase.y;
			} else {
				// Approach 2: Pairwise matching
				const byDims = new Map<string, AtlasSnapshotFragment[]>();
				for (const frag of unidentified) {
					const dk = `${frag.width}x${frag.height}`;
					if (!byDims.has(dk)) byDims.set(dk, []);
					byDims.get(dk)!.push(frag);
				}

				let found = false;
				for (let i = 0; i < votableChars.length && !found; i++) {
					for (let j = i + 1; j < votableChars.length && !found; j++) {
						const cA = votableChars[i], cB = votableChars[j];
						if (cA.w === cB.w && cA.h === cB.h) continue;
						const expectedDx = cA.x - cB.x;
						const expectedDy = cA.y - cB.y;
						const fragsA = byDims.get(`${cA.w}x${cA.h}`) ?? [];
						const fragsB = byDims.get(`${cB.w}x${cB.h}`) ?? [];
						for (const fa of fragsA) {
							for (const fb of fragsB) {
								const dx = fa.x - fb.x;
								const dy = fa.y - fb.y;
								if (Math.abs(dx - expectedDx) <= 2 && Math.abs(dy - expectedDy) <= 2) {
									const bx = fa.x - cA.x;
									const by = fa.y - cA.y;
									if (bx >= 0 && by >= 0) {
										baseX = bx;
										baseY = by;
										found = true;
										break;
									}
								}
							}
							if (found) break;
						}
					}
				}
			}

			if (baseX === undefined || baseY === undefined) return;

			// Log base position once (or when it changes)
			const prev = fontBaseCache.get(-1);
			if (!prev || prev.x !== baseX || prev.y !== baseY) {
				fontBaseCache.set(-1, { x: baseX, y: baseY });
				// bootstrap base found (silent)
			}
		}

		// Build position→SpriteInfo lookup for known-position chars
		const charByPos = new Map<string, SpriteInfo>();
		for (const sub of font.subs) {
			if (!sub.fontchr) continue;
			if (sub.fontchr.x === 0 && sub.fontchr.y === 0) continue;
			charByPos.set(`${sub.fontchr.x},${sub.fontchr.y}`, sub);
		}

		// Register font sheet for tryMatchFontChar fallback
		if (!this.fontsheets.some(f => f.font === font)) {
			const baseFrag = this.makeFragment(baseX, baseY, font.sheetwidth, font.sheetheight, font.basesprite);
			this.fontsheets.push({ font, frag: baseFrag });
		}

		// Track which interpolated charcodes have been claimed (prevent double-assignment)
		const claimedInterpolated = new Set<number>();
		let counts = { inSheet: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, pua: 0 };

		// Identify fragments by their position relative to the font sheet base.
		// We process ALL font-sized fragments (even those with hash matches) because
		// stream-mode hash matching is unreliable — position matching is authoritative.
		for (const frag of unidentified) {
			const relX = frag.x - baseX;
			const relY = frag.y - baseY;
			if (relX < 0 || relY < 0 || relX >= font.sheetwidth || relY >= font.sheetheight) continue;
			counts.inSheet++;

			// 1. Exact position + dimension match against known-position chars
			const posKey = `${relX},${relY}`;
			const match = charByPos.get(posKey);
			if (match?.fontchr && match.fontchr.width === frag.width && match.fontchr.height === frag.height) {
				frag.known = match;
				counts.s1++;
				continue;
			}

			// 2. ±3 tolerance against known-position chars in font.subs
			for (const sub of font.subs) {
				if (!sub.fontchr || (sub.fontchr.x === 0 && sub.fontchr.y === 0)) continue;
				if (sub.fontchr.width !== frag.width || sub.fontchr.height !== frag.height) continue;
				if (Math.abs(relX - sub.fontchr.x) <= 3 && Math.abs(relY - sub.fontchr.y) <= 3) {
					frag.known = sub;
					counts.s2++;
					break;
				}
			}
			if (frag.known) continue;

			// 3. ±5 tolerance against unknownchars positions (approximate manual positions)
			for (const unk of font.unknownsubs) {
				if (Math.abs(relX - unk.x) <= 5 && Math.abs(relY - unk.y) <= 5) {
					frag.known = font.addCharSprite(unk.charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
					font.unknownsubs = font.unknownsubs.filter((u: any) => u.charcode !== unk.charcode);
					charByPos.set(`${relX},${relY}`, frag.known);
					counts.s3++;
					break;
				}
			}
			if (frag.known) continue;

			// 4. ±8 tolerance against interpolated positions for (0,0) chars.
			// These are digits 2,5,7,8 and letters b,n,o,u whose positions are
			// estimated from ASCII-order neighbors in the font sheet.
			// Wider tolerance because:
			//   - unknownsubs positions (interpolation anchors) are approximate
			//   - digit Y varies ~5px between subs (y=22) and unknownsubs (y=27)
			let bestInterp: { charcode: number, dist: number } | null = null;
			for (const [cc, est] of interpolated) {
				if (claimedInterpolated.has(cc)) continue;
				if (est.w !== frag.width || est.h !== frag.height) continue;
				const dx = Math.abs(relX - est.x);
				const dy = Math.abs(relY - est.y);
				if (dx <= 8 && dy <= 8 && (dx + dy) <= 14) {
					const dist = dx + dy;
					if (!bestInterp || dist < bestInterp.dist) {
						bestInterp = { charcode: cc, dist };
					}
				}
			}
			if (bestInterp) {
				claimedInterpolated.add(bestInterp.charcode);
				frag.known = font.addCharSprite(bestInterp.charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
				charByPos.set(`${relX},${relY}`, frag.known);
				counts.s4++;
				continue;
			}

			// 5. Dimension-based identification for uniquely-sized chars
			let charcode = -1;
			if (frag.width === 2 && frag.height === 3) charcode = 46; // '.'
			else if (frag.width === 5 && frag.height === 12) charcode = 49; // '1'
			else if (frag.width === 4 && frag.height === 20) charcode = 40; // '('
			else if (frag.width === 7 && frag.height === 9) charcode = 115; // 's'
			else if (frag.width === 5 && frag.height === 20) charcode = 41; // ')'
			if (charcode !== -1) {
				frag.known = font.addCharSprite(charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
				charByPos.set(`${relX},${relY}`, frag.known);
				counts.s5++;
				continue;
			}

			// 6. PUA placeholder for truly unidentified chars (keeps text runs connected)
			const placeholderCode = 0xE000 + ((relX * 397 + relY) % 6400);
			frag.known = font.addCharSprite(placeholderCode, relX, relY, frag.width, frag.height, frag.pixelhash);
			charByPos.set(`${relX},${relY}`, frag.known);
			counts.pua++;
		}

		// One-time step count log
		if (!fontBaseCache.has(-998)) {
			fontBaseCache.set(-998, { x: 0, y: 0 });
			const interpChars = [...claimedInterpolated].map(cc => String.fromCharCode(cc)).join('');
			// bootstrap steps logged (silent)
		}
	}
}

export class AtlasTracker {
	cache = new Map<patchrs.TextureSnapshot, AtlasTextureSnapshotCache>();
	spriteCache: SpriteCache;
	// Limit cache size to prevent unbounded memory growth
	private readonly MAX_CACHE_SIZE = 10;
	/** Position-based sprite lookup: learned from capture-capable frames, used in stream mode */
	positionMap = new Map<string, SpriteInfo>();
	/** Discovered font base positions per font spriteid, persists across frames */
	fontBaseCache = new Map<number, { x: number, y: number }>();

	constructor(spriteCache: SpriteCache) {
		this.spriteCache = spriteCache;
	}

	getSubcache(tex: patchrs.TextureSnapshot) {
		let subcache = this.cache.get(tex);
		if (!subcache) {
			subcache = new AtlasTextureSnapshotCache(tex);
			let absorbed = false;
			for (let [key, val] of this.cache.entries()) {
				if (subcache.adsorbKnowns(val)) {
					this.cache.delete(key);
					absorbed = true;
					break;
				}
			}
			this.cache.set(tex, subcache);

			// If we didn't absorb and cache is too large, remove oldest entries
			if (!absorbed && this.cache.size > this.MAX_CACHE_SIZE) {
				const keysToDelete: patchrs.TextureSnapshot[] = [];
				let count = 0;
				for (const key of this.cache.keys()) {
					if (count < this.cache.size - this.MAX_CACHE_SIZE) {
						keysToDelete.push(key);
						count++;
					} else {
						break;
					}
				}
				for (const key of keysToDelete) {
					this.cache.delete(key);
				}
			}
		}
		return subcache;
	}
}

export function getUIState(renders: patchrs.RenderInvocation[], cache: AtlasTracker) {
	let elements: RenderRect[] = [];
	let usedSubcaches = new Set<AtlasTextureSnapshotCache>();
	for (let render of renders) {
		let progmeta = getProgramMeta(render.program);
		if (!progmeta.isUi) { continue; }
		if (!render.uniformState) { continue; }
		let data: ReturnType<typeof getRenderFunc>;
		try { data = getRenderFunc(render); } catch { continue; }
		if (!data.uniforms["uDiffuseMap"]) { continue; }
		let posget = data.getters["aVertexPosition2D"];
		let texget = data.getters["aTextureUV"];
		let texminget = data.getters["aTextureUVAtlasMin"];
		let texextget = data.getters["aTextureUVAtlasExtents"];
		let colget = data.getters["aVertexColour"];
		let samplerid = data.uniforms["uDiffuseMap"][0][0];
		let tex = render.samplers[samplerid];
		if (!tex) {
			// TODO fix underlying, this seems to happen after for some reason the uniform buffer is all 0
			//console.log("ui texture sampler not found");
			continue;
		}

		let subcache = cache.getSubcache(tex);
		usedSubcaches.add(subcache);

		const eps = 0.4;//bias for weird rounding situation
		for (let a = 0; a < data.indices.length; a += 6) {
			let botleft = data.indices[a + 3];
			let topright = data.indices[a + 1];
			let botright = data.indices[a + 0];
			let topleft = data.indices[a + 2];

			let samplex = Math.floor(tex.width * texget(topleft, 0) + eps);
			let sampley = Math.floor(tex.height * texget(topleft, 1) + eps);
			let samplew = Math.floor(tex.width * texget(botright, 0) + eps) - samplex;
			let sampleh = Math.floor(tex.height * texget(botright, 1) + eps) - sampley;

			let texboxx = Math.floor(tex.width * texminget(topleft, 0) + eps);
			let texboxy = Math.floor(tex.height * texminget(topleft, 1) + eps);
			let texboxw = Math.floor(tex.width * texextget(topleft, 0) + eps);
			let texboxh = Math.floor(tex.height * texextget(topleft, 1) + eps);

			//deal with 1px profile sweeping, they have 0 width attribute arguments
			if (texboxw == 0 && samplew == 0 && texboxh != 0) { texboxw = 1; samplew = 1; }
			if (texboxh == 0 && sampleh == 0 && texboxw != 0) { texboxh = 1; sampleh = 1; }

			let xb = posget(botleft, 0);
			let yb = posget(botleft, 1);
			let dxx = posget(botright, 0) - xb;
			let dxy = posget(botright, 1) - yb;
			let dyx = posget(topleft, 0) - xb;
			let dyy = posget(topleft, 1) - yb;

			texboxw = Math.abs(texboxw);
			texboxh = Math.abs(texboxh);

			let frag: AtlasSnapshotFragment | undefined;
			//hardcoded case in shader, this produces white
			if (samplex < -60000 || sampley < -60000) {
				frag = subcache.whitesprite;
			} else {
				if (dxx == 0 || dyy == 0) {
					continue;
				}
				if (samplew == 0 || sampleh == 0) {
					console.log("skipped zero size tex");
					continue;
				}
				if (texboxw == 0 || texboxh == 0) {
					console.log("skipped zero size tex bounding box");
					continue;
				}

				frag = subcache.findFragment(cache.spriteCache, texboxx, texboxy, texboxw, texboxh);
			}
			let el: RenderRect = {
				sprite: frag,
				x: xb, y: yb,
				width: dxx, height: dyy,
				m12: dyx, m21: dxy,
				samplex: samplex - texboxx,
				sampley: sampley - texboxy,
				samplewidth: samplew,
				sampleheight: sampleh,
				color: [colget(botleft, 0), colget(botleft, 1), colget(botleft, 2), colget(botleft, 3)]
			}

			elements.push(el);
		}
	}

	// Stream mode: position-based font bootstrap (uses atlas coordinates + known char positions)
	for (const subcache of usedSubcaches) {
		subcache.bootstrapFontPositions(cache.spriteCache, cache.fontBaseCache);
	}

	// Position map: learn from capture-capable frames, apply to stream frames
	for (const el of elements) {
		const frag = el.sprite;
		if (frag.x < 0 || frag.y < 0) continue;
		const texid = (frag.basetex as any).texid ?? 0;
		const posKey = `${texid}_${frag.x}_${frag.y}_${frag.width}_${frag.height}`;

		const isPUA = frag.known?.fontchr && frag.known.fontchr.charcode >= 0xE000;

		if (frag.known && !isPUA) {
			cache.positionMap.set(posKey, frag.known);
		} else {
			const mapped = cache.positionMap.get(posKey);
			if (mapped && !(mapped.fontchr && mapped.fontchr.charcode >= 0xE000)) {
				frag.known = mapped;
			}
		}
	}

	// Contextual '+' bootstrap: if '+' was identified from font -1 but nearby digits
	// were missed by the global bootstrap (e.g. tolerance too tight, or position map
	// didn't cover them), use the '+'-derived base to identify them directly.
	const font9x11 = cache.spriteCache.fonts.get(-1);
	if (font9x11) {
		// Build interpolated positions once for contextual matching
		const ctxInterpolated = new Map<number, { x: number, y: number, w: number, h: number }>();
		const ctxKnownPos: { charcode: number, x: number, y: number }[] = [];
		for (const sub of font9x11.subs) {
			if (!sub.fontchr || (sub.fontchr.x === 0 && sub.fontchr.y === 0)) continue;
			ctxKnownPos.push({ charcode: sub.fontchr.charcode, x: sub.fontchr.x, y: sub.fontchr.y });
		}
		for (const unk of font9x11.unknownsubs) {
			ctxKnownPos.push({ charcode: unk.charcode, x: unk.x, y: unk.y });
		}
		ctxKnownPos.sort((a, b) => a.charcode - b.charcode);
		for (const sub of font9x11.subs) {
			if (!sub.fontchr || !(sub.fontchr.x === 0 && sub.fontchr.y === 0)) continue;
			const cc = sub.fontchr.charcode;
			let lower: typeof ctxKnownPos[0] | null = null;
			let upper: typeof ctxKnownPos[0] | null = null;
			for (const c of ctxKnownPos) {
				if (c.charcode < cc) lower = c;
				if (c.charcode > cc && !upper) upper = c;
			}
			if (lower && upper) {
				const range = upper.charcode - lower.charcode;
				const t = (cc - lower.charcode) / range;
				ctxInterpolated.set(cc, {
					x: Math.round(lower.x + t * (upper.x - lower.x)),
					y: Math.round(lower.y + t * (upper.y - lower.y)),
					w: sub.fontchr.width, h: sub.fontchr.height,
				});
			}
		}

		let ctxFixed = 0;
		for (const el of elements) {
			if (el.sprite.known?.fontchr?.charcode !== 43 || el.sprite.known?.font?.spriteid !== -1) continue;
			const plusFrag = el.sprite;
			const baseX = plusFrag.x - 375;
			const baseY = plusFrag.y;
			const plusTexid = (plusFrag.basetex as any).texid ?? 0;

			for (const other of elements) {
				if (other.sprite.known) continue;
				if (other.x <= el.x - 5 || other.x > el.x + 200) continue;
				if (Math.abs(other.y - el.y) > 15) continue;
				const frag = other.sprite;
				if (frag.width < 2 || frag.width > 15 || frag.height < 2 || frag.height > 25) continue;
				const otherTexid = (frag.basetex as any).texid ?? 0;
				if (otherTexid !== plusTexid) continue;

				const relX = frag.x - baseX;
				const relY = frag.y - baseY;
				if (relX < 0 || relY < 0 || relX >= font9x11.sheetwidth || relY >= font9x11.sheetheight) continue;

				// Try known-position subs ±5
				for (const sub of font9x11.subs) {
					if (!sub.fontchr || (sub.fontchr.x === 0 && sub.fontchr.y === 0)) continue;
					if (sub.fontchr.width !== frag.width || sub.fontchr.height !== frag.height) continue;
					if (Math.abs(relX - sub.fontchr.x) <= 5 && Math.abs(relY - sub.fontchr.y) <= 5) {
						frag.known = sub;
						break;
					}
				}
				if (frag.known) { ctxFixed++; continue; }

				// Try unknownsubs ±5
				for (const unk of font9x11.unknownsubs) {
					if (Math.abs(relX - unk.x) <= 5 && Math.abs(relY - unk.y) <= 5) {
						frag.known = font9x11.addCharSprite(unk.charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
						ctxFixed++;
						break;
					}
				}
				if (frag.known) continue;

				// Try interpolated ±8, Manhattan ≤ 14
				let bestInterp: { charcode: number, dist: number } | null = null;
				for (const [cc, est] of ctxInterpolated) {
					if (est.w !== frag.width || est.h !== frag.height) continue;
					const dx = Math.abs(relX - est.x);
					const dy = Math.abs(relY - est.y);
					if (dx <= 8 && dy <= 8 && (dx + dy) <= 14) {
						const dist = dx + dy;
						if (!bestInterp || dist < bestInterp.dist) {
							bestInterp = { charcode: cc, dist };
						}
					}
				}
				if (bestInterp) {
					frag.known = font9x11.addCharSprite(bestInterp.charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
					ctxFixed++;
					continue;
				}

				// Dimension-based for unique sizes
				let charcode = -1;
				if (frag.width === 2 && frag.height === 3) charcode = 46;
				else if (frag.width === 5 && frag.height === 12) charcode = 49;
				else if (frag.width === 4 && frag.height === 20) charcode = 40;
				else if (frag.width === 7 && frag.height === 9) charcode = 115;
				else if (frag.width === 5 && frag.height === 20) charcode = 41;
				if (charcode !== -1) {
					frag.known = font9x11.addCharSprite(charcode, relX, relY, frag.width, frag.height, frag.pixelhash);
					ctxFixed++;
				}
			}
		}
	}
	// +Diag and +Context logging removed — no longer needed for debugging

	return { elements, frametime: renders[0]?.ownFrameTime ?? 0, lastframetime: renders[0]?.lastFrameTime ?? 0 };
}

/**
 * Safe wrapper around TextureSnapshot.capture() that validates bounds
 * before calling native code. The native SubImage() has a FATAL_ASSERT
 * that crashes the process if coordinates exceed the data buffer.
 */
export function safeCapture(
  snapshot: { capture?(x: number, y: number, w: number, h: number): ImageData; width: number; height: number; canCapture?(): boolean },
  x: number, y: number, w: number, h: number
): ImageData | null {
  if (typeof snapshot.canCapture === 'function' && !snapshot.canCapture()) return null;
  if (typeof snapshot.capture !== 'function') return null;
  if (w <= 0 || h <= 0) return null;
  if (x < 0 || y < 0) return null;
  if (x + w > snapshot.width || y + h > snapshot.height) return null;
  try {
    return snapshot.capture(x, y, w, h);
  } catch {
    return null;
  }
}
