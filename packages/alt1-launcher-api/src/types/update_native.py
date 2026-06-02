#!/usr/bin/env python3
import re

file_path = 'native.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update injectDll JSDoc
old_inject_doc = '''  /**
   * Inject DLL into a process
   *
   * @param pid - Target process ID
   * @param dllfile - Path to DLL file to inject
   * @param memoryid - Optional existing memory session ID
   * @param instanceid - Optional existing instance ID
   * @returns Injection state with memory and instance IDs, or null on failure
   */'''

new_inject_doc = '''  /**
   * Inject DLL into a process (Windows) or connect to shared memory (Linux)
   *
   * Platform-specific behavior:
   * - **Windows**: Injects a DLL into the target process to hook OpenGL calls
   * - **Linux**: Connects to existing shared memory at `/dev/shm/alt1link_{pid}` (no actual injection)
   *
   * @param pid - Target process ID
   * @param dllfile - Path to DLL file to inject (Windows only, ignored on Linux)
   * @param memoryid - Optional existing memory session ID (Windows only)
   * @param instanceid - Optional existing instance ID
   * @returns Injection state with memory and instance IDs (Windows), or instance ID only (Linux), or null on failure
   *
   * @note On Linux, the `memoryid` field in the return value is not present as shared memory uses a fixed path
   */'''

content = content.replace(old_inject_doc, new_inject_doc)

# Update connectToOverlay JSDoc
old_connect_doc = '''  /**
   * Connect to existing overlay shared memory (Linux only)
   *
   * @param pid - Target process ID
   * @returns Connection state with instance ID, or null on failure
   */'''

new_connect_doc = '''  /**
   * Connect to existing overlay shared memory (Linux only)
   *
   * This is the Linux equivalent of `injectDll`. Instead of injecting code into the
   * target process, it connects to shared memory at `/dev/shm/alt1link_{pid}` that
   * was created by the overlay library preloaded into the game process.
   *
   * @param pid - Target process ID
   * @returns Connection state with instance ID, or null on failure
   */'''

content = content.replace(old_connect_doc, new_connect_doc)

# Update getRsHwnd JSDoc in DebugApi
old_hwnd_debug_doc = '''  /**
   * Get the RuneScape window handle (Windows only)
   *
   * @returns Window handle (HWND) or 0 if not found
   */
  getRsHwnd(): number;'''

new_hwnd_debug_doc = '''  /**
   * Get the RuneScape window handle (Windows only)
   *
   * @returns Window handle (HWND) on Windows, or 0 on Linux (HWND is Windows-specific)
   */
  getRsHwnd(): number;'''

content = content.replace(old_hwnd_debug_doc, new_hwnd_debug_doc)

# Update getRsHwnd JSDoc in Alt1GLNative
old_hwnd_native_doc = '''  /**
   * Get RuneScape window handle (Windows only)
   *
   * @returns Window handle (HWND) or 0 if not found
   */
  getRsHwnd(): number;'''

new_hwnd_native_doc = '''  /**
   * Get RuneScape window handle (Windows only)
   *
   * @returns Window handle (HWND) on Windows, or 0 on Linux (HWND is Windows-specific)
   */
  getRsHwnd(): number;'''

content = content.replace(old_hwnd_native_doc, new_hwnd_native_doc)

# Add platform detection section at the end
platform_detection = '''
// ============================================
// Platform Detection
// ============================================

/**
 * Supported platforms for Alt1GL
 */
export type Platform = 'windows' | 'linux';

/**
 * Get the current platform
 * @returns 'windows' or 'linux' based on the runtime environment
 */
export function getPlatform(): Platform {
  if (typeof process !== 'undefined' && process.platform === 'linux') {
    return 'linux';
  }
  return 'windows';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === 'windows';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === 'linux';
}
'''

# Append platform detection if not already present
if 'Platform Detection' not in content:
    content = content.rstrip() + '\n' + platform_detection

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated native.ts")
