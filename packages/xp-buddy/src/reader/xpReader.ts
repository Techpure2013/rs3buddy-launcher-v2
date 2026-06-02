// xpReader.ts - Clean XP detection using pattern matching
import * as patchrs from "../util/patchrs_napi";
import * as uiparser from "../reflect2d/uiparser";
import { AtlasTracker, getUIState, RenderRect, safeCapture } from "../reflect2d/reflect2d";
import { KnownSpriteSheet } from "../reflect2d/spritecache";
import { produce } from "immer";


// ============================================================================
// SPRITE ID CONSTANTS - All RS3 skill sprites
// ============================================================================
export const SKILL_SPRITES = {
  // Combat Skills (9)
  attack: { id: 197, label: "Attack" },
  strength: { id: 198, label: "Strength" },
  defence: { id: 199, label: "Defence" },
  ranged: { id: 200, label: "Ranged" },
  prayer: { id: 201, label: "Prayer" },
  magic: { id: 202, label: "Magic" },
  constitution: { id: 203, label: "Constitution" },
  summoning: { id: 222, label: "Summoning" },
  necromancy: { id: 30934, label: "Necromancy" },

  // Gathering Skills (7)
  mining: { id: 209, label: "Mining" },
  fishing: { id: 211, label: "Fishing" },
  woodcutting: { id: 214, label: "Woodcutting" },
  farming: { id: 217, label: "Farming" },
  hunter: { id: 220, label: "Hunter" },
  divination: { id: 9170, label: "Divination" },
  archaeology: { id: 10782, label: "Archaeology" },

  // Artisan Skills (8)
  smithing: { id: 210, label: "Smithing" },
  cooking: { id: 212, label: "Cooking" },
  firemaking: { id: 213, label: "Firemaking" },
  runecrafting: { id: 215, label: "Runecrafting" },
  crafting: { id: 207, label: "Crafting" },
  fletching: { id: 208, label: "Fletching" },
  herblore: { id: 205, label: "Herblore" },
  construction: { id: 221, label: "Construction" },

  // Support Skills (4)
  agility: { id: 204, label: "Agility" },
  thieving: { id: 206, label: "Thieving" },
  slayer: { id: 216, label: "Slayer" },
  dungeoneering: { id: 3028, label: "Dungeoneering" },

  // Elite Skills (1)
  invention: { id: 26541, label: "Invention" },
} as const;

// Special UI sprites
export const UI_SPRITES = {
  xpDropBackground: { id: 9278 }, // Background behind skill icon in XP drops
} as const;

// ============================================================================
// TYPES
// ============================================================================
export type SkillInfo = { id: number; label: string };

// ============================================================================
// LOOKUP MAPS
// ============================================================================
const SKILL_ID_TO_INFO = new Map<number, SkillInfo>(
  Object.values(SKILL_SPRITES).map(s => [s.id, { id: s.id, label: s.label }])
);

const ALL_SKILL_IDS: number[] = Object.values(SKILL_SPRITES).map(s => s.id);

// Combat skills that can appear together in shared XP drops (all 9 combat skills)
const COMBAT_SKILL_IDS = new Set<number>([
  SKILL_SPRITES.attack.id,
  SKILL_SPRITES.strength.id,
  SKILL_SPRITES.defence.id,
  SKILL_SPRITES.ranged.id,
  SKILL_SPRITES.prayer.id,
  SKILL_SPRITES.magic.id,
  SKILL_SPRITES.constitution.id,
  SKILL_SPRITES.summoning.id,
  SKILL_SPRITES.necromancy.id,
]);

// Primary attack skills that receive 2/3 of combat XP
// These are the main damage-dealing skills (excludes Prayer, Summoning, Constitution)
const PRIMARY_ATTACK_SKILL_IDS = new Set<number>([
  SKILL_SPRITES.attack.id,
  SKILL_SPRITES.strength.id,
  SKILL_SPRITES.defence.id,
  SKILL_SPRITES.ranged.id,
  SKILL_SPRITES.magic.id,
  SKILL_SPRITES.necromancy.id,
]);

// Skills that are ALWAYS visible in the combat skills menu UI
// These should be IGNORED when looking for XP drop indicators because they're
// part of the skills interface, not the XP drop itself
// NOTE: Constitution is NOT in this list because it's needed for combat XP splits
// We rely on render order + distance filtering to avoid menu sprites
const MENU_SKILL_IDS = new Set<number>([
  SKILL_SPRITES.attack.id,
  SKILL_SPRITES.strength.id,
  SKILL_SPRITES.defence.id,
  SKILL_SPRITES.necromancy.id,
]);

// Maximum horizontal distance (pixels) between XP text and skill indicator
// Skill sprites must be close to the XP text to be considered part of the drop
const MAX_INDICATOR_DISTANCE = 120;

// Maximum render order distance - only consider skill sprites within this many
// elements of the XP drop sprite in the render order. This prevents picking up
// skill sprites from other UI components (skills menu, buff bar, etc.)
const MAX_RENDER_ORDER_DISTANCE = 20;

// ============================================================================
// SKILL SPRITE CACHE - Captures and caches skill sprites for display
// ============================================================================
export interface CachedSkillSprite {
  skillId: number;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: number;
}

export class SkillSpriteCache {
  private cache: Map<number, CachedSkillSprite> = new Map();

  /**
   * Capture a sprite from a RenderRect and return as data URL
   */
  private captureSprite(sprite: RenderRect["sprite"]): string | null {
    try {
      const imgData = safeCapture(sprite.basetex, sprite.x, sprite.y, sprite.width, sprite.height);
      if (!imgData) return null;
      const canvas = document.createElement("canvas");
      canvas.width = sprite.width;
      canvas.height = sprite.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  /**
   * Cache a skill sprite from a detected RenderRect
   */
  cacheFromRenderRect(element: RenderRect): CachedSkillSprite | null {
    const skillId = element.sprite.known?.id;
    if (skillId === undefined) return null;

    const skillInfo = SKILL_ID_TO_INFO.get(skillId);
    if (!skillInfo) return null;

    // Already cached? Return existing
    if (this.cache.has(skillId)) {
      return this.cache.get(skillId)!;
    }

    // Capture the sprite
    const dataUrl = this.captureSprite(element.sprite);
    if (!dataUrl) return null;

    const cached: CachedSkillSprite = {
      skillId,
      label: skillInfo.label,
      dataUrl,
      width: element.width,
      height: element.height,
      capturedAt: Date.now(),
    };

    this.cache.set(skillId, cached);
    return cached;
  }

  /**
   * Get a cached sprite by skill ID
   */
  get(skillId: number): CachedSkillSprite | undefined {
    return this.cache.get(skillId);
  }

  /**
   * Get all cached sprites
   */
  getAll(): CachedSkillSprite[] {
    return Array.from(this.cache.values());
  }

  /**
   * Check if a skill sprite is cached
   */
  has(skillId: number): boolean {
    return this.cache.has(skillId);
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global sprite cache instance
export const skillSpriteCache = new SkillSpriteCache();

// ============================================================================
// ANTI-ALIAS & EDGE DETECTION (ported from reference implementation)
// ============================================================================

type AssembledDrop = {
  sign: "+" | "-" | null;
  value: string | null;
  unit: string | null;
  label: string | null;
  text: string;
};

/** Parse raw XP drop characters into structured components */
function assembleXpText(chars: string[]): AssembledDrop {
  const raw = chars.join("");
  let i = 0;
  const n = raw.length;

  let sign: "+" | "-" | null = null;
  if (i < n && (raw[i] === "+" || raw[i] === "-")) {
    sign = raw[i] as "+" | "-";
    i += 1;
  }

  while (i < n && (raw[i] === " " || raw[i] === "\u00A0")) i += 1;

  const numStart = i;
  let hasDigits = false;
  while (i < n && raw[i] >= "0" && raw[i] <= "9") { hasDigits = true; i += 1; }
  if (i < n && raw[i] === ".") {
    const dotPos = i;
    i += 1;
    let postDigits = 0;
    while (i < n && raw[i] >= "0" && raw[i] <= "9") { postDigits += 1; hasDigits = true; i += 1; }
    if (postDigits === 0 && !hasDigits) i = dotPos;
  }
  const value = hasDigits ? raw.slice(numStart, i) : null;

  while (i < n && (raw[i] === " " || raw[i] === "\u00A0")) i += 1;

  const unitStart = i;
  while (i < n && ((raw[i] >= "A" && raw[i] <= "Z") || (raw[i] >= "a" && raw[i] <= "z"))) i += 1;
  let unit = i > unitStart ? raw.slice(unitStart, i) : null;
  if (unit) {
    const lower = unit.toLowerCase();
    if (lower === "xp" || lower === "k" || lower === "m") { unit = lower; }
    else { i = unitStart; unit = null; }
  }

  while (i < n && (raw[i] === " " || raw[i] === "\u00A0")) i += 1;
  const label = i < n ? raw.slice(i).replace(/\s+/g, " ").trim() : null;

  const parts: string[] = [];
  if (sign) parts.push(sign, " ");
  if (value) parts.push(value);
  if (unit) parts.push(" ", unit);
  if (label) parts.push(" ", label);
  const text = parts.join("").replace(/\s+/g, " ").trim();

  return { sign, value, unit, label, text };
}

/**
 * Edge detector for XP drops - emits only on FIRST frame of a new drop.
 * Handles RS3's frame-to-frame jitter with linger frames.
 */
class XpEdgeDetector {
  private phase: "idle" | "seen" = "idle";
  private lastSignature: string | null = null;
  private lastEmitMs = 0;
  private lingerFramesLeft = 0;
  private burstCount = 0;

  // Tuning constants (matched to old proven antiAliasUtil.ts)
  private readonly LINGER_FRAMES = 3;
  private readonly MAX_BURST = 1; // emit once per unique drop
  private readonly MIN_MS_BETWEEN_SAME = 550; // ~1 game tick, allows next drop
  // MIN_MS_BETWEEN_ANY removed — spawn gate handles oscillation prevention

  /** Build signature from XP text - value only, ignoring label differences */
  private signature(xpText: string): string {
    const a = assembleXpText(xpText.split(""));
    return [a.sign ?? "", a.value ?? ""].join("|");
  }

  /**
   * Process a frame. Returns true if this is a NEW drop that should be emitted.
   * Call with null when no XP drop is detected in a frame.
   */
  processFrame(xpText: string | null): boolean {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    if (xpText === null) {
      // No match: count as gap frame
      if (this.phase === "seen") {
        if (this.lingerFramesLeft > 0) {
          this.lingerFramesLeft--;
        } else {
          this.phase = "idle";
        }
      }
      return false;
    }

    const sig = this.signature(xpText);

    // New drop or different signature: emit
    if (this.phase === "idle" || (this.phase === "seen" && sig !== this.lastSignature)) {
      this.phase = "seen";
      this.lastSignature = sig;
      this.lingerFramesLeft = this.LINGER_FRAMES;
      this.lastEmitMs = now;
      this.burstCount = 1;
      return true;
    }

    // Global inter-emit gate: prevents oscillation from overlapping drops at spawn
    // Same signature continuing
    if (this.phase === "seen" && sig === this.lastSignature) {
      this.lingerFramesLeft = this.LINGER_FRAMES; // refresh linger

      const canEmit = this.burstCount < this.MAX_BURST;
      const timeOk = now - this.lastEmitMs >= this.MIN_MS_BETWEEN_SAME;

      if (canEmit && timeOk) {
        this.lastEmitMs = now;
        this.burstCount++;
        return true;
      }
      return false; // suppress duplicate
    }

    // Different signature = new drop — emit immediately
    this.phase = "seen";
    this.lastSignature = sig;
    this.lingerFramesLeft = this.LINGER_FRAMES;
    this.lastEmitMs = now;
    this.burstCount = 1;
    return true;
  }

  /** Reset the detector state */
  reset(): void {
    this.phase = "idle";
    this.lastSignature = null;
    this.lastEmitMs = 0;
    this.lingerFramesLeft = 0;
    this.burstCount = 0;
  }
}

// ============================================================================
// XP DROP PATTERN - Using UIParser pattern matching
// ============================================================================
export const XP_DROP_PATTERN = [
  { id: UI_SPRITES.xpDropBackground.id },  // 9278 - background behind skill icon in XP drop
  { repeat: [0, 5] as [number, number] },   // Skip skill icon sprite + any intermediate elements
  { string: "", ref: "xpText" },             // XP value text (9x11 font)
  { repeat: [0, 10] as [number, number] },
];

// ============================================================================
// XP DROP TYPES - Different sources have different distribution rules
// ============================================================================
export enum XpDropType {
  /** Single skill XP drop (skilling, quest reward, etc.) - 100% to one skill */
  SINGLE_SKILL = "single",

  /** Combat XP split - Constitution gets 1/3, other combat skills split 2/3 */
  COMBAT_SPLIT = "combat",

  /** Celebration lamp - Main skill gets full XP, all others get 5% */
  CELEBRATION_LAMP = "celebration",

  /** All-skills lamp (Djinn, etc.) - Equal XP to all skills shown */
  ALL_SKILLS_LAMP = "all_skills",

  /** Unknown multi-skill drop - split evenly as fallback */
  UNKNOWN_MULTI = "unknown_multi",
}

// Per-skill XP attribution for split drops
export type SkillXpAttribution = {
  skill: SkillInfo;
  xp: number;
  /** Whether this is the "primary" skill (for celebration lamps) */
  isPrimary?: boolean;
};

// ============================================================================
// XP SOURCE IDENTIFICATION (loaded from JSON to avoid circular deps)
// ============================================================================
import xpSourcesData from "../data/xpSources.json";

type XpSourceEntry = { name: string; xp: number; skillId: number; category: string };

// Build lookup map from JSON data
const XP_SOURCE_MAP = new Map<string, XpSourceEntry[]>();
for (const src of xpSourcesData.sources as XpSourceEntry[]) {
  const key = `${Math.round(src.xp * 10)}_${src.skillId}`;
  if (!XP_SOURCE_MAP.has(key)) XP_SOURCE_MAP.set(key, []);
  XP_SOURCE_MAP.get(key)!.push(src);
}

function identifySource(xpValue: number, skillId: number): string | null {
  const key = `${Math.round(xpValue * 10)}_${skillId}`;
  const matches = XP_SOURCE_MAP.get(key);
  return matches && matches.length > 0 ? matches[0].name : null;
}

/**
 * Check if XP value matches a known Prayer source (bones/ashes).
 * Returns the source name and XP if found, null otherwise.
 * Allows tolerance for rounding (e.g., 4.5 XP bones can show as 4 or 5).
 */
function findMatchingPrayerSource(xpValue: number): { name: string; xp: number } | null {
  const prayerSources = (xpSourcesData.sources as XpSourceEntry[])
    .filter(s => s.skillId === SKILL_SPRITES.prayer.id);

  // Check for near-match (within 1 XP tolerance for rounding)
  // RS3 can round 4.5 to either 4 or 5
  let bestMatch: { name: string; xp: number; diff: number } | null = null;
  for (const src of prayerSources) {
    const diff = Math.abs(src.xp - xpValue);
    if (diff < 1.0 && (!bestMatch || diff < bestMatch.diff)) {
      bestMatch = { name: src.name, xp: src.xp, diff };
    }
  }
  return bestMatch ? { name: bestMatch.name, xp: bestMatch.xp } : null;
}

// ============================================================================
// XP DROP RESULT TYPE
// ============================================================================
export type XpDropResult = {
  xpValue: number;
  xpText: string;
  skill: SkillInfo | null;
  skillSprite: RenderRect | null;
  /** Type of XP drop - determines distribution rules */
  dropType: XpDropType;
  /** All skills involved in this drop */
  skills: SkillInfo[];
  /** Per-skill XP breakdown (for tracking individual skill totals) */
  skillXp: SkillXpAttribution[];
  /** Cached skill sprite images (data URLs) for display */
  skillSpriteImages: CachedSkillSprite[];
  timestamp: number;
  /** Best guess for the activity source (highest confidence match) */
  likelySource: string | null;
};

// ============================================================================
// XP DETECTION CLASS
// ============================================================================

/** Standard font sheet format - compatible with fonthash.batch.json entries */
type FontSheetJson = {
  sheetwidth: number;
  sheetheight: number;
  sheethash: number;
  spriteid: number;
  characters: {
    chr: string;
    charcode: number;
    x: number;
    y: number;
    width: number;
    height: number;
    hash: number;
    bearingy: number;
  }[];
  unknownchars: { x: number; y: number; charcode: number }[];
};

// Pending drop waiting for skill association
type PendingDrop = {
  xpValue: number;
  xpText: string;
  timestamp: number;
  // Approximate position for skill association
  approxX: number;
  approxY: number;
};

// XP drop zone - the screen area where XP drops appear
type XpDropZone = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  lastSeen: number; // timestamp of last drop in this zone
};

export class XpDetector {
  private atlas: AtlasTracker;
  // Deduplication: Track recent XP drops by value AND position to prevent counting
  // the same drop multiple times as it animates upward, while still allowing
  // rapid kills with the same XP value at different positions.
  private recentDrops: Map<string, { timestamp: number; x: number; y: number }> = new Map();
  private readonly DEDUP_WINDOW_MS = 1500; // ~2.5 ticks
  private readonly DEDUP_POSITION_THRESHOLD = 50; // pixels - drops within this distance are considered same

  // Float edge detector: tracks the NEWEST visible drop (highest Y = closest to spawn)
  // and emits when the text signature changes. Same approach as the old 100% accurate code.
  // No position tracking needed — signature changes = new drop appeared.
  private floatEdgeDetector = new XpEdgeDetector();
  private floatFrameCounter = 0;

  // Sticky skill cache: once a skill is found for a float drop at a given X region,
  // apply it to subsequent drops at the same X. Solves stream-mode skill sprite
  // recognition failure (blank hash collision prevents identification).
  private stickySkillByX: Map<number, SkillInfo[]> = new Map(); // quantizedX → skills

  // Pending drops: XP drops detected without skills, waiting for skill association
  // Key is XP value (stringified), value is pending drop info
  private pendingDrops: Map<string, PendingDrop> = new Map();
  // How long to wait for skills before giving up (ms) - about 3 game ticks
  private readonly PENDING_TIMEOUT_MS = 1800;

  // XP drop zone tracking - focus detection on known XP drop area
  private xpDropZone: XpDropZone | null = null;
  // How long before zone expires and we scan everything again (10 seconds)
  private readonly ZONE_EXPIRE_MS = 10000;
  // Margin around detected drops to define the zone
  private readonly ZONE_MARGIN = 150;

  // Static text rejection: tracks text seen in previous frame
  // Key: "x_y" (rounded to nearest 5px), Value: text content
  private previousScanTexts: Map<string, string> = new Map();

  // Delta tracking for XP counter positions: persists across frames (NOT cleared each frame)
  // When the same position shows a different numeric value, the XP gain is the delta.
  // Key: "x_y" (rounded to nearest 15px), Value: last XP numeric value
  private positionXpValues: Map<string, number> = new Map();
  // Typical delta tracking: stores exponential moving average of deltas per position
  // Used to detect anomalous deltas from position quantization boundary crossings
  // Key: "x_y" (rounded to nearest 15px), Value: typical delta value
  private positionTypicalDelta: Map<string, number> = new Map();
  // Stable delta tracking: locks onto the consistent delta for each position
  // Snaps deltas within ±1 of locked value to eliminate alternation from fractional XP
  // (RS3 tracks .5 XP internally → text parsing loses it for numbers >1000 → alternating N/N+1)
  private positionStableDelta: Map<string, { value: number; count: number; snapCount: number }> = new Map();
  // Frame counter for TextScan - first 2 frames are "learning period" to record
  // counter starting values without emitting them as false positives
  private textScanFrameCount: number = 0;

  // Fallback rejection cache: throttle repeated rejection logs
  // Key: "${skillLabel}:${roundedX}:${roundedY}:${text}", Value: timestamp
  private fallbackRejectCache = new Map<string, number>();

  // User-configured detection zone - when set, TextScan only processes text within this zone
  private userDetectionZone: { x: number; y: number; width: number; height: number } | null = null;

  // Edge detector for robust dedup (ported from reference)
  private edgeDetector = new XpEdgeDetector();

  // Runtime font learning: XP drop text uses an 8x12 font not in the hash database
  // We learn character hashes by cross-referencing with delta tracking results
  private learnedFontSheet: KnownSpriteSheet | null = null;
  private learnedFontChars: Map<number, { char: string; width: number; height: number }> = new Map();
  // Confidence tracking: need to see same hash→char pair multiple times before registering
  private fontCharConfidence: Map<number, { char: string; count: number }> = new Map();
  private readonly FONT_LEARN_CONFIDENCE = 2;
  // Position-based learning for stream mode (where hashes are unreliable)
  private learnedByPosKey: Map<string, { char: string; width: number; height: number }> = new Map();
  private confByPosKey: Map<string, { char: string; count: number }> = new Map();
  private static readonly FONT_STORAGE_KEY = 'xpbuddy:learned_font';
  private static readonly XP_LOG_KEY = 'xpbuddy:xp_log';
  private static readonly XP_LOG_MAX_ENTRIES = 5000;
  private fontSheetState: FontSheetJson = {
    sheetwidth: 0, sheetheight: 0, sheethash: 0, spriteid: -2,
    characters: [], unknownchars: [],
  };

  constructor(atlas: AtlasTracker) {
    this.atlas = atlas;
    this.loadLearnedFont();
  }

  /** Load previously learned font characters from JSON file or localStorage */
  private loadLearnedFont(): void {
    // Try loading from JSON file first (via IPC), fall back to localStorage
    try {
      const api = (window as any).appWindowApi;
      if (api?.readAppData) {
        api.readAppData('xp-buddy', 'learned-font.json').then((raw: string | null) => {
          if (raw) {
            const count = this.loadFontFromJson(raw);
            if (count > 0) {
              console.log(`[XP Font] Loaded ${count} learned characters from JSON file`);
              return;
            }
          }
          // Fall back to localStorage
          this.loadFontFromLocalStorage();
        }).catch(() => {
          this.loadFontFromLocalStorage();
        });
        return;
      }
    } catch (e) { /* fall through */ }

    // No IPC available, use localStorage directly
    this.loadFontFromLocalStorage();
  }

  /** Parse font sheet JSON and register all characters */
  private loadFontFromJson(raw: string): number {
    try {
      const data = JSON.parse(raw);

      // Standard font sheet format
      if (data.spriteid !== undefined && Array.isArray(data.characters)) {
        // Load into immer state
        this.fontSheetState = produce(this.fontSheetState, draft => {
          Object.assign(draft, data);
        });

        let count = 0;
        for (const entry of data.characters) {
          if (!entry.chr || !entry.hash) continue;
          this.registerLearnedFontChar(entry.hash, entry.chr, entry.width ?? 0, entry.height ?? 0);
          count++;
        }
        return count;
      }

      // Legacy format
      if (data.version === 1 && data.chars) {
        let count = 0;
        for (const [hashStr, entry] of Object.entries(data.chars) as [string, any][]) {
          const hash = Number(hashStr);
          if (isNaN(hash) || !entry.char) continue;
          this.registerLearnedFontChar(hash, entry.char, entry.width ?? 0, entry.height ?? 0);
          count++;
        }
        if (count > 0) this.saveLearnedFont(); // Migrate to new format
        return count;
      }
    } catch (e) {
      console.warn('[XP Font] Failed to parse font data:', e);
    }
    return 0;
  }

  /** Load from localStorage (fallback) */
  private loadFontFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(XpDetector.FONT_STORAGE_KEY);
      if (!raw) return;
      const count = this.loadFontFromJson(raw);
      if (count > 0) {
        console.log(`[XP Font] Loaded ${count} learned characters from localStorage`);
      }
    } catch (e) {
      console.warn('[XP Font] Failed to load from localStorage:', e);
    }
  }

  /** Save learned font characters using immer for immutable state, persisting to JSON file */
  private saveLearnedFont(): void {
    // Use immer to produce the next font sheet state immutably
    this.fontSheetState = produce(this.fontSheetState, draft => {
      draft.characters = [];
      for (const [hash, entry] of this.learnedFontChars) {
        draft.characters.push({
          chr: entry.char,
          charcode: entry.char.charCodeAt(0),
          x: 0, y: 0,
          width: entry.width,
          height: entry.height,
          hash,
          bearingy: 0,
        });
      }
      draft.characters.sort((a, b) => a.charcode - b.charcode);
    });

    const json = JSON.stringify(this.fontSheetState, null, 2);

    // Save to localStorage as fallback
    try {
      localStorage.setItem(XpDetector.FONT_STORAGE_KEY, json);
    } catch (e) { /* silent */ }

    // Save to actual JSON file via IPC
    try {
      const api = (window as any).appWindowApi;
      if (api?.writeAppData) {
        api.writeAppData('xp-buddy', 'learned-font.json', json);
      }
    } catch (e) {
      console.warn('[XP Font] Failed to write font JSON file:', e);
    }
  }

  /** Log a detected XP drop to localStorage and JSON file for history tracking */
  private logXpDrop(result: XpDropResult): void {
    try {
      const raw = localStorage.getItem(XpDetector.XP_LOG_KEY);
      const data: { version: number; drops: any[] } = raw
        ? JSON.parse(raw)
        : { version: 1, drops: [] };

      if (data.version !== 1) return;

      const entry = {
        timestamp: result.timestamp,
        xp: result.xpValue,
        text: result.xpText,
        skill: result.skill?.label ?? null,
        skills: result.skills.map(s => s.label),
        type: result.dropType,
        source: result.likelySource,
        skillXp: result.skillXp.map(s => ({ skill: s.skill.label, xp: s.xp, primary: s.isPrimary })),
      };

      data.drops.push(entry);

      // Cap the log to prevent bloat
      if (data.drops.length > XpDetector.XP_LOG_MAX_ENTRIES) {
        data.drops = data.drops.slice(-XpDetector.XP_LOG_MAX_ENTRIES);
      }

      const json = JSON.stringify(data);
      localStorage.setItem(XpDetector.XP_LOG_KEY, json);

      // Also write to JSON file
      try {
        const api = (window as any).appWindowApi;
        if (api?.writeAppData) {
          api.writeAppData('xp-buddy', 'xp-log.json', json);
        }
      } catch (e) { /* silent */ }
    } catch (e) {
      // Silent fail - logging shouldn't break detection
    }
  }

  /**
   * Learn XP drop font characters at runtime.
   * RS3's XP drop text uses a small font (3-8px wide, 4-9px tall) not in the sprite hash database.
   * When delta tracking gives us a confirmed XP value, we cross-reference with
   * unknown ~8x12 elements visible on screen to learn hash→character mappings.
   * Once learned, readFont() can read the XP drop text directly.
   */
  /** Get a unique key for a sprite: atlas position for PUA/stream chars, hash for record mode */
  private getSpriteLearnKey(el: RenderRect): string {
    const fontchr = el.sprite.known?.fontchr;
    if (fontchr && fontchr.charcode >= 0xE000) {
      // PUA placeholder (stream mode) — hash is unreliable, use atlas position
      const texid = (el.sprite.basetex as any).texid ?? 0;
      return `pos:${texid}_${el.sprite.x}_${el.sprite.y}_${el.sprite.width}_${el.sprite.height}`;
    }
    return `hash:${el.sprite.pixelhash}`;
  }

  /** Check if a fontchr is a PUA placeholder assigned during stream-mode bootstrap */
  private isPuaPlaceholder(el: RenderRect): boolean {
    const cc = el.sprite.known?.fontchr?.charcode;
    return cc !== undefined && cc >= 0xE000;
  }

  private learnXpFontFromDelta(elements: RenderRect[], knownXpValue: number): void {
    // Collect ALL font-sized elements (known AND unknown) so we can match
    // mixed rows where some chars are already learned and others aren't.
    // Previous approach only collected unknowns, which failed for rows like
    // "+1866" where "+","8","6","6" are learned but "1" is not — the unknown
    // group had length 1, never matching candidate "1866" (length 4).
    const fontSized = elements.filter(el =>
      el.width >= 3 && el.width <= 10 &&
      el.height >= 4 && el.height <= 12
    );

    if (fontSized.length < 2) return;

    // Deduplicate anti-alias doubles: RS3 renders each character twice
    // at ~1px offset with different colors. Keep only the first of each pair.
    const deduped: RenderRect[] = [];
    const sortedByPos = [...fontSized].sort((a, b) => a.x - b.x || a.y - b.y);
    for (const el of sortedByPos) {
      const last = deduped[deduped.length - 1];
      if (last &&
        Math.abs(el.x - last.x) <= 2 &&
        Math.abs(el.y - last.y) <= 2 &&
        Math.abs(el.width - last.width) <= 1 &&
        Math.abs(el.height - last.height) <= 1) {
        continue; // Anti-alias duplicate, skip
      }
      deduped.push(el);
    }

    // Group by Y position (tolerance 4px) to find text rows
    const yGroups = new Map<number, RenderRect[]>();
    for (const el of deduped) {
      const yKey = Math.round(el.y / 4) * 4;
      if (!yGroups.has(yKey)) yGroups.set(yKey, []);
      yGroups.get(yKey)!.push(el);
    }

    // Generate candidate strings from the known XP value
    const candidates: string[] = [];
    // Most common XP drop formats (floating text)
    if (knownXpValue % 1 !== 0) {
      // Has decimal: "6.3", "+6.3"
      const dec = knownXpValue.toFixed(1);
      candidates.push(dec, "+" + dec);
    }
    const intStr = Math.round(knownXpValue).toString();
    candidates.push(intStr, "+" + intStr);
    // Also try with "xp" suffix
    if (knownXpValue % 1 !== 0) {
      candidates.push(knownXpValue.toFixed(1) + "xp");
    }
    candidates.push(intStr + "xp");

    for (const [, group] of yGroups) {
      if (group.length < 2) continue;

      const sorted = group.sort((a, b) => a.x - b.x);

      // Verify consistent spacing (text-like row)
      let isTextLike = true;
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
        if (gap < -3 || gap > 12) { isTextLike = false; break; }
      }
      if (!isTextLike) continue;

      // Try each candidate against this row
      for (const candidate of candidates) {
        if (sorted.length !== candidate.length) continue;

        // Check consistency: known chars (both from sprite DB and learned)
        // must match the candidate. At least one must be unknown (learnable).
        let consistent = true;
        let hasNewChar = false;
        for (let i = 0; i < sorted.length; i++) {
          const el = sorted[i];
          const learnKey = this.getSpriteLearnKey(el);
          const isPua = this.isPuaPlaceholder(el);
          const hash = el.sprite.pixelhash;
          const learned = isPua
            ? this.learnedByPosKey.get(learnKey)
            : this.learnedFontChars.get(hash);
          const knownFontChr = el.sprite.known?.fontchr;

          if (learned) {
            // Already learned — must match candidate
            if (learned.char !== candidate[i]) { consistent = false; break; }
          } else if (isPua) {
            // PUA placeholder (stream mode) — treat as learnable unknown
            hasNewChar = true;
          } else if (knownFontChr) {
            // Known from sprite DB (font -1, etc.) — must match candidate
            if (knownFontChr.chr !== candidate[i]) { consistent = false; break; }
          } else if (el.sprite.known && !el.sprite.known.fontchr) {
            // Known sprite but not a font char (icon, etc.) — reject
            consistent = false; break;
          } else {
            // Unknown — can learn this char
            hasNewChar = true;
          }
        }

        if (!consistent || !hasNewChar) continue;

        // Update confidence for each unknown/PUA char
        for (let i = 0; i < sorted.length; i++) {
          const el = sorted[i];
          const learnKey = this.getSpriteLearnKey(el);
          const isPua = this.isPuaPlaceholder(el);
          const char = candidate[i];

          // Skip already known/learned chars
          if (isPua) {
            if (this.learnedByPosKey.has(learnKey)) continue;
          } else {
            if (this.learnedFontChars.has(el.sprite.pixelhash)) continue;
            if (el.sprite.known) continue;
          }

          if (isPua) {
            // Position-based confidence for stream mode
            const conf = this.confByPosKey.get(learnKey);
            if (conf && conf.char === char) {
              conf.count++;
              if (conf.count >= this.FONT_LEARN_CONFIDENCE) {
                this.registerLearnedCharByPosition(learnKey, char, el);
              }
            } else {
              this.confByPosKey.set(learnKey, { char, count: 1 });
            }
          } else {
            // Hash-based confidence for record mode
            const hash = el.sprite.pixelhash;
            const conf = this.fontCharConfidence.get(hash);
            if (conf && conf.char === char) {
              conf.count++;
              if (conf.count >= this.FONT_LEARN_CONFIDENCE) {
                this.registerLearnedFontChar(hash, char, sorted[i].width, sorted[i].height);
              }
            } else if (!conf || conf.char !== char) {
              this.fontCharConfidence.set(hash, { char, count: 1 });
            }
          }
        }
        break; // Found a match, stop trying other candidates
      }
    }
  }

  /**
   * Register a learned font character in the SpriteCache.
   * After registration, getUIState() will recognize this hash on future frames,
   * and readFont() will be able to read the character.
   */
  private registerLearnedFontChar(hash: number, char: string, width: number, height: number): void {
    // Create font sheet on first use (sprite ID -2 for XP drop font)
    if (!this.learnedFontSheet) {
      this.learnedFontSheet = new KnownSpriteSheet(-2, 0, 0, 0);
    }

    const charcode = char.charCodeAt(0);
    const info = this.learnedFontSheet.addCharSprite(charcode, 0, 0, width, height, hash);
    this.atlas.spriteCache.addSprite(info);
    this.learnedFontChars.set(hash, { char, width, height });
    this.saveLearnedFont();

  }

  /**
   * Register a learned font character by atlas position (stream mode).
   * Updates the position map so future frames identify this char immediately,
   * and replaces the PUA placeholder fontchr with the real character.
   */
  private registerLearnedCharByPosition(posKey: string, char: string, el: RenderRect): void {
    const charcode = char.charCodeAt(0);
    const sprite = el.sprite;

    // Update the existing SpriteInfo's fontchr to the real character
    if (sprite.known?.fontchr) {
      sprite.known.fontchr.chr = char;
      sprite.known.fontchr.charcode = charcode;
    }

    // Register in position map for future stream frames
    const texid = (sprite.basetex as any).texid ?? 0;
    const mapKey = `${texid}_${sprite.x}_${sprite.y}_${sprite.width}_${sprite.height}`;
    if (sprite.known) {
      this.atlas.positionMap.set(mapKey, sprite.known);
    }

    this.learnedByPosKey.set(posKey, { char, width: el.width, height: el.height });
    console.log(`[XP Font] Learned '${char}' by position: ${posKey}`);
  }

  /** Set a user-defined detection zone. TextScan will only process text within this rectangle. */
  setDetectionZone(zone: { x: number; y: number; width: number; height: number } | null): void {
    this.userDetectionZone = zone;
  }

  /**
   * Update the XP drop zone based on a detected drop position.
   * XP drops all start from a single spot, so we just need a fixed-size zone
   * centered on that spot (not an expanding zone).
   */
  private updateDropZone(x: number, y: number, now: number): void {
    if (!this.xpDropZone) {
      // First drop - create fixed zone around it
      this.xpDropZone = {
        minX: x - this.ZONE_MARGIN,
        maxX: x + this.ZONE_MARGIN,
        minY: y - this.ZONE_MARGIN,
        maxY: y + this.ZONE_MARGIN,
        lastSeen: now,
      };
    } else {
      // Just update the last seen time, don't expand the zone
      this.xpDropZone.lastSeen = now;
    }
  }

  /**
   * Check if zone is still valid or should be reset
   */
  private isZoneValid(now: number): boolean {
    if (!this.xpDropZone) return false;
    return now - this.xpDropZone.lastSeen < this.ZONE_EXPIRE_MS;
  }

  /**
   * Filter elements to only those in or near the XP drop zone
   */
  private filterToZone(elements: RenderRect[], now: number): RenderRect[] {
    if (!this.isZoneValid(now)) {
      // Zone expired or doesn't exist - return all elements
      return elements;
    }

    const zone = this.xpDropZone!;
    return elements.filter(el => {
      // Always include XP drop sprites and skill sprites regardless of position
      const id = el.sprite.known?.id;
      if (id === UI_SPRITES.xpDropBackground.id || (id !== undefined && ALL_SKILL_IDS.includes(id))) {
        return true;
      }
      // For other elements (like text), filter by zone
      return el.x >= zone.minX && el.x <= zone.maxX &&
             el.y >= zone.minY && el.y <= zone.maxY;
    });
  }

  /**
   * Clean up old entries from the dedup cache
   */
  private cleanupRecentDrops(now: number): void {
    for (const [sig, entry] of this.recentDrops) {
      if (now - entry.timestamp > this.DEDUP_WINDOW_MS) {
        this.recentDrops.delete(sig);
      }
    }
  }

  /**
   * Check if this drop was recently seen at a similar position (deduplication).
   * Same XP value at a different position is NOT a duplicate (rapid kills).
   */
  private isDuplicate(signature: string, now: number, x: number, y: number): boolean {
    const entry = this.recentDrops.get(signature);
    if (!entry) return false;
    if (now - entry.timestamp > this.DEDUP_WINDOW_MS) return false;

    // Check if position is similar (same drop animating)
    const dist = Math.abs(x - entry.x) + Math.abs(y - entry.y);
    if (dist < this.DEDUP_POSITION_THRESHOLD) {
      return true; // Same value at similar position = duplicate
    }

    // Same value but different position = new drop (rapid kills)
    return false;
  }

  /**
   * Record a drop as seen at a specific position
   */
  private recordDrop(signature: string, now: number, x: number, y: number): void {
    this.recentDrops.set(signature, { timestamp: now, x, y });
  }

  /**
   * Clean up expired pending drops and return any that timed out
   */
  private cleanupPendingDrops(now: number): PendingDrop[] {
    const expired: PendingDrop[] = [];
    for (const [sig, pending] of this.pendingDrops) {
      if (now - pending.timestamp > this.PENDING_TIMEOUT_MS) {
        expired.push(pending);
        this.pendingDrops.delete(sig);
      }
    }
    return expired;
  }

  /**
   * Detect XP drops from render data.
   * Returns an array of detected drops (may be multiple if pending drops resolved).
   */
  detectAll(renders: patchrs.RenderInvocation[]): XpDropResult[] {
    const results: XpDropResult[] = [];
    const now = Date.now();

    // Clean up old dedup entries
    this.cleanupRecentDrops(now);

    // Clean up expired pending drops - DON'T emit them
    // They'll be re-detected with skills once the dedup window also expires
    // This prevents double-counting (expired pending + later detection with skills)
    this.cleanupPendingDrops(now);

    const state = getUIState(renders, this.atlas);

    // Filter elements at valid Y positions (not faded drops)
    const allElements = state.elements.filter(el => {
      if (el.sprite.known?.id === UI_SPRITES.xpDropBackground.id) {
        return el.y >= 15;
      }
      return true;
    });

    // Apply zone filtering to reduce processing if we have a known XP drop area
    const elements = this.filterToZone(allElements, now);

    // Try to resolve pending drops by looking for skills NEAR the pending drop's position
    for (const [sig, pending] of this.pendingDrops) {
      // Look for skill sprites near this specific pending drop, not anywhere on screen
      const nearbySkills = this.findSkillsNearPosition(elements, pending.approxX, pending.approxY);
      if (nearbySkills.length > 0) {
        // Found skills near this drop! Resolve it
        this.pendingDrops.delete(sig);
        const dropType = this.classifyDropType(nearbySkills);
        const skill = nearbySkills.length === 1 ? nearbySkills[0] : null;
        const skillXp = this.calculateSkillXp(pending.xpValue, dropType, skill, nearbySkills);

        let likelySource: string | null = null;
        if (dropType === XpDropType.SINGLE_SKILL && skill) {
          likelySource = identifySource(pending.xpValue, skill.id);
        }

        // Update zone with pending drop's original position
        this.updateDropZone(pending.approxX, pending.approxY, now);


        // Get cached sprites for the skills
        const skillSpriteImages = nearbySkills
          .map(s => skillSpriteCache.get(s.id))
          .filter((s): s is CachedSkillSprite => s !== undefined);

        results.push({
          xpValue: pending.xpValue,
          xpText: pending.xpText,
          skill,
          skillSprite: null,
          dropType,
          skills: nearbySkills,
          skillXp,
          skillSpriteImages,
          timestamp: pending.timestamp,
          likelySource,
        });
      }
    }

    // PRIMARY: Use UIRenderParser.readFont() to scan all 9x11 font text
    // readFont() handles drop shadows natively (skips chars at x-1 offset)
    // Then filter by XP text structure using assembleXpText logic
    const parser = new uiparser.UIRenderParser(elements);
    const textRuns: { text: string; x: number; y: number; els: RenderRect[] }[] = [];

    while (parser.index < parser.end) {
      const el = parser.peek();
      if (!el) break;
      // Only read 9x11 font (negative font spriteid)
      if (el.sprite.known?.fontchr && (el.sprite.known.font?.spriteid ?? 0) < 0) {
        const startIdx = parser.index;
        const font = parser.readFont();
        if (font.text.trim().length > 0) {
          textRuns.push({
            text: font.text.trim(),
            x: font.x,
            y: font.y,
            els: elements.slice(startIdx, font.endindex),
          });
        }
      } else {
        parser.skip(1);
      }
    }

    // Filter: only text that looks like an XP drop (has sign + numeric value)
    // Uses the same parsing logic as the old working antiAliasUtil.ts
    type ParsedDrop = { value: number; text: string; x: number; y: number; els: RenderRect[] };
    const xpCandidates: ParsedDrop[] = [];

    for (const run of textRuns) {
      // Quick check: must contain a digit
      if (!/\d/.test(run.text)) continue;

      // Parse the text structure
      const chars = run.text.split("");
      let sign: string | null = null;
      let i = 0;
      if (chars[i] === "+" || chars[i] === "-") { sign = chars[i]; i++; }
      while (i < chars.length && chars[i] === " ") i++;

      // Must have a sign (XP drops always show +N or -N)
      if (!sign) continue;

      const xpValue = this.parseXpValue(run.text);
      if (xpValue < 1) continue;

      xpCandidates.push({ value: xpValue, text: run.text, x: run.x, y: run.y, els: run.els });
    }

    if (xpCandidates.length === 0) {
      this.edgeDetector.processFrame(null);
      return results;
    }

    // Dedup: use isDuplicate() which checks value + position
    // This handles same-value drops at different positions (rapid herbs)
    // AND same drop floating across frames (same value, nearby position)
    for (const candidate of xpCandidates) {
      const dropX = candidate.x;
      const dropY = candidate.y;
      const signature = `${candidate.value}`;

      // Skip if this exact drop (same value + similar position) was recently seen
      if (this.isDuplicate(signature, now, dropX, dropY)) continue;

      // Record this drop position for future dedup
      this.recordDrop(signature, now, dropX, dropY);

      // Find skill sprites anywhere on screen (XP drops and skill icons may be far apart)
      const nearbySkills: SkillInfo[] = [];
      let skill: SkillInfo | null = null;
      let skillSprite: RenderRect | null = null;
      for (const el of elements) {
        const id = el.sprite.known?.id;
        if (id === undefined || !ALL_SKILL_IDS.includes(id)) continue;
        // Wide search: skill icons can be far from text
        if (Math.abs(el.x - dropX) < 200 && Math.abs(el.y - dropY) < 100) {
          const info = SKILL_ID_TO_INFO.get(id);
          if (info && !nearbySkills.find(s => s.id === info.id)) {
            nearbySkills.push(info);
            if (!skill) { skill = info; skillSprite = el; }
          }
        }
      }

      const dropType = this.classifyDropType(nearbySkills);

      if (nearbySkills.length === 0) {
        // No skill found — still emit the drop (value is correct even without skill label)
        // Use last known skill from cache if available
      }

      console.log(`[XP] ${candidate.value} text="${candidate.text}" y=${candidate.y} skill=${skill?.label ?? 'none'}`);

      const skillXp = this.calculateSkillXp(candidate.value, dropType, skill, nearbySkills);

      let likelySource: string | null = null;
      if (dropType === XpDropType.SINGLE_SKILL && skill) {
        likelySource = identifySource(candidate.value, skill.id);
      }

      this.updateDropZone(dropX, dropY, now);

      const skillSpriteImages: CachedSkillSprite[] = [];
      for (const s of nearbySkills) {
        let cached = skillSpriteCache.get(s.id);
        if (!cached && skillSprite && skillSprite.sprite.known?.id === s.id) {
          cached = skillSpriteCache.cacheFromRenderRect(skillSprite) ?? undefined;
        }
        if (cached) skillSpriteImages.push(cached);
      }

      results.push({ xpValue: candidate.value, xpText: candidate.text, skill, skillSprite, dropType, skills: nearbySkills, skillXp, skillSpriteImages, timestamp: now, likelySource });

      // Only emit one drop per frame to avoid burst-counting
      break;
    }

    if (results.length === 0) {
      this.edgeDetector.processFrame(null);
    }

    return results;
  }

  /**
   * Text-based XP detection: scans ALL text on screen for XP values.
   * Does not rely on sprite 9278. Finds XP text outside known UI panels
   * and associates with nearby skill sprites.
   */
  private detectByTextScan(elements: RenderRect[], now: number): XpDropResult[] {
    const results: XpDropResult[] = [];

    // Step 1: Find skill panel bounding box
    const skillSprites: { el: RenderRect; index: number }[] = [];
    for (let i = 0; i < elements.length; i++) {
      const id = elements[i].sprite.known?.id;
      if (id !== undefined && ALL_SKILL_IDS.includes(id)) {
        skillSprites.push({ el: elements[i], index: i });
      }
    }

    let panelBox: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
    if (skillSprites.length >= 5) {
      for (const seed of skillSprites) {
        const cluster = skillSprites.filter(s =>
          Math.abs(s.el.x - seed.el.x) < 300 && Math.abs(s.el.y - seed.el.y) < 300
        );
        if (!panelBox || cluster.length > 0) {
          const xs = cluster.map(s => s.el.x);
          const ys = cluster.map(s => s.el.y);
          const box = {
            minX: Math.min(...xs) - 20,
            maxX: Math.max(...xs) + 60,
            minY: Math.min(...ys) - 120,
            maxY: Math.max(...ys) + 40,
          };
          if (!panelBox || cluster.length > ((panelBox as any)._count ?? 0)) {
            (box as any)._count = cluster.length;
            panelBox = box;
          }
        }
      }
    }

    // Step 2: Scan all text strings from render data
    const parser = new uiparser.UIRenderParser(elements);
    const textRuns: { text: string, x: number, y: number, width: number, height: number, startIndex: number, endIndex: number, color: [number, number, number, number] | null }[] = [];

    while (parser.index < parser.end) {
      const el = parser.peek();
      if (!el) break;
      if (el.sprite.known?.fontchr) {
        const font = parser.readFont();
        if (font.text.trim().length > 0) {
          textRuns.push({
            text: font.text.trim(),
            x: font.x, y: font.y,
            width: font.width, height: font.height,
            startIndex: font.startindex, endIndex: font.endindex,
            color: font.color,
          });
        }
      } else {
        parser.skip(1);
      }
    }

    // Merge adjacent text runs that were split by unrecognized characters (like ".")
    // readFont() stops at unknown elements, so "6.3xp" might become ["6", "3xp"]
    // Merging reconnects them with inferred separators, but ONLY if the runs are
    // adjacent in the render stream (preventing false merges of unrelated numbers)
    if (textRuns.length > 1) {
      const mergedRuns: typeof textRuns = [];
      let current = { ...textRuns[0] };
      for (let i = 1; i < textRuns.length; i++) {
        const next = textRuns[i];
        const sameLineY = Math.abs(next.y - current.y) < 8;
        const gapX = next.x - (current.x + current.width);
        const indexGap = next.startIndex - current.endIndex;
        // Only merge if runs are adjacent in render stream (at most 3 elements apart)
        // AND spatially close. This prevents merging "6" from XP counter with "3" from
        // a nearby level display just because they're on the same line.
        if (sameLineY && gapX >= 0 && gapX < 15 && indexGap >= 0 && indexGap <= 3) {
          // If gap is 2-10px, likely a period or small character was skipped
          const separator = (gapX >= 2 && gapX <= 10) ? "." : "";
          current = {
            ...current,
            text: current.text + separator + next.text,
            width: (next.x + next.width) - current.x,
            height: Math.max(current.height, next.height),
            endIndex: next.endIndex,
          };
        } else {
          mergedRuns.push(current);
          current = { ...next };
        }
      }
      mergedRuns.push(current);

      // Log merges that happened (only if merging changed something)

      // Replace textRuns contents with merged version
      textRuns.length = 0;
      textRuns.push(...mergedRuns);
    }

    // Diagnostic: log text runs every 30 frames to see what readFont() produces
    if (this.textScanFrameCount % 30 === 0 && textRuns.length > 0) {
      const font1Runs = textRuns.filter(r => {
        // Check if any element in this run's range belongs to font -1
        const startEl = elements[r.startIndex];
        return startEl?.sprite?.known?.font?.spriteid === -1;
      });
      const sample = textRuns.slice(0, 8).map(r =>
        `"${r.text.substring(0, 30)}" @(${Math.round(r.x)},${Math.round(r.y)}) c=[${r.color?.map(c => Math.round(c)).join(',')}]`
      );
      console.log(`[TextScan#${this.textScanFrameCount}] ${textRuns.length} runs (${font1Runs.length} font-1). Sample: ${sample.join(' | ')}`);
    }

    // Increment float frame counter so each tracker entry can only match once per frame
    this.floatFrameCounter++;

    // Filter to ONLY XP drop fonts (font -1 and font -2, both have negative spriteids).
    // Font -1 is the main 9x11 XP drop font (digits, letters).
    // Font -2 contains the '+' character and some digits used in XP drops.
    // This eliminates all false positives from chat text, UI numbers, stats, etc.
    const xpFontRuns = textRuns.filter(r => {
      const startEl = elements[r.startIndex];
      const fontId = startEl?.sprite?.known?.font?.spriteid;
      return fontId !== undefined && fontId < 0;
    });

    // Collect floating drop candidates for batch dedup after the loop
    const floatCandidates: { run: typeof textRuns[0]; xpValue: number }[] = [];

    // Step 3: Filter for XP-like text outside known UI panels
    for (const run of xpFontRuns) {
      // Skip text inside skill panel
      if (panelBox && run.x >= panelBox.minX && run.x <= panelBox.maxX &&
          run.y >= panelBox.minY && run.y <= panelBox.maxY) {
        continue;
      }

      // If user has set a detection zone, only process text within it
      if (this.userDetectionZone) {
        const z = this.userDetectionZone;
        if (run.x < z.x || run.x > z.x + z.width || run.y < z.y || run.y > z.y + z.height) continue;
      }

      // Skip text at very top of screen (y < 30) - total XP counter area
      if (run.y < 30) continue;

      // Color filter - only when NO detection zone is active
      // When zone is active, the zone constraint prevents false positives and
      // we need to accept faded/dimmed colors from XP drops animating upward.
      // Skip color filter for:
      //   - Text starting with "+" (floating XP drops, can be any color)
      //   - Text with 4+ digits (XP counter values like "12,784" or "12,784/13,200")
      //     These are delta-tracked: only emit on value CHANGE, so false positives
      //     from static UI numbers (prices, stats) are prevented by delta tracking.
      if (!this.userDetectionZone && run.color && !run.text.trim().startsWith('+')) {
        const digitCount = (run.text.match(/\d/g) || []).length;
        if (digitCount < 4) {
          const [r, g, b] = run.color;
          const isWhite = r > 200 && g > 200 && b > 200;
          const isYellow = r > 180 && g > 130 && b < 100;
          const isGreen = r < 150 && g > 180 && b < 100;
          const isOrange = r > 200 && g > 80 && b < 80;
          if (!isWhite && !isYellow && !isGreen && !isOrange) {
            if (this.textScanFrameCount < 3) {

            }
            continue;
          }
        }
      }

      // Skip static UI text - text at the same position as previous frame is not an XP drop
      // XP drops appear suddenly and animate upward; static UI text stays put
      const posKey = `${Math.round(run.x / 15) * 15}_${Math.round(run.y / 15) * 15}`;
      if (this.previousScanTexts.get(posKey) === run.text) {
        continue;
      }

      // Check if text looks like an XP value
      let xpValue = this.parseXpValue(run.text);
      if (xpValue < 1) {
        // Log numeric text that fails XP validation (first 60 frames only)
        if (this.textScanFrameCount < 60 && /\d/.test(run.text)) {
          console.log(`[TextScan] Rejected: "${run.text.substring(0, 40)}" @(${Math.round(run.x)},${Math.round(run.y)}) parseXp=0`);
        }
        continue;
      }

      // Floating XP drops start with "+" (e.g., "+6", "+75", "+8").
      // They animate upward, constantly changing position. Delta tracking (designed
      // for fixed-position cumulative counters) would always treat them as "first
      // time at this position" and skip them. Bypass delta tracking for these.
      const isFloatingDrop = run.text.trim().charAt(0) === '+';

      // Log XP values that passed validation (first 60 frames)
      if (this.textScanFrameCount < 60) {
        console.log(`[TextScan] XP candidate: "${run.text.substring(0, 40)}" val=${xpValue} float=${isFloatingDrop} @(${Math.round(run.x)},${Math.round(run.y)}) posKey=${posKey}`);
      }

      // Delta tracking for XP counter positions
      // RS3 XP tracker counters show cumulative totals at fixed screen positions.
      // When a counter value changes (e.g., 2512 → 2637), the actual XP gain is
      // the delta (125), not the absolute value (2637).
      const prevXpAtPos = this.positionXpValues.get(posKey);
      if (prevXpAtPos !== undefined && !isFloatingDrop) {
        // Known position - use delta instead of absolute value
        const rawDelta = xpValue - prevXpAtPos;
        let delta = Math.round(rawDelta); // RS3 tracks fractional XP internally but displays integers
        this.positionXpValues.set(posKey, xpValue);
        if (delta <= 0) {
          // Counter reset, no change, or decrease - skip
          continue;
        }

        // Sanity check: if we have a typical delta for this position and the new
        // delta is more than 5x larger, it's likely a position quantization error
        // or a stale value from a different counter. Re-seed and skip.
        const typicalDelta = this.positionTypicalDelta.get(posKey);
        if (typicalDelta !== undefined && delta > typicalDelta * 5 && delta > 500) {
          // Don't emit, just keep the updated position value for next frame
          continue;
        }

        // Update typical delta using exponential moving average
        if (typicalDelta === undefined) {
          this.positionTypicalDelta.set(posKey, delta);
        } else {
          // Blend: 70% old typical, 30% new value
          this.positionTypicalDelta.set(posKey, typicalDelta * 0.7 + delta * 0.3);
        }

        // Snap stabilization: RS3 tracks fractional XP (e.g., 67.5 per action).
        // When counter < 1000, text correctly reads "67.5" → delta = 68 (rounded).
        // When counter >= 1000, text loses ".5" (comma splits text) → delta alternates 67/68.
        // Lock onto the first consistent delta and snap ±1 variations to it.
        const stable = this.positionStableDelta.get(posKey);
        if (stable) {
          if (delta === stable.value) {
            stable.count++;
            stable.snapCount = 0; // Natural match resets snap counter
          } else if (Math.abs(delta - stable.value) <= 1 && stable.count >= 3) {
            // Within ±1 of locked value - snap to stable
            stable.snapCount++;
            if (stable.snapCount > 10) {
              // Too many consecutive snaps without natural match - true delta changed
              this.positionStableDelta.set(posKey, { value: delta, count: 1, snapCount: 0 });
            } else {
              delta = stable.value;
            }
          } else if (Math.abs(delta - stable.value) > 1) {
            // Significantly different (e.g., frame miss double or new activity)
            this.positionStableDelta.set(posKey, { value: delta, count: 1, snapCount: 0 });
          }
        } else {
          this.positionStableDelta.set(posKey, { value: delta, count: 1, snapCount: 0 });
        }

        xpValue = delta;

        // Use confirmed delta value to learn the XP drop font characters
        this.learnXpFontFromDelta(elements, delta);
      } else {
        // First time seeing this position.
        if (isFloatingDrop) {
          // Floating XP drops ("+75 xp", "+8") animate upward - every frame is a
          // "new" position. Let them through for direct emission. Don't seed delta
          // tracking to avoid polluting counter history.
        } else {
          // Record the value for delta tracking on next frame.
          // NEVER emit absolute values from new positions - bank/inventory numbers would
          // cause false positives. Only emit when the value CHANGES (delta > 0).
          this.positionXpValues.set(posKey, xpValue);
          continue;
        }
      }

      // Cap at 10M - no single XP drop exceeds this in RS3
      if (xpValue > 10_000_000) continue;

      // Floating drops are collected for batch dedup after this loop
      if (isFloatingDrop) {
        floatCandidates.push({ run, xpValue });
        continue;
      }

      // Delta-tracked (non-floating) dedup: short time window
      const signature = `delta:${posKey}:${xpValue}`;
      const existingDrop = this.recentDrops.get(signature);
      if (existingDrop && (now - existingDrop.timestamp) < 400) {
        continue;
      }

      // Look for nearby skill sprites (outside panel)
      const nearbySkills = this.findSkillsNearPosition(elements, run.x, run.y);

      // Accept XP text without nearby skill sprite if:
      // 1. Detection zone is active (zone constraint prevents false positives), OR
      // 2. Text is white/near-white (RS3 XP drops are often white)
      if (nearbySkills.length === 0) {
        const isWhiteText = run.color && run.color[0] > 200 && run.color[1] > 200 && run.color[2] > 200;
        if (!this.userDetectionZone && !isWhiteText) continue;
      }

      const dropType = this.classifyDropType(nearbySkills);
      const skill = nearbySkills.length === 1 ? nearbySkills[0] : null;
      const skillXp = this.calculateSkillXp(xpValue, dropType, skill, nearbySkills);

      this.recordDrop(signature, now, run.x, run.y);

      const skillSpriteImages = nearbySkills
        .map(s => skillSpriteCache.get(s.id))
        .filter((s): s is CachedSkillSprite => s !== undefined);

      results.push({
        xpValue,
        xpText: run.text,
        skill,
        skillSprite: null,
        dropType,
        skills: nearbySkills,
        skillXp,
        skillSpriteImages,
        timestamp: now,
        likelySource: null,
      });
    }

    // Step 4: Spawn-gated edge-detector dedup.
    // Only feed the edge detector when the newest drop is near the spawn point (Y > 980).
    // This ensures continuation frames (drop floating upward) are ignored, and the
    // edge detector only sees spawn events. Same-value consecutive drops re-feed at
    // game-tick intervals (600ms > MIN_MS_BETWEEN_SAME), so they always pass.
    if (floatCandidates.length > 0) {
      const newest = floatCandidates.reduce((best, c) =>
        c.run.y > best.run.y ? c : best
      );

      // Only feed edge detector when near spawn — skip continuation frames entirely
      const SPAWN_Y_THRESHOLD = 970;
      const isNearSpawn = newest.run.y >= SPAWN_Y_THRESHOLD;
      const shouldEmit = isNearSpawn
        ? this.floatEdgeDetector.processFrame(newest.run.text)
        : false;

      if (shouldEmit) {
        const xpValue = newest.xpValue;
        const signature = `float:${xpValue}:${now}:${Math.round(newest.run.y)}`;

        let nearbySkills = this.findSkillsNearPosition(elements, newest.run.x, newest.run.y);

        // Sticky skill cache for stream mode
        const quantizedX = Math.round(newest.run.x / 30) * 30;
        if (nearbySkills.length > 0) {
          this.stickySkillByX.set(quantizedX, nearbySkills);
        } else {
          const cached = this.stickySkillByX.get(quantizedX);
          if (cached && cached.length > 0) nearbySkills = cached;
        }

        const dropType = this.classifyDropType(nearbySkills);
        const skill = nearbySkills.length === 1 ? nearbySkills[0] : null;
        const skillXp = this.calculateSkillXp(xpValue, dropType, skill, nearbySkills);
        this.recordDrop(signature, now, newest.run.x, newest.run.y);

        const skillSpriteImages = nearbySkills
          .map(s => skillSpriteCache.get(s.id))
          .filter((s): s is CachedSkillSprite => s !== undefined);

        results.push({
          xpValue,
          xpText: newest.run.text,
          skill,
          skillSprite: null,
          dropType,
          skills: nearbySkills,
          skillXp,
          skillSpriteImages,
          timestamp: now,
          likelySource: null,
        });
      }
    } else {
      // No float candidates this frame — tell edge detector there's a gap
      this.floatEdgeDetector.processFrame(null);
    }

    // Update previous frame text positions for static text rejection
    this.previousScanTexts.clear();
    for (const run of textRuns) {
      const posKey = `${Math.round(run.x / 15) * 15}_${Math.round(run.y / 15) * 15}`;
      this.previousScanTexts.set(posKey, run.text);
    }

    this.textScanFrameCount++;
    return results;
  }

  /**
   * Backward-compatible detect method - returns first result or null
   */
  detect(renders: patchrs.RenderInvocation[]): XpDropResult | null {
    const results = this.detectAll(renders);
    for (const result of results) {
      this.logXpDrop(result);
    }
    return results.length > 0 ? results[0] : null;
  }

  /** Refresh sprite cache and position map without running detection logic.
   *  Call with recordRenderCalls data to seed real hashes into the atlas tracker. */
  calibrate(renders: patchrs.RenderInvocation[]): void {
    getUIState(renders, this.atlas);
  }

  /**
   * Fallback XP detection: find skill sprites outside the skill panel
   * and read nearby text as XP values.
   * Used when sprite 9278 (XP drop background) is not present.
   */
  private detectFallback(elements: RenderRect[], now: number): XpDropResult[] {
    const results: XpDropResult[] = [];

    // Step 1: Find all skill sprites and determine the skill panel region
    const skillSprites: { el: RenderRect; index: number }[] = [];
    for (let i = 0; i < elements.length; i++) {
      const id = elements[i].sprite.known?.id;
      if (id !== undefined && ALL_SKILL_IDS.includes(id)) {
        skillSprites.push({ el: elements[i], index: i });
      }
    }

    if (skillSprites.length < 2) return results;

    // Step 2: Detect the skill panel bounding box
    // The skill panel has many skill sprites clustered together in a grid
    // Use a simple approach: find the bounding box that contains the most skills
    // within a reasonable area (300x300 pixels)
    let bestCluster: { minX: number; maxX: number; minY: number; maxY: number; count: number } | null = null;

    for (const seed of skillSprites) {
      const clusterSprites = skillSprites.filter(s =>
        Math.abs(s.el.x - seed.el.x) < 300 && Math.abs(s.el.y - seed.el.y) < 300
      );
      if (!bestCluster || clusterSprites.length > bestCluster.count) {
        const xs = clusterSprites.map(s => s.el.x);
        const ys = clusterSprites.map(s => s.el.y);
        bestCluster = {
          minX: Math.min(...xs) - 20,
          maxX: Math.max(...xs) + 40,
          minY: Math.min(...ys) - 20,
          maxY: Math.max(...ys) + 40,
          count: clusterSprites.length,
        };
      }
    }

    if (!bestCluster || bestCluster.count < 5) return results;

    // Step 3: Find skill sprites OUTSIDE the skill panel
    const outlierSkills = skillSprites.filter(s =>
      s.el.x < bestCluster!.minX || s.el.x > bestCluster!.maxX ||
      s.el.y < bestCluster!.minY || s.el.y > bestCluster!.maxY
    );

    if (outlierSkills.length === 0) return results;

    // Step 4: For each outlier skill sprite, try to read nearby text
    for (const outlier of outlierSkills) {
      const skillId = outlier.el.sprite.known!.id;
      const skillInfo = SKILL_ID_TO_INFO.get(skillId);
      if (!skillInfo) continue;

      // Look for font characters near this skill sprite in the render order
      // Check elements AFTER the skill sprite (XP text usually renders after the icon)
      const searchStart = Math.max(0, outlier.index - 5);
      const searchEnd = Math.min(elements.length, outlier.index + MAX_RENDER_ORDER_DISTANCE);

      let xpText = "";
      let textElement: RenderRect | null = null;

      for (let i = outlier.index + 1; i < searchEnd; i++) {
        const el = elements[i];
        if (el.sprite.known?.fontchr) {
          // Found font character - use UIRenderParser to read the full text
          const textParser = new uiparser.UIRenderParser(elements, i, searchEnd);
          const fontResult = textParser.readFont();
          if (fontResult.text.trim().length > 0) {
            xpText = fontResult.text.trim();
            textElement = elements[fontResult.startindex];
            break;
          }
        }
        // If we hit another non-font known sprite that's not a skill, stop looking
        if (el.sprite.known && !el.sprite.known.fontchr && !ALL_SKILL_IDS.includes(el.sprite.known.id)) {
          break;
        }
      }

      // Also check BEFORE the skill sprite (text might render before icon)
      if (!xpText) {
        for (let i = outlier.index - 1; i >= searchStart; i--) {
          const el = elements[i];
          if (el.sprite.known?.fontchr) {
            // Find the start of this text run
            let textStart = i;
            while (textStart > 0 && elements[textStart - 1].sprite.known?.fontchr) {
              textStart--;
            }
            const textParser = new uiparser.UIRenderParser(elements, textStart, outlier.index);
            const fontResult = textParser.readFont();
            if (fontResult.text.trim().length > 0) {
              xpText = fontResult.text.trim();
              textElement = elements[fontResult.startindex];
              break;
            }
          }
          if (el.sprite.known && !el.sprite.known.fontchr && !ALL_SKILL_IDS.includes(el.sprite.known.id)) {
            break;
          }
        }
      }

      if (!xpText) {
        continue;
      }

      // Parse XP value
      const xpValue = this.parseXpValue(xpText);
      if (xpValue < 1) {
        const rejectKey = `${skillInfo.label}:${Math.round(outlier.el.x / 10) * 10}:${Math.round(outlier.el.y / 10) * 10}:${xpText.replace(/[0-9.]/g, '')}`;
        if (!this.fallbackRejectCache.has(rejectKey) || (now - this.fallbackRejectCache.get(rejectKey)!) > 10000) {
          this.fallbackRejectCache.set(rejectKey, now);
        }
        continue;
      }

      // Dedup check
      const signature = `${xpValue}`;
      const dropX = textElement?.x ?? outlier.el.x;
      const dropY = textElement?.y ?? outlier.el.y;
      if (this.isDuplicate(signature, now, dropX, dropY)) {
        continue;
      }


      // Record and emit
      this.recordDrop(signature, now, dropX, dropY);
      this.updateDropZone(dropX, dropY, now);

      // Cache the skill sprite
      skillSpriteCache.cacheFromRenderRect(outlier.el);
      const spriteImage = skillSpriteCache.get(skillId);
      const skillSpriteImages = spriteImage ? [spriteImage] : [];

      const skillXp: SkillXpAttribution[] = [{ skill: skillInfo, xp: xpValue, isPrimary: true }];

      results.push({
        xpValue,
        xpText,
        skill: skillInfo,
        skillSprite: outlier.el,
        dropType: XpDropType.SINGLE_SKILL,
        skills: [skillInfo],
        skillXp,
        skillSpriteImages,
        timestamp: now,
        likelySource: null,
      });
    }

    return results;
  }

  /**
   * Find skill sprites near a specific position (for pending drop resolution)
   * Filters out menu skills (always visible in UI) and uses MAX_INDICATOR_DISTANCE
   */
  private findSkillsNearPosition(elements: RenderRect[], x: number, y: number): SkillInfo[] {
    // Filter skill sprites that are:
    // 1. Not menu skills (always visible in skills interface)
    // 2. Close to the XP text position
    const nearbySkillSprites = elements.filter(el => {
      const id = el.sprite.known?.id;
      if (id === undefined || !ALL_SKILL_IDS.includes(id)) return false;

      // Skip menu skills - they're always visible and not XP indicators
      if (MENU_SKILL_IDS.has(id)) return false;

      // Check if sprite is close to the position
      const horizontalDist = Math.abs(el.x - x);
      if (horizontalDist > MAX_INDICATOR_DISTANCE) return false;

      const verticalDist = Math.abs(el.y - y);
      if (verticalDist > 50) return false;

      return true;
    });

    // Deduplicate by skill ID
    const uniqueSkillIds = new Set<number>();
    const skills: SkillInfo[] = [];
    for (const sprite of nearbySkillSprites) {
      const id = sprite.sprite.known!.id;
      if (!uniqueSkillIds.has(id)) {
        uniqueSkillIds.add(id);
        const skillInfo = SKILL_ID_TO_INFO.get(id);
        if (skillInfo) skills.push(skillInfo);
      }
    }
    return skills;
  }

  /**
   * Classify the type of XP drop based on the skills present.
   */
  private classifyDropType(skills: SkillInfo[]): XpDropType {
    if (skills.length === 0) {
      return XpDropType.UNKNOWN_MULTI;
    }

    if (skills.length === 1) {
      return XpDropType.SINGLE_SKILL;
    }

    // Check if all skills are combat skills
    const allCombat = skills.every(s => COMBAT_SKILL_IDS.has(s.id));
    const hasConstitution = skills.some(s => s.id === SKILL_SPRITES.constitution.id);

    // 2-4 combat skills with Constitution = typical combat split
    if (allCombat && hasConstitution && skills.length <= 4) {
      return XpDropType.COMBAT_SPLIT;
    }

    // Many skills (10+) = likely celebration lamp or all-skills lamp
    if (skills.length >= 10) {
      // If it's close to all skills (25+), it's an all-skills lamp
      if (skills.length >= 20) {
        return XpDropType.ALL_SKILLS_LAMP;
      }
      // Otherwise likely celebration lamp
      return XpDropType.CELEBRATION_LAMP;
    }

    // 5-9 skills could be celebration lamp with combat opt-out
    if (skills.length >= 5) {
      return XpDropType.CELEBRATION_LAMP;
    }

    // Fallback for other multi-skill scenarios
    return XpDropType.UNKNOWN_MULTI;
  }

  /**
   * Calculate per-skill XP attribution based on drop type.
   *
   * Distribution rules:
   * - SINGLE_SKILL: 100% to that skill
   * - COMBAT_SPLIT: Constitution gets 1/3, others split 2/3
   * - CELEBRATION_LAMP: Primary skill gets full XP, others get 5%
   * - ALL_SKILLS_LAMP: Equal split among all skills
   * - UNKNOWN_MULTI: Equal split as fallback
   */
  private calculateSkillXp(
    totalXp: number,
    dropType: XpDropType,
    singleSkill: SkillInfo | null,
    skills: SkillInfo[]
  ): SkillXpAttribution[] {
    // Single skill drop - 100% to that skill
    if (dropType === XpDropType.SINGLE_SKILL && singleSkill) {
      return [{ skill: singleSkill, xp: totalXp, isPrimary: true }];
    }

    // No skills identified
    if (skills.length === 0) {
      return [];
    }

    switch (dropType) {
      case XpDropType.COMBAT_SPLIT:
        return this.calculateCombatSplit(totalXp, skills);

      case XpDropType.CELEBRATION_LAMP:
        return this.calculateCelebrationLamp(totalXp, skills);

      case XpDropType.ALL_SKILLS_LAMP:
        return this.calculateEqualSplit(totalXp, skills);

      case XpDropType.UNKNOWN_MULTI:
      default:
        return this.calculateEqualSplit(totalXp, skills);
    }
  }

  /**
   * Combat XP split: Constitution gets 1/3, PRIMARY attack skill gets 2/3
   * If Prayer is detected (Soul Split/Leech curses), estimate Prayer XP as bonus
   */
  private calculateCombatSplit(totalXp: number, skills: SkillInfo[]): SkillXpAttribution[] {
    const hasConstitution = skills.some(s => s.id === SKILL_SPRITES.constitution.id);
    const hasPrayer = skills.some(s => s.id === SKILL_SPRITES.prayer.id);

    // Find the primary attack skill (Magic, Ranged, Attack, Strength, Defence, Necromancy)
    const primaryAttackSkill = skills.find(s => PRIMARY_ATTACK_SKILL_IDS.has(s.id));

    if (hasConstitution && primaryAttackSkill) {
      // Standard RS3 combat split: 1/3 Constitution, 2/3 attack skill
      const constitutionXp = Math.round(totalXp / 3 * 10) / 10;
      const attackXp = Math.round((totalXp * 2 / 3) * 10) / 10;

      const result: SkillXpAttribution[] = [
        { skill: { id: SKILL_SPRITES.constitution.id, label: "Constitution" }, xp: constitutionXp },
        { skill: primaryAttackSkill, xp: attackXp, isPrimary: true }
      ];

      // If Prayer is displayed alongside combat skills, try to identify the bone/ash type
      // from the JSON database. Bonecrusher/ectoplasmator give fixed XP based on bone type.
      if (hasPrayer) {
        // Check if this total XP matches a known Prayer source (might be misclassified Prayer drop)
        const prayerSource = findMatchingPrayerSource(totalXp);
        if (prayerSource) {
          // This looks like a Prayer drop being misclassified as combat!
          // Return just the Prayer XP
          return [{
            skill: { id: SKILL_SPRITES.prayer.id, label: "Prayer" },
            xp: prayerSource.xp
          }];
        }

        // Otherwise estimate Prayer XP at ~10% (Soul Split healing)
        const prayerXp = Math.round(totalXp * 0.1 * 10) / 10;
        result.push({
          skill: { id: SKILL_SPRITES.prayer.id, label: "Prayer" },
          xp: prayerXp
        });
      }

      return result;
    }

    // If only Constitution (no attack skill), it gets 1/3
    if (hasConstitution && !primaryAttackSkill) {
      const constitutionXp = Math.round(totalXp / 3 * 10) / 10;
      return [{ skill: { id: SKILL_SPRITES.constitution.id, label: "Constitution" }, xp: constitutionXp }];
    }

    // If only attack skill (no Constitution), it gets 2/3
    if (!hasConstitution && primaryAttackSkill) {
      const attackXp = Math.round((totalXp * 2 / 3) * 10) / 10;
      return [{ skill: primaryAttackSkill, xp: attackXp }];
    }

    // Fallback to equal split if neither Constitution nor attack skill
    return this.calculateEqualSplit(totalXp, skills);
  }

  /**
   * Celebration lamp: Primary skill gets full XP (shown as totalXp),
   * all other skills get 5% of that amount.
   * The totalXp shown is the PRIMARY skill's XP, not the sum.
   */
  private calculateCelebrationLamp(totalXp: number, skills: SkillInfo[]): SkillXpAttribution[] {
    if (skills.length === 0) return [];

    // First skill is typically the primary (selected) skill
    const primarySkill = skills[0];
    const secondarySkills = skills.slice(1);

    // Primary gets full amount shown
    const primaryXp = totalXp;
    // Secondary skills get 5% of primary
    const secondaryXp = Math.round(totalXp * 0.05 * 10) / 10;

    const result: SkillXpAttribution[] = [
      { skill: primarySkill, xp: primaryXp, isPrimary: true }
    ];

    for (const skill of secondarySkills) {
      result.push({ skill, xp: secondaryXp, isPrimary: false });
    }

    return result;
  }

  /**
   * Equal split: Total XP divided evenly among all skills
   */
  private calculateEqualSplit(totalXp: number, skills: SkillInfo[]): SkillXpAttribution[] {
    if (skills.length === 0) return [];

    const perSkillXp = Math.round(totalXp / skills.length * 10) / 10;
    return skills.map(skill => ({ skill, xp: perSkillXp }));
  }

  /**
   * Check if text looks like a valid XP value (not tooltip/item text)
   * Valid: "+5", "150", "1.5k", "2.3m xp", "1,234"
   * Invalid: "Stack value: 1.8K", "1 x Law talisman", "Level 99", "1,232/1,232", "100%"
   */
  private isValidXpText(text: string): boolean {
    const trimmed = text.trim();

    // Reject text containing PUA placeholder chars (stream-mode unknowns).
    // These produce wrong numeric values; wait until chars are learned.
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed.charCodeAt(i) >= 0xE000) return false;
    }

    // Reject text containing "/" - HP/prayer/summoning bars like "1,232/1,232"
    if (trimmed.includes("/")) return false;

    // Reject digit-hyphen-digit patterns — misread "/" in stream mode.
    // E.g., "1-28" is really "1/28" (kill counter), "60-60" is "60/60" (prayer).
    // Don't reject "+"-prefixed floating drops (those never contain separators).
    if (!trimmed.startsWith('+') && /\d\s*-\s*\d/.test(trimmed)) return false;

    // Reject text containing "%" - adrenaline bar like "100%"
    if (trimmed.includes("%")) return false;

    // Reject very short text that's just 1-2 digits (likely UI labels/levels/crafting values)
    // UNLESS it starts with "+" which indicates an actual XP drop (e.g., "+ 6 xp")
    // Static UI labels like "6.3xp" in crafting interface don't have "+" prefix.
    const digitsOnly = trimmed.replace(/[^0-9]/g, "");
    const startsWithPlus = trimmed.startsWith("+");
    if (digitsOnly.length <= 2 && !startsWithPlus && !trimmed.includes("k") && !trimmed.includes("K") && !trimmed.includes("m") && !trimmed.includes("M")) return false;

    // Reject if contains "x" followed by space (item count like "1 x Law")
    if (/\d+\s*x\s+/i.test(trimmed)) return false;

    // Reject if contains colon (tooltip labels like "Stack value:")
    if (trimmed.includes(":")) return false;

    // Reject if starts with a letter (not + or digit)
    if (/^[a-z]/i.test(trimmed)) return false;

    // Reject if contains multiple words with letters (item names)
    // Allow "xp" at the end but not other words
    const withoutXp = trimmed.replace(/\s*xp\s*$/i, "");
    if (/[a-z]{2,}/i.test(withoutXp.replace(/[km]$/i, ""))) return false;

    // Must contain at least one digit
    if (!/\d/.test(trimmed)) return false;

    return true;
  }

  /**
   * Parse XP value from text, handling +, k/m suffixes, and "xp" suffix
   * Examples: "+5 xp", "150", "1.5k", "2.3m xp"
   */
  private parseXpValue(text: string): number {
    // Handle "current/target" format from XP tracker (e.g., "7,673/13,200")
    // Extract only the current value (left of "/") for delta tracking.
    let processText = text;
    if (text.includes("/")) {
      const parts = text.split("/");
      if (parts.length === 2 && /\d/.test(parts[0]) && /\d/.test(parts[1])) {
        processText = parts[0].trim();
      }
    }

    // Strip parenthetical bonus XP info: "+7 xp (3.8 bonus xp)" → "+7 xp"
    // Also handle '...) since '(' can be misidentified as "'" in stream mode
    processText = processText.replace(/\s*['(][^)]*\)\s*$/, "").trim();

    // For floating drops, truncate after first "xp" to remove any trailing garbage
    if (processText.startsWith('+')) {
      const xpIdx = processText.toLowerCase().indexOf('xp');
      if (xpIdx > 0) {
        processText = processText.substring(0, xpIdx + 2).trim();
      }
    }

    // First validate this looks like XP text, not a tooltip
    if (!this.isValidXpText(processText)) {
      return 0;
    }

    // Remove +, spaces, "xp" suffix, and other non-numeric chars except . k m
    // For floating drops (+), strip "." too — RS3 XP drops are always integers,
    // so "." is a misidentified font char in stream mode (e.g., "+.7" → "+7").
    const isFloat = processText.startsWith('+');
    const clean = processText.toLowerCase()
      .replace(/xp/g, "")
      .replace(isFloat ? /[^0-9km]/g : /[^0-9.km]/g, "");

    const match = clean.match(/^([\d.]+)(k|m)?/);
    if (!match) return 0;

    let value = parseFloat(match[1]);
    if (isNaN(value)) return 0;

    if (match[2] === "k") value *= 1000;
    if (match[2] === "m") value *= 1000000;

    return Math.round(value * 10) / 10;
  }

  /**
   * Find the skill(s) associated with an XP drop.
   * In RS3, XP can be split among multiple skills (e.g., Constitution + Magic + Prayer)
   *
   * XP drop UI structure: skill icons appear DIRECTLY above the XP text,
   * typically within 20-35 pixels vertically and nearly centered horizontally.
   *
   * IMPORTANT: Uses tight thresholds to avoid picking up sprites from OTHER drops
   * that are still animating on screen.
   */
  private findAssociatedSkill(
    elements: RenderRect[],
    xpTextElement: RenderRect | undefined
  ): {
    skill: SkillInfo | null;
    skillSprite: RenderRect | null;
    skills: SkillInfo[];
  } {
    if (!xpTextElement) {
      return { skill: null, skillSprite: null, skills: [] };
    }

    const xpX = xpTextElement.x;
    const xpY = xpTextElement.y;

    // Find ALL skill sprites on screen
    const allSkillSprites = elements.filter(el => {
      const id = el.sprite.known?.id;
      return id !== undefined && ALL_SKILL_IDS.includes(id);
    });

    // Separate into menu skills (always visible in UI) vs XP indicators (actual drop indicators)
    const menuSprites: RenderRect[] = [];
    const xpIndicatorSprites: RenderRect[] = [];

    for (const sprite of allSkillSprites) {
      const id = sprite.sprite.known!.id;
      if (MENU_SKILL_IDS.has(id)) {
        menuSprites.push(sprite);
      } else {
        // Non-menu skill - potential XP indicator
        xpIndicatorSprites.push(sprite);
      }
    }

    // Find XP indicator sprites that are close enough to the XP text
    // Use MAX_INDICATOR_DISTANCE for horizontal distance
    const nearbyIndicators = xpIndicatorSprites.filter(el => {
      const horizontalDist = Math.abs(el.x - xpX);
      // Must be within MAX_INDICATOR_DISTANCE horizontally
      if (horizontalDist > MAX_INDICATOR_DISTANCE) return false;

      // Vertically: skill icons typically appear above/near the XP text
      const verticalDist = Math.abs(el.y - xpY);
      if (verticalDist > 50) return false;

      return true;
    });

    // If no non-menu indicators found, the drop might not have a visible skill indicator
    // (e.g., Prayer from bonecrusher, or skill icon faded)
    if (nearbyIndicators.length === 0) {
      return { skill: null, skillSprite: null, skills: [] };
    }

    // Deduplicate by skill ID and cache sprites
    const uniqueSkillIds = new Set<number>();
    const uniqueSkills: RenderRect[] = [];
    for (const sprite of nearbyIndicators) {
      const id = sprite.sprite.known!.id;
      if (!uniqueSkillIds.has(id)) {
        uniqueSkillIds.add(id);
        uniqueSkills.push(sprite);
        // Cache the sprite for later use in display
        skillSpriteCache.cacheFromRenderRect(sprite);
      }
    }

    // Convert to SkillInfo array
    let skills = uniqueSkills
      .map(s => SKILL_ID_TO_INFO.get(s.sprite.known!.id)!)
      .filter(Boolean);

    // VALIDATION: Check for impossible skill combinations
    // Normal skilling activities should NEVER combine non-combat skills
    if (skills.length > 1) {
      const validatedSkills = this.validateSkillCombination(skills, xpX, xpY, uniqueSkills);
      if (validatedSkills.length !== skills.length) {
        skills = validatedSkills;

        // Update uniqueSkills to match
        const validIds = new Set(validatedSkills.map(s => s.id));
        uniqueSkills.length = 0;
        for (const sprite of nearbyIndicators) {
          const id = sprite.sprite.known!.id;
          if (validIds.has(id) && !uniqueSkills.some(s => s.sprite.known!.id === id)) {
            uniqueSkills.push(sprite);
          }
        }
      }
    }

    // Single skill - return with skill info
    if (uniqueSkills.length === 1) {
      const sprite = uniqueSkills[0];
      const skillInfo = skills[0];
      return {
        skill: skillInfo,
        skillSprite: sprite,
        skills,
      };
    }

    // Multiple skills
    return {
      skill: null,
      skillSprite: null,
      skills,
    };
  }

  /**
   * Validate that a combination of skills makes sense for RS3.
   * Returns the validated (possibly reduced) list of skills.
   *
   * Valid multi-skill combinations:
   * - Combat skills only (Attack/Str/Def/Ranged/Magic/Necro/Constitution/Prayer/Summoning)
   * - Many skills together (10+) = celebration/all-skills lamp
   *
   * Invalid combinations (likely from OTHER drops on screen):
   * - Woodcutting + Firemaking (these never share XP)
   * - Fletching + Firemaking
   * - Mining + Smithing (unless possibly DXP but rare)
   * - Any non-combat skill + combat skill (unless it's Prayer from bonecrusher)
   */
  private validateSkillCombination(
    skills: SkillInfo[],
    xpX: number,
    xpY: number,
    skillSprites: RenderRect[]
  ): SkillInfo[] {
    // If many skills (5+), it's likely a lamp - accept it
    if (skills.length >= 5) {
      return skills;
    }

    // Check if all skills are combat skills - valid combination
    const allCombat = skills.every(s => COMBAT_SKILL_IDS.has(s.id));
    if (allCombat) {
      return skills;
    }

    // For 2-4 skills with non-combat mixed in, check if it's valid
    const combatSkills = skills.filter(s => COMBAT_SKILL_IDS.has(s.id));
    const nonCombatSkills = skills.filter(s => !COMBAT_SKILL_IDS.has(s.id));

    // If we have combat + non-combat, it's almost always wrong
    // Exception: Prayer can appear with combat skills from Soul Split
    if (combatSkills.length > 0 && nonCombatSkills.length > 0) {
      // If non-combat skills are ONLY Prayer, and we have combat skills, that's valid
      const nonCombatWithoutPrayer = nonCombatSkills.filter(s => s.id !== SKILL_SPRITES.prayer.id);
      if (nonCombatWithoutPrayer.length === 0) {
        return skills; // Valid: combat + Prayer
      }

      // Otherwise, pick the skill CLOSEST to the XP text position
      return this.pickClosestSkill(skills, xpX, xpY, skillSprites);
    }

    // Multiple non-combat skills together - almost always wrong
    // (e.g., Woodcutting + Firemaking from different drops)
    if (nonCombatSkills.length > 1) {
      return this.pickClosestSkill(skills, xpX, xpY, skillSprites);
    }

    return skills;
  }

  /**
   * Pick the single skill that is closest to the XP text position.
   * Used when we detect what are likely skills from different drops.
   */
  private pickClosestSkill(
    skills: SkillInfo[],
    xpX: number,
    xpY: number,
    skillSprites: RenderRect[]
  ): SkillInfo[] {
    let closestSkill: SkillInfo | null = null;
    let closestDist = Infinity;

    for (const sprite of skillSprites) {
      const id = sprite.sprite.known!.id;
      const skillInfo = SKILL_ID_TO_INFO.get(id);
      if (!skillInfo) continue;

      // Calculate distance (prioritize horizontal alignment)
      const hDist = Math.abs(sprite.x - xpX);
      const vDist = Math.abs(sprite.y - xpY);
      const dist = hDist * 2 + vDist; // Weight horizontal more

      if (dist < closestDist) {
        closestDist = dist;
        closestSkill = skillInfo;
      }
    }

    return closestSkill ? [closestSkill] : skills.slice(0, 1);
  }
}

// ============================================================================
// SPRITE CAPTURE UTILITY
// ============================================================================
export function captureSprite(sprite: RenderRect["sprite"]): string | null {
  try {
    const { x, y, width, height } = sprite;
    const imgData = safeCapture(sprite.basetex, x, y, width, height);
    if (!imgData) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  } catch {
    return null;
  }
}

// ============================================================================
// BRIGHTNESS ANALYSIS UTILITY
// ============================================================================
export type BrightnessResult = {
  /** Average brightness (0-255) */
  avgBrightness: number;
  /** Maximum brightness found */
  maxBrightness: number;
  /** Percentage of pixels above threshold (bright pixels) */
  brightPixelRatio: number;
  /** Average alpha (0-255) */
  avgAlpha: number;
  /** Number of non-transparent pixels */
  visiblePixels: number;
  /** Total pixels analyzed */
  totalPixels: number;
};

/**
 * Analyze the brightness of an ImageData object.
 * XP drop text is typically white/bright colored, so we can use
 * brightness thresholds to validate detection.
 */
export function analyzeBrightness(
  imgData: ImageData,
  brightnessThreshold: number = 200
): BrightnessResult {
  const data = imgData.data;
  const totalPixels = imgData.width * imgData.height;

  let sumBrightness = 0;
  let sumAlpha = 0;
  let maxBrightness = 0;
  let brightPixelCount = 0;
  let visiblePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a < 10) continue;

    visiblePixels++;
    sumAlpha += a;

    // Calculate perceived brightness (luminance formula)
    // Human eye is more sensitive to green, less to blue
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);

    sumBrightness += brightness;
    if (brightness > maxBrightness) maxBrightness = brightness;
    if (brightness >= brightnessThreshold) brightPixelCount++;
  }

  return {
    avgBrightness: visiblePixels > 0 ? sumBrightness / visiblePixels : 0,
    maxBrightness,
    brightPixelRatio: visiblePixels > 0 ? brightPixelCount / visiblePixels : 0,
    avgAlpha: visiblePixels > 0 ? sumAlpha / visiblePixels : 0,
    visiblePixels,
    totalPixels,
  };
}

/**
 * Capture a sprite region and analyze its brightness.
 * Returns null if capture fails.
 */
export function captureSpriteWithBrightness(
  sprite: RenderRect["sprite"]
): { dataUrl: string; brightness: BrightnessResult } | null {
  try {
    const { x, y, width, height } = sprite;
    const imgData = safeCapture(sprite.basetex, x, y, width, height);
    if (!imgData) return null;

    const brightness = analyzeBrightness(imgData);

    // Create canvas for data URL
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.putImageData(imgData, 0, 0);

    return {
      dataUrl: canvas.toDataURL(),
      brightness,
    };
  } catch {
    return null;
  }
}

/**
 * Check if brightness characteristics match an XP drop.
 * XP drops have bright white text that should:
 * - Have high average brightness (text is white/light)
 * - Have a good ratio of bright pixels
 * - Have visible alpha (not fully transparent)
 */
export function isBrightnessValidForXpDrop(brightness: BrightnessResult): boolean {
  // Need at least some visible pixels
  if (brightness.visiblePixels < 5) return false;

  // XP text should have high brightness (white text)
  // Threshold: at least 150 average brightness or 30% bright pixels
  const hasHighBrightness = brightness.avgBrightness >= 150;
  const hasBrightPixels = brightness.brightPixelRatio >= 0.3;

  // Need good alpha (visible, not faded)
  const hasGoodAlpha = brightness.avgAlpha >= 100;

  return (hasHighBrightness || hasBrightPixels) && hasGoodAlpha;
}

// ============================================================================
// HELPER - Get skill label from ID
// ============================================================================
export function getSkillLabel(id: number): string | null {
  return SKILL_ID_TO_INFO.get(id)?.label ?? null;
}
