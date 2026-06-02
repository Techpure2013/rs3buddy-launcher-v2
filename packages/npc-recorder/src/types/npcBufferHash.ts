/**
 * NPC Buffer Hash Utilities
 * Uses CRC-32 of vertex position data for NPC identification.
 * Compatible with RS3QuestBuddyBeta hashing algorithm.
 */

import type { RenderInvocation } from "../gl/patchrs_napi";
import type { NpcMeshGroupInfo } from "./npcTypes";
import type { NpcMeshGroup } from "../gl/npcOverlay";
import { generateMeshMeta, getProgramMeta } from "../gl/renderprogram";
import { CrcBuilder } from "../gl/crc32";

/**
 * Convert numeric hash to hex string format
 * @param num 32-bit unsigned integer
 * @returns Hex string like "0x1A2B3C4D"
 */
export function toHexHash(num: number): string {
  return "0x" + (num >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

/**
 * Convert hex hash string to numeric value
 * @param hex Hex string like "0x1A2B3C4D"
 * @returns 32-bit unsigned integer
 */
export function fromHexHash(hex: string): number {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return parseInt(clean, 16) >>> 0;
}

/**
 * Extract buffer hashes from a render invocation using CRC-32 of vertex positions.
 * Uses generateMeshMeta for compatibility with RS3QuestBuddyBeta.
 */
export function extractBufferHashes(render: RenderInvocation): {
  posBufferHash: string;
  posBufferHashNum: number;
  indexBufferHash: string;
  combinedHash: string;
} {
  const progmeta = getProgramMeta(render.program);

  if (!progmeta.aPos) {
    return {
      posBufferHash: "0x00000000",
      posBufferHashNum: 0,
      indexBufferHash: "0x00000000",
      combinedHash: "0x00000000",
    };
  }

  try {
    const meshMeta = generateMeshMeta(render, progmeta);
    const hashNum = meshMeta.posbufferhash >>> 0;
    const hashHex = toHexHash(hashNum);
    return {
      posBufferHash: hashHex,
      posBufferHashNum: hashNum,
      indexBufferHash: hashHex,
      combinedHash: hashHex,
    };
  } catch (e) {
    console.warn("[extractBufferHashes] Failed to generate mesh meta:", e);
    return {
      posBufferHash: "0x00000000",
      posBufferHashNum: 0,
      indexBufferHash: "0x00000000",
      combinedHash: "0x00000000",
    };
  }
}

/**
 * Compute combined hash from multiple render invocations.
 * Collects UNIQUE mesh hashes (deduplicates repeats), sorts them,
 * then combines via CRC-32 - matching RS3QuestBuddyBeta behavior.
 */
export function computeCombinedHash(
  renders: RenderInvocation[]
): { hex: string; num: number } {
  if (renders.length === 0) {
    return { hex: "0x00000000", num: 0 };
  }

  const uniqueHashes = new Set<number>();

  for (const render of renders) {
    const progmeta = getProgramMeta(render.program);
    if (!progmeta.aPos) continue;

    try {
      const meshMeta = generateMeshMeta(render, progmeta);
      uniqueHashes.add(meshMeta.posbufferhash >>> 0);
    } catch {
      // Skip meshes that fail
    }
  }

  if (uniqueHashes.size === 0) {
    return { hex: "0x00000000", num: 0 };
  }

  const sortedHashes = Array.from(uniqueHashes).sort((a, b) => a - b);

  const combined = new CrcBuilder();
  for (const hash of sortedHashes) {
    combined.addUint32(hash);
  }

  const num = combined.get() >>> 0;
  return { hex: toHexHash(num), num };
}

/**
 * Get short hash identifier from buffer hashes
 */
export function getHashId(hashes: {
  posBufferHash: string;
  [key: string]: any;
}): string {
  return hashes.posBufferHash.substring(0, 10);
}

/**
 * Extract grouped hashes from multiple render invocations
 */
export function extractGroupedHashes(renders: RenderInvocation[]): {
  posBufferHash: string;
  combinedHash: string;
} {
  if (renders.length === 0) {
    return {
      posBufferHash: "0x00000000",
      combinedHash: "0x00000000",
    };
  }

  const mainHashes = extractBufferHashes(renders[0]);
  const combined = computeCombinedHash(renders);

  return {
    posBufferHash: mainHashes.posBufferHash,
    combinedHash: combined.hex,
  };
}

/**
 * Convert NpcMeshGroup array to NpcMeshGroupInfo array
 */
export function toMeshGroupInfos(groups: NpcMeshGroup[]): NpcMeshGroupInfo[] {
  return groups.map((group) => {
    const hashes = extractGroupedHashes(group.renders);
    return {
      hashId: getHashId(hashes),
      meshCount: group.meshCount,
      combinedHash: hashes.combinedHash,
    };
  });
}
