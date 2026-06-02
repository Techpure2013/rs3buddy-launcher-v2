export interface LearnedItem {
  name: string;
  iconHash: number;       // Session-specific CRC32
  pHash?: string;         // Cross-session perceptual hash (32-char hex, 128-bit)
  learnedAt: number;
  confidence: number;     // 0-1
  source: 'tooltip' | 'database' | 'manual';
}

export interface InventorySlotInfo {
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  iconHash: number;
  pHash?: string;
  itemName?: string;
}

export interface CalibrationProfile {
  name: string;
  data: Array<{ slot: number; x: number; y: number }>;
  createdAt: number;
}
