/**
 * Font Atlas Generator
 * Generates a font texture atlas for the overlay
 *
 * This module provides two approaches:
 * 1. Browser-based (Canvas2D) - for renderer process
 * 2. Pre-computed bitmap - for main process without canvas
 */

// Font atlas configuration
export interface FontAtlasConfig {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  // Characters to include (ASCII 32-126 by default)
  firstChar: number;
  lastChar: number;
}

export interface FontAtlasResult {
  // RGBA pixel data
  pixels: Uint8Array;
  // Texture dimensions
  textureWidth: number;
  textureHeight: number;
  // Glyph metrics (cell size - for rendering the quad)
  glyphWidth: number;
  glyphHeight: number;
  // Character range
  firstChar: number;
  lastChar: number;
  // Chars per row (for grid layout)
  charsPerRow: number;
  // Per-character advance widths for proportional spacing
  charWidths: Uint8Array;
}

const DEFAULT_CONFIG: FontAtlasConfig = {
  fontSize: 28,  // Generate at 2x resolution for crisp text at all DPI levels
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
  textColor: '#ffffff',
  firstChar: 32,  // Space
  lastChar: 126,  // Tilde
};

/**
 * Generate a font atlas texture using Canvas2D (browser/renderer only)
 */
export function generateFontAtlas(config: Partial<FontAtlasConfig> = {}): FontAtlasResult {
  if (typeof document === 'undefined') {
    throw new Error('generateFontAtlas requires browser environment with Canvas2D');
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const numChars = cfg.lastChar - cfg.firstChar + 1;

  // Create measurement canvas
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;

  // Measure each character and store widths for proportional spacing
  const charWidths = new Uint8Array(numChars);
  let maxWidth = 0;
  for (let i = cfg.firstChar; i <= cfg.lastChar; i++) {
    const char = String.fromCharCode(i);
    const metrics = measureCtx.measureText(char);
    const width = Math.ceil(metrics.width);
    charWidths[i - cfg.firstChar] = width;
    maxWidth = Math.max(maxWidth, width);
  }

  // Add padding for anti-aliasing (cell size for rendering)
  const glyphWidth = maxWidth + 2;
  const glyphHeight = Math.ceil(cfg.fontSize * 1.4);

  // Calculate texture size (arrange in a grid)
  const charsPerRow = Math.ceil(Math.sqrt(numChars));
  const rows = Math.ceil(numChars / charsPerRow);

  const textureWidth = charsPerRow * glyphWidth;
  const textureHeight = rows * glyphHeight;

  // Create the atlas canvas
  const canvas = document.createElement('canvas');
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  const ctx = canvas.getContext('2d', { alpha: true })!;

  // Clear to transparent
  ctx.clearRect(0, 0, textureWidth, textureHeight);

  // Set up text rendering
  ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
  ctx.fillStyle = cfg.textColor;
  ctx.textBaseline = 'top';

  // Render each character
  for (let i = 0; i < numChars; i++) {
    const charCode = cfg.firstChar + i;
    const char = String.fromCharCode(charCode);

    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);

    const x = col * glyphWidth + 1; // +1 for padding
    const y = row * glyphHeight + 2; // +2 for top padding

    ctx.fillText(char, x, y);
  }

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, textureWidth, textureHeight);
  const pixels = new Uint8Array(imageData.data);

  return {
    pixels,
    textureWidth,
    textureHeight,
    glyphWidth,
    glyphHeight,
    firstChar: cfg.firstChar,
    lastChar: cfg.lastChar,
    charsPerRow,
    charWidths,
  };
}

/**
 * Check if Canvas2D is available (browser environment)
 */
export function canGenerateFontAtlas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}
