/**
 * Tooltip Item Learner
 *
 * Auto-learns item names by detecting tooltips that appear when hovering
 * items in the inventory. Uses mouse position from the overlay API to
 * determine exactly which inventory slot is being hovered.
 *
 * Tooltip sprites: 4650, 4649, 4651, 35516
 * - These form a box around the item name text when hovering
 * - 35516 appears toward the center
 */

import { GLBridgeAdapter, type RenderRect, type UIState } from './GLBridgeAdapter';
import type { RenderInvocation, StreamRenderObject } from './patchrs_napi';
import * as patchrs from './patchrs_napi';
import { hammingDistance, itemHash, itemHashToHex } from './phash';
import { queueItem as queueItemForApi } from '../types/itemApi';

// Tooltip sprite IDs that form the tooltip background
export const TOOLTIP_SPRITE_IDS = {
  topLeft: 4650,
  topRight: 4649,
  bottomLeft: 4651,
  center: 35516,
};

const TOOLTIP_ID_SET = new Set([
  TOOLTIP_SPRITE_IDS.topLeft,
  TOOLTIP_SPRITE_IDS.topRight,
  TOOLTIP_SPRITE_IDS.bottomLeft,
  TOOLTIP_SPRITE_IDS.center,
]);

/**
 * Extract mouse position from render invocation uniforms
 */
export function getMousePositionFromRender(render: RenderInvocation): { x: number; y: number } | null {
  if (!render.program?.uniforms || !render.uniformState) return null;

  const mouseUniform = render.program.uniforms.find((u: any) =>
    u.name === 'uMouse' || u.name === 'mouse' || u.name === 'u_mouse'
  );
  if (!mouseUniform) return null;

  try {
    const offset = mouseUniform.snapshotOffset;
    if (offset === undefined || offset < 0) return null;

    const view = new DataView(
      render.uniformState.buffer,
      render.uniformState.byteOffset + offset
    );
    const x = view.getFloat32(0, true);
    const y = view.getFloat32(4, true);

    if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x > 10000 || y > 10000) {
      return null;
    }

    return { x, y };
  } catch (e) {
    return null;
  }
}

/**
 * Debug: Log all uniform names from renders
 */
export function debugUniformNames(renders: RenderInvocation[]): string[] {
  const names = new Set<string>();
  for (const render of renders) {
    if (render.program?.uniforms) {
      for (const u of render.program.uniforms) {
        names.add((u as any).name);
      }
    }
  }
  return Array.from(names).sort();
}

/**
 * Find mouse position from any render invocation that has the uMouse uniform
 */
export function findMousePosition(renders: RenderInvocation[]): { x: number; y: number } | null {
  for (const render of renders) {
    const pos = getMousePositionFromRender(render);
    if (pos) return pos;
  }
  return null;
}

/**
 * Learned item entry
 */
export interface LearnedItem {
  name: string;
  iconHash: number;       // CRC32 hash (session-specific)
  pHash?: string;         // Perceptual hash (cross-session)
  learnedAt: number;
  confidence: number;     // 0-1
  source: 'tooltip' | 'database' | 'manual';
}

/**
 * Inventory slot info for correlation
 */
export interface InventorySlotInfo {
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  iconHash: number;
  pHash?: string;
  iconElement: RenderRect | null;
}

/**
 * Tooltip detection result
 */
export interface TooltipDetectionResult {
  isVisible: boolean;
  bounds: { x: number; y: number; width: number; height: number } | null;
  text: string | null;
  nearestSlot: number | null;
  confidence: number;
}

/**
 * Calibration state exposed to UI
 */
export interface CalibrationState {
  active: boolean;
  targetSlot: number;
  totalSlots: number;
  samplesCollected: number;
  samplesNeeded: number;
  calibratedSlots: number;
  message: string;
  countdown: number;       // Seconds remaining before capture starts
  capturing: boolean;      // True when actively capturing samples
  columns: number;         // Detected column count for row/col display
}

/**
 * TooltipItemLearner - Auto-learns item names from inventory hover tooltips
 */
export class TooltipItemLearner {
  private glBridge: GLBridgeAdapter;
  private learnedItems: Map<number, LearnedItem> = new Map();
  private pHashIndex: Map<string, LearnedItem> = new Map();
  private listeners: Set<(item: LearnedItem) => void> = new Set();
  private renderStream: StreamRenderObject | null = null;

  // Track last mouse position inside the inventory grid
  private lastGridMousePos: { x: number; y: number; slot: number } | null = null;
  private lastGridMouseTime: number = 0;

  // Slot-vote confirmation system
  private slotVotes: Map<string, Map<number, number>> = new Map();
  private static readonly VOTES_REQUIRED = 2;
  private static readonly MAX_INVENTORY_SLOTS = 28;

  public debugMode = false;

  // pHash-based slot matching
  private namePHashCandidates: Map<string, Set<string>> = new Map();

  // Slot pHash Validation Map
  private slotPHashMap: Map<number, string> = new Map();
  private slotPHashStability: Map<number, { pHash: string; count: number }> = new Map();
  private static readonly PHASH_STABLE_FRAMES = 2;

  // Last detected inventory slots (for external access, e.g. pre-calibration item detection)
  private lastInventorySlots: InventorySlotInfo[] = [];

  // Inventory Mouse Calibration
  private calibratedMousePositions: Map<number, { x: number; y: number }[]> = new Map();
  private calibrationActive: boolean = false;
  private calibrationSlotList: number[] = [];
  private calibrationTargetIdx: number = 0;
  private calibrationSamplesPerSlot: number = 3;
  private calibrationListeners: Set<(state: CalibrationState) => void> = new Set();
  private calibrationCountdownFrames: number = 0;
  private static readonly CALIBRATION_COUNTDOWN_SECONDS = 4;  // 4 second countdown per slot
  private static readonly CALIBRATION_FRAMES_PER_SECOND = 2;  // ~500ms poll = 2 frames/sec
  private calibrationNumCols: number = 4;  // Actual detected columns for calibration display (not affected by MAX_INVENTORY_SLOTS cap)

  // UI text patterns that should never be learned as item names
  private static readonly REJECTED_PATTERNS: RegExp[] = [
    /don'?t\s*show\s*this\s*again/i,
    /show\s*this\s*again/i,
    /are\s*you\s*sure/i,
    /click\s*here\s*to/i,
    /press\s*esc/i,
    /please\s*wait/i,
    /select\s*the\s*icon/i,
    /view\s*your\s*wealth/i,
    /to\s*view\s*your/i,
    /right[- ]?click/i,
    /drag\s*(and|&)?\s*drop/i,
    /hover\s*over/i,
    /left[- ]?click/i,
    /you\s*currently\s*have/i,
    /select\s*this\s*to/i,
    /open\s*the\s*price/i,
    // RS3 UI element tooltips (not inventory items)
    /\baction\s*bar\b/i,
    /\bsettings?\b/i,
    /\bworn\s*equipment\b/i,
    /\bfamiliar\s*(details?|options?)\b/i,
    /\bloot\s*inventory\b/i,
    /\bcustomise\b/i,
    /\bskill\s*guide\b/i,
    /\bminimise\b/i,
    /\bmaximise\b/i,
    /\bclose\s*window\b/i,
    /\bribbon\b/i,
    /\babilities?\s*book\b/i,
    /\bprayer\s*(?:list|book)\b/i,
    /\bspell\s*book\b/i,
    /\bbackpack\b/i,
    /\bequipment\s*(?:screen|stats?)\b/i,
  ];

  /**
   * Check if text looks like a UI instruction rather than an item name
   */
  private static isInstructionalText(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.endsWith('.')) return true;
    if (trimmed.endsWith('!')) return true;
    if (trimmed.length > 60) return true;

    const sentenceWords = ['the', 'to', 'your', 'you', 'for', 'this', 'that', 'from',
      'with', 'have', 'has', 'will', 'can', 'select', 'click', 'view', 'open',
      'press', 'drag', 'hover', 'please', 'would', 'should', 'must',
      'currently', 'here', 'items', 'or', 'interface'];
    const lowerWords = trimmed.toLowerCase().split(/\s+/);
    const sentenceWordCount = lowerWords.filter(w => sentenceWords.includes(w)).length;
    if (sentenceWordCount >= 3) return true;

    return false;
  }

  /**
   * Check if text looks like garbled OCR output rather than a real item name.
   * Garbled text has many single-char tokens, isolated digits, excessive punctuation.
   * Example: "Vanqu 1 is 0 h,00(0(m 0/a 1 a 1 0 g 0 g,i 0 c 0)0 1 00%"
   */
  private static isGarbledText(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 3) return true;

    const tokens = trimmed.split(/\s+/);
    // If more than half of tokens are single characters, it's garbled
    const singleCharTokens = tokens.filter(t => t.length === 1).length;
    if (tokens.length >= 3 && singleCharTokens / tokens.length > 0.4) return true;

    // High punctuation density (parens, commas, slashes relative to length)
    const punctCount = (trimmed.match(/[(),\/\\%]/g) || []).length;
    if (punctCount > trimmed.length * 0.15) return true;

    // Excessive isolated digits (single digits separated by spaces)
    const isolatedDigits = tokens.filter(t => /^\d$/.test(t)).length;
    if (isolatedDigits >= 3) return true;

    return false;
  }

  // Inventory grid config
  private gridConfig = {
    startX: 0,
    startY: 0,
    slotWidth: 40,
    slotHeight: 36,
    columns: 4,
    rows: 7,
    horizontalGap: 2,
    verticalGap: 2,
    actualGridTopY: 0,
    actualCellWidth: 0,
    actualCellHeight: 0,
  };

  // Actual detected column X and row Y positions
  private columnPositions: number[] = [];
  private rowPositions: number[] = [];

  // Inventory slot sprite ID
  private readonly INVENTORY_SLOT_SPRITE_ID = 18266;

  constructor(glBridge: GLBridgeAdapter) {
    this.glBridge = glBridge;
  }

  /**
   * Set grid config
   */
  setGridConfig(config: typeof this.gridConfig): void {
    this.gridConfig = { ...config };
  }

  // ── Calibration API ──

  async startCalibration(slotIndices?: number[]): Promise<void> {
    let detectedCols = this.gridConfig.columns;
    let detectedSlotList: number[] | null = null;

    try {
      console.log('[Calibration] Detecting inventory grid from GL sprites...');
      const renders = await this.glBridge.recordRenderCalls({
        texturesnapshot: true,
        uniforms: true,
        vertexarray: true,
      });
      const uiState = this.glBridge.getUIState(renders);
      const elements = uiState.elements;

      const slotSprites = elements.filter(
        (el: RenderRect) => el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID
      );

      if (slotSprites.length >= 8) {
        // Also trigger autoCalibrate for normal detection if not done yet
        if (this.gridConfig.startX === 0 && this.gridConfig.startY === 0) {
          this.detectFromElements(elements, renders, null);
        }

        const xClusters = this.clusterPositions(slotSprites.map((s: RenderRect) => s.x), 8)
          .filter(c => c.count >= 2)
          .sort((a, b) => a.center - b.center);
        const yClusters = this.clusterPositions(slotSprites.map((s: RenderRect) => s.y), 8)
          .filter(c => c.count >= 2)
          .sort((a, b) => a.center - b.center);

        if (xClusters.length >= 2 && yClusters.length >= 2) {
          const colCenters = xClusters.map(c => c.center);
          const rowCenters = [...yClusters.map(c => c.center)].reverse();
          detectedCols = colCenters.length;
          const numRows = rowCenters.length;

          console.log(`[Calibration] Detected grid: ${detectedCols} columns × ${numRows} rows from ${slotSprites.length} slot sprites`);

          const SLOT_W = 40;
          const SLOT_H = 36;
          const targets: number[] = [];

          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < detectedCols; col++) {
              const slotIndex = row * detectedCols + col;
              const slotX = colCenters[col];
              const slotY = rowCenters[row];

              const hasItem = elements.some((el: RenderRect) => {
                if (el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID) return false;
                if (el.sprite?.known?.fontchr) return false;
                if (el.width < 10 || el.height < 10) return false;
                return (
                  el.x >= slotX - 2 &&
                  el.y >= slotY - 2 &&
                  el.x + el.width <= slotX + SLOT_W + 5 &&
                  el.y + el.height <= slotY + SLOT_H + 5
                );
              });

              if (hasItem) {
                targets.push(slotIndex);
              }
            }
          }

          if (targets.length > 0) {
            detectedSlotList = targets;
            console.log(`[Calibration] Found ${targets.length} slots with items: [${targets.join(', ')}]`);
          } else {
            console.warn('[Calibration] No slots with items detected — will calibrate all slots');
          }
        }
      } else {
        console.warn(`[Calibration] Only ${slotSprites.length} slot sprites found (need 8+) — running detectAndLearn fallback`);
        await this.detectAndLearn();
        detectedCols = this.gridConfig.columns;
      }
    } catch (e) {
      console.warn('[Calibration] Grid detection failed, using defaults:', e);
    }

    this.calibrationNumCols = detectedCols;

    if (slotIndices && slotIndices.length > 0) {
      this.calibrationSlotList = slotIndices;
    } else if (detectedSlotList && detectedSlotList.length > 0) {
      this.calibrationSlotList = detectedSlotList;
    } else {
      const total = Math.min(this.calibrationNumCols * this.gridConfig.rows, TooltipItemLearner.MAX_INVENTORY_SLOTS);
      this.calibrationSlotList = Array.from({ length: total }, (_, i) => i);
    }

    this.calibrationActive = true;
    this.calibrationTargetIdx = 0;
    this.calibratedMousePositions.clear();
    this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
    console.log(`[Calibration] Started: ${this.calibrationSlotList.length} slots to calibrate (${this.calibrationSamplesPerSlot} samples each)`);
    console.log(`[Calibration] Grid: ${this.calibrationNumCols} columns (detected from sprites, no cap applied)`);
    this.emitCalibrationState();
  }

  /**
   * Test inventory detection — captures a frame, detects grid, computes pHash for each slot.
   * Call from console: _inventoryLearner.testInventory()
   */
  async testInventory(): Promise<{ columns: number; rows: number; slots: { slot: number; row: number; col: number; hasItem: boolean; pHash: string }[] }> {
    console.log('[TestInventory] Capturing frame...');
    const renders = await this.glBridge.recordRenderCalls({
      texturesnapshot: true,
      uniforms: true,
      vertexarray: true,
    });
    const uiState = this.glBridge.getUIState(renders);
    const elements = uiState.elements;

    const slotSprites = elements.filter(
      (el: RenderRect) => el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID
    );

    console.log(`[TestInventory] Found ${slotSprites.length} slot sprites, ${elements.length} total elements`);

    if (slotSprites.length < 4) {
      console.warn('[TestInventory] Not enough slot sprites. Is your inventory open?');
      return { columns: 0, rows: 0, slots: [] };
    }

    const xClusters = this.clusterPositions(slotSprites.map((s: RenderRect) => s.x), 8)
      .filter(c => c.count >= 2)
      .sort((a, b) => a.center - b.center);
    const yClusters = this.clusterPositions(slotSprites.map((s: RenderRect) => s.y), 8)
      .filter(c => c.count >= 2)
      .sort((a, b) => a.center - b.center);

    console.log(`[TestInventory] X clusters: ${xClusters.map(c => `X=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
    console.log(`[TestInventory] Y clusters: ${yClusters.map(c => `Y=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);

    if (xClusters.length < 2 || yClusters.length < 2) {
      console.warn('[TestInventory] Not enough clusters for grid detection');
      return { columns: xClusters.length, rows: yClusters.length, slots: [] };
    }

    const colCenters = xClusters.map(c => c.center);
    // GL Y-up: row 0 (top of screen) = highest Y value
    const rowCenters = [...yClusters.map(c => c.center)].reverse();
    const numCols = colCenters.length;
    const numRows = rowCenters.length;

    console.log(`[TestInventory] Grid: ${numCols} columns x ${numRows} rows = ${numCols * numRows} slots`);

    const SLOT_W = 40;
    const SLOT_H = 36;
    const padding = 1;
    const slots: { slot: number; row: number; col: number; hasItem: boolean; pHash: string }[] = [];

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const slotIndex = row * numCols + col;
        const slotX = colCenters[col];
        const slotY = rowCenters[row];

        // Find all elements within this slot bounds
        const slotElements = elements.filter((el: RenderRect) => {
          if (el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID) return false;
          if (el.sprite?.known?.fontchr) return false;
          if (el.width < 10 || el.height < 10) return false;
          return (
            el.x >= slotX - 2 &&
            el.y >= slotY - 2 &&
            el.x + el.width <= slotX + SLOT_W + padding &&
            el.y + el.height <= slotY + SLOT_H + padding
          );
        });

        const itemSprite = this.findItemSprite(slotElements);
        let pHashHex = '';

        // Compute pHash from the item sprite texture
        if (itemSprite) {
          try {
            const rawSprite = itemSprite.sprite as any;
            const basetex = rawSprite.basetex;
            if (basetex && typeof basetex.capture === 'function') {
              const canCapture = typeof basetex.canCapture === 'function' ? basetex.canCapture() : true;
              if (canCapture) {
                const texX = rawSprite.texX ?? rawSprite.x ?? 0;
                const texY = rawSprite.texY ?? rawSprite.y ?? 0;
                const texW = rawSprite.texWidth ?? rawSprite.width ?? 0;
                const texH = rawSprite.texHeight ?? rawSprite.height ?? 0;
                const texDataW = basetex.width ?? 0;
                const texDataH = basetex.height ?? 0;

                if (texW > 0 && texH > 0 && texX >= 0 && texY >= 0 &&
                    texX + texW <= texDataW && texY + texH <= texDataH) {
                  const imgData = basetex.capture(texX, texY, texW, texH);
                  const expectedLen = imgData ? imgData.width * imgData.height * 4 : 0;
                  if (imgData && imgData.data && imgData.data.length >= expectedLen && imgData.width > 0 && imgData.height > 0) {
                    const pHashValue = itemHash(imgData.data, imgData.width, imgData.height);
                    pHashHex = itemHashToHex(pHashValue);
                    if (pHashHex === '00000000000000000000000000000000' || pHashHex === 'ffffffffffffffffffffffffffffffff') {
                      pHashHex = `INVALID(${pHashHex})`;
                    }
                  } else {
                    pHashHex = 'CAPTURE_FAILED';
                  }
                } else {
                  pHashHex = 'BAD_BOUNDS';
                }
              } else {
                pHashHex = 'NO_CAPTURE';
              }
            } else {
              pHashHex = 'NO_BASETEX';
            }
          } catch {
            pHashHex = 'ERROR';
          }
        }

        slots.push({ slot: slotIndex, row: row + 1, col: col + 1, hasItem: !!itemSprite, pHash: pHashHex });
      }
    }

    // Print nice formatted table
    console.log('\n[TestInventory] ═══════════════════════════════════════════════════════════');
    console.log(`[TestInventory] INVENTORY GRID: ${numCols} columns x ${numRows} rows`);
    console.log('[TestInventory] ═══════════════════════════════════════════════════════════');

    for (let row = 0; row < numRows; row++) {
      console.log(`[TestInventory] ─── Row ${row + 1} ───`);
      for (let col = 0; col < numCols; col++) {
        const s = slots[row * numCols + col];
        if (s.hasItem) {
          console.log(`[TestInventory]   Slot ${String(s.slot).padStart(2)} │ R${s.row}C${s.col} │ ITEM │ pHash: ${s.pHash}`);
        } else {
          console.log(`[TestInventory]   Slot ${String(s.slot).padStart(2)} │ R${s.row}C${s.col} │ empty │`);
        }
      }
    }

    const withItems = slots.filter(s => s.hasItem);
    console.log('[TestInventory] ═══════════════════════════════════════════════════════════');
    console.log(`[TestInventory] ${withItems.length} items found, ${slots.length - withItems.length} empty slots`);
    console.log('[TestInventory] ═══════════════════════════════════════════════════════════\n');

    return { columns: numCols, rows: numRows, slots };
  }

  cancelCalibration(): void {
    if (!this.calibrationActive) return;
    this.calibrationActive = false;
    console.log(`[Calibration] Cancelled. ${this.calibratedMousePositions.size} slots were calibrated.`);
    this.emitCalibrationState();
  }

  skipCalibrationSlot(): void {
    if (!this.calibrationActive) return;
    const slot = this.calibrationSlotList[this.calibrationTargetIdx];
    console.log(`[Calibration] Skipping slot ${slot + 1}`);
    this.calibrationTargetIdx++;
    this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
    if (this.calibrationTargetIdx >= this.calibrationSlotList.length) {
      this.calibrationActive = false;
      console.log(`[Calibration] Complete! ${this.calibratedMousePositions.size} slots calibrated.`);
    }
    this.emitCalibrationState();
  }

  private recordCalibrationSample(mousePos: { x: number; y: number }): boolean {
    if (!this.calibrationActive) return false;

    // Countdown phase - wait before capturing
    if (this.calibrationCountdownFrames > 0) {
      this.calibrationCountdownFrames--;
      this.emitCalibrationState();
      return false;
    }

    const slot = this.calibrationSlotList[this.calibrationTargetIdx];
    let samples = this.calibratedMousePositions.get(slot);
    if (!samples) {
      samples = [];
      this.calibratedMousePositions.set(slot, samples);
    }

    samples.push({ x: mousePos.x, y: mousePos.y });
    console.log(`[Calibration] Slot ${slot + 1}: sample ${samples.length}/${this.calibrationSamplesPerSlot} at (${mousePos.x.toFixed(0)}, ${mousePos.y.toFixed(0)})`);

    if (samples.length >= this.calibrationSamplesPerSlot) {
      this.calibrationTargetIdx++;
      // Reset countdown for next slot
      this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
      if (this.calibrationTargetIdx >= this.calibrationSlotList.length) {
        this.calibrationActive = false;
        console.log(`[Calibration] Complete! ${this.calibratedMousePositions.size} slots calibrated.`);
        this.logCalibrationSummary();
      }
      this.emitCalibrationState();
      return true;
    }

    this.emitCalibrationState();
    return false;
  }

  getCalibratedPosition(slot: number): { x: number; y: number } | null {
    const samples = this.calibratedMousePositions.get(slot);
    if (!samples || samples.length === 0) return null;
    const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
    const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
    return { x: avgX, y: avgY };
  }

  isCalibrated(): boolean {
    return this.calibratedMousePositions.size > 0;
  }

  isCalibrating(): boolean {
    return this.calibrationActive;
  }

  getCalibrationState(): CalibrationState {
    const targetIdx = this.calibrationTargetIdx;
    const slot = this.calibrationSlotList[targetIdx] ?? 0;
    const samples = this.calibratedMousePositions.get(slot);
    const collected = samples?.length ?? 0;
    const cols = this.calibrationNumCols;
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const countdown = Math.ceil(this.calibrationCountdownFrames / TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND);
    const capturing = this.calibrationActive && this.calibrationCountdownFrames <= 0;

    return {
      active: this.calibrationActive,
      targetSlot: slot,
      totalSlots: this.calibrationSlotList.length,
      samplesCollected: collected,
      samplesNeeded: this.calibrationSamplesPerSlot,
      calibratedSlots: this.calibratedMousePositions.size,
      countdown,
      capturing,
      columns: cols,
      message: this.calibrationActive
        ? this.calibrationCountdownFrames > 0
          ? `Move to slot ${slot + 1} (row ${row + 1}, col ${col + 1}) — ${countdown}s...`
          : `CAPTURING slot ${slot + 1} — Hold still! ${collected}/${this.calibrationSamplesPerSlot} samples`
        : this.calibratedMousePositions.size > 0
          ? `Calibrated: ${this.calibratedMousePositions.size} slots`
          : 'Not calibrated',
    };
  }

  onCalibrationStateChange(listener: (state: CalibrationState) => void): () => void {
    this.calibrationListeners.add(listener);
    return () => this.calibrationListeners.delete(listener);
  }

  clearCalibration(): void {
    this.calibratedMousePositions.clear();
    this.calibrationActive = false;
    console.log('[Calibration] Cleared all calibration data.');
    this.emitCalibrationState();
  }

  exportCalibration(): { slot: number; x: number; y: number }[] {
    const result: { slot: number; x: number; y: number }[] = [];
    for (const [slot, samples] of this.calibratedMousePositions) {
      if (samples.length > 0) {
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
        result.push({ slot, x: avgX, y: avgY });
      }
    }
    return result;
  }

  importCalibration(data: { slot: number; x: number; y: number }[]): void {
    this.calibratedMousePositions.clear();
    for (const entry of data) {
      this.calibratedMousePositions.set(entry.slot, [{ x: entry.x, y: entry.y }]);
    }
    console.log(`[Calibration] Imported ${data.length} calibrated positions.`);
    this.emitCalibrationState();
  }

  private emitCalibrationState(): void {
    const state = this.getCalibrationState();
    for (const listener of this.calibrationListeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[Calibration] Listener error:', e);
      }
    }
  }

  private logCalibrationSummary(): void {
    const columns = this.calibrationNumCols;
    console.log('[Calibration] === Summary ===');
    for (const [slot, samples] of this.calibratedMousePositions) {
      const avg = this.getCalibratedPosition(slot);
      if (avg) {
        const row = Math.floor(slot / columns);
        const col = slot % columns;
        console.log(`  Slot ${slot + 1} (row${row},col${col}): avg mouse (${avg.x.toFixed(0)}, ${avg.y.toFixed(0)}) from ${samples.length} samples`);
      }
    }
  }


  /**
   * Detect tooltip and learn item name if visible
   */
  async detectAndLearn(): Promise<TooltipDetectionResult> {
    const renders = await this.glBridge.recordRenderCalls({
      texturesnapshot: true,
      uniforms: true,
      vertexarray: true,
    });
    const mousePos = this.glBridge.getMousePositionGL();
    const uiState = this.glBridge.getUIState(renders);
    const result = this.detectFromElements(uiState.elements, renders, mousePos);

    // Release texture references to prevent memory leak
    // TextureSnapshot objects from native addon hold GPU memory
    for (const el of uiState.elements) {
      if (el.sprite) {
        (el.sprite as any).basetex = undefined;
      }
    }

    return result;
  }

  /**
   * Detect tooltip from pre-captured elements
   */
  detectFromElements(elements: RenderRect[], renders?: any, preMousePos?: { x: number; y: number } | null): TooltipDetectionResult {

    // Auto-calibrate grid if needed
    this.autoCalibrate(elements);

    // Track mouse grid position every frame
    const earlyMousePos = preMousePos ?? this.glBridge.getMousePositionGL();
    if (earlyMousePos) {
      const earlySlot = this.getNearestSlotGenerous(earlyMousePos.x, earlyMousePos.y);
      if (earlySlot !== null) {
        this.lastGridMousePos = { x: earlyMousePos.x, y: earlyMousePos.y, slot: earlySlot };
        this.lastGridMouseTime = Date.now();
      }
    }

    // Check if mouse is within inventory bounds (skip tooltip detection if outside)
    // Use calibrated mouse positions for bounds since raw grid positions vs mouse coords have ~300px IPC drift
    if (earlyMousePos && this.calibratedMousePositions.size >= 4) {
      const padding = 40;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [, samples] of this.calibratedMousePositions) {
        for (const s of samples) {
          if (s.x < minX) minX = s.x;
          if (s.x > maxX) maxX = s.x;
          if (s.y < minY) minY = s.y;
          if (s.y > maxY) maxY = s.y;
        }
      }

      if (minX < Infinity) {
        const isMouseInBounds = earlyMousePos.x >= minX - padding && earlyMousePos.x <= maxX + padding &&
                                earlyMousePos.y >= minY - padding && earlyMousePos.y <= maxY + padding;

        if (!isMouseInBounds) {
          this.debugMode && console.log(`[TooltipLearner] Mouse (${earlyMousePos.x.toFixed(0)},${earlyMousePos.y.toFixed(0)}) outside calibrated inventory bounds, skipping`);
          return {
            isVisible: false,
            bounds: null,
            text: null,
            nearestSlot: null,
            confidence: 0,
          };
        }
      }
    }

    // Find tooltip elements by sprite ID
    const tooltipElements = elements.filter(
      el => el.sprite.known && TOOLTIP_ID_SET.has(el.sprite.known.id)
    );

    let tooltipBounds: { x: number; y: number; width: number; height: number } | null = null;

    if (tooltipElements.length > 0) {
      this.debugMode && console.log(`[TooltipLearner] Found ${tooltipElements.length} tooltip sprites by ID`);
      const positions = tooltipElements.slice(0, 5).map(el =>
        `ID:${el.sprite.known?.id} at (${el.x.toFixed(0)},${el.y.toFixed(0)})`
      );
      this.debugMode && console.log(`[TooltipLearner] Positions: ${positions.join(', ')}`);

      tooltipBounds = this.calculateTooltipBounds(tooltipElements);
      this.debugMode && console.log(`[TooltipLearner] calculateTooltipBounds result: ${tooltipBounds ? `(${tooltipBounds.x.toFixed(0)},${tooltipBounds.y.toFixed(0)}) ${tooltipBounds.width.toFixed(0)}x${tooltipBounds.height.toFixed(0)}` : 'null'}`);
    }

    // Fallback: detect tooltip by finding text character clusters near inventory
    if (!tooltipBounds) {
      tooltipBounds = this.detectTooltipByTextCluster(elements);
      if (tooltipBounds) {
        this.debugMode && console.log(`[TooltipLearner] Fallback detected tooltip: (${tooltipBounds.x.toFixed(0)},${tooltipBounds.y.toFixed(0)}) ${tooltipBounds.width.toFixed(0)}x${tooltipBounds.height.toFixed(0)}`);
      }
    }

    if (!tooltipBounds) {
      return {
        isVisible: false,
        bounds: null,
        text: null,
        nearestSlot: null,
        confidence: 0,
      };
    }

    // Extract text from tooltip area
    const { fullText, itemName } = this.extractTooltipText(elements, tooltipBounds);

    // Find inventory slots and their contents
    const inventorySlots = this.findInventorySlots(elements);
    this.lastInventorySlots = inventorySlots;

    // Update slot pHash map every frame
    this.updateSlotPHashMap(inventorySlots);

    // Detect hovered slot by highlight element count
    const hoveredByHighlight = this.detectHoveredSlotByHighlight(inventorySlots, elements);

    // Get mouse position
    let mousePos = preMousePos ?? null;
    if (!mousePos) {
      mousePos = this.glBridge.getMousePositionGL();
    }
    if (!mousePos) {
      const rawRenders = renders as unknown as RenderInvocation[];
      mousePos = renders ? findMousePosition(rawRenders) : null;
    }

    // Calibration mode is now handled in startPolling (lightweight path)
    // so detectFromElements is never called during calibration

    let hoveredSlot: number | null = null;
    let confidence = 0.5;
    let detectionMethod = 'none';

    // Determine tooltip column
    const { columns } = this.gridConfig;
    const cellWidth = this.gridConfig.actualCellWidth || (this.gridConfig.slotWidth + 2);
    const tooltipCenterX = tooltipBounds.x + tooltipBounds.width / 2;
    let tooltipCol = -1;
    let bestColDist = Infinity;
    for (let c = 0; c < this.columnPositions.length; c++) {
      const colCenterX = this.columnPositions[c] + this.gridConfig.slotWidth / 2;
      const dist = Math.abs(tooltipCenterX - colCenterX);
      if (dist < bestColDist) {
        bestColDist = dist;
        tooltipCol = c;
      }
    }
    if (bestColDist > cellWidth * 1.5) tooltipCol = -1;

    // SLOT DETECTION - Calibrated mouse ONLY
    // When tooltipCol is known (from GL sprite coordinates), constrain search to that column.
    // This prevents IPC mouse drift from picking a slot in the wrong column.
    if (mousePos && this.calibratedMousePositions.size > 0) {
      // Compute inventory bounding box from calibrated positions (IPC mouse space).
      // Rejects tooltips from UI elements outside the inventory area.
      const BOUNDS_PADDING = 5;
      let boundsMinX = Infinity, boundsMaxX = -Infinity;
      let boundsMinY = Infinity, boundsMaxY = -Infinity;
      for (const [, calPosList] of this.calibratedMousePositions) {
        for (const calPos of calPosList) {
          if (calPos.x < boundsMinX) boundsMinX = calPos.x;
          if (calPos.x > boundsMaxX) boundsMaxX = calPos.x;
          if (calPos.y < boundsMinY) boundsMinY = calPos.y;
          if (calPos.y > boundsMaxY) boundsMaxY = calPos.y;
        }
      }
      const mouseOutOfBounds =
        mousePos.x < boundsMinX - BOUNDS_PADDING || mousePos.x > boundsMaxX + BOUNDS_PADDING ||
        mousePos.y < boundsMinY - BOUNDS_PADDING || mousePos.y > boundsMaxY + BOUNDS_PADDING;

      if (mouseOutOfBounds) {
        this.debugMode && console.log(`[TooltipLearner] Mouse (${mousePos.x.toFixed(0)},${mousePos.y.toFixed(0)}) outside inventory bounds [${boundsMinX.toFixed(0)}-${boundsMaxX.toFixed(0)}, ${boundsMinY.toFixed(0)}-${boundsMaxY.toFixed(0)}] — skipping`);
      } else {
      let bestDist = Infinity;
      let bestCalSlot: number | null = null;
      for (const [slotIdx] of this.calibratedMousePositions) {
        // If tooltip column is known, only consider slots in that column
        if (tooltipCol >= 0 && (slotIdx % columns) !== tooltipCol) continue;
        const calPos = this.getCalibratedPosition(slotIdx);
        if (!calPos) continue;
        const dx = mousePos.x - calPos.x;
        const dy = mousePos.y - calPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestCalSlot = slotIdx;
        }
      }
      const cellDiag = Math.sqrt(cellWidth * cellWidth + (this.gridConfig.actualCellHeight || this.gridConfig.slotHeight) ** 2);
      if (bestCalSlot !== null && bestDist < cellDiag * 1.5) {
        hoveredSlot = bestCalSlot;
        confidence = 0.95;
        detectionMethod = 'calibrated';
        const calPos = this.getCalibratedPosition(bestCalSlot);
        const calRow = Math.floor(bestCalSlot / columns);
        const calCol = bestCalSlot % columns;
        const slotPHash = this.slotPHashMap.get(bestCalSlot) ?? 'none';
        console.log(`[DETECT] "${itemName ?? fullText}" → slot ${bestCalSlot + 1} (r${calRow}c${calCol}) | mouse=(${mousePos!.x.toFixed(0)},${mousePos!.y.toFixed(0)}) cal=(${calPos?.x.toFixed(0)},${calPos?.y.toFixed(0)}) dist=${bestDist.toFixed(0)}px | grid=${columns}x${this.gridConfig.rows} | slotPHash=${slotPHash} | tooltipCol=${tooltipCol}`);
      } else {
        this.debugMode && console.log(`[TooltipLearner] CALIBRATED: no match within range (bestDist=${bestDist.toFixed(0)}px, threshold=${(cellDiag * 1.5).toFixed(0)}px)`);
      }
      } // end mouseOutOfBounds else
    } else {
      if (!mousePos) {
        this.debugMode && console.log(`[TooltipLearner] No mouse position available -- skipping slot detection`);
      } else {
        this.debugMode && console.log(`[TooltipLearner] No calibration data -- skipping slot detection. Run calibration first.`);
      }
    }

    // If we found a slot with an item, learn the association
    const nameToLearn = itemName || fullText;
    if (hoveredSlot !== null && nameToLearn && nameToLearn.length > 0) {
      const isRejected = TooltipItemLearner.REJECTED_PATTERNS.some(p => p.test(nameToLearn));
      const isInstruction = TooltipItemLearner.isInstructionalText(nameToLearn);
      const isGarbled = TooltipItemLearner.isGarbledText(nameToLearn);
      if (isRejected || isInstruction || isGarbled) {
        this.debugMode && console.log(`[TooltipLearner] Rejected ${isRejected ? 'UI pattern' : isGarbled ? 'garbled OCR' : 'instructional text'}: "${nameToLearn}"`);
        return {
          isVisible: true,
          bounds: tooltipBounds,
          text: fullText,
          nearestSlot: hoveredSlot,
          confidence: 0,
        };
      }

      // Filter out non-inventory tooltips
      const firstLine = fullText?.split('\n')[0]?.trim() ?? '';
      const hasContextMenu = fullText ? /\+\d+ options/.test(fullText) : false;
      const verbWasStripped = itemName !== null && itemName !== firstLine;

      if (!verbWasStripped && hasContextMenu) {
        this.debugMode && console.log(`[TooltipLearner] Skipping non-inventory tooltip: "${firstLine}" (context menu with no inventory verb)`);
      } else {
        let slotInfo = inventorySlots.find(s => s.slot === hoveredSlot);
        const col = hoveredSlot! % columns;

        // pHash intersection matching
        const columnSlotsWithItems = inventorySlots.filter(s =>
          (s.slot % columns) === col && s.iconHash !== 0 && s.pHash
        );
        const currentColumnPHashes = new Set(columnSlotsWithItems.map(s => s.pHash!));

        if (currentColumnPHashes.size > 0) {
          const existing = this.namePHashCandidates.get(nameToLearn);
          if (existing) {
            const intersection = new Set<string>();
            for (const ph of existing) {
              if (currentColumnPHashes.has(ph)) intersection.add(ph);
            }
            this.namePHashCandidates.set(nameToLearn, intersection);
            this.debugMode && console.log(`[pHashMatch] "${nameToLearn}": intersected ${existing.size} x ${currentColumnPHashes.size} -> ${intersection.size} candidates`);

            if (intersection.size === 1) {
              const matchedPHash = Array.from(intersection)[0];
              const matchedSlot = columnSlotsWithItems.find(s => s.pHash === matchedPHash);
              if (matchedSlot) {
                this.debugMode && console.log(`[pHashMatch] "${nameToLearn}" resolved to slot ${matchedSlot.slot + 1} via pHash ${matchedPHash}`);
                slotInfo = matchedSlot;
                hoveredSlot = matchedSlot.slot;
                confidence = 0.92;
              }
            }
          } else {
            // Cap size to prevent unbounded growth
            if (this.namePHashCandidates.size > 200) {
              this.namePHashCandidates.clear();
            }
            this.namePHashCandidates.set(nameToLearn, currentColumnPHashes);
            this.debugMode && console.log(`[pHashMatch] "${nameToLearn}": first sighting, ${currentColumnPHashes.size} candidates in col ${col}`);
          }
        }

        // Elimination fallback
        if (slotInfo && slotInfo.iconHash !== 0) {
          const alreadyKnown = this.learnedItems.get(slotInfo.iconHash);
          const nameAlreadyLearned = Array.from(this.learnedItems.values()).some(i => i.name === nameToLearn);

          if (!nameAlreadyLearned && alreadyKnown && alreadyKnown.name !== nameToLearn) {
            const allColumnSlotsWithItems = inventorySlots.filter(s =>
              (s.slot % columns) === col && s.iconHash !== 0
            );
            const unlearnedInColumn = allColumnSlotsWithItems.filter(s =>
              !this.learnedItems.has(s.iconHash)
            );

            if (unlearnedInColumn.length === 1) {
              this.debugMode && console.log(`[TooltipLearner] Elimination: "${nameToLearn}" must be slot ${unlearnedInColumn[0].slot + 1} (only unlearned slot in col ${col})`);
              slotInfo = unlearnedInColumn[0];
              hoveredSlot = slotInfo.slot;
            } else if (unlearnedInColumn.length > 1) {
              this.debugMode && console.log(`[TooltipLearner] Elimination: ${unlearnedInColumn.length} unlearned slots in col ${col}, can't disambiguate yet`);
            }
          }
        }

        if (slotInfo && slotInfo.iconHash !== 0) {
          // pHash Validation Gate
          const validation = this.validateSlotByPHash(hoveredSlot!, inventorySlots);

          if (validation.valid && validation.pHash) {
            this.debugMode && console.log(`[pHashValidation] Slot ${hoveredSlot! + 1} VALIDATED (pHash: ${validation.pHash}) -- learning "${nameToLearn}" immediately`);

            const existing = this.learnedItems.get(slotInfo.iconHash);
            if (existing && existing.name === nameToLearn) {
              // Already known
            } else {
              const nameAlreadyLearned = Array.from(this.learnedItems.values()).some(i => i.name === nameToLearn);
              if (!nameAlreadyLearned) {
                const learnedItem: LearnedItem = {
                  name: nameToLearn,
                  iconHash: slotInfo.iconHash,
                  pHash: validation.pHash,
                  learnedAt: Date.now(),
                  confidence: 0.95,
                  source: 'tooltip',
                };
                this.learnedItems.set(slotInfo.iconHash, learnedItem);
                if (validation.pHash) {
                  this.pHashIndex.set(validation.pHash, learnedItem);
                }
                for (const listener of this.listeners) {
                  try { listener(learnedItem); } catch (e) { console.error('[TooltipLearner] Listener error:', e); }
                }
                queueItemForApi({ name: learnedItem.name, pHash: learnedItem.pHash });
                this.slotVotes.delete(nameToLearn);
                this.debugMode && console.log(`[TooltipLearner] Learned "${nameToLearn}" via pHash validation (slot ${hoveredSlot! + 1}, pHash: ${validation.pHash}, iconHash: ${slotInfo.iconHash})`);
              } else {
                this.debugMode && console.log(`[TooltipLearner] "${nameToLearn}" already learned for different hash -- skipping`);
              }
            }
          } else {
            this.debugMode && console.log(`[pHashValidation] Slot ${hoveredSlot! + 1} NOT validated: ${validation.reason} -- using vote system`);
            this.learnItemSync(slotInfo, nameToLearn);
          }

          this.debugMode && console.log(`[TooltipLearner] Processing slot ${hoveredSlot! + 1}: "${nameToLearn}" (method: ${detectionMethod}, itemName: "${itemName}", fullText: "${fullText}")`);
        }
      }
    }

    return {
      isVisible: true,
      bounds: tooltipBounds,
      text: fullText,
      nearestSlot: hoveredSlot,
      confidence,
    };
  }

  /**
   * Get the inventory slot at a specific screen position
   */
  private getSlotAtPosition(x: number, y: number): number | null {
    const { slotWidth, slotHeight, columns, actualCellWidth, actualCellHeight } = this.gridConfig;

    const hitHalfW = (actualCellWidth > 0 ? actualCellWidth : slotWidth) / 2;
    const hitMaxY = (actualCellHeight > 0 ? actualCellHeight : slotHeight) * 2;

    if (this.columnPositions.length > 0 && this.rowPositions.length > 0) {
      let bestCol = -1;
      let bestColDist = Infinity;
      for (let c = 0; c < this.columnPositions.length; c++) {
        const colCenter = this.columnPositions[c] + slotWidth / 2;
        const dist = Math.abs(x - colCenter);
        if (dist < bestColDist && dist <= hitHalfW) {
          bestColDist = dist;
          bestCol = c;
        }
      }

      let bestRow = -1;
      let bestRowDist = Infinity;
      for (let r = 0; r < this.rowPositions.length; r++) {
        const rowCenter = this.rowPositions[r] + slotHeight / 2;
        const dist = Math.abs(y - rowCenter);
        if (dist < bestRowDist && dist <= hitMaxY) {
          bestRowDist = dist;
          bestRow = r;
        }
      }

      if (bestCol >= 0 && bestRow >= 0) {
        return bestRow * columns + bestCol;
      }
      return null;
    }

    // Fallback: step-based calculation
    const { startX, startY, rows, actualGridTopY } = this.gridConfig;
    const cellWidth = actualCellWidth > 0 ? actualCellWidth : (slotWidth + 2);
    const cellHeight = actualCellHeight > 0 ? actualCellHeight : (slotHeight + 2);
    const gridTopY = actualGridTopY > 0 ? actualGridTopY : startY;

    const col = Math.floor((x - startX + cellWidth / 2) / cellWidth);
    const row = Math.floor((gridTopY - y + cellHeight / 2) / cellHeight);

    if (col < 0 || col >= columns || row < 0 || row >= rows) {
      return null;
    }

    return row * columns + col;
  }

  /**
   * Find nearest inventory slot with generous tolerance
   */
  private getNearestSlotGenerous(x: number, y: number): number | null {
    const { slotWidth, slotHeight, columns, actualCellWidth, actualCellHeight } = this.gridConfig;

    if (this.columnPositions.length === 0 || this.rowPositions.length === 0) return null;

    const maxColDist = (actualCellWidth > 0 ? actualCellWidth : slotWidth) * 1.5;
    const maxRowDist = (actualCellHeight > 0 ? actualCellHeight : slotHeight) * 2.5;

    let bestCol = -1;
    let bestColDist = Infinity;
    for (let c = 0; c < this.columnPositions.length; c++) {
      const colCenter = this.columnPositions[c] + slotWidth / 2;
      const dist = Math.abs(x - colCenter);
      if (dist < bestColDist) {
        bestColDist = dist;
        bestCol = c;
      }
    }
    if (bestCol < 0 || bestColDist > maxColDist) return null;

    let bestRow = -1;
    let bestRowDist = Infinity;
    for (let r = 0; r < this.rowPositions.length; r++) {
      const rowCenter = this.rowPositions[r] + slotHeight / 2;
      const dist = Math.abs(y - rowCenter);
      if (dist < bestRowDist) {
        bestRowDist = dist;
        bestRow = r;
      }
    }
    if (bestRow < 0 || bestRowDist > maxRowDist) return null;

    const slotIdx = bestRow * columns + bestCol;
    if (slotIdx >= TooltipItemLearner.MAX_INVENTORY_SLOTS) return null;
    return slotIdx;
  }

  /**
   * Detect tooltip by finding clusters of text characters
   */
  private detectTooltipByTextCluster(elements: RenderRect[]): { x: number; y: number; width: number; height: number } | null {
    const textElements = elements.filter(el => {
      if (!el.sprite.known?.fontchr) return false;
      const color = el.color;
      if (color && (color[1] ?? 0) < 15 && (color[2] ?? 0) < 15 && (color[3] ?? 0) < 15) {
        return false;
      }
      return true;
    });

    if (textElements.length < 3) return null;

    const inventorySlots = elements.filter(
      el => el.sprite.known?.id === 18266
    );

    if (inventorySlots.length === 0) return null;

    const invMinX = Math.min(...inventorySlots.map(s => s.x));
    const invMaxX = Math.max(...inventorySlots.map(s => s.x + s.width));
    const invMinY = Math.min(...inventorySlots.map(s => s.y));
    const invMaxY = Math.max(...inventorySlots.map(s => s.y + s.height));

    const searchArea = {
      x: invMinX - 200,
      y: invMinY - 150,
      width: (invMaxX - invMinX) + 400,
      height: (invMaxY - invMinY) + 300,
    };

    const nearbyText = textElements.filter(el =>
      el.x >= searchArea.x && el.x <= searchArea.x + searchArea.width &&
      el.y >= searchArea.y && el.y <= searchArea.y + searchArea.height
    );

    if (nearbyText.length < 3) return null;

    const Y_TOLERANCE = 8;
    const lines: RenderRect[][] = [];
    const sorted = [...nearbyText].sort((a, b) => b.y - a.y);

    let currentLine: RenderRect[] = [];
    let currentY = -Infinity;

    for (const el of sorted) {
      if (currentLine.length === 0 || Math.abs(el.y - currentY) <= Y_TOLERANCE) {
        currentLine.push(el);
        currentY = currentLine.reduce((sum, e) => sum + e.y, 0) / currentLine.length;
      } else {
        if (currentLine.length >= 2) lines.push(currentLine);
        currentLine = [el];
        currentY = el.y;
      }
    }
    if (currentLine.length >= 2) lines.push(currentLine);

    for (let i = 0; i < lines.length; i++) {
      for (let numLines = 1; numLines <= Math.min(4, lines.length - i); numLines++) {
        const cluster = lines.slice(i, i + numLines);
        const allChars = cluster.flat();

        const minX = Math.min(...allChars.map(c => c.x));
        const maxX = Math.max(...allChars.map(c => c.x + c.width));
        const minY = Math.min(...allChars.map(c => c.y));
        const maxY = Math.max(...allChars.map(c => c.y + c.height));

        const width = maxX - minX;
        const height = maxY - minY;

        if (width < 30 || width > 350) continue;
        if (height < 8 || height > 150) continue;

        const charDensity = allChars.length / (width * height) * 1000;
        if (charDensity < 0.1) continue;

        const clusterText = allChars
          .map(c => this.getFontChar(c.sprite.known?.fontchr))
          .join('');

        const letterCount = (clusterText.match(/[a-zA-Z]/g) || []).length;
        const totalCount = clusterText.length;
        if (letterCount < 2 || letterCount / totalCount < 0.3) {
          continue;
        }

        const clusterCenterX = (minX + maxX) / 2;
        const clusterBottom = minY;

        for (const slot of inventorySlots) {
          const slotCenterX = slot.x + slot.width / 2;
          const slotTop = slot.y + slot.height;

          const dx = Math.abs(clusterCenterX - slotCenterX);
          const dy = clusterBottom - slotTop;

          if (dx < 100 && dy > -50 && dy < 150) {
            this.debugMode && console.log(`[TooltipLearner] Fallback found: "${clusterText}" (${letterCount}/${totalCount} letters)`);
            return {
              x: minX - 5,
              y: minY - 5,
              width: width + 10,
              height: height + 10,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Calculate the bounding box of tooltip sprites
   */
  private calculateTooltipBounds(elements: RenderRect[]): { x: number; y: number; width: number; height: number } | null {
    if (elements.length === 0) return null;

    const centerSprites = elements.filter(el => el.sprite.known?.id === TOOLTIP_SPRITE_IDS.center);
    this.debugMode && console.log(`[calculateTooltipBounds] ${elements.length} tooltip elements, ${centerSprites.length} center sprites`);

    if (centerSprites.length > 0) {
      for (const center of centerSprites) {
        const nearby = elements.filter(el => {
          const dx = Math.abs(el.x - center.x);
          const dy = Math.abs(el.y - center.y);
          return dx < 300 && dy < 200;
        });

        this.debugMode && console.log(`[calculateTooltipBounds] Center at (${center.x.toFixed(0)},${center.y.toFixed(0)}) has ${nearby.length} nearby`);

        if (nearby.length >= 2) {
          let minX = Infinity, minY = Infinity;
          let maxX = -Infinity, maxY = -Infinity;

          for (const el of nearby) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
          }

          const width = maxX - minX;
          const height = maxY - minY;

          this.debugMode && console.log(`[calculateTooltipBounds] Cluster bounds: ${width.toFixed(0)}x${height.toFixed(0)}`);

          if (width < 400 && height < 300 && width > 20 && height > 10) {
            return { x: minX, y: minY, width, height };
          } else {
            this.debugMode && console.log(`[calculateTooltipBounds] Rejected - size out of range`);
          }
        }
      }
    }

    // Fallback: find any small cluster
    this.debugMode && console.log(`[calculateTooltipBounds] Trying fallback cluster detection...`);
    let bestCluster: { x: number; y: number; width: number; height: number } | null = null;
    let smallestArea = Infinity;

    for (const el of elements) {
      const nearby = elements.filter(other => {
        const dx = Math.abs(other.x - el.x);
        const dy = Math.abs(other.y - el.y);
        return dx < 200 && dy < 150;
      });

      if (nearby.length >= 2) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const n of nearby) {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + n.width);
          maxY = Math.max(maxY, n.y + n.height);
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;

        if (width < 350 && height < 250 && width > 20 && height > 10) {
          if (area < smallestArea) {
            smallestArea = area;
            bestCluster = { x: minX, y: minY, width, height };
          }
        }
      }
    }

    if (bestCluster) {
      this.debugMode && console.log(`[calculateTooltipBounds] Found cluster: ${bestCluster.width.toFixed(0)}x${bestCluster.height.toFixed(0)}`);
      return bestCluster;
    }

    this.debugMode && console.log(`[calculateTooltipBounds] No valid cluster found`);
    return null;
  }

  private getFontChar(fontchr: any): string {
    if (!fontchr) return '';
    if (typeof fontchr === 'string') return fontchr;
    if (typeof fontchr === 'object' && fontchr.chr) return fontchr.chr;
    return '';
  }

  private isShadowText(color: number[] | undefined): boolean {
    if (!color || !Array.isArray(color)) return false;
    return (color[1] ?? 0) < 15 && (color[2] ?? 0) < 15 && (color[3] ?? 0) < 15;
  }

  private normalizeColorValue(value: number): number {
    if (value > 255) {
      return Math.round(Math.sqrt(value));
    }
    return value;
  }

  private isColoredText(color: number[] | undefined): boolean {
    if (!color || !Array.isArray(color)) return false;

    const b = this.normalizeColorValue(color[1] ?? 0);
    const g = this.normalizeColorValue(color[2] ?? 0);
    const r = this.normalizeColorValue(color[3] ?? 0);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;

    const avgColor = (r + g + b) / 3;
    const rDiff = Math.abs(r - avgColor);
    const gDiff = Math.abs(g - avgColor);
    const bDiff = Math.abs(b - avgColor);
    const maxDiff = Math.max(rDiff, gDiff, bDiff);

    if (maxDiff < 15 && avgColor > 140) {
      return false;
    }

    if (spread >= 20 || maxDiff >= 15) {
      return true;
    }

    return avgColor < 140 || spread > 10;
  }

  /**
   * Extract item name from first line using color detection
   */
  private extractItemNameFromFirstLine(lineChars: RenderRect[], gapThreshold: number): string {
    const sorted = [...lineChars].sort((a, b) => a.x - b.x);

    let itemName = '';
    let prevEl: RenderRect | null = null;
    let prevChar = '';
    let inColoredSection = false;
    let debugColors: string[] = [];

    for (const el of sorted) {
      const thisChar = this.getFontChar(el.sprite.known!.fontchr);

      if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
        continue;
      }

      const color = el.color as number[];
      const isColored = this.isColoredText(color);

      if (debugColors.length < 15) {
        const r = this.normalizeColorValue(color?.[3] ?? 0);
        const g = this.normalizeColorValue(color?.[2] ?? 0);
        const b = this.normalizeColorValue(color?.[1] ?? 0);
        debugColors.push(`'${thisChar}':[R${r},G${g},B${b}]=${isColored ? 'COLOR' : 'white'}`);
      }

      if (isColored) {
        inColoredSection = true;

        if (prevEl && inColoredSection) {
          const prevEnd = prevEl.x + prevEl.width;
          const gap = el.x - prevEnd;
          if (gap >= gapThreshold) {
            itemName += ' ';
          }
        }

        itemName += thisChar;
        prevEl = el;
        prevChar = thisChar;
      } else if (inColoredSection) {
        if (prevEl) {
          const prevEnd = prevEl.x + prevEl.width;
          const gap = el.x - prevEnd;
          if (gap >= gapThreshold * 2) {
            break;
          }
        }
      }
    }

    this.debugMode && console.log(`[ColorDetect] ${debugColors.join(', ')}`);

    if (!itemName.trim()) {
      this.debugMode && console.log(`[ColorDetect] No colored text found, using full line`);
      return this.extractLineText(sorted, gapThreshold);
    }

    this.debugMode && console.log(`[ColorDetect] Extracted colored item name: "${itemName.trim()}"`);
    return itemName.trim();
  }

  private extractLineText(lineChars: RenderRect[], gapThreshold: number): string {
    let lineText = '';
    let prevEl: RenderRect | null = null;
    let prevChar = '';

    for (const el of lineChars) {
      const thisChar = this.getFontChar(el.sprite.known!.fontchr);

      if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
        continue;
      }

      if (prevEl) {
        const prevEnd = prevEl.x + prevEl.width;
        const gap = el.x - prevEnd;
        if (gap >= gapThreshold) {
          lineText += ' ';
        }
      }

      lineText += thisChar;
      prevEl = el;
      prevChar = thisChar;
    }

    return lineText;
  }

  /**
   * Extract text from elements within tooltip bounds
   */
  private extractTooltipText(elements: RenderRect[], bounds: { x: number; y: number; width: number; height: number }): { fullText: string | null, itemName: string | null } {
    const padding = 10;

    const tooltipElements = elements.filter(el => {
      return (
        el.x >= bounds.x - padding &&
        el.x <= bounds.x + bounds.width + padding &&
        el.y >= bounds.y - padding &&
        el.y <= bounds.y + bounds.height + padding
      );
    });

    if (tooltipElements.length === 0) return { fullText: null, itemName: null };

    const ACTION_BAR_FONT_ID = 494;
    const SORT_Y_TOLERANCE = 6;
    const fontElements = tooltipElements
      .filter(el => {
        if (!el.sprite.known?.fontchr) return false;
        if (this.isShadowText(el.color as number[])) return false;
        const fontId = el.sprite.known?.font?.basesprite?.id;
        if (fontId === ACTION_BAR_FONT_ID) return false;
        return true;
      })
      .sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > SORT_Y_TOLERANCE) return yDiff;
        return a.x - b.x;
      });

    if (fontElements.length === 0) return { fullText: null, itemName: null };

    // Group into lines by Y position
    const Y_LINE_TOLERANCE = 12;
    const lines: RenderRect[][] = [];
    let currentLine: RenderRect[] = [];
    let currentLineY = -Infinity;

    for (const el of fontElements) {
      if (currentLine.length === 0 || Math.abs(el.y - currentLineY) <= Y_LINE_TOLERANCE) {
        currentLine.push(el);
        if (currentLine.length === 1) {
          currentLineY = el.y;
        } else {
          currentLineY = currentLine.reduce((sum, e) => sum + e.y, 0) / currentLine.length;
        }
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [el];
        currentLineY = el.y;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // Post-process: merge close lines
    const mergedLines: RenderRect[][] = [];
    for (const line of lines) {
      const lineAvgY = line.reduce((sum, el) => sum + el.y, 0) / line.length;

      if (mergedLines.length > 0) {
        const prevLine = mergedLines[mergedLines.length - 1];
        const prevAvgY = prevLine.reduce((sum, el) => sum + el.y, 0) / prevLine.length;

        if (Math.abs(lineAvgY - prevAvgY) <= Y_LINE_TOLERANCE) {
          prevLine.push(...line);
          this.debugMode && console.log(`[Tooltip] Merged line at Y=${lineAvgY.toFixed(0)} with previous at Y=${prevAvgY.toFixed(0)}`);
          continue;
        }
      }
      mergedLines.push([...line]);
    }

    this.debugMode && console.log(`[Tooltip] Line grouping: ${lines.length} initial -> ${mergedLines.length} merged (tolerance=${Y_LINE_TOLERANCE}px)`);

    // Process each line with smart spacing
    const textLines: { y: number; text: string }[] = [];

    for (const lineChars of mergedLines) {
      lineChars.sort((a, b) => a.x - b.x);

      const fontId = lineChars[0]?.sprite.known?.font?.basesprite?.id;
      const avgHeight = lineChars.reduce((sum, el) => sum + el.height, 0) / lineChars.length;

      let gapThreshold: number;
      if (fontId && fontId > 0) {
        const fontGapThresholds: Record<number, number> = {
          645: 2, 646: 2, 647: 2, 648: 2,
          649: 3, 650: 3,
          651: 3, 652: 3,
        };
        gapThreshold = fontGapThresholds[fontId] ?? Math.max(2, Math.round(avgHeight * 0.25));
        this.debugMode && console.log(`[Tooltip] Using font ID ${fontId}, gap threshold: ${gapThreshold}px`);
      } else {
        gapThreshold = avgHeight < 10 ? 2 : 3;
        this.debugMode && console.log(`[Tooltip] Unknown font (ID ${fontId}), using conservative gap threshold: ${gapThreshold}px (avgH=${avgHeight.toFixed(1)})`);
      }

      let lineText = '';
      let prevEl: RenderRect | null = null;
      let prevChar = '';

      for (const el of lineChars) {
        const thisChar = this.getFontChar(el.sprite.known!.fontchr);

        if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
          continue;
        }

        if (prevEl) {
          const prevEnd = prevEl.x + prevEl.width;
          const gap = el.x - prevEnd;
          if (gap >= gapThreshold) {
            lineText += ' ';
          }
        }

        lineText += thisChar;
        prevEl = el;
        prevChar = thisChar;
      }

      if (lineText.trim()) {
        textLines.push({ y: lineChars[0].y, text: lineText });
        this.debugMode && console.log(`[Tooltip] Line Y=${lineChars[0].y.toFixed(0)} avgH=${avgHeight.toFixed(1)} gap=${gapThreshold}px: "${lineText}"`);
      }
    }

    if (textLines.length === 0) return { fullText: null, itemName: null };

    textLines.sort((a, b) => b.y - a.y);

    const processedLines = textLines.map(l => ({
      y: l.y,
      text: this.autoSpaceText(l.text)
    }));

    const fullText = processedLines.map(l => l.text).join('\n') || null;

    // Extract item name from the first meaningful line
    let itemName: string | null = null;

    const meaningfulLine = processedLines.find(line => {
      const text = line.text.trim();
      if (text.length < 3) return false;
      if (/^['".,;:!?+\-\s]+$/.test(text)) return false;
      if (text.startsWith('+')) return false;
      return true;
    });

    if (meaningfulLine) {
      const firstLine = meaningfulLine.text;
      this.debugMode && console.log(`[Tooltip] First meaningful line for item extraction: "${firstLine}"`);

      const actionVerbs = [
        'Get info', 'String', 'Unstring',
        'Eat', 'Use', 'Wear', 'Wield', 'Equip', 'Remove', 'Drop', 'Examine',
        'Drink', 'Read', 'Open', 'Close', 'Light', 'Extinguish', 'Empty',
        'Fill', 'Check', 'Activate', 'Deactivate', 'Bury', 'Scatter',
        'Cast', 'Plant', 'Pick', 'Harvest', 'Info',
        'Clean', 'Crush', 'Grind', 'Mix', 'Add', 'Combine', 'Split',
        'Craft', 'Fletch', 'Smith', 'Cook', 'Burn', 'Cut', 'Chop',
        'Mine', 'Smelt', 'Spin', 'Weave', 'Tan', 'Chip',
        'Rub', 'Break', 'Destroy', 'Disassemble', 'Dismantle',
        'Teleport', 'Configure', 'Adjust', 'Set', 'Tune',
        'Summon', 'Dismiss', 'Feed', 'Interact', 'Play',
        'Claim', 'Redeem', 'Inspect', 'Study', 'Investigate',
        'Sip', 'Apply', 'Invoke', 'Boost', 'Restore',
        'Assemble', 'Repair', 'Charge', 'Uncharge',
        'Toggle', 'Switch', 'Brandish', 'Flourish',
        'Offer', 'Sacrifice', 'Release',
      ];

      for (const verb of actionVerbs) {
        if (firstLine.toLowerCase().startsWith(verb.toLowerCase() + ' ')) {
          itemName = firstLine.substring(verb.length + 1).trim();
          this.debugMode && console.log(`[Tooltip] Extracted item name by removing verb "${verb}": "${itemName}"`);
          break;
        }
      }

      if (!itemName) {
        if (!firstLine.startsWith('+') && !firstLine.match(/^\d/)) {
          itemName = firstLine;
          this.debugMode && console.log(`[Tooltip] Using first line as item name (no verb): "${itemName}"`);
        }
      }
    }

    // Fallback: color-based extraction
    if (!itemName && meaningfulLine) {
      const targetY = meaningfulLine.y;
      const targetLineChars = mergedLines.find(line => {
        const avgY = line.reduce((sum, el) => sum + el.y, 0) / line.length;
        return Math.abs(avgY - targetY) < 15;
      });

      if (targetLineChars && targetLineChars.length > 0) {
        const avgHeight = targetLineChars.reduce((sum, el) => sum + el.height, 0) / targetLineChars.length;
        const gapThreshold = avgHeight < 10 ? 2 : 3;
        itemName = this.extractItemNameFromFirstLine(targetLineChars, gapThreshold);
        if (itemName) {
          itemName = this.autoSpaceText(itemName);
          this.debugMode && console.log(`[Tooltip] Extracted item name by color: "${itemName}"`);
        }
      }
    }

    // Handle "X -> Y" arrow pattern
    if (itemName && itemName.includes('->')) {
      const arrowParts = itemName.split('->').map(s => s.trim());
      if (arrowParts.length >= 2 && arrowParts[1].length > 0) {
        this.debugMode && console.log(`[Tooltip] Arrow pattern in final name: "${itemName}" -> using target: "${arrowParts[1]}"`);
        itemName = arrowParts[1];
      }
    }

    return { fullText, itemName };
  }

  /**
   * Auto-space text to fix common missing space patterns
   */
  private autoSpaceText(text: string): string {
    let result = text;

    // Rule 1: digit -> letter
    result = result.replace(/(\d)([a-zA-Z])/g, '$1 $2');

    // Rule 2: letter -> digit (quantity)
    result = result.replace(/([a-z])(\d+)(?=[^a-zA-Z]|$)/gi, '$1 $2');

    // Rule 3: camelCase
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Rule 4: common RS3 suffixes
    const commonSuffixes = ['torso', 'helm', 'legs', 'boots', 'gloves', 'shield', 'sword', 'bow', 'staff', 'wand', 'orb', 'cape', 'amulet', 'necklace', 'bracelet', 'options', 'charges', 'uses'];
    const ringSafePattern = /([lnst])(ring)(?:\s|$)/gi;

    for (const suffix of commonSuffixes) {
      const pattern = new RegExp(`([a-z])(${suffix})`, 'gi');
      result = result.replace(pattern, '$1 $2');
    }
    result = result.replace(ringSafePattern, '$1 $2');

    // Rule 5: common RS3 prefixes
    const commonPrefixes = ['Wear', 'Wield', 'Equip', 'Remove', 'Drop', 'Examine', 'Use', 'Eat', 'Drink', 'Read', 'Open', 'Close', 'Attack', 'Talk', 'Trade', 'Follow', 'Destroy'];
    for (const prefix of commonPrefixes) {
      const pattern = new RegExp(`^(${prefix})([A-Z])`, 'g');
      result = result.replace(pattern, '$1 $2');
    }

    // Rule 6: specific patterns
    result = result.replace(/([Ee]xoskeleton)(torso|helm|legs|boots|gloves)/gi, '$1 $2');
    result = result.replace(/(\+\d+)(options)/gi, '$1 $2');
    result = result.replace(/([aeiousnrt])(torso|helm|legs|boots|gloves|shield|cape)(?![a-z])/gi, '$1 $2');

    // Rule 7: orphaned trailing letters
    result = result.replace(/([a-zA-Z0-9]{2,}) ([sledintyhr])(?=[\s:;,.]|$)/gi, '$1$2');

    // Rule 8: spacing around colons
    result = result.replace(/ +:/g, ':');
    result = result.replace(/(\d) +,/g, '$1,');
    result = result.replace(/,\s+(\d)/g, ',$1');

    // Rule 9: OCR corrections
    const ocrCorrections: [RegExp, string][] = [
      [/\bl[1l]?[e3][v3][e3][l1]\b/gi, 'level'],
      [/\bl[1l]?[e3]v[e3][l1]\b/gi, 'level'],
      [/\bl1e3v1\b/gi, 'level'],
      [/\bleve1\b/gi, 'level'],
      [/\b1evel\b/gi, 'level'],
      [/\b1eve1\b/gi, 'level'],
      [/\bN[e3]xt\b/gi, 'Next'],
      [/\bn[e3]xt\b/gi, 'next'],
      [/\b[e3]xp[e3]ri[e3]nc[e3]\b/gi, 'experience'],
      [/\bExp[e3]ri[e3]nc[e3]\b/gi, 'Experience'],
      [/\btota[l1]\b/gi, 'total'],
      [/\bTota[l1]\b/gi, 'Total'],
      [/\bski[l1][l1]\b/gi, 'skill'],
      [/\bSki[l1][l1]\b/gi, 'Skill'],
      [/\bh[e3]a[l1]th\b/gi, 'health'],
      [/\bH[e3]a[l1]th\b/gi, 'Health'],
      [/\bpray[e3]r\b/gi, 'prayer'],
      [/\bPray[e3]r\b/gi, 'Prayer'],
      [/\batt[a4]ck\b/gi, 'attack'],
      [/\bd[e3]f[e3]nc[e3]\b/gi, 'defence'],
      [/\bstr[e3]ngth\b/gi, 'strength'],
      [/\bcurr[e3]nt\b/gi, 'current'],
      [/\bCurr[e3]nt\b/gi, 'Current'],
    ];

    for (const [pattern, replacement] of ocrCorrections) {
      result = result.replace(pattern, replacement);
    }

    // Clean up double spaces
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  /**
   * Auto-calibrate grid from inventory slot sprites
   */
  private autoCalibrate(elements: RenderRect[]): void {
    if (this.gridConfig.startX !== 0 || this.gridConfig.startY !== 0) return;

    const slotSprites = elements.filter(
      el => el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID
    );

    if (slotSprites.length < 8) return;

    const avgSlotWidth = slotSprites.reduce((sum, s) => sum + s.width, 0) / slotSprites.length;
    const avgSlotHeight = slotSprites.reduce((sum, s) => sum + s.height, 0) / slotSprites.length;

    const xClusters = this.clusterPositions(slotSprites.map(s => s.x), 8);
    const yClusters = this.clusterPositions(slotSprites.map(s => s.y), 8);

    const significantXClusters = xClusters.filter(c => c.count >= 2);
    const significantYClusters = yClusters.filter(c => c.count >= 2);

    this.debugMode && console.log(`[AutoCalibrate] Raw X clusters (count>=2): ${significantXClusters.map(c => `X=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
    this.debugMode && console.log(`[AutoCalibrate] Raw Y clusters (count>=2): ${significantYClusters.map(c => `Y=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);

    let columns = significantXClusters.sort((a, b) => a.center - b.center);
    const rows = significantYClusters.sort((a, b) => a.center - b.center);

    if (columns.length < 2 || rows.length < 2) return;

    // Cross-validate columns
    const rowYTolerance = 15;
    const minRowsRequired = Math.max(2, Math.ceil(rows.length / 2));
    columns = columns.filter(col => {
      const colSprites = slotSprites.filter(s => Math.abs(s.x - col.center) <= 8);
      const rowsHit = new Set<number>();
      for (const sprite of colSprites) {
        for (let ri = 0; ri < rows.length; ri++) {
          if (Math.abs(sprite.y - rows[ri].center) <= rowYTolerance) {
            rowsHit.add(ri);
            break;
          }
        }
      }
      const valid = rowsHit.size >= minRowsRequired;
      if (!valid) {
        this.debugMode && console.log(`[AutoCalibrate] Rejecting column at X=${col.center.toFixed(0)}: only ${rowsHit.size}/${rows.length} row(s) hit (need >=${minRowsRequired}), sprites=${colSprites.length}`);
      }
      return valid;
    });

    if (columns.length < 2) return;

    const xSteps: number[] = [];
    for (let i = 1; i < columns.length; i++) {
      xSteps.push(columns[i].center - columns[i - 1].center);
    }
    const ySteps: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      ySteps.push(rows[i].center - rows[i - 1].center);
    }

    const actualCellWidth = this.medianValue(xSteps);
    const actualCellHeight = this.medianValue(ySteps);

    const rowCenters = rows.map(r => r.center);

    const startX = columns[0].center;
    const gridTopY = rowCenters[rowCenters.length - 1];
    const gridBottomY = rowCenters[0];

    this.gridConfig.columns = columns.length;
    this.gridConfig.rows = rowCenters.length;
    this.gridConfig.startX = startX;
    this.gridConfig.startY = gridBottomY;
    this.gridConfig.actualGridTopY = gridTopY;
    this.gridConfig.actualCellWidth = actualCellWidth;
    this.gridConfig.actualCellHeight = actualCellHeight;
    this.gridConfig.slotWidth = avgSlotWidth;
    this.gridConfig.slotHeight = avgSlotHeight;

    this.columnPositions = columns.map(c => c.center);
    this.rowPositions = [...rowCenters].reverse();

    // Note: Don't trim columns/rows here. The RS3 inventory is genuinely 5x6=30 grid positions,
    // but only slots 0-27 are valid. The MAX_INVENTORY_SLOTS check in getNearestSlotGenerous
    // and other slot lookups handles rejecting slots 28-29.

    const totalSlots = this.gridConfig.columns * this.gridConfig.rows;
    this.debugMode && console.log(`[AutoCalibrate] Found ${slotSprites.length} slot sprites -> ${columns.length} cols, ${rowCenters.length} rows (${totalSlots} slots)`);
    this.debugMode && console.log(`[AutoCalibrate] Columns: ${columns.map(c => c.center.toFixed(0)).join(', ')}`);
    this.debugMode && console.log(`[AutoCalibrate] Rows (top->bottom): ${this.rowPositions.map(y => y.toFixed(0)).join(', ')}`);
    this.debugMode && console.log(`[AutoCalibrate] Cell step: ${actualCellWidth.toFixed(1)}x${actualCellHeight.toFixed(1)}`);
    this.debugMode && console.log(`[AutoCalibrate] Slot size: ${avgSlotWidth.toFixed(1)}x${avgSlotHeight.toFixed(1)}`);
  }

  private clusterPositions(values: number[], tolerance: number): { center: number; count: number }[] {
    const sorted = [...values].sort((a, b) => a - b);
    const clusters: { sum: number; count: number; center: number }[] = [];

    for (const val of sorted) {
      let merged = false;
      for (const cluster of clusters) {
        if (Math.abs(val - cluster.center) <= tolerance) {
          cluster.sum += val;
          cluster.count++;
          cluster.center = cluster.sum / cluster.count;
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({ sum: val, count: 1, center: val });
      }
    }

    return clusters.map(c => ({ center: c.center, count: c.count }));
  }

  private medianValue(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private getSlotBoundsInternal(slot: number, cellWidth: number, cellHeight: number, gridTopY: number): { x: number; y: number } {
    const col = slot % this.gridConfig.columns;
    const row = Math.floor(slot / this.gridConfig.columns);
    return {
      x: this.gridConfig.startX + col * cellWidth,
      y: gridTopY - row * cellHeight,
    };
  }

  /**
   * Find inventory slots and their current contents
   */
  private findInventorySlots(elements: RenderRect[]): InventorySlotInfo[] {
    const slots: InventorySlotInfo[] = [];
    const slotCount = this.gridConfig.columns * this.gridConfig.rows;

    let loggedSlots = 0;

    for (let slot = 0; slot < slotCount; slot++) {
      const slotBounds = this.getSlotBounds(slot);
      if (!slotBounds) continue;

      const padding = 1;
      const slotElements = elements.filter(el => {
        const elCenterX = el.x + el.width / 2;
        const elCenterY = el.y + el.height / 2;
        return (
          elCenterX >= slotBounds.x - padding &&
          elCenterX <= slotBounds.x + slotBounds.width + padding &&
          elCenterY >= slotBounds.y - padding &&
          elCenterY <= slotBounds.y + slotBounds.height + padding
        );
      });

      const itemSprite = this.findItemSprite(slotElements);

      // Compute pHash from item sprite's raw texture data
      let itemPHash: string | undefined;
      if (itemSprite) {
        try {
          const rawSprite = itemSprite.sprite as any;
          const basetex = rawSprite.basetex;
          if (basetex && typeof basetex.capture === 'function') {
            const canCapture = typeof basetex.canCapture === 'function' ? basetex.canCapture() : true;
            if (canCapture) {
              const texX = rawSprite.texX ?? rawSprite.x ?? 0;
              const texY = rawSprite.texY ?? rawSprite.y ?? 0;
              const texW = rawSprite.texWidth ?? rawSprite.width ?? 0;
              const texH = rawSprite.texHeight ?? rawSprite.height ?? 0;

              const texDataW = basetex.width ?? 0;
              const texDataH = basetex.height ?? 0;
              if (texW > 0 && texH > 0 && texX >= 0 && texY >= 0 &&
                  texX + texW <= texDataW && texY + texH <= texDataH) {
                const imgData = basetex.capture(texX, texY, texW, texH);
                const expectedLen = imgData ? imgData.width * imgData.height * 4 : 0;
                if (imgData && imgData.data && imgData.data.length >= expectedLen && imgData.width > 0 && imgData.height > 0) {
                  const pHashValue = itemHash(imgData.data, imgData.width, imgData.height);
                  const pHashHex = itemHashToHex(pHashValue);
                  // Reject degenerate hashes (all-zero = empty/freed texture, all-ones = fully transparent)
                  if (pHashHex !== '00000000000000000000000000000000' && pHashHex !== 'ffffffffffffffffffffffffffffffff') {
                    itemPHash = pHashHex;
                  }
                }
              }
            }
          }
        } catch (e) {
          // pHash computation not available for this sprite
        }
      }

      if ((slot < 4 || slot === 24) && loggedSlots < 6) {
        const row = Math.floor(slot / this.gridConfig.columns);
        const col = slot % this.gridConfig.columns;
        this.debugMode && console.log(`[InventorySlots] Slot ${slot + 1} (row${row},col${col}): X=${slotBounds.x.toFixed(0)}, Y=${slotBounds.y.toFixed(0)}, elements=${slotElements.length}, hasItem=${itemSprite !== null}${itemPHash ? `, pHash=${itemPHash}` : ''}`);
        loggedSlots++;
      }

      // Release texture reference after pHash extraction to prevent memory leak
      if (itemSprite) {
        const rawSprite = itemSprite.sprite as any;
        if (rawSprite) rawSprite.basetex = undefined;
      }

      slots.push({
        slot,
        ...slotBounds,
        iconHash: itemSprite?.sprite.hash ?? 0,
        pHash: itemPHash,
        iconElement: null,  // Stripped after pHash extraction to prevent memory leak
      });
    }

    return slots;
  }

  private updateSlotPHashMap(inventorySlots: InventorySlotInfo[]): void {
    for (const slot of inventorySlots) {
      if (slot.pHash && slot.iconHash !== 0) {
        const prev = this.slotPHashStability.get(slot.slot);
        if (prev && prev.pHash === slot.pHash) {
          prev.count++;
        } else {
          this.slotPHashStability.set(slot.slot, { pHash: slot.pHash, count: 1 });
        }
        this.slotPHashMap.set(slot.slot, slot.pHash);
      } else {
        this.slotPHashMap.delete(slot.slot);
        this.slotPHashStability.delete(slot.slot);
      }
    }
  }

  private getStableSlotPHash(slotIndex: number): string | null {
    const stability = this.slotPHashStability.get(slotIndex);
    if (!stability) return null;
    if (stability.count >= TooltipItemLearner.PHASH_STABLE_FRAMES) {
      return stability.pHash;
    }
    return null;
  }

  private validateSlotByPHash(guessedSlot: number, inventorySlots: InventorySlotInfo[]): { valid: boolean; pHash: string | null; reason: string } {
    const stablePHash = this.getStableSlotPHash(guessedSlot);
    if (!stablePHash) {
      return { valid: false, pHash: null, reason: 'slot pHash not stable yet' };
    }

    const currentSlot = inventorySlots.find(s => s.slot === guessedSlot);
    if (!currentSlot || !currentSlot.pHash) {
      return { valid: false, pHash: null, reason: 'slot has no current pHash' };
    }

    if (currentSlot.pHash !== stablePHash) {
      return { valid: false, pHash: currentSlot.pHash, reason: `pHash changed this frame (was ${stablePHash}, now ${currentSlot.pHash})` };
    }

    return { valid: true, pHash: stablePHash, reason: 'pHash stable and consistent' };
  }

  /**
   * Detect hovered slot by highlight element count
   */
  private detectHoveredSlotByHighlight(
    inventorySlots: InventorySlotInfo[],
    allElements: RenderRect[]
  ): number | null {
    const slotsWithItems = inventorySlots.filter(s => s.iconHash !== 0);
    if (slotsWithItems.length < 2) return null;

    const padding = 1;
    const slotElementCounts: { slot: number; count: number }[] = [];

    for (const slotInfo of slotsWithItems) {
      let count = 0;
      for (const el of allElements) {
        if (el.sprite.known?.fontchr) continue;
        if (el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID) continue;
        const elCenterX = el.x + el.width / 2;
        const elCenterY = el.y + el.height / 2;
        if (
          elCenterX >= slotInfo.x - padding &&
          elCenterX <= slotInfo.x + slotInfo.width + padding &&
          elCenterY >= slotInfo.y - padding &&
          elCenterY <= slotInfo.y + slotInfo.height + padding
        ) {
          count++;
        }
      }

      slotElementCounts.push({ slot: slotInfo.slot, count });
    }

    slotElementCounts.sort((a, b) => b.count - a.count);

    const top = slotElementCounts[0];
    const secondTop = slotElementCounts[1];

    if (!top || !secondTop) return null;

    const gap = top.count - secondTop.count;
    const ratio = secondTop.count > 0 ? top.count / secondTop.count : top.count;

    if (gap >= 3 && ratio >= 1.5) {
      const { columns } = this.gridConfig;
      const row = Math.floor(top.slot / columns);
      const col = top.slot % columns;
      this.debugMode && console.log(`[HoverDetect] Slot ${top.slot + 1} (row${row},col${col}) has ${top.count} elements, next highest=${secondTop.count} (gap=${gap}, ratio=${ratio.toFixed(1)}x) -- likely hovered`);
      return top.slot;
    }

    const topFew = slotElementCounts.slice(0, 5).map(s => `slot${s.slot + 1}=${s.count}`).join(', ');
    this.debugMode && console.log(`[HoverDetect] No clear hover outlier: top=[${topFew}] (gap=${gap}, ratio=${ratio.toFixed(1)}x)`);

    return null;
  }

  private findItemSprite(slotElements: RenderRect[]): RenderRect | null {
    const itemCandidates = slotElements.filter(el => {
      if (el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID) return false;
      if (el.sprite.known?.fontchr) return false;
      return true;
    });

    if (itemCandidates.length === 0) return null;

    return itemCandidates.reduce((largest, current) => {
      const largestArea = largest.width * largest.height;
      const currentArea = current.width * current.height;
      return currentArea > largestArea ? current : largest;
    });
  }

  /**
   * Get bounds for a specific inventory slot
   */
  private getSlotBounds(slot: number): { x: number; y: number; width: number; height: number } | null {
    const { slotWidth, slotHeight, columns } = this.gridConfig;
    const col = slot % columns;
    const row = Math.floor(slot / columns);

    if (row >= this.gridConfig.rows || col >= columns) {
      return null;
    }

    if (this.columnPositions.length > col && this.rowPositions.length > row) {
      return {
        x: this.columnPositions[col],
        y: this.rowPositions[row],
        width: slotWidth,
        height: slotHeight,
      };
    }

    const { startX, actualGridTopY, actualCellWidth, actualCellHeight } = this.gridConfig;
    const cellWidth = actualCellWidth > 0 ? actualCellWidth : (slotWidth + 2);
    const cellHeight = actualCellHeight > 0 ? actualCellHeight : (slotHeight + 2);
    const gridTopY = actualGridTopY > 0 ? actualGridTopY : (this.gridConfig.startY + 6 * cellHeight);

    return {
      x: startX + col * cellWidth,
      y: gridTopY - row * cellHeight,
      width: slotWidth,
      height: slotHeight,
    };
  }

  /**
   * Find nearest slot from tooltip position
   */
  private findNearestSlot(
    tooltipBounds: { x: number; y: number; width: number; height: number },
    slots: InventorySlotInfo[],
    mousePos?: { x: number; y: number } | null
  ): number | null {
    const tooltipCenterX = tooltipBounds.x + tooltipBounds.width / 2;
    const tooltipTopY = tooltipBounds.y + tooltipBounds.height;

    const gridLeftX = this.columnPositions[0] ?? this.gridConfig.startX;
    const gridRightX = (this.columnPositions[this.columnPositions.length - 1] ?? gridLeftX) + this.gridConfig.slotWidth;
    const gridWidth = gridRightX - gridLeftX;
    const gridMarginX = Math.max(gridWidth / 2, 100);

    if (tooltipCenterX < gridLeftX - gridMarginX || tooltipCenterX > gridRightX + gridMarginX) {
      this.debugMode && console.log(`[SlotFind] Tooltip center X=${tooltipCenterX.toFixed(0)} outside inventory grid`);
      return null;
    }

    const gridTopY = this.rowPositions[0] ?? this.gridConfig.actualGridTopY;
    const gridBottomY = this.rowPositions[this.rowPositions.length - 1] ?? this.gridConfig.startY;
    const gridHeight = Math.abs(gridTopY - gridBottomY) + this.gridConfig.slotHeight;
    const maxYDistance = Math.max(gridHeight * 2, 500);

    const tooltipMidY = tooltipBounds.y + tooltipBounds.height / 2;
    const yDistFromGrid = (tooltipMidY > gridTopY + this.gridConfig.slotHeight)
      ? (tooltipMidY - gridTopY - this.gridConfig.slotHeight)
      : (tooltipMidY < gridBottomY)
        ? (gridBottomY - tooltipMidY)
        : 0;

    if (yDistFromGrid > maxYDistance) {
      this.debugMode && console.log(`[SlotFind] Tooltip Y=${tooltipMidY.toFixed(0)} too far from grid (dist=${yDistFromGrid.toFixed(0)}px)`);
      return null;
    }

    const { columns } = this.gridConfig;
    const cellWidth = this.gridConfig.actualCellWidth || (this.gridConfig.slotWidth + 2);

    let bestCol = -1;
    let bestColDist = Infinity;
    for (let c = 0; c < this.columnPositions.length; c++) {
      const colCenterX = this.columnPositions[c] + this.gridConfig.slotWidth / 2;
      const dist = Math.abs(tooltipCenterX - colCenterX);
      if (dist < bestColDist) {
        bestColDist = dist;
        bestCol = c;
      }
    }

    if (bestCol < 0 && this.gridConfig.startX > 0) {
      bestCol = Math.round((tooltipCenterX - this.gridConfig.startX - this.gridConfig.slotWidth / 2) / cellWidth);
      bestCol = Math.max(0, Math.min(columns - 1, bestCol));
      bestColDist = Math.abs(tooltipCenterX - (this.gridConfig.startX + bestCol * cellWidth + this.gridConfig.slotWidth / 2));
    }

    if (bestCol < 0) return null;

    if (bestColDist > cellWidth * 1.5) return null;

    const columnSlots = slots.filter(s => (s.slot % columns) === bestCol);
    const slotsWithItems = columnSlots.filter(s => s.iconHash !== 0);

    if (slotsWithItems.length === 1) {
      return slotsWithItems[0].slot;
    }

    const candidatePool = slotsWithItems.length > 0 ? slotsWithItems : columnSlots;
    let bestSlot: InventorySlotInfo | null = null;

    if (mousePos && this.calibratedMousePositions.size > 0) {
      let bestDist = Infinity;
      for (const slot of candidatePool) {
        const calPos = this.getCalibratedPosition(slot.slot);
        if (!calPos) continue;
        const dx = mousePos.x - calPos.x;
        const dy = mousePos.y - calPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestSlot = slot;
        }
      }
    }

    if (mousePos && !bestSlot) {
      let bestYDist = Infinity;
      for (const slot of candidatePool) {
        const slotCenterY = slot.y + slot.height / 2;
        const yDist = Math.abs(slotCenterY - mousePos.y);
        if (yDist < bestYDist) {
          bestYDist = yDist;
          bestSlot = slot;
        }
      }
    } else if (!mousePos) {
      candidatePool.sort((a, b) => a.slot - b.slot);
      bestSlot = candidatePool[0] ?? null;
    }

    if (!bestSlot) return null;

    return bestSlot.slot;
  }

  /**
   * Learn an item association (sync version with voting)
   */
  private learnItemSync(slotInfo: InventorySlotInfo, name: string): void {
    const existing = this.learnedItems.get(slotInfo.iconHash);
    if (existing && existing.name === name) {
      return;
    }

    for (const [hash, item] of this.learnedItems) {
      if (item.name === name && hash !== slotInfo.iconHash) {
        this.debugMode && console.log(`[TooltipLearner] "${name}" already known (hash: ${hash}), skipping re-learn for hash ${slotInfo.iconHash}`);
        return;
      }
    }

    // Cap vote map size to prevent unbounded growth
    if (this.slotVotes.size > 100) {
      this.debugMode && console.log(`[TooltipLearner] Clearing stale vote data (${this.slotVotes.size} entries)`);
      this.slotVotes.clear();
    }

    let nameVotes = this.slotVotes.get(name);
    if (!nameVotes) {
      nameVotes = new Map();
      this.slotVotes.set(name, nameVotes);
    }
    const currentVotes = (nameVotes.get(slotInfo.iconHash) ?? 0) + 1;
    nameVotes.set(slotInfo.iconHash, currentVotes);

    this.debugMode && console.log(`[TooltipLearner] Vote for "${name}" -> hash ${slotInfo.iconHash}: ${currentVotes}/${TooltipItemLearner.VOTES_REQUIRED}`);

    if (currentVotes < TooltipItemLearner.VOTES_REQUIRED) {
      return;
    }

    this.slotVotes.delete(name);

    const learnedItem: LearnedItem = {
      name,
      iconHash: slotInfo.iconHash,
      pHash: slotInfo.pHash,
      learnedAt: Date.now(),
      confidence: slotInfo.pHash ? 0.90 : 0.85,
      source: 'tooltip',
    };

    this.learnedItems.set(slotInfo.iconHash, learnedItem);

    if (slotInfo.pHash) {
      this.pHashIndex.set(slotInfo.pHash, learnedItem);
    }

    for (const listener of this.listeners) {
      try {
        listener(learnedItem);
      } catch (e) {
        console.error('[TooltipLearner] Listener error:', e);
      }
    }

    queueItemForApi({ name: learnedItem.name, pHash: learnedItem.pHash });

    this.debugMode && console.log(`[TooltipLearner] Confirmed: "${name}" (hash: ${slotInfo.iconHash}${slotInfo.pHash ? `, pHash: ${slotInfo.pHash}` : ''})`);
  }

  private async learnItem(slotInfo: InventorySlotInfo, name: string): Promise<void> {
    this.learnItemSync(slotInfo, name);
  }

  /**
   * Look up item name by hash
   */
  getItemName(iconHash: number): string | null {
    return this.learnedItems.get(iconHash)?.name ?? null;
  }

  /**
   * Look up item name by pHash (cross-session)
   */
  getItemNameByPHash(pHash: string, maxDistance: number = 10): string | null {
    const exact = this.pHashIndex.get(pHash);
    if (exact) return exact.name;

    for (const [storedHash, item] of this.pHashIndex) {
      const distance = hammingDistance(
        BigInt('0x' + pHash),
        BigInt('0x' + storedHash)
      );
      if (distance <= maxDistance) {
        return item.name;
      }
    }

    return null;
  }

  /**
   * Get all learned items
   */
  getLearnedItems(): LearnedItem[] {
    return Array.from(this.learnedItems.values());
  }

  /**
   * Export learned items for persistence
   */
  exportLearnedItems(): { iconHash: number; name: string; pHash?: string }[] {
    return Array.from(this.learnedItems.values()).map(item => ({
      iconHash: item.iconHash,
      name: item.name,
      pHash: item.pHash,
    }));
  }

  /**
   * Import previously learned items
   */
  importLearnedItems(items: { iconHash: number; name: string; pHash?: string }[]): void {
    for (const item of items) {
      const learnedItem: LearnedItem = {
        name: item.name,
        iconHash: item.iconHash,
        pHash: item.pHash,
        learnedAt: Date.now(),
        confidence: 0.8,
        source: 'database',
      };

      this.learnedItems.set(item.iconHash, learnedItem);
      if (item.pHash) {
        this.pHashIndex.set(item.pHash, learnedItem);
      }
    }
    console.log(`[TooltipItemLearner] Imported ${items.length} items`);
  }

  /**
   * Register a callback for newly learned items
   */
  onItemLearned(callback: (item: LearnedItem) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get the inventory slots from the last detection run.
   * Useful for determining which slots have items before calibration.
   */
  getLastInventorySlots(): InventorySlotInfo[] {
    return this.lastInventorySlots;
  }

  /**
   * Start automatic tooltip learning
   */
  startPolling(intervalMs: number = 500): void {
    if (this.renderStream) this.stopPolling();

    type FeatureType = "vertexarray" | "uniforms" | "textures" | "texturesnapshot" | "texturecapture" | "computebindings" | "framebuffer" | "full";
    const features: FeatureType[] = ['texturesnapshot', 'uniforms', 'vertexarray'];

    this.renderStream = patchrs.native.streamRenderCalls(
      { framecooldown: 600, features },
      (renders: RenderInvocation[]) => {
        try {
          // During calibration, only capture mouse position — skip expensive GL pipeline
          if (this.calibrationActive) {
            const mousePos = this.glBridge.getMousePositionGL();
            if (mousePos) {
              this.recordCalibrationSample(mousePos);
            }
            return;
          }

          // Process streamed render data through the same pipeline as detectAndLearn
          const mousePos = this.glBridge.getMousePositionGL();
          const uiState = this.glBridge.getUIState(renders);
          this.detectFromElements(uiState.elements, renders, mousePos);

          // Release texture references to prevent memory leak
          for (const el of uiState.elements) {
            if (el.sprite) {
              (el.sprite as any).basetex = undefined;
            }
          }
        } catch (err) {
          console.error('[TooltipItemLearner] Detection error:', err);
        }
      }
    );

    console.log(`[TooltipItemLearner] Started streaming render calls (framecooldown: 600ms)`);
  }

  /**
   * Stop automatic tooltip learning
   */
  stopPolling(): void {
    if (this.renderStream) {
      this.renderStream.close();
      this.renderStream = null;
      console.log('[TooltipItemLearner] Stopped render stream');
    }
  }
}

/**
 * Create a configured TooltipItemLearner instance
 */
export function createTooltipLearner(glBridge: GLBridgeAdapter): TooltipItemLearner {
  return new TooltipItemLearner(glBridge);
}
