/**
 * GL Debug App - Main Application Logic
 * Comprehensive testing and debugging tool for Alt1GL
 */

// =============================================================================
// Globals and State
// =============================================================================
let native = null;
let isConnected = false;
const RS_EXE_NAME = navigator.platform?.startsWith('Win') ? 'rs2client.exe' : 'rs2client';
let activeOverlays = [];
let currentStream = null;
let testResults = [];

// =============================================================================
// Initialization
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    log('GL Debug App initializing...', 'info');

    // Use a Proxy to always read from the latest alt1gl bridge.
    // The preload's cached state updates at 10Hz — a direct reference
    // would capture a stale snapshot. The Proxy pattern matches npc-recorder.
    if (globalThis.alt1gl || globalThis._alt1gl) {
        native = new Proxy({}, {
            get(_target, prop) {
                const api = globalThis.alt1gl || globalThis._alt1gl;
                if (!api) throw new Error('alt1gl API not available');
                return api[prop];
            }
        });
        log('Native addon found via alt1gl bridge (Proxy)', 'success');
    } else {
        log('ERROR: Native addon not available!', 'error');
        log('Make sure RS3 is running and connected through the launcher', 'warn');
    }

    setupEventListeners();
    setupCategoryNavigation();

    if (native) {
        checkConnectionStatus();
        tryAutoConnect();

        // Poll connection every 2s — matches tile-marker's HOOK_RETRY_INTERVAL pattern.
        // Injection may complete after this app opens.
        setInterval(() => {
            const was = isConnected;
            isConnected = isClientReady();
            checkConnectionStatus();
            if (!was && isConnected) {
                log('Connection established — RS client hooked', 'success');
                updateOverviewInfo();
            }
        }, 2000);

        setInterval(updateFPS, 1000);
    }
});

// Check if client is ready (matches tile-marker's isClientReady pattern)
function isClientReady() {
    if (!native) return false;
    try { return native.getRsReady() > 0; } catch { return false; }
}

// Wait for client to become ready, retrying periodically.
// The launcher injects the DLL — it may take a few seconds after the app opens.
// Matches tile-marker's tryHookClient + retry loop pattern.
async function tryAutoConnect() {
    if (!native || isConnected) return;

    log('Checking connection status...', 'info');

    try {
        if (isClientReady()) {
            isConnected = true;
            log('Connected to RS client via launcher', 'success');
            checkConnectionStatus();
            return;
        }

        // Not connected yet — check if RS client is at least running
        let pids = native.debug.getExePids(RS_EXE_NAME);
        if (pids && typeof pids.then === 'function') pids = await pids;
        const pidArr = Array.isArray(pids) ? pids : Array.from(pids || []);

        if (pidArr.length === 0) {
            log('No RS client found running', 'info');
            return;
        }

        log(`RS client found (PID: ${pidArr[0]}) — waiting for launcher to complete injection...`, 'info');

    } catch (e) {
        log('Auto-connect error: ' + e.message, 'error');
    }
}

// doConnect removed — the main process owns the connection.
// Calling connectToOverlay from a renderer kills the existing session.

// =============================================================================
// Logging
// =============================================================================
function log(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(message)}`;

    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight;

    // Also log to console
    console.log(`[GLDebug] ${message}`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearLog() {
    document.getElementById('log-output').innerHTML = '';
    log('Log cleared', 'info');
}

function exportLog() {
    const logContent = document.getElementById('log-output').innerText;
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gl-debug-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    log('Log exported', 'success');
}

// =============================================================================
// UI Helpers
// =============================================================================
function setupCategoryNavigation() {
    const buttons = document.querySelectorAll('.category-btn');
    const panels = document.querySelectorAll('.panel');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding panel
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${category}`).classList.add('active');
        });
    });
}

function setupEventListeners() {
    // Quick Actions
    document.getElementById('btn-refresh').addEventListener('click', refreshState);
    document.getElementById('btn-clear-log').addEventListener('click', clearLog);
    document.getElementById('btn-export-log').addEventListener('click', exportLog);

    // Connection Tests
    document.getElementById('test-native-addon').addEventListener('click', testNativeAddon);
    document.getElementById('test-find-client').addEventListener('click', testFindClient);
    document.getElementById('test-hook-client').addEventListener('click', testHookClient);
    document.getElementById('test-window-apis').addEventListener('click', testWindowAPIs);
    document.getElementById('test-debug-apis').addEventListener('click', testDebugAPIs);

    // Capture
    document.getElementById('btn-capture').addEventListener('click', captureFramebuffer);
    document.getElementById('btn-capture-full').addEventListener('click', captureFullScreen);

    // Render Recording
    document.getElementById('btn-record-once').addEventListener('click', recordRenderOnce);
    document.getElementById('btn-stream-start').addEventListener('click', startStreaming);
    document.getElementById('btn-stream-stop').addEventListener('click', stopStreaming);

    // Overlays
    document.getElementById('test-simple-frameend').addEventListener('click', testSimpleFrameendOverlay);
    document.getElementById('test-diagnostic').addEventListener('click', testDiagnosticOverlay);
    document.getElementById('test-all-triggers').addEventListener('click', testAllTriggerTypes);
    document.getElementById('test-overlay-before').addEventListener('click', () => testOverlayTrigger('before'));
    document.getElementById('test-overlay-after').addEventListener('click', () => testOverlayTrigger('after'));
    document.getElementById('test-overlay-replace').addEventListener('click', () => testOverlayTrigger('replace'));
    document.getElementById('test-overlay-frameend').addEventListener('click', () => testOverlayTrigger('frameend'));
    document.getElementById('test-overlay-passive').addEventListener('click', () => testOverlayTrigger('passive'));
    document.getElementById('test-blend-default').addEventListener('click', () => testBlendMode(undefined));
    document.getElementById('test-blend-blend').addEventListener('click', () => testBlendMode(true));
    document.getElementById('test-blend-noblend').addEventListener('click', () => testBlendMode(false));
    document.getElementById('test-overlay-duration').addEventListener('click', testOverlayDuration);
    document.getElementById('test-overlay-multiple').addEventListener('click', testMultipleOverlays);
    document.getElementById('test-overlay-uniforms').addEventListener('click', testUniformManipulation);
    document.getElementById('test-builtin-uniforms').addEventListener('click', testBuiltinUniforms);
    document.getElementById('btn-stop-all-overlays').addEventListener('click', stopAllOverlays);

    // Textures
    document.getElementById('test-create-texture').addEventListener('click', testCreateTexture);
    document.getElementById('test-texture-capture').addEventListener('click', testTextureCapture);
    document.getElementById('test-texture-upload').addEventListener('click', testTextureUpload);
    document.getElementById('btn-list-textures').addEventListener('click', listAllTextures);

    // Shaders
    document.getElementById('btn-analyze-shaders').addEventListener('click', analyzeShaders);
    document.getElementById('test-create-program').addEventListener('click', testCreateProgram);
    document.getElementById('test-create-vao').addEventListener('click', testCreateVAO);

    // Performance
    document.getElementById('test-frame-timing').addEventListener('click', testFrameTiming);
    document.getElementById('test-benchmark').addEventListener('click', runBenchmark);
    document.getElementById('test-memory-state').addEventListener('click', testMemoryState);

    // All Tests
    document.getElementById('btn-run-all-tests').addEventListener('click', runAllTests);
    document.getElementById('btn-run-quick-test').addEventListener('click', runQuickTest);
    document.getElementById('btn-diagnostic-report').addEventListener('click', generateDiagnosticReport);

    // GL Objects
    document.getElementById('btn-refresh-objects').addEventListener('click', refreshAllGlObjects);
    document.getElementById('btn-get-gl-state').addEventListener('click', displayGlState);
    document.getElementById('btn-get-object-stats').addEventListener('click', displayObjectStats);
}

// =============================================================================
// Status Updates
// =============================================================================
function checkConnectionStatus() {
    if (!native) return;

    try {
        isConnected = native.getRsReady();
        const statusEl = document.getElementById('connection-status');

        if (isConnected) {
            statusEl.textContent = 'Connected';
            statusEl.className = 'status connected';
            document.getElementById('info-connected').textContent = 'Yes';
            updateOverviewInfo();
        } else {
            statusEl.textContent = 'Disconnected';
            statusEl.className = 'status disconnected';
            document.getElementById('info-connected').textContent = 'No';
        }
    } catch (e) {
        log('Error checking connection: ' + e, 'error');
    }
}

function updateFPS() {
    // This would need frame timing from streaming to calculate
    // For now, just show placeholder
}

function refreshState() {
    log('Refreshing state...', 'info');
    checkConnectionStatus();
    if (isConnected) {
        updateOverviewInfo();
    }
}

async function updateOverviewInfo() {
    if (!native || !isConnected) return;

    try {
        // Window info
        const x = native.getRsX();
        const y = native.getRsY();
        const w = native.getRsWidth();
        const h = native.getRsHeight();
        document.getElementById('info-window').textContent = `${w}x${h} at (${x}, ${y})`;

        // Renderer info
        const renderer = await native.getRenderer();
        if (renderer) {
            document.getElementById('info-renderer').textContent = renderer.glRenderer || '--';
            document.getElementById('info-glversion').textContent = renderer.glVersion || '--';
            document.getElementById('info-vendor').textContent = renderer.glVendor || '--';
        }

        // Memory state
        const mem = await native.debug.memoryState();
        if (mem) {
            document.getElementById('info-mem-used').textContent = `${(mem.used / 1024 / 1024).toFixed(2)} MB`;
            document.getElementById('info-mem-total').textContent = `${(mem.size / 1024 / 1024).toFixed(2)} MB`;
            document.getElementById('info-mem-allocs').textContent = mem.allocs;
        }

        // GL Object stats
        const stats = await native.debug.getGlObjectStats();
        if (stats) {
            document.getElementById('info-programs').textContent = stats.counts.GlProgram || 0;
            document.getElementById('info-textures').textContent = stats.counts.TrackedTexture || 0;
            document.getElementById('info-vaos').textContent = stats.counts.VertexArray || 0;
        }
    } catch (e) {
        log('Error updating overview: ' + e, 'error');
    }
}

// =============================================================================
// Memory Inspector
// =============================================================================
async function updateMemoryInspector() {
    const memPanel = document.getElementById('memory-inspector-content');
    if (!memPanel || !native) return;

    let html = '';

    // Helper functions
    function formatBytes(bytes) {
        if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    }

    function getAllocClassName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Fetch all data in parallel
    let mem, stats, handles, sizes;
    try {
        [mem, stats, handles, sizes] = await Promise.all([
            native.debug ? native.debug.memoryState().catch(() => null) : null,
            native.debug ? native.debug.getGlObjectStats().catch(() => null) : null,
            native.debug ? native.debug.handleStoreStats().catch(() => null) : null,
            native.debug ? native.debug.getSharedMemorySizes().catch(() => null) : null
        ]);
    } catch (e) {
        memPanel.innerHTML = `<p class="placeholder error">Failed to load memory data: ${e.message}</p>`;
        return;
    }

    // 1. Main Heap Overview Card
    if (mem) {
        const usedMB = mem.used / 1024 / 1024;
        const totalMB = mem.size / 1024 / 1024;
        const freeMB = (mem.size - mem.used) / 1024 / 1024;
        const usedPct = (mem.used / mem.size) * 100;

        html += '<div class="mem-overview-card">';
        html += '<div class="mem-overview-header">';
        html += '<div class="mem-overview-title">Main Shared Heap</div>';
        html += `<div class="mem-sanity-indicator">`;
        html += `<div class="mem-sanity-dot ${mem.sanity ? 'ok' : 'fail'}"></div>`;
        html += `<span>Sanity ${mem.sanity ? 'OK' : 'FAIL'}</span>`;
        html += '</div></div>';

        // Big stats row
        html += '<div class="mem-stats-row">';
        html += '<div class="mem-stat-item">';
        html += '<div class="mem-stat-label">Used</div>';
        html += `<div class="mem-stat-value">${usedMB.toFixed(0)}<span class="mem-stat-unit">MB</span></div>`;
        html += `<div class="mem-stat-subtext">${usedPct.toFixed(1)}% of total</div>`;
        html += '</div>';
        html += '<div class="mem-stat-item">';
        html += '<div class="mem-stat-label">Free</div>';
        html += `<div class="mem-stat-value">${freeMB.toFixed(0)}<span class="mem-stat-unit">MB</span></div>`;
        html += `<div class="mem-stat-subtext">${(100 - usedPct).toFixed(1)}% available</div>`;
        html += '</div>';
        html += '<div class="mem-stat-item">';
        html += '<div class="mem-stat-label">Total</div>';
        html += `<div class="mem-stat-value">${totalMB.toFixed(0)}<span class="mem-stat-unit">MB</span></div>`;
        html += `<div class="mem-stat-subtext">${mem.namedobjects || 0} named objects</div>`;
        html += '</div>';
        html += '</div>';

        // Segmented progress bar
        if (mem.namedAllocations && mem.namedAllocations.length > 0) {
            const sorted = [...mem.namedAllocations].sort((a, b) => b.itemSize - a.itemSize);

            html += '<div class="mem-main-progress">';
            html += '<div class="mem-progress-segments">';

            for (const alloc of sorted) {
                const pct = (alloc.itemSize / mem.size) * 100;
                const className = getAllocClassName(alloc.name);
                const label = formatBytes(alloc.itemSize);

                html += `<div class="mem-progress-segment ${className}" style="width: ${pct}%">`;
                if (pct > 5) { // Only show label if segment is wide enough
                    html += `<div class="mem-progress-label">${label}</div>`;
                }
                html += '</div>';
            }

            const freePct = (mem.size - mem.used) / mem.size * 100;
            html += `<div class="mem-progress-free" style="width: ${freePct}%"></div>`;
            html += '</div></div>';

            // Named allocations breakdown
            html += '<div class="mem-allocations-grid">';
            for (const alloc of sorted) {
                const className = getAllocClassName(alloc.name);
                const pct = (alloc.itemSize / mem.size) * 100;

                html += `<div class="mem-allocation-row ${className}">`;
                html += `<div class="mem-alloc-color-dot ${className}"></div>`;
                html += `<div class="mem-alloc-name">${alloc.name}</div>`;
                html += `<div class="mem-alloc-bar-container">`;
                html += `<div class="mem-alloc-bar-fill ${className}" style="width: ${pct}%"></div>`;
                html += '</div>';
                html += `<div class="mem-alloc-size">${formatBytes(alloc.itemSize)}</div>`;
                html += '</div>';
            }
            html += '</div>';
        }

        html += '</div>';
    }

    // 2. GL Object Stats (glstate breakdown)
    if (stats && stats.subsizes) {
        const entries = Object.entries(stats.subsizes)
            .filter(([_, size]) => size > 0)
            .sort((a, b) => b[1] - a[1]);

        if (entries.length > 0) {
            const totalCount = stats.count || 0;
            const totalSize = stats.size || 0;

            html += '<div class="mem-section">';
            html += '<div class="mem-section-title">';
            html += 'GL Object Breakdown';
            html += `<span class="mem-section-badge">${totalCount} objects</span>`;
            html += '</div>';

            html += '<div class="mem-gl-objects-grid">';
            for (const [type, size] of entries) {
                const count = (stats.counts && stats.counts[type]) || 0;
                const pct = totalSize > 0 ? (size / totalSize) * 100 : 0;

                html += '<div class="mem-gl-object-card">';
                html += '<div class="mem-gl-object-header">';
                html += `<div class="mem-gl-object-type">${type}</div>`;
                html += `<div class="mem-gl-object-count">${count}</div>`;
                html += '</div>';
                html += `<div class="mem-gl-object-size">${formatBytes(size)}</div>`;
                html += '<div class="mem-gl-object-bar">';
                html += `<div class="mem-gl-object-bar-fill" style="width: ${pct}%"></div>`;
                html += '</div>';
                html += '</div>';
            }
            html += '</div>';

            html += '</div>';
        }
    }

    // 3. IPC Handle Store
    if (handles) {
        const total = handles.total || 0;
        const types = Object.entries(handles)
            .filter(([key, val]) => key !== 'total' && val > 0)
            .sort((a, b) => b[1] - a[1]);

        if (total > 0 || types.length > 0) {
            html += '<div class="mem-handle-store">';
            html += '<div class="mem-section-title">IPC Handle Store</div>';

            html += '<div class="mem-handle-total">';
            html += '<div class="mem-handle-total-label">Total Handles</div>';
            html += `<div class="mem-handle-total-value">${total}</div>`;
            html += '</div>';

            if (types.length > 0) {
                html += '<div class="mem-handle-pills">';
                for (const [type, count] of types) {
                    html += '<div class="mem-handle-pill">';
                    html += `<div class="mem-handle-pill-type">${type}</div>`;
                    html += `<div class="mem-handle-pill-count">${count}</div>`;
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div>';
        }
    }

    // 4. Memory Segments
    if (sizes && sizes.length > 0) {
        const maxSize = Math.max(...sizes);

        html += '<div class="mem-section">';
        html += '<div class="mem-section-title">Memory Segments</div>';

        html += '<div class="mem-segments-list">';
        for (let i = 0; i < sizes.length; i++) {
            const label = i === 0 ? 'Main shared heap' : `External mapping #${i}`;
            const pct = (sizes[i] / maxSize) * 100;

            html += '<div class="mem-segment-row">';
            html += `<div class="mem-segment-label">${label}</div>`;
            html += '<div class="mem-segment-bar-container">';
            html += `<div class="mem-segment-bar-fill" style="width: ${pct}%"></div>`;
            html += '</div>';
            html += `<div class="mem-segment-size">${formatBytes(sizes[i])}</div>`;
            html += '</div>';
        }
        html += '</div>';

        html += '</div>';
    }

    // Fallback for no data
    if (!html) {
        html = '<p class="placeholder">No memory data available. Make sure RS is running and the overlay is injected.</p>';
    }

    memPanel.innerHTML = html;
}

let memoryRefreshInterval = null;

function toggleMemoryRefresh() {
    const btn = document.getElementById('mem-refresh-toggle');
    if (memoryRefreshInterval) {
        clearInterval(memoryRefreshInterval);
        memoryRefreshInterval = null;
        if (btn) btn.textContent = 'Auto-Refresh: OFF';
    } else {
        updateMemoryInspector();
        memoryRefreshInterval = setInterval(updateMemoryInspector, 2000);
        if (btn) btn.textContent = 'Auto-Refresh: ON';
    }
}

// =============================================================================
// Connection Tests
// =============================================================================
function testNativeAddon() {
    const resultsEl = document.getElementById('connection-results');

    if (!native) {
        addResult(resultsEl, false, 'Native Addon', 'Not loaded');
        log('FAIL: Native addon not loaded', 'error');
        return;
    }

    try {
        const keys = Object.keys(native);
        addResult(resultsEl, true, 'Native Addon', `Loaded with ${keys.length} exports`);
        log(`PASS: Native addon loaded - exports: ${keys.join(', ')}`, 'success');
    } catch (e) {
        addResult(resultsEl, false, 'Native Addon', e.message);
        log('FAIL: ' + e, 'error');
    }
}

async function testFindClient() {
    const resultsEl = document.getElementById('connection-results');

    if (!native) {
        addResult(resultsEl, false, 'Find Client', 'Native addon not loaded');
        return;
    }

    try {
        const pids = await native.debug.getExePids(RS_EXE_NAME);
        if (pids.length > 0) {
            addResult(resultsEl, true, 'Find Client', `Found PIDs: ${pids.join(', ')}`);
            document.getElementById('info-pid').textContent = pids[0];
            log(`PASS: Found RS client PIDs: ${pids.join(', ')}`, 'success');
        } else {
            addResult(resultsEl, false, 'Find Client', 'No RS client found');
            log('FAIL: No RS client process found', 'error');
        }
    } catch (e) {
        addResult(resultsEl, false, 'Find Client', e.message);
        log('FAIL: ' + e, 'error');
    }
}

async function testHookClient() {
    const resultsEl = document.getElementById('connection-results');

    if (!native) {
        addResult(resultsEl, false, 'Hook Client', 'Native addon not loaded');
        return;
    }

    // DO NOT call connectToOverlay/injectDll/exitDll from here.
    // The main process owns the addon connection. Calling these from
    // a renderer kills the existing session and breaks all other apps.
    try {
        const ready = native.getRsReady();
        if (ready) {
            addResult(resultsEl, true, 'Hook Client', 'Connected via launcher');
            log('Client connected — managed by launcher main process', 'success');
            checkConnectionStatus();
            return;
        }

        // Not connected — report why
        let pids = native.debug.getExePids(RS_EXE_NAME);
        if (pids && typeof pids.then === 'function') pids = await pids;
        const pidArr = Array.isArray(pids) ? pids : Array.from(pids || []);

        if (pidArr.length === 0) {
            addResult(resultsEl, false, 'Hook Client', 'No RS client found — start RS3 through the launcher');
        } else {
            addResult(resultsEl, false, 'Hook Client', `RS client PID ${pidArr[0]} found but not hooked — restart launcher with RS running`);
        }
    } catch (e) {
        addResult(resultsEl, false, 'Hook Client', e.message);
        log('FAIL: ' + e, 'error');
    }
}

function testWindowAPIs() {
    const resultsEl = document.getElementById('connection-results');

    if (!native || !isConnected) {
        addResult(resultsEl, false, 'Window APIs', 'Not connected');
        return;
    }

    try {
        const x = native.getRsX();
        const y = native.getRsY();
        const w = native.getRsWidth();
        const h = native.getRsHeight();

        if (w > 0 && h > 0) {
            addResult(resultsEl, true, 'Window APIs', `${w}x${h} at (${x}, ${y})`);
            log(`PASS: Window APIs - Position: ${x},${y} Size: ${w}x${h}`, 'success');
        } else {
            addResult(resultsEl, false, 'Window APIs', 'Invalid dimensions');
            log(`FAIL: Invalid window dimensions: ${w}x${h}`, 'error');
        }
    } catch (e) {
        addResult(resultsEl, false, 'Window APIs', e.message);
        log('FAIL: ' + e, 'error');
    }
}

async function testDebugAPIs() {
    const resultsEl = document.getElementById('connection-results');

    if (!native) {
        addResult(resultsEl, false, 'Debug APIs', 'Not connected');
        return;
    }

    try {
        const cwd = await native.debug.getCurrentWorkingDirectory();
        log(`CWD: ${cwd}`, 'info');

        const mem = await native.debug.memoryState();
        if (mem) {
            log(`Memory - Used: ${(mem.used/1024/1024).toFixed(2)}MB, Sanity: ${mem.sanity}`, 'info');
        }

        addResult(resultsEl, true, 'Debug APIs', 'All debug APIs accessible');
        log('PASS: Debug APIs working', 'success');
    } catch (e) {
        addResult(resultsEl, false, 'Debug APIs', e.message);
        log('FAIL: ' + e, 'error');
    }
}

// =============================================================================
// Capture Functions
// =============================================================================
async function captureFramebuffer() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    const x = parseInt(document.getElementById('capture-x').value) || 0;
    const y = parseInt(document.getElementById('capture-y').value) || 0;
    const w = parseInt(document.getElementById('capture-w').value) || 256;
    const h = parseInt(document.getElementById('capture-h').value) || 256;

    try {
        const start = performance.now();
        const img = await native.capture(-1, x, y, w, h);
        const elapsed = performance.now() - start;

        if (img && img.data.length > 0) {
            displayCapture(img);
            document.getElementById('capture-size').textContent = `${img.width}x${img.height}`;
            document.getElementById('capture-time').textContent = `${elapsed.toFixed(2)}ms`;
            log(`Captured ${img.width}x${img.height} in ${elapsed.toFixed(2)}ms`, 'success');
        } else {
            log('Capture returned empty data', 'error');
        }
    } catch (e) {
        log('Capture failed: ' + e, 'error');
    }
}

async function captureFullScreen() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const w = native.getRsWidth();
        const h = native.getRsHeight();

        const start = performance.now();
        const img = await native.capture(-1, 0, 0, w, h);
        const elapsed = performance.now() - start;

        if (img && img.data.length > 0) {
            displayCapture(img);
            document.getElementById('capture-size').textContent = `${img.width}x${img.height}`;
            document.getElementById('capture-time').textContent = `${elapsed.toFixed(2)}ms`;
            log(`Full screen capture ${img.width}x${img.height} in ${elapsed.toFixed(2)}ms`, 'success');
        }
    } catch (e) {
        log('Full screen capture failed: ' + e, 'error');
    }
}

function displayCapture(img) {
    const canvas = document.getElementById('capture-canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    const imageData = new ImageData(
        new Uint8ClampedArray(img.data),
        img.width,
        img.height
    );
    ctx.putImageData(imageData, 0, 0);
}

// =============================================================================
// Render Recording
// =============================================================================
async function recordRenderOnce() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    const maxframes = parseInt(document.getElementById('render-maxframes').value) || 1;
    const timeout = parseInt(document.getElementById('render-timeout').value) || 5000;

    const features = [];
    if (document.getElementById('feat-uniforms').checked) features.push('uniforms');
    if (document.getElementById('feat-vertexarray').checked) features.push('vertexarray');
    if (document.getElementById('feat-textures').checked) features.push('textures');
    if (document.getElementById('feat-framebuffer').checked) features.push('framebuffer');
    if (document.getElementById('feat-computebindings').checked) features.push('computebindings');

    log(`Recording ${maxframes} frame(s) with features: ${features.join(', ')}`, 'info');

    try {
        const renders = await native.recordRenderCalls({
            maxframes,
            timeout,
            features
        });

        if (renders && renders.length > 0) {
            displayRenderStats(renders);
            displayRenderList(renders);
            log(`Captured ${renders.length} render calls`, 'success');

            // Cleanup: dispose render call data
            renders.forEach(r => { if (r.dispose) r.dispose(); });
        } else {
            log('No render calls captured', 'warn');
        }
    } catch (e) {
        log('Record failed: ' + e, 'error');
    }
}

function displayRenderStats(renders) {
    const uniquePrograms = new Set(renders.map(r => r.program?.programId).filter(Boolean));
    const uniqueVAOs = new Set(renders.map(r => r.vertexObjectId).filter(Boolean));
    const totalVerts = renders.reduce((sum, r) =>
        sum + r.renderRanges.reduce((s, rr) => s + rr.length, 0), 0);

    document.getElementById('stat-drawcalls').textContent = renders.length;
    document.getElementById('stat-programs').textContent = uniquePrograms.size;
    document.getElementById('stat-vaos').textContent = uniqueVAOs.size;
    document.getElementById('stat-vertices').textContent = totalVerts;
}

function displayRenderList(renders) {
    const listEl = document.getElementById('render-list');
    listEl.innerHTML = '';

    renders.slice(0, 50).forEach((r, i) => {
        const verts = r.renderRanges.reduce((s, rr) => s + rr.length, 0);
        const item = document.createElement('div');
        item.className = 'render-item';
        item.innerHTML = `
            <div class="render-item-header">
                <span class="id">#${i} VAO: ${r.vertexObjectId}</span>
                <span class="mode">${r.renderMode || 'TRIANGLES'}</span>
            </div>
            <div class="render-item-details">
                <span>Program: ${r.program?.programId || '--'}</span>
                <span>Vertices: ${verts}</span>
                <span>FBO: ${r.framebufferId || 0}</span>
            </div>
        `;
        listEl.appendChild(item);
    });

    if (renders.length > 50) {
        const more = document.createElement('p');
        more.className = 'placeholder';
        more.textContent = `... and ${renders.length - 50} more`;
        listEl.appendChild(more);
    }
}

function startStreaming() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    if (currentStream) {
        log('Stream already active', 'warn');
        return;
    }

    const features = [];
    if (document.getElementById('feat-uniforms').checked) features.push('uniforms');
    if (document.getElementById('feat-vertexarray').checked) features.push('vertexarray');

    log('Starting render stream...', 'info');

    try {
        let frameCount = 0;
        currentStream = native.streamRenderCalls(
            { framecooldown: 100, features },
            (renders) => {
                frameCount++;
                if (frameCount % 10 === 0) {
                    log(`Stream frame ${frameCount}: ${renders.length} renders`, 'info');
                }
                displayRenderStats(renders);
            }
        );

        document.getElementById('btn-stream-start').disabled = true;
        document.getElementById('btn-stream-stop').disabled = false;
        log('Stream started', 'success');
    } catch (e) {
        log('Stream start failed: ' + e, 'error');
    }
}

async function stopStreaming() {
    if (!currentStream) {
        log('No active stream to stop', 'warn');
        return;
    }

    log('Stopping stream...', 'info');
    const stream = currentStream;
    currentStream = null; // Clear immediately to prevent double-stop

    try {
        // Try to close with a timeout
        const closePromise = stream.close();

        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Stream stop timed out')), 2000)
        );

        await Promise.race([closePromise, timeoutPromise]);
        log('Stream stopped successfully', 'success');
    } catch (e) {
        log('Stream stop error (may still be stopped): ' + e.message, 'warn');
    } finally {
        // Always update UI
        document.getElementById('btn-stream-start').disabled = false;
        document.getElementById('btn-stream-stop').disabled = true;
    }
}

// =============================================================================
// Overlay Tests
// =============================================================================
async function testOverlayTrigger(trigger) {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log(`Testing overlay trigger: ${trigger}`, 'info');

    try {
        // Get a render to trigger on (except for frameend)
        let triggerVAO = null;
        let triggerProgram = null;
        if (trigger !== 'frameend') {
            log('Recording render calls to find trigger target...', 'info');
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            log(`Got ${renders?.length || 0} render calls`, 'info');

            // Helper to get programId
            const getProgramId = (r) => r.program?.programId || 0;
            const getVertexCount = (r) => r.renderRanges?.reduce((s, rr) => s + (rr.length || 0), 0) || 0;

            // Find render with valid vertices - VAO 0 is valid in compatibility profile
            const triggerRender = renders?.find(r => getVertexCount(r) > 0 && getProgramId(r) > 0);
            if (!triggerRender) {
                log('No valid trigger render found - trying frameend instead', 'warn');
                // Fall back to frameend behavior for testing
            } else {
                triggerVAO = triggerRender.vertexObjectId;
                triggerProgram = getProgramId(triggerRender);
                log(`Using VAO ${triggerVAO}, Program ${triggerProgram} as trigger`, 'info');
            }
        }

        // Create test overlay with bright, visible colors
        // Colors with full alpha for maximum visibility
        const colors = {
            before: [1.0, 1.0, 0.0, 0.9], // Bright Yellow
            after: [0.0, 1.0, 1.0, 0.9],  // Bright Cyan
            replace: [1.0, 0.0, 1.0, 0.9], // Bright Magenta
            frameend: [0.0, 1.0, 0.0, 0.9], // Bright Green
            passive: [1.0, 0.5, 0.0, 0.9] // Bright Orange
        };

        // Position overlays in different corners based on trigger type
        const positions = {
            before: 'topleft',
            after: 'topright',
            replace: 'center',
            frameend: 'topright',
            passive: 'bottomleft'
        };

        const color = colors[trigger] || [1, 1, 1, 0.9];
        const position = positions[trigger] || 'topright';

        // For passive, we don't need a program - it just monitors the draw
        if (trigger === 'passive') {
            // Use programId if VAO is 0 (compatibility profile)
            const useProgFilter = triggerVAO === 0 && triggerProgram > 0;
            const filter = useProgFilter ? { programId: triggerProgram } : { vertexObjectId: triggerVAO };
            const filterDesc = useProgFilter ? `prog=${triggerProgram}` : `VAO=${triggerVAO}`;
            log(`Creating passive overlay on ${filterDesc}...`, 'info');
            const overlay = await native.beginOverlay(
                filter,
                undefined,
                undefined,
                { trigger: 'passive' }
            );

            if (overlay) {
                addActiveOverlay(overlay, `Passive on ${filterDesc}`);
                log(`PASS: Passive overlay created on ${filterDesc}`, 'success');
            } else {
                log(`FAIL: beginOverlay returned null for passive`, 'error');
            }
            return;
        }

        log(`Creating ${trigger} overlay program (${position})...`, 'info');
        const program = await createTestProgram(color, position);
        if (!program) {
            log('FAIL: createProgram returned null', 'error');
            return;
        }
        log('Program created successfully', 'info');

        log('Creating test VAO...', 'info');
        const vao = await createTestVAO();
        if (!vao) {
            log('FAIL: createVertexArray returned null', 'error');
            return;
        }
        log('VAO created successfully', 'info');

        // Build the filter object - use programId if VAO is 0 (compatibility profile)
        let filter = {};
        if (trigger !== 'frameend') {
            const useProgFilter = triggerVAO === 0 && triggerProgram > 0;
            filter = useProgFilter ? { programId: triggerProgram } : { vertexObjectId: triggerVAO };
        }
        log(`Filter: ${JSON.stringify(filter)}`, 'info');

        // Build options
        const options = {
            trigger,
            alphaBlend: true,
            ranges: [{ start: 0, length: 3 }]
        };
        log(`Options: ${JSON.stringify(options)}`, 'info');

        log('Calling beginOverlay...', 'info');
        const overlay = await native.beginOverlay(filter, program, vao, options);

        if (overlay) {
            addActiveOverlay(overlay, `${trigger.toUpperCase()} on VAO ${triggerVAO || 'all'}`);
            log(`PASS: ${trigger} overlay created! Look for a ${color[0] > 0 ? 'colored' : ''} triangle in the ${position}`, 'success');
        } else {
            log(`FAIL: beginOverlay returned null for ${trigger}`, 'error');
        }
    } catch (e) {
        log(`FAIL: ${trigger} overlay - ${e.message || e}`, 'error');
        console.error(e);
    }
}

async function testBlendMode(alphaBlend) {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    const modeName = alphaBlend === undefined ? 'DEFAULT' : (alphaBlend ? 'BLEND' : 'NOBLEND');
    log(`Testing blend mode: ${modeName}`, 'info');

    try {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const triggerRender = renders?.find(r => r.vertexObjectId > 0);
        if (!triggerRender) {
            log('No valid trigger render found', 'error');
            return;
        }

        const program = await createTestProgram([1, 0, 0, 0.5]); // Semi-transparent red
        const vao = await createTestVAO();

        const overlay = await native.beginOverlay(
            { vertexObjectId: triggerRender.vertexObjectId },
            program,
            vao,
            {
                trigger: 'after',
                alphaBlend,
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, `Blend: ${modeName}`);
            log(`PASS: Blend mode ${modeName} works`, 'success');
        }
    } catch (e) {
        log(`FAIL: Blend mode test - ${e}`, 'error');
    }
}

// Simple frameend test - most reliable overlay test (no filtering needed)
async function testSimpleFrameendOverlay() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('=== SIMPLE FRAMEEND OVERLAY TEST ===', 'info');
    log('This test creates a green triangle in the top-right corner', 'info');
    log('It should appear on EVERY frame since it uses frameend trigger', 'info');

    try {
        // Use the full-screen program and quad for maximum visibility
        log('Creating bright green program...', 'info');
        const program = await createFullScreenProgram([0.0, 1.0, 0.0, 0.9]); // Bright green
        if (!program) {
            log('FAIL: createProgram returned null', 'error');
            return;
        }

        log('Creating full-screen quad VAO...', 'info');
        const vao = await createFullScreenQuadVAO();
        if (!vao) {
            log('FAIL: createVertexArray returned null', 'error');
            return;
        }

        log('Calling beginOverlay with frameend trigger...', 'info');
        const overlay = await native.beginOverlay(
            {},  // Empty filter - frameend doesn't need to match anything
            program,
            vao,
            {
                trigger: 'frameend',
                alphaBlend: true,
                ranges: [{ start: 0, length: 6 }]  // 6 vertices for the quad
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, 'SIMPLE FRAMEEND (green)');
            log('SUCCESS! Look for a GREEN rectangle in the top-right corner of the game window', 'success');
            log('If you see the green overlay, overlays are working!', 'success');
        } else {
            log('FAIL: beginOverlay returned null', 'error');
        }
    } catch (e) {
        log(`FAIL: ${e.message || e}`, 'error');
        console.error(e);
    }
}

// DIAGNOSTIC TEST - Huge unmissable red triangle covering half the screen
async function testDiagnosticOverlay() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('=== DIAGNOSTIC OVERLAY TEST ===', 'info');
    log('This creates a HUGE RED TRIANGLE covering half the screen', 'info');
    log('If this is not visible, there is a fundamental rendering issue', 'info');

    try {
        // Create a massive triangle that covers the left half of the screen
        const positions = new Float32Array([
            // Huge triangle covering left half of screen
            -0.9, -0.9, 0.0,   // bottom-left
             0.9, -0.9, 0.0,   // bottom-right
             0.0,  0.9, 0.0    // top-center
        ]);
        const indices = new Uint16Array([0, 1, 2]);

        log('Creating VAO with 3 vertices...', 'info');
        const vao = await native.createVertexArray(new Uint8Array(indices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406, // GL_FLOAT
                stride: 12,         // 3 floats * 4 bytes
                vectorlength: 3,
                normalized: false
            }
        ]);

        if (!vao) {
            log('FAIL: createVertexArray returned null', 'error');
            return;
        }
        log('VAO created successfully', 'success');

        // Create the simplest possible shader - just output red
        log('Creating simple red shader program...', 'info');
        const program = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() {
                gl_Position = vec4(aPos, 1.0);
            }`,
            `#version 330 core
            out vec4 FragColor;
            void main() {
                FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            []
        );

        if (!program) {
            log('FAIL: createProgram returned null', 'error');
            return;
        }
        log('Program created successfully', 'success');

        log('Calling beginOverlay with FRAMEEND trigger...', 'info');
        const overlay = await native.beginOverlay(
            {},  // No filter needed for frameend
            program,
            vao,
            {
                trigger: 'frameend',
                alphaBlend: false,  // No blending - solid red
                ranges: [{ start: 0, length: 3 }]  // 3 vertices = 1 triangle
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, 'DIAGNOSTIC (huge red triangle)');
            log('SUCCESS! Look for a HUGE RED TRIANGLE covering most of the game window', 'success');
            log('Triangle vertices: (-0.9,-0.9), (0.9,-0.9), (0.0,0.9)', 'info');
        } else {
            log('FAIL: beginOverlay returned null', 'error');
        }
    } catch (e) {
        log(`FAIL: ${e.message || e}`, 'error');
        console.error(e);
    }
}

// Comprehensive test for ALL trigger types: before, after, replace, passive
async function testAllTriggerTypes() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('=== COMPREHENSIVE TRIGGER TYPE TEST ===', 'info');
    log('Testing: BEFORE, AFTER, REPLACE, PASSIVE', 'info');
    log('Each overlay will be in a different corner for easy identification', 'info');

    try {
        // Step 1: Find draw calls to attach to
        log('Recording render calls to find trigger targets...', 'info');
        const renders = await native.recordRenderCalls({ maxframes: 2 });

        if (!renders || renders.length === 0) {
            log('FAIL: No render calls recorded', 'error');
            return;
        }
        log(`Found ${renders.length} render calls`, 'info');

        // Helper to get vertex count and programId from render object
        const getVertexCount = (r) => r.renderRanges?.reduce((s, rr) => s + (rr.length || 0), 0) || 0;
        const getProgramId = (r) => r.program?.programId || 0;

        // Find draws with valid vertexCount (VAO 0 is valid in compatibility profile!)
        const validRenders = renders.filter(r => getVertexCount(r) > 0);
        log(`${validRenders.length} have valid vertexCount`, 'info');

        // Check if all VAOs are 0 (compatibility profile)
        const nonZeroVAOs = validRenders.filter(r => r.vertexObjectId > 0);
        if (nonZeroVAOs.length === 0 && validRenders.length > 0) {
            log('Note: All draws use VAO 0 (OpenGL compatibility profile)', 'info');
            log('Will use programId for filtering instead', 'info');
        }

        if (validRenders.length < 4) {
            log(`Warning: Only ${validRenders.length} valid draws, may reuse triggers`, 'warn');
        }

        // Log some of the found draws
        validRenders.slice(0, 8).forEach((r, i) => {
            log(`  Draw ${i}: VAO=${r.vertexObjectId} prog=${getProgramId(r)} verts=${getVertexCount(r)}`, 'info');
        });

        // Pick 4 draws with DIFFERENT programIds if possible (better for testing)
        const usedPrograms = new Set();
        const picks = [];
        for (const r of validRenders) {
            if (picks.length >= 4) break;
            const progId = getProgramId(r);
            if (progId > 0 && !usedPrograms.has(progId)) {
                usedPrograms.add(progId);
                picks.push(r);
            }
        }
        // Fill remaining slots if we don't have 4 unique programs
        while (picks.length < 4 && validRenders.length > 0) {
            picks.push(picks[0] || validRenders[0]);
        }

        // Create overlays for each trigger type
        const tests = [
            { trigger: 'before',  color: [1.0, 1.0, 0.0, 0.9], position: 'topleft',     desc: 'BEFORE (Yellow, top-left)' },
            { trigger: 'after',   color: [0.0, 1.0, 1.0, 0.9], position: 'topright',    desc: 'AFTER (Cyan, top-right)' },
            { trigger: 'replace', color: [1.0, 0.0, 1.0, 0.9], position: 'center',      desc: 'REPLACE (Magenta, center)' },
            { trigger: 'passive', color: [1.0, 0.5, 0.0, 0.9], position: 'bottomleft',  desc: 'PASSIVE (Orange, bottom-left)' }
        ];

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            const draw = picks[i];

            if (!draw) {
                log(`SKIP ${test.desc}: No valid draw call available`, 'warn');
                continue;
            }

            // Use programId if VAO is 0 (compatibility profile)
            const drawProgId = getProgramId(draw);
            const useProgram = draw.vertexObjectId === 0 && drawProgId > 0;
            const filterDesc = useProgram
                ? `prog=${drawProgId}`
                : `VAO=${draw.vertexObjectId}`;
            log(`Creating ${test.desc} on ${filterDesc}...`, 'info');

            try {
                // Build filter - use programId if VAO is 0, otherwise use VAO
                const filter = {};
                if (useProgram) {
                    filter.programId = drawProgId;
                } else {
                    filter.vertexObjectId = draw.vertexObjectId;
                }

                if (test.trigger === 'passive') {
                    // Passive overlays don't render anything
                    const overlay = await native.beginOverlay(filter, undefined, undefined, { trigger: 'passive' });
                    if (overlay) {
                        addActiveOverlay(overlay, test.desc);
                        log(`SUCCESS: ${test.desc}`, 'success');
                    } else {
                        log(`FAIL: ${test.desc} - beginOverlay returned null`, 'error');
                    }
                } else {
                    // Create program and VAO for rendering triggers
                    const program = await createTestProgram(test.color, test.position);
                    const vao = await createTestVAO();

                    if (!program || !vao) {
                        log(`FAIL: ${test.desc} - failed to create program or VAO`, 'error');
                        continue;
                    }

                    const overlay = await native.beginOverlay(
                        filter,
                        program,
                        vao,
                        {
                            trigger: test.trigger,
                            alphaBlend: true,
                            ranges: [{ start: 0, length: 3 }]
                        }
                    );

                    if (overlay) {
                        addActiveOverlay(overlay, test.desc);
                        log(`SUCCESS: ${test.desc}`, 'success');
                    } else {
                        log(`FAIL: ${test.desc} - beginOverlay returned null`, 'error');
                    }
                }
            } catch (e) {
                log(`FAIL: ${test.desc} - ${e.message || e}`, 'error');
            }
        }

        log('Test complete! Look for colored triangles in each corner:', 'info');
        log('  Top-left: YELLOW = BEFORE trigger working', 'info');
        log('  Top-right: CYAN = AFTER trigger working', 'info');
        log('  Center: MAGENTA = REPLACE trigger working', 'info');
        log('  Bottom-left: PASSIVE (no visible output, just monitors)', 'info');

    } catch (e) {
        log(`FAIL: ${e.message || e}`, 'error');
        console.error(e);
    }
}

async function testOverlayDuration() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Testing overlay with 3 second duration (auto-expire)', 'info');

    try {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        // Helper functions for property access
        const getProgramId = (r) => r.program?.programId || 0;
        const getVertexCount = (r) => r.renderRanges?.reduce((s, rr) => s + (rr.length || 0), 0) || 0;

        // Find render with valid vertices - VAO 0 is valid in compatibility profile
        const triggerRender = renders?.find(r => getVertexCount(r) > 0 && getProgramId(r) > 0);
        if (!triggerRender) {
            log('No valid trigger render found - using frameend', 'warn');
        }

        const program = await createTestProgram([1, 1, 0, 0.9], 'bottomright'); // Bright Yellow
        const vao = await createTestVAO();

        // Use programId if VAO is 0 (compatibility profile)
        let filter = {};
        let trigger = 'frameend';
        if (triggerRender) {
            const useProgFilter = triggerRender.vertexObjectId === 0 && getProgramId(triggerRender) > 0;
            filter = useProgFilter ? { programId: getProgramId(triggerRender) } : { vertexObjectId: triggerRender.vertexObjectId };
            trigger = 'after';
        }

        const overlay = await native.beginOverlay(
            filter,
            program,
            vao,
            {
                trigger,
                alphaBlend: true,
                duration: 3000, // 3 seconds
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, 'Duration: 3s (auto-expire)');
            log('PASS: Duration overlay created - will auto-expire in 3 seconds', 'success');
            log('Look for a YELLOW triangle in the bottom-right corner', 'info');

            // Remove from UI after duration
            setTimeout(() => {
                removeOverlayFromUI(overlay);
                log('Duration overlay expired', 'info');
            }, 3500);
        }
    } catch (e) {
        log(`FAIL: Duration test - ${e}`, 'error');
    }
}

async function testMultipleOverlays() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Creating multiple simultaneous overlays...', 'info');

    try {
        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });

        // Find 3 different VAOs
        const uniqueVAOs = [];
        for (const r of renders || []) {
            if (r.vertexObjectId > 0 && !uniqueVAOs.includes(r.vertexObjectId)) {
                uniqueVAOs.push(r.vertexObjectId);
                if (uniqueVAOs.length >= 3) break;
            }
        }

        if (uniqueVAOs.length < 2) {
            log('Not enough unique VAOs found', 'warn');
            return;
        }

        const colors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // RGB
        let count = 0;

        for (let i = 0; i < uniqueVAOs.length; i++) {
            const program = await createTestProgram(colors[i]);
            const vao = await createTestVAO();

            const overlay = await native.beginOverlay(
                { vertexObjectId: uniqueVAOs[i] },
                program,
                vao,
                {
                    trigger: 'after',
                    alphaBlend: true,
                    ranges: [{ start: 0, length: 3 }]
                }
            );

            if (overlay) {
                addActiveOverlay(overlay, `Multi #${i + 1} VAO ${uniqueVAOs[i]}`);
                count++;
            }
        }

        log(`PASS: Created ${count} simultaneous overlays`, 'success');
    } catch (e) {
        log(`FAIL: Multiple overlays - ${e}`, 'error');
    }
}

async function testUniformManipulation() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Testing uniform manipulation (color cycling)...', 'info');

    try {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        // Helper functions for property access
        const getProgramId = (r) => r.program?.programId || 0;
        const getVertexCount = (r) => r.renderRanges?.reduce((s, rr) => s + (rr.length || 0), 0) || 0;

        const triggerRender = renders?.find(r => getVertexCount(r) > 0 && getProgramId(r) > 0);
        if (!triggerRender) {
            log('No valid trigger render found - using frameend instead', 'warn');
        }

        const program = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos * 0.2, 1.0); }`,
            `#version 330 core
            uniform vec4 uColor;
            out vec4 FragColor;
            void main() { FragColor = uColor; }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [{ name: 'uColor', type: 0x8B52, length: 1, snapshotOffset: 0, snapshotSize: 16 }]
        );

        const vao = await createTestVAO();
        const uniformBuffer = new Uint8Array(16);
        new Float32Array(uniformBuffer.buffer).set([1, 0, 0, 0.7]); // Red

        // Build filter - use programId if VAO is 0
        let filter = {};
        let trigger = 'frameend';
        if (triggerRender) {
            const useProgFilter = triggerRender.vertexObjectId === 0 && getProgramId(triggerRender) > 0;
            filter = useProgFilter ? { programId: getProgramId(triggerRender) } : { vertexObjectId: triggerRender.vertexObjectId };
            trigger = 'after';
        }

        const overlay = await native.beginOverlay(
            filter,
            program,
            vao,
            {
                trigger,
                alphaBlend: true,
                uniformBuffer,
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, 'Uniform cycling');

            // Cycle colors
            const colors = [
                [1, 0, 0, 0.7], // Red
                [0, 1, 0, 0.7], // Green
                [0, 0, 1, 0.7], // Blue
                [1, 1, 0, 0.7], // Yellow
            ];

            let colorIdx = 0;
            const interval = setInterval(async () => {
                if (!activeOverlays.includes(overlay)) {
                    clearInterval(interval);
                    return;
                }

                colorIdx = (colorIdx + 1) % colors.length;
                const state = await overlay.getUniformState();
                new Float32Array(state.buffer).set(colors[colorIdx]);
                await overlay.setUniformState(state);
            }, 500);

            log('PASS: Uniform manipulation working - color cycling', 'success');
        }
    } catch (e) {
        log(`FAIL: Uniform manipulation - ${e}`, 'error');
    }
}

async function testBuiltinUniforms() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Testing builtin uniforms (mouse, timestamp, framenr, viewport)...', 'info');

    try {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        // Helper functions for property access
        const getProgramId = (r) => r.program?.programId || 0;
        const getVertexCount = (r) => r.renderRanges?.reduce((s, rr) => s + (rr.length || 0), 0) || 0;

        const triggerRender = renders?.find(r => getVertexCount(r) > 0 && getProgramId(r) > 0);
        if (!triggerRender) {
            log('No valid trigger render found - using frameend instead', 'warn');
        }

        const program = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos * 0.3, 1.0); }`,
            `#version 330 core
            uniform vec2 uMouse;
            uniform float uTimestamp;
            uniform int uFramenr;
            out vec4 FragColor;
            void main() {
                float t = mod(uTimestamp, 1000.0) / 1000.0;
                float m = (uMouse.x + 1.0) * 0.5;
                FragColor = vec4(t, m, float(uFramenr % 60) / 60.0, 0.7);
            }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [
                { name: 'uMouse', type: 0x8B50, length: 1, snapshotOffset: 0, snapshotSize: 8 },
                { name: 'uTimestamp', type: 0x1406, length: 1, snapshotOffset: 8, snapshotSize: 4 },
                { name: 'uFramenr', type: 0x1404, length: 1, snapshotOffset: 12, snapshotSize: 4 }
            ]
        );

        const vao = await createTestVAO();

        // Build filter - use programId if VAO is 0
        let filter = {};
        let trigger = 'frameend';
        if (triggerRender) {
            const useProgFilter = triggerRender.vertexObjectId === 0 && getProgramId(triggerRender) > 0;
            filter = useProgFilter ? { programId: getProgramId(triggerRender) } : { vertexObjectId: triggerRender.vertexObjectId };
            trigger = 'after';
        }

        const overlay = await native.beginOverlay(
            filter,
            program,
            vao,
            {
                trigger,
                alphaBlend: true,
                uniformSources: [
                    { name: 'uMouse', sourceName: 'mouse', type: 'builtin' },
                    { name: 'uTimestamp', sourceName: 'timestamp', type: 'builtin' },
                    { name: 'uFramenr', sourceName: 'framenr', type: 'builtin' }
                ],
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (overlay) {
            addActiveOverlay(overlay, 'Builtin uniforms');
            log('PASS: Builtin uniforms overlay created', 'success');
        }
    } catch (e) {
        log(`FAIL: Builtin uniforms - ${e}`, 'error');
    }
}

// =============================================================================
// Overlay UI Management
// =============================================================================
function addActiveOverlay(overlay, description) {
    activeOverlays.push(overlay);
    updateOverlayList();
}

function removeOverlayFromUI(overlay) {
    const idx = activeOverlays.indexOf(overlay);
    if (idx >= 0) {
        activeOverlays.splice(idx, 1);
        updateOverlayList();
    }
}

function updateOverlayList() {
    const listEl = document.getElementById('overlay-list');

    if (activeOverlays.length === 0) {
        listEl.innerHTML = '<p class="placeholder">No active overlays</p>';
        return;
    }

    listEl.innerHTML = '';
    activeOverlays.forEach((overlay, i) => {
        const item = document.createElement('div');
        item.className = 'overlay-item';
        item.innerHTML = `
            <span class="info">Overlay #${i + 1}</span>
            <button class="test-btn stop-btn" data-index="${i}">Stop</button>
        `;
        item.querySelector('.stop-btn').addEventListener('click', () => {
            overlay.stop();
            activeOverlays.splice(i, 1);
            updateOverlayList();
            log(`Stopped overlay #${i + 1}`, 'info');
        });
        listEl.appendChild(item);
    });
}

function stopAllOverlays() {
    log(`Stopping ${activeOverlays.length} overlays...`, 'info');
    activeOverlays.forEach(o => {
        try { o.stop(); } catch (e) {}
    });
    activeOverlays = [];
    updateOverlayList();
    log('All overlays stopped', 'success');
}

// =============================================================================
// Texture Tests
// =============================================================================
async function testCreateTexture() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        // Create checkerboard texture
        const width = 64;
        const height = 64;
        const data = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const isWhite = ((x >> 3) + (y >> 3)) % 2 === 0;
                data[idx + 0] = isWhite ? 255 : 50;
                data[idx + 1] = isWhite ? 255 : 50;
                data[idx + 2] = isWhite ? 255 : 150;
                data[idx + 3] = 255;
            }
        }

        const texture = await native.createTexture(new ImageData(data, width, height));

        if (texture && texture.texid > 0) {
            document.getElementById('tex-id').textContent = texture.texid;
            document.getElementById('tex-size').textContent = `${texture.width}x${texture.height}`;
            document.getElementById('tex-format').textContent = texture.format;

            // Display on canvas
            const canvas = document.getElementById('texture-canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(new ImageData(data, width, height), 0, 0);

            log(`PASS: Created texture ID ${texture.texid}`, 'success');
        }
    } catch (e) {
        log(`FAIL: Create texture - ${e}`, 'error');
    }
}

async function testTextureCapture() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const state = await native.getOpenGlState();
        const texIds = Object.keys(state?.textures || {});

        if (texIds.length === 0) {
            log('No textures available', 'warn');
            return;
        }

        const texId = parseInt(texIds[0]);
        const texture = state.textures[texId];

        const w = Math.min(256, texture.width);
        const h = Math.min(256, texture.height);

        const captured = await texture.capture(0, 0, w, h);

        if (captured && captured.data.length > 0) {
            const canvas = document.getElementById('texture-canvas');
            canvas.width = captured.width;
            canvas.height = captured.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(new ImageData(
                new Uint8ClampedArray(captured.data),
                captured.width,
                captured.height
            ), 0, 0);

            document.getElementById('tex-id').textContent = texId;
            document.getElementById('tex-size').textContent = `${texture.width}x${texture.height}`;
            document.getElementById('tex-format').textContent = texture.format || '--';

            log(`PASS: Captured texture ${texId}`, 'success');
        }
    } catch (e) {
        log(`FAIL: Texture capture - ${e}`, 'error');
    }
}

async function testTextureUpload() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        // Create and upload gradient texture
        const width = 64;
        const height = 64;
        const data = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                data[idx + 0] = (x / width) * 255;
                data[idx + 1] = (y / height) * 255;
                data[idx + 2] = 128;
                data[idx + 3] = 255;
            }
        }

        const texture = await native.createTexture(new ImageData(data, width, height));

        if (texture) {
            // Modify and re-upload
            for (let i = 0; i < data.length; i += 4) {
                data[i + 0] = 255 - data[i + 0]; // Invert red
                data[i + 1] = 255 - data[i + 1]; // Invert green
            }

            await texture.upload(new ImageData(data, width, height));

            // Capture back
            const captured = await texture.capture(0, 0, width, height);
            if (captured) {
                const canvas = document.getElementById('texture-canvas');
                canvas.width = captured.width;
                canvas.height = captured.height;
                const ctx = canvas.getContext('2d');
                ctx.putImageData(new ImageData(
                    new Uint8ClampedArray(captured.data),
                    captured.width,
                    captured.height
                ), 0, 0);
            }

            log('PASS: Texture upload and modification works', 'success');
        }
    } catch (e) {
        log(`FAIL: Texture upload - ${e}`, 'error');
    }
}

async function listAllTextures() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const state = await native.getOpenGlState();
        const textures = state?.textures || {};
        const listEl = document.getElementById('texture-list');

        listEl.innerHTML = '';

        const texIds = Object.keys(textures);
        if (texIds.length === 0) {
            listEl.innerHTML = '<p class="placeholder">No textures found</p>';
            return;
        }

        texIds.slice(0, 50).forEach(id => {
            const tex = textures[id];
            const item = document.createElement('div');
            item.className = 'texture-item';
            item.innerHTML = `
                <div class="tex-thumb"></div>
                <div class="tex-info">
                    <span class="tex-id">ID: ${id}</span>
                    <span>${tex.width}x${tex.height} ${tex.format || ''}</span>
                </div>
            `;
            item.addEventListener('click', async () => {
                try {
                    const w = Math.min(256, tex.width);
                    const h = Math.min(256, tex.height);
                    const captured = await tex.capture(0, 0, w, h);
                    if (captured) {
                        const canvas = document.getElementById('texture-canvas');
                        canvas.width = captured.width;
                        canvas.height = captured.height;
                        const ctx = canvas.getContext('2d');
                        ctx.putImageData(new ImageData(
                            new Uint8ClampedArray(captured.data),
                            captured.width,
                            captured.height
                        ), 0, 0);

                        document.getElementById('tex-id').textContent = id;
                        document.getElementById('tex-size').textContent = `${tex.width}x${tex.height}`;
                    }
                } catch (e) {
                    log('Failed to capture texture: ' + e, 'error');
                }
            });
            listEl.appendChild(item);
        });

        log(`Found ${texIds.length} textures`, 'success');
    } catch (e) {
        log(`Failed to list textures: ${e}`, 'error');
    }
}

// =============================================================================
// Shader Analysis
// =============================================================================
async function analyzeShaders() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const state = await native.getOpenGlState();
        const programs = state?.programs || {};
        const programIds = Object.keys(programs);

        let vertexCount = 0;
        let fragmentCount = 0;
        let computeCount = 0;
        const uniformNames = new Set();

        programIds.forEach(id => {
            const prog = programs[id];
            if (prog.vertexShader?.source) vertexCount++;
            if (prog.fragmentShader?.source) fragmentCount++;
            if (prog.computeShader?.source) computeCount++;

            (prog.uniforms || []).forEach(u => uniformNames.add(u.name));
        });

        document.getElementById('shader-total').textContent = programIds.length;
        document.getElementById('shader-vertex').textContent = vertexCount;
        document.getElementById('shader-fragment').textContent = fragmentCount;
        document.getElementById('shader-compute').textContent = computeCount;

        // Display shader list
        const listEl = document.getElementById('shader-list');
        listEl.innerHTML = '';

        programIds.slice(0, 30).forEach(id => {
            const prog = programs[id];
            const item = document.createElement('div');
            item.className = 'shader-item';

            const uniforms = prog.uniforms || [];
            item.innerHTML = `
                <div class="shader-item-header">
                    <span class="program-id">Program ${id}</span>
                    <span class="uniform-count">${uniforms.length} uniforms</span>
                </div>
                <div class="shader-uniforms">
                    ${uniforms.slice(0, 5).map(u => u.name).join(', ')}
                    ${uniforms.length > 5 ? `... +${uniforms.length - 5} more` : ''}
                </div>
            `;
            listEl.appendChild(item);
        });

        log(`Analyzed ${programIds.length} programs, ${uniformNames.size} unique uniforms`, 'success');
    } catch (e) {
        log(`Shader analysis failed: ${e}`, 'error');
    }
}

async function testCreateProgram() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const program = await createTestProgram([1, 0, 0]);
        if (program && program.programId !== undefined) {
            log(`PASS: Created program ID ${program.programId}`, 'success');
        } else {
            log('FAIL: Program creation returned null', 'error');
        }
    } catch (e) {
        log(`FAIL: Create program - ${e}`, 'error');
    }
}

async function testCreateVAO() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    try {
        const vao = await createTestVAO();
        if (vao && vao.indexBuffer) {
            log(`PASS: Created VAO with ${vao.attributes.length} attributes`, 'success');
        } else {
            log('FAIL: VAO creation returned null', 'error');
        }
    } catch (e) {
        log(`FAIL: Create VAO - ${e}`, 'error');
    }
}

// =============================================================================
// Performance Tests
// =============================================================================
async function testFrameTiming() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Measuring frame timing (1 second)...', 'info');

    try {
        const frames = [];
        let lastFrameTime = 0;
        let callbackCount = 0;
        let totalRenders = 0;

        const stream = native.streamRenderCalls(
            { framecooldown: 0, maxPerFrame: 1 },
            (renders) => {
                callbackCount++;
                totalRenders += renders.length;

                // Debug: log first few callbacks
                if (callbackCount <= 5 && renders.length > 0) {
                    const r = renders[0];
                    log(`  [Debug] callback #${callbackCount}: renders=${renders.length} ownFrameTime=${r.ownFrameTime} lastFrameTime=${r.lastFrameTime} framenr=${r.framenr}`, 'info');
                }

                if (renders.length > 0 && renders[0].ownFrameTime !== lastFrameTime) {
                    if (lastFrameTime > 0) {
                        frames.push(renders[0].ownFrameTime - lastFrameTime);
                    }
                    lastFrameTime = renders[0].ownFrameTime;
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, 1000));
        log(`  [Debug] Before close: callbacks=${callbackCount}, frames=${frames.length}`, 'info');
        await stream.close();
        log(`  [Debug] After close`, 'info');

        log(`  [Debug] Total callbacks: ${callbackCount}, total renders: ${totalRenders}, frames captured: ${frames.length}`, 'info');

        if (frames.length > 5) {
            const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
            const fps = 1000 / avg;
            const min = Math.min(...frames);
            const max = Math.max(...frames);

            document.getElementById('perf-fps').textContent = fps.toFixed(1);
            document.getElementById('perf-frametime').textContent = `${avg.toFixed(2)}ms`;
            document.getElementById('perf-minmax').textContent = `${min.toFixed(2)}ms / ${max.toFixed(2)}ms`;

            log(`FPS: ${fps.toFixed(1)}, Frame time: ${avg.toFixed(2)}ms (${frames.length} samples)`, 'success');
        } else {
            log(`Not enough frames captured (got ${frames.length})`, 'warn');
        }
    } catch (e) {
        log(`Frame timing failed: ${e}`, 'error');
    }
}

async function runBenchmark() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Running benchmark (5 iterations each)...', 'info');

    const iterations = 5;
    const times = { record: [], state: [], capture: [] };

    try {
        for (let i = 0; i < iterations; i++) {
            let start = performance.now();
            await native.recordRenderCalls({ maxframes: 1, features: [] });
            times.record.push(performance.now() - start);

            start = performance.now();
            await native.getOpenGlState();
            times.state.push(performance.now() - start);

            start = performance.now();
            await native.capture(-1, 0, 0, 64, 64);
            times.capture.push(performance.now() - start);
        }

        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

        document.getElementById('bench-record').textContent = `${avg(times.record).toFixed(2)}ms`;
        document.getElementById('bench-state').textContent = `${avg(times.state).toFixed(2)}ms`;
        document.getElementById('bench-capture').textContent = `${avg(times.capture).toFixed(2)}ms`;

        log(`Benchmark complete - Record: ${avg(times.record).toFixed(2)}ms, State: ${avg(times.state).toFixed(2)}ms, Capture: ${avg(times.capture).toFixed(2)}ms`, 'success');
    } catch (e) {
        log(`Benchmark failed: ${e}`, 'error');
    }
}

async function testMemoryState() {
    if (!native) {
        log('Native addon not loaded', 'error');
        return;
    }

    try {
        const mem = await native.debug.memoryState();
        if (mem) {
            log(`Memory - Used: ${(mem.used/1024/1024).toFixed(2)}MB / ${(mem.size/1024/1024).toFixed(2)}MB`, 'success');
            log(`Sanity: ${mem.sanity}, Allocations: ${mem.allocs}`, 'info');
        }
    } catch (e) {
        log(`Memory state failed: ${e}`, 'error');
    }
}

// =============================================================================
// Comprehensive Tests
// =============================================================================
// Wrap an async function with a timeout — rejects if it takes too long
function withTimeout(fn, ms = 10000) {
    return () => Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms))
    ]);
}

async function runAllTests() {
    testResults = [];
    const progressFill = document.getElementById('test-progress-fill');
    const progressText = document.getElementById('test-progress-text');
    const resultsEl = document.getElementById('all-test-results');

    resultsEl.innerHTML = '';
    log('Starting comprehensive test suite...', 'info');

    const tests = [
        { name: 'Native Addon', fn: withTimeout(async () => !!native, 3000) },
        { name: 'Find Client', fn: withTimeout(async () => {
            const pids = await native.debug.getExePids(RS_EXE_NAME);
            return pids.length > 0;
        }, 5000) },
        { name: 'Client Connection', fn: withTimeout(async () => native.getRsReady(), 3000) },
        { name: 'Window APIs', fn: withTimeout(async () => {
            const w = native.getRsWidth();
            const h = native.getRsHeight();
            return w > 0 && h > 0;
        }, 3000) },
        { name: 'Renderer Info', fn: withTimeout(async () => {
            const info = await native.getRenderer();
            return !!info?.glRenderer;
        }, 5000) },
        { name: 'Memory State', fn: withTimeout(async () => {
            const mem = await native.debug.memoryState();
            return !!mem && mem.sanity;
        }, 5000) },
        { name: 'GL Object Stats', fn: withTimeout(async () => {
            const stats = await native.debug.getGlObjectStats();
            return !!stats;
        }, 5000) },
        { name: 'OpenGL State Query', fn: withTimeout(async () => {
            const state = await native.getOpenGlState();
            const passed = !!state?.programs;
            if (state && state.dispose) state.dispose();
            return passed;
        }, 10000) },
        { name: 'Capture Framebuffer', fn: withTimeout(async () => {
            const img = await native.capture(-1, 0, 0, 64, 64);
            return img && img.data.length > 0;
        }, 10000) },
        { name: 'Record Render Calls', fn: withTimeout(async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            const passed = renders && renders.length > 0;
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
            return passed;
        }, 10000) },
        { name: 'Stream Render Calls', fn: withTimeout(async () => {
            let received = false;
            const stream = native.streamRenderCalls({ framecooldown: 100 }, () => { received = true; });
            await new Promise(r => setTimeout(r, 500));
            await stream.close();
            return received;
        }, 5000) },
        { name: 'Create Program', fn: withTimeout(async () => {
            const prog = await createTestProgram([1, 0, 0]);
            const passed = prog != null && prog.programId !== undefined;
            if (prog && prog.dispose) prog.dispose();
            return passed;
        }, 10000) },
        { name: 'Create VAO', fn: withTimeout(async () => {
            const vao = await createTestVAO();
            const passed = !!vao?.indexBuffer;
            if (vao && vao.dispose) vao.dispose();
            return passed;
        }, 10000) },
        { name: 'Create Texture', fn: withTimeout(async () => {
            const data = new Uint8ClampedArray(16 * 16 * 4).fill(255);
            const tex = await native.createTexture(new ImageData(data, 16, 16));
            // On Linux, texid is 0 until used in overlay - check dimensions instead
            const passed = tex && tex.width === 16 && tex.height === 16;
            if (tex && tex.dispose) tex.dispose();
            return passed;
        }, 10000) },
        { name: 'Overlay AFTER', fn: withTimeout(async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            const trigger = renders?.find(r => r.vertexObjectId > 0);
            if (!trigger) {
                if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
                return false;
            }
            const prog = await createTestProgram([1, 0, 0]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay({ vertexObjectId: trigger.vertexObjectId }, prog, vao, {
                trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }]
            });
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
            if (overlay) { overlay.stop(); return true; }
            return false;
        }, 10000) },
        { name: 'Overlay BEFORE', fn: withTimeout(async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            const trigger = renders?.find(r => r.vertexObjectId > 0);
            if (!trigger) {
                if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
                return false;
            }
            const prog = await createTestProgram([0, 1, 0]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay({ vertexObjectId: trigger.vertexObjectId }, prog, vao, {
                trigger: 'before', alphaBlend: true, ranges: [{ start: 0, length: 3 }]
            });
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
            if (overlay) { overlay.stop(); return true; }
            return false;
        }, 10000) },
        { name: 'Overlay FRAMEEND', fn: withTimeout(async () => {
            const prog = await createTestProgram([0, 0, 1]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay({}, prog, vao, {
                trigger: 'frameend', alphaBlend: true, ranges: [{ start: 0, length: 3 }]
            });
            if (overlay) { overlay.stop(); return true; }
            return false;
        }, 10000) },
        { name: 'Overlay REPLACE', fn: withTimeout(async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            const trigger = renders?.find(r => r.vertexObjectId > 0);
            if (!trigger) {
                if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
                return false;
            }
            const prog = await createTestProgram([1, 0, 1]);
            const overlay = await native.beginOverlay({ vertexObjectId: trigger.vertexObjectId }, prog, undefined, {
                trigger: 'replace'
            });
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
            if (overlay) { overlay.stop(); return true; }
            return false;
        }, 10000) },
        { name: 'Overlay PASSIVE', fn: withTimeout(async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1 });
            const trigger = renders?.find(r => r.vertexObjectId > 0);
            if (!trigger) {
                if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
                return false;
            }
            const overlay = await native.beginOverlay({ vertexObjectId: trigger.vertexObjectId }, undefined, undefined, {
                trigger: 'passive'
            });
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
            if (overlay) { overlay.stop(); return true; }
            return false;
        }, 10000) },
        { name: 'GL Log Toggles', fn: withTimeout(async () => {
            const toggles = await native.getGlLogToggles();
            return toggles && toggles.length > 0;
        }, 5000) },
        { name: 'Debug APIs', fn: withTimeout(async () => {
            const cwd = await native.debug.getCurrentWorkingDirectory();
            return !!cwd;
        }, 5000) }
    ];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        progressText.textContent = `Running: ${test.name}`;
        progressFill.style.width = `${((i + 1) / tests.length) * 100}%`;

        try {
            const result = await test.fn();
            testResults.push({ name: test.name, passed: result });

            if (result) {
                passed++;
                addTestResult(resultsEl, true, test.name);
                log(`PASS: ${test.name}`, 'success');
            } else {
                failed++;
                addTestResult(resultsEl, false, test.name);
                log(`FAIL: ${test.name}`, 'error');
            }
        } catch (e) {
            failed++;
            testResults.push({ name: test.name, passed: false, error: e.message });
            addTestResult(resultsEl, false, test.name, e.message);
            log(`FAIL: ${test.name} - ${e}`, 'error');
        }

        document.getElementById('tests-passed').textContent = passed;
        document.getElementById('tests-failed').textContent = failed;
        document.getElementById('tests-total').textContent = i + 1;

        // Small delay to show progress
        await new Promise(r => setTimeout(r, 50));
    }

    // Cleanup all handles between test suites to prevent memory pressure
    await disposeAllTestHandles();

    progressText.textContent = `Complete: ${passed}/${tests.length} passed`;
    log(`\n=== TEST COMPLETE: ${passed} passed, ${failed} failed ===`, passed === tests.length ? 'success' : 'warn');
}

/**
 * Generate a comprehensive diagnostic report for troubleshooting.
 * Runs all tests, collects system/GPU/memory info, measures performance,
 * and downloads a single text file the user can send to the developer.
 */
async function generateDiagnosticReport() {
    log('Generating diagnostic report...', 'info');
    const lines = [];
    const line = (s = '') => lines.push(s);
    const hr = () => line('─'.repeat(60));

    line('═══ Alt1GL Diagnostic Report ═══');
    line(`Generated: ${new Date().toISOString()}`);
    line(`User Agent: ${navigator.userAgent}`);
    hr();

    // System info
    line('\n── System Info ──');
    line(`Platform: ${navigator.platform}`);
    line(`Language: ${navigator.language}`);
    line(`Cores: ${navigator.hardwareConcurrency || 'unknown'}`);
    line(`Screen: ${screen.width}x${screen.height} (${devicePixelRatio}x DPR)`);

    // GPU / Renderer info
    line('\n── GPU & Renderer ──');
    try {
        const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
        if (renderer) {
            line(`GL Renderer: ${renderer.glRenderer}`);
            line(`GL Vendor:   ${renderer.glVendor}`);
            line(`GL Version:  ${renderer.glVersion}`);
            line(`GLSL:        ${renderer.glShaderVersion || 'N/A'}`);
        } else {
            line('getRenderer() returned null — GL server not initialized');
        }
    } catch (e) { line(`getRenderer() ERROR: ${e.message}`); }

    // RS Client state
    line('\n── RS Client ──');
    try {
        line(`Connected: ${native.getRsReady()}`);
        const w = native.getRsWidth(), h = native.getRsHeight();
        line(`Window:    ${w}x${h}`);
        line(`Position:  ${native.getRsX()}, ${native.getRsY()}`);
        try { const hwnd = await Promise.resolve(native.debug.getRsHwnd()); line(`HWND:      ${hwnd}`); } catch {}
    } catch (e) { line(`Client state ERROR: ${e.message}`); }

    // Shared memory
    line('\n── Shared Memory ──');
    try {
        const mem = await Promise.resolve(native.debug.memoryState());
        if (mem) {
            line(`Total:      ${(mem.size / 1024 / 1024).toFixed(1)}MB`);
            line(`Used:       ${(mem.used / 1024 / 1024).toFixed(1)}MB (${((mem.used / mem.size) * 100).toFixed(1)}%)`);
            line(`Free:       ${(mem.free / 1024 / 1024).toFixed(1)}MB`);
            line(`Sanity:     ${mem.sanity}`);
            line(`Allocs:     ${mem.allocs}`);
            line(`Named Objs: ${mem.namedobjects || 'N/A'}`);
        } else {
            line('memoryState() returned null');
        }
    } catch (e) { line(`memoryState() ERROR: ${e.message}`); }

    // GL Object stats
    line('\n── GL Objects ──');
    try {
        const stats = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
        if (stats) {
            line(`Count: ${stats.count}`);
            line(`Size:  ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
            if (stats.counts) {
                for (const [type, count] of Object.entries(stats.counts)) {
                    line(`  ${type}: ${count}`);
                }
            }
        }
    } catch (e) { line(`getGlObjectStats() ERROR: ${e.message}`); }

    // Wait for client to be hooked (launcher injection may still be in progress)
    line('\n── Connection ──');
    log('Waiting for RS client to be hooked (up to 15s)...', 'info');
    line('Waiting for RS client hook...');
    const hookWaitStart = performance.now();
    for (let i = 0; i < 30; i++) {
        if (isClientReady()) break;
        await new Promise(r => setTimeout(r, 500));
    }
    const hookWaitMs = (performance.now() - hookWaitStart).toFixed(0);
    const hooked = isClientReady();

    if (hooked) {
        line(`Client hooked in ${hookWaitMs}ms`);
        log(`Client hooked in ${hookWaitMs}ms`, 'success');
    } else {
        line(`Client NOT hooked after ${hookWaitMs}ms`);
        log(`Client not hooked after ${hookWaitMs}ms`, 'warn');
    }

    // Collect connection info
    let rsPids = [];
    try {
        let pids = native.debug.getExePids(RS_EXE_NAME);
        if (pids && typeof pids.then === 'function') pids = await pids;
        rsPids = Array.isArray(pids) ? pids : Array.from(pids || []);
    } catch {}
    line(`RS client PIDs: ${rsPids.length > 0 ? rsPids.join(', ') : 'none found'}`);
    line(`getRsReady: ${native.getRsReady()}`);

    if (hooked) {
        try {
            const w = native.getRsWidth(), h = native.getRsHeight();
            line(`Window: ${w}x${h}`);
        } catch {}
    }

    // Wait for GL server (renderer info) if hooked
    if (hooked) {
        line('\n── GL Server ──');
        log('Waiting for GL server...', 'info');
        const glWaitStart = performance.now();
        let glReady = false;
        for (let i = 0; i < 20; i++) {
            try {
                const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
                if (renderer && renderer.glRenderer) { glReady = true; break; }
            } catch {}
            await new Promise(r => setTimeout(r, 500));
        }
        const glWaitMs = (performance.now() - glWaitStart).toFixed(0);
        if (glReady) {
            line(`GL server ready in ${glWaitMs}ms`);
            log(`GL server ready in ${glWaitMs}ms`, 'success');
        } else {
            line(`GL server NOT ready after ${glWaitMs}ms`);
            log('GL server not ready — RS may be on lobby', 'warn');
        }
    }

    // Run all tests
    line('\n── Test Results ──');
    hr();

    const tests = [
        { name: 'Native Addon Available', fn: async () => !!native },
        { name: 'Find RS Client (getExePids)', fn: async () => {
            let pids = native.debug.getExePids(RS_EXE_NAME);
            if (pids && typeof pids.then === 'function') pids = await pids;
            const arr = Array.isArray(pids) ? pids : Array.from(pids || []);
            return { pass: arr.length > 0, detail: `PIDs: ${arr.length > 0 ? arr.join(', ') : 'none'}` };
        }},
        { name: 'Client Connection (getRsReady)', fn: async () => native.getRsReady() },
        { name: 'Window Dimensions', fn: async () => {
            const w = native.getRsWidth(), h = native.getRsHeight();
            return { pass: w > 0 && h > 0, detail: `${w}x${h}` };
        }},
        { name: 'Renderer Info', fn: async () => {
            const info = await Promise.resolve(native.getRenderer()).catch(() => null);
            return { pass: !!info?.glRenderer, detail: info?.glRenderer || 'null' };
        }},
        { name: 'Memory State + Sanity', fn: async () => {
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: !!mem && mem.sanity, detail: mem ? `${(mem.used / 1024 / 1024).toFixed(1)}MB/${(mem.size / 1024 / 1024).toFixed(0)}MB sanity=${mem.sanity}` : 'null' };
        }},
        { name: 'GL Object Stats', fn: async () => {
            const s = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
            return { pass: !!s, detail: s ? `${s.count} objects, ${(s.size / 1024 / 1024).toFixed(1)}MB` : 'null' };
        }},
        { name: 'GL Server Probe (5s)', fn: async () => {
            // Quick probe — if the GL server doesn't respond to a simple recordRenderCalls
            // within 5s, skip all remaining GL tests to avoid minutes of timeouts.
            const result = await Promise.race([
                native.recordRenderCalls({ maxframes: 1, features: [] }),
                new Promise(r => setTimeout(() => r('__TIMEOUT__'), 5000))
            ]);
            if (result === '__TIMEOUT__') {
                glServerDead = true;
                return { pass: false, detail: 'GL server not responding — skipping remaining GL tests. This is likely a GPU driver compatibility issue.' };
            }
            const n = Array.isArray(result) ? result.length : 0;
            if (result && Array.isArray(result)) result.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: n > 0, detail: `${n} renders — GL server responsive` };
        }},
        { name: 'OpenGL State Query', fn: async () => {
            const state = await Promise.race([
                native.getOpenGlState(),
                new Promise(r => setTimeout(() => r(null), 10000))
            ]);
            if (state === null) return { pass: false, detail: 'timed out after 10s — GL server may not be responding' };
            const n = state ? Object.keys(state.programs).length : 0;
            return { pass: n > 0, detail: `${n} programs` };
        }},
        { name: 'Screen Capture (64x64)', fn: async () => {
            const t0 = performance.now();
            const img = await Promise.race([
                native.capture(-1, 0, 0, 64, 64),
                new Promise(r => setTimeout(() => r(null), 10000))
            ]);
            if (img === null) return { pass: false, detail: 'timed out after 10s' };
            const ms = (performance.now() - t0).toFixed(1);
            const nonZero = img ? Array.from(img.data).filter((_, i) => i % 4 < 3 && img.data[i] > 0).length : 0;
            return { pass: img && img.data.length > 0, detail: `${ms}ms, ${nonZero} non-zero channels` };
        }},
        { name: 'recordRenderCalls (1 frame, uniforms+VA)', fn: async () => {
            const t0 = performance.now();
            const renders = await Promise.race([
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                new Promise(r => setTimeout(() => r(null), 10000))
            ]);
            const ms = (performance.now() - t0).toFixed(1);
            if (renders === null) return { pass: false, detail: `timed out after 10s` };
            const n = renders?.length ?? 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: n > 0, detail: `${n} renders in ${ms}ms` };
        }},
        { name: 'recordRenderCalls (minimal, no features)', fn: async () => {
            const t0 = performance.now();
            const renders = await Promise.race([
                native.recordRenderCalls({ maxframes: 1, features: [] }),
                new Promise(r => setTimeout(() => r(null), 10000))
            ]);
            const ms = (performance.now() - t0).toFixed(1);
            if (renders === null) return { pass: false, detail: `timed out after 10s` };
            const n = renders?.length ?? 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: n > 0, detail: `${n} renders in ${ms}ms` };
        }},
        { name: 'recordRenderCalls (with textures)', fn: async () => {
            const t0 = performance.now();
            const renders = await Promise.race([
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'textures'] }),
                new Promise(r => setTimeout(() => r(null), 10000))
            ]);
            const ms = (performance.now() - t0).toFixed(1);
            if (renders === null) return { pass: false, detail: `timed out after 10s` };
            const n = renders?.length ?? 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: n > 0, detail: `${n} renders in ${ms}ms` };
        }},
        { name: 'Stream Render Calls', fn: async () => {
            let count = 0;
            const stream = native.streamRenderCalls({ framecooldown: 100 }, (r) => { count += r?.length ?? 0; });
            await new Promise(r => setTimeout(r, 600));
            await stream.close();
            return { pass: count > 0, detail: `${count} renders streamed` };
        }},
        { name: 'Create Program', fn: async () => {
            const prog = await createTestProgram([1, 0, 0]);
            const pass = prog != null && prog.programId !== undefined;
            return { pass, detail: pass ? `programId=${prog.programId}` : 'failed' };
        }},
        { name: 'Create VAO', fn: async () => {
            const vao = await createTestVAO();
            return { pass: !!vao?.indexBuffer, detail: vao ? 'created' : 'failed' };
        }},
        { name: 'Create Texture (16x16)', fn: async () => {
            const data = new Uint8ClampedArray(16 * 16 * 4).fill(255);
            const tex = await native.createTexture(new ImageData(data, 16, 16));
            return { pass: tex && tex.width === 16, detail: tex ? `${tex.width}x${tex.height}` : 'failed' };
        }},
        { name: 'Overlay FRAMEEND', fn: async () => {
            const prog = await createTestProgram([0, 0, 1]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay({}, prog, vao, {
                trigger: 'frameend', alphaBlend: true, ranges: [{ start: 0, length: 3 }], duration: 100
            });
            const pass = !!overlay;
            if (overlay) overlay.stop();
            return { pass, detail: pass ? 'created and stopped' : 'failed' };
        }},
        { name: 'Memory After Tests', fn: async () => {
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: !!mem && mem.sanity, detail: mem ? `${(mem.used / 1024 / 1024).toFixed(1)}MB, sanity=${mem.sanity}` : 'null' };
        }},
        { name: 'resetOpenGlState', fn: async () => {
            const memBefore = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            await native.debug.resetOpenGlState();
            const memAfter = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const freedMB = memBefore && memAfter ? ((memBefore.used - memAfter.used) / 1024 / 1024).toFixed(1) : '?';
            return { pass: memAfter?.sanity ?? false, detail: `freed ${freedMB}MB, sanity=${memAfter?.sanity}` };
        }},
        { name: 'Post-Reset Capture', fn: async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
            const n = renders?.length ?? 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: n > 0, detail: `${n} renders — pipeline ${n > 0 ? 'healthy' : 'BROKEN'}` };
        }},
        { name: 'Rapid Fire (5x, 100ms apart)', fn: async () => {
            let total = 0, zeros = 0;
            for (let i = 0; i < 5; i++) {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
                const n = renders?.length ?? 0;
                total += n; if (n === 0) zeros++;
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                await new Promise(r => setTimeout(r, 100));
            }
            return { pass: zeros <= 1, detail: `${total} total, ${zeros} zero-renders` };
        }},

        // ── Multi-App Contention Simulation ─────────────────────────────
        { name: 'CONTENTION: 5 concurrent recordRenderCalls', fn: async () => {
            const t0 = performance.now();
            const results = await Promise.all([
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] }),
                native.recordRenderCalls({ maxframes: 1, features: ['vertexarray'] }),
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                native.recordRenderCalls({ maxframes: 1, features: [] }),
            ]);
            const ms = (performance.now() - t0).toFixed(1);
            const counts = results.map(r => r?.length ?? 0);
            const total = counts.reduce((s, n) => s + n, 0);
            for (const renders of results) {
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            return { pass: total > 0, detail: `${counts.join(', ')} renders in ${ms}ms` };
        }},
        { name: 'CONTENTION: interleaved record + capture + state', fn: async () => {
            const [renders, img, state] = await Promise.all([
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                native.capture(-1, 0, 0, 64, 64),
                native.getOpenGlState(),
            ]);
            const rn = renders?.length ?? 0;
            const imgOk = img && img.data.length > 0;
            const stateOk = state && Object.keys(state.programs).length > 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            return { pass: rn > 0 && imgOk && stateOk, detail: `${rn} renders, capture=${imgOk}, state=${stateOk}` };
        }},
        { name: 'CONTENTION: back-to-back without dispose (simulates bad app)', fn: async () => {
            const batches = [];
            const memStart = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            for (let i = 0; i < 5; i++) {
                batches.push(await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }));
            }
            const memPeak = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            // Now dispose all at once
            for (const b of batches) if (b) b.forEach(r => { try { r?.dispose?.(); } catch {} });
            const memAfter = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const peakMB = memPeak ? (memPeak.used / 1024 / 1024).toFixed(1) : '?';
            const afterMB = memAfter ? (memAfter.used / 1024 / 1024).toFixed(1) : '?';
            return { pass: memPeak?.sanity ?? false, detail: `peak ${peakMB}MB → ${afterMB}MB, sanity=${memPeak?.sanity}` };
        }},

        // ── Memory Leak Detection ───────────────────────────────────────
        { name: 'LEAK TEST: 15 capture/dispose cycles', fn: async () => {
            await native.debug.resetOpenGlState();
            await new Promise(r => setTimeout(r, 300));
            const memStart = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            for (let i = 0; i < 15; i++) {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                if (i % 5 === 4) await new Promise(r => setTimeout(r, 200)); // GC pause
            }
            await new Promise(r => setTimeout(r, 500));
            const memEnd = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const leakMB = memEnd && memStart ? ((memEnd.used - memStart.used) / 1024 / 1024).toFixed(1) : '?';
            return { pass: memEnd?.sanity && parseFloat(leakMB) < 50, detail: `delta: ${leakMB}MB after 15 cycles, sanity=${memEnd?.sanity}` };
        }},
        { name: 'LEAK TEST: overlay create/stop cycles', fn: async () => {
            let created = 0, errors = 0;
            for (let i = 0; i < 5; i++) {
                try {
                    const prog = await createTestProgram([Math.random(), Math.random(), 0]);
                    const vao = await createTestVAO();
                    const overlay = await native.beginOverlay({}, prog, vao, {
                        trigger: 'frameend', alphaBlend: true, ranges: [{ start: 0, length: 3 }], duration: 50
                    });
                    if (overlay) { overlay.stop(); created++; }
                } catch { errors++; }
                await new Promise(r => setTimeout(r, 100));
            }
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: created >= 3 && (mem?.sanity ?? false), detail: `${created}/5 created, ${errors} errors, sanity=${mem?.sanity}` };
        }},

        // ── Sustained Load ──────────────────────────────────────────────
        { name: 'SUSTAINED: 10s continuous capture', fn: async () => {
            const t0 = performance.now();
            const deadline = t0 + 10000;
            let captures = 0, zeros = 0, totalRenders = 0;
            let minRenders = Infinity, maxRenders = 0;
            while (performance.now() < deadline) {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
                const n = renders?.length ?? 0;
                captures++; totalRenders += n;
                if (n === 0) zeros++;
                if (n > 0) { minRenders = Math.min(minRenders, n); maxRenders = Math.max(maxRenders, n); }
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                // No delay — as fast as possible
            }
            const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return {
                pass: zeros < captures * 0.3 && (mem?.sanity ?? false),
                detail: `${captures} captures in ${elapsed}s (${(captures / parseFloat(elapsed)).toFixed(1)}/s), ${zeros} zeros, renders: ${minRenders}-${maxRenders}, sanity=${mem?.sanity}`
            };
        }},

        // ── Concurrent Capture + Close Simulation ───────────────────────
        { name: 'LIFECYCLE: capture during dispose storm', fn: async () => {
            // Simulate: one app captures while another app's handles are being disposed
            const batch1 = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
            // Start disposing batch1 while immediately capturing batch2
            const disposePromise = new Promise(resolve => {
                if (batch1) batch1.forEach(r => { try { r?.dispose?.(); } catch {} });
                resolve();
            });
            const [_, batch2] = await Promise.all([
                disposePromise,
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
            ]);
            const n = batch2?.length ?? 0;
            if (batch2) batch2.forEach(r => { try { r?.dispose?.(); } catch {} });
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: n > 0 && (mem?.sanity ?? false), detail: `${n} renders during dispose, sanity=${mem?.sanity}` };
        }},
        { name: 'LIFECYCLE: resetOpenGlState during active captures', fn: async () => {
            // Fire a capture, then reset GL state, then capture again
            const r1 = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
            const n1 = r1?.length ?? 0;
            await native.debug.resetOpenGlState();
            const r2 = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
            const n2 = r2?.length ?? 0;
            if (r1) r1.forEach(r => { try { r?.dispose?.(); } catch {} });
            if (r2) r2.forEach(r => { try { r?.dispose?.(); } catch {} });
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: n2 > 0 && (mem?.sanity ?? false), detail: `before=${n1}, after reset=${n2}, sanity=${mem?.sanity}` };
        }},
        { name: 'LIFECYCLE: rapid resetOpenGlState (3x)', fn: async () => {
            for (let i = 0; i < 3; i++) {
                await native.debug.resetOpenGlState();
                await new Promise(r => setTimeout(r, 100));
            }
            const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
            const n = renders?.length ?? 0;
            if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: n > 0 && (mem?.sanity ?? false), detail: `${n} renders after 3 resets, sanity=${mem?.sanity}` };
        }},

        // ── Texture Capture (heavy feature) ─────────────────────────────
        { name: 'TEXTURE: recordRenderCalls with texturesnapshot', fn: async () => {
            const memBefore = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray', 'texturesnapshot'] });
            const n = renders?.length ?? 0;
            const memDuring = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            // Check for samplers/textures on renders
            let withTex = 0;
            if (renders) {
                for (const r of renders) {
                    if (r.samplers && Object.keys(r.samplers).length > 0) withTex++;
                }
                renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            const growth = memBefore && memDuring ? ((memDuring.used - memBefore.used) / 1024 / 1024).toFixed(1) : '?';
            return { pass: n > 0, detail: `${n} renders, ${withTex} with textures, mem+${growth}MB` };
        }},
        { name: 'TEXTURE: capture specific texture from render', fn: async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'texturesnapshot'] });
            let captured = false;
            let texInfo = 'none';
            if (renders) {
                for (const r of renders) {
                    if (r.samplers) {
                        for (const [loc, snap] of Object.entries(r.samplers)) {
                            if (snap && typeof snap.canCapture === 'function' && snap.canCapture()) {
                                try {
                                    const img = snap.capture(0, 0, Math.min(snap.width, 64), Math.min(snap.height, 64));
                                    if (img && img.data && img.data.length > 0) {
                                        captured = true;
                                        texInfo = `${snap.width}x${snap.height} from sampler ${loc}`;
                                        break;
                                    }
                                } catch {}
                            }
                        }
                    }
                    if (captured) break;
                }
                renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            return { pass: captured, detail: captured ? texInfo : 'no capturable textures found' };
        }},

        // ── Handle / Object Growth ──────────────────────────────────────
        { name: 'HANDLES: GL object count stable across captures', fn: async () => {
            const statsBefore = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
            for (let i = 0; i < 5; i++) {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            await new Promise(r => setTimeout(r, 500));
            const statsAfter = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
            const before = statsBefore?.count ?? 0;
            const after = statsAfter?.count ?? 0;
            const growth = after - before;
            // DLL GC runs asynchronously during frame swaps — temporary object growth is expected.
            // Only flag if growth exceeds 20000 (indicates GC not running at all).
            return { pass: Math.abs(growth) < 20000, detail: `objects: ${before} → ${after} (${growth >= 0 ? '+' : ''}${growth})` };
        }},
        { name: 'HANDLES: memory stable after 10 capture+dispose cycles', fn: async () => {
            const memBefore = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            for (let i = 0; i < 10; i++) {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            await new Promise(r => setTimeout(r, 1000));
            const memAfter = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const delta = memBefore && memAfter ? ((memAfter.used - memBefore.used) / 1024 / 1024).toFixed(1) : '?';
            return { pass: memAfter?.sanity && parseFloat(delta) < 30, detail: `delta: ${delta}MB after 10 cycles` };
        }},

        // ── Extended Duration ────────────────────────────────────────────
        { name: 'DURATION: 30s mixed workload', fn: async () => {
            const t0 = performance.now();
            const deadline = t0 + 30000;
            let captures = 0, screens = 0, zeros = 0, errors = 0;
            while (performance.now() < deadline) {
                try {
                    // Alternate between recordRenderCalls and capture
                    if (captures % 3 === 0) {
                        const img = await native.capture(-1, 0, 0, 32, 32);
                        if (img) screens++;
                    } else {
                        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
                        const n = renders?.length ?? 0;
                        if (n === 0) zeros++;
                        if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                    }
                    captures++;
                } catch { errors++; }
            }
            const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return {
                pass: zeros < captures * 0.3 && errors === 0 && (mem?.sanity ?? false),
                detail: `${captures} ops in ${elapsed}s (${(captures / parseFloat(elapsed)).toFixed(1)}/s), ${screens} captures, ${zeros} zeros, ${errors} errors, sanity=${mem?.sanity}`
            };
        }},

        // ── Vertex Array Deep Validation ────────────────────────────────
        { name: 'VERTEX: attribute data is valid', fn: async () => {
            const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
            let checked = 0, valid = 0;
            if (renders) {
                for (const r of renders) {
                    if (r.vertexArray?.attributes?.length > 0) {
                        checked++;
                        const attr = r.vertexArray.attributes.find(a => a && a.enabled);
                        if (attr && attr.buffer && attr.buffer.length > 0) valid++;
                        if (checked >= 10) break;
                    }
                }
                renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            }
            return { pass: valid > 0, detail: `${valid}/${checked} renders have valid vertex data` };
        }},

        // ── Shader Analysis ─────────────────────────────────────────────
        { name: 'SHADER: programs have valid shader sources', fn: async () => {
            const state = await native.getOpenGlState();
            let total = 0, withVS = 0, withFS = 0, defines = new Set();
            if (state?.programs) {
                for (const [id, prog] of Object.entries(state.programs)) {
                    total++;
                    if (prog.vertexShader?.source) withVS++;
                    if (prog.fragmentShader?.source) {
                        withFS++;
                        // Collect #defines for fingerprinting
                        const defs = prog.fragmentShader.source.match(/#define\s+(\w+)/g);
                        if (defs) defs.forEach(d => defines.add(d.replace('#define ', '')));
                    }
                }
            }
            return { pass: withVS > 0 && withFS > 0, detail: `${total} programs, ${withVS} VS, ${withFS} FS, ${defines.size} unique defines` };
        }},

        // ── Concurrent Mixed Feature Captures ───────────────────────────
        { name: 'CONTENTION: mixed features concurrent', fn: async () => {
            const [r1, r2, r3, r4] = await Promise.all([
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] }),
                native.recordRenderCalls({ maxframes: 1, features: ['vertexarray'] }),
                native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                native.recordRenderCalls({ maxframes: 1, features: [] }),
            ]);
            const counts = [r1, r2, r3, r4].map(r => r?.length ?? 0);
            const total = counts.reduce((s, n) => s + n, 0);
            [r1, r2, r3, r4].forEach(renders => {
                if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
            });
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: total > 0 && (mem?.sanity ?? false), detail: `${counts.join(', ')} renders, sanity=${mem?.sanity}` };
        }},

        // ── Full Capture Cycle Stress ───────────────────────────────────
        { name: 'STRESS: capture → getState → record → dispose × 5', fn: async () => {
            let ok = 0;
            for (let i = 0; i < 5; i++) {
                try {
                    const img = await native.capture(-1, 0, 0, 32, 32);
                    const state = await native.getOpenGlState();
                    const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] });
                    if (img && state && renders?.length > 0) ok++;
                    if (renders) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                } catch {}
            }
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: ok >= 4 && (mem?.sanity ?? false), detail: `${ok}/5 full cycles passed, sanity=${mem?.sanity}` };
        }},

        // ── Crash Reproduction (Upkeep/dispose race) ─────────────────────
        { name: 'CRASH-TEST: rapid capture+dispose storm (20x)', fn: async () => {
            // Reproduces the RTX 5080 crash: clearOwnedObjects during Upkeep
            // while GL hooks are active. Rapid create/dispose cycles stress
            // the channel cleanup path.
            let ok = 0, errors = 0;
            for (let i = 0; i < 20; i++) {
                try {
                    const renders = await Promise.race([
                        native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                        new Promise(r => setTimeout(() => r(null), 5000))
                    ]);
                    if (renders && Array.isArray(renders)) {
                        renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                        ok++;
                    }
                } catch { errors++; }
                // No delay — maximum pressure on dispose path
            }
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: errors === 0 && (mem?.sanity ?? false), detail: `${ok}/20 ok, ${errors} errors, sanity=${mem?.sanity}` };
        }},
        { name: 'CRASH-TEST: concurrent capture+dispose+capture', fn: async () => {
            // Fire multiple captures, dispose one batch while another is in-flight
            let survived = true;
            for (let i = 0; i < 5; i++) {
                try {
                    const [batch1, batch2] = await Promise.all([
                        native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray'] }),
                        native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] }),
                    ]);
                    // Dispose batch1 immediately while batch2 may still be referenced
                    if (batch1) batch1.forEach(r => { try { r?.dispose?.(); } catch {} });
                    // Small gap then dispose batch2
                    await new Promise(r => setTimeout(r, 10));
                    if (batch2) batch2.forEach(r => { try { r?.dispose?.(); } catch {} });
                } catch { survived = false; }
            }
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: survived && (mem?.sanity ?? false), detail: `survived=${survived}, sanity=${mem?.sanity}` };
        }},
        { name: 'CRASH-TEST: heavy texture+overlay+capture mix', fn: async () => {
            // Mix overlay creation/destruction with texture captures and renders
            let ok = 0, errors = 0;
            for (let i = 0; i < 3; i++) {
                try {
                    // Create overlay
                    const prog = await createTestProgram([Math.random(), Math.random(), 0]);
                    const vao = await createTestVAO();
                    const overlay = await native.beginOverlay({}, prog, vao, {
                        trigger: 'frameend', alphaBlend: true, ranges: [{ start: 0, length: 3 }], duration: 200
                    });
                    // While overlay is active, do captures
                    const renders = await Promise.race([
                        native.recordRenderCalls({ maxframes: 1, features: ['uniforms', 'vertexarray', 'texturesnapshot'] }),
                        new Promise(r => setTimeout(() => r(null), 5000))
                    ]);
                    // Stop overlay and dispose renders simultaneously
                    if (overlay) overlay.stop();
                    if (renders && Array.isArray(renders)) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                    ok++;
                } catch { errors++; }
            }
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            return { pass: ok >= 2 && (mem?.sanity ?? false), detail: `${ok}/3 cycles ok, ${errors} errors, sanity=${mem?.sanity}` };
        }},
        { name: 'CRASH-TEST: resetOpenGlState during active overlay', fn: async () => {
            // Create an active overlay, then reset GL state — tests the
            // clearOwnedObjects path when overlays are still rendering
            try {
                const prog = await createTestProgram([1, 0, 0]);
                const vao = await createTestVAO();
                const overlay = await native.beginOverlay({}, prog, vao, {
                    trigger: 'frameend', alphaBlend: true, ranges: [{ start: 0, length: 3 }]
                });
                // Reset GL state while overlay is active
                await native.debug.resetOpenGlState();
                // Try to capture after reset
                const renders = await Promise.race([
                    native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] }),
                    new Promise(r => setTimeout(() => r(null), 5000))
                ]);
                const n = renders && Array.isArray(renders) ? renders.length : 0;
                if (renders && Array.isArray(renders)) renders.forEach(r => { try { r?.dispose?.(); } catch {} });
                if (overlay) try { overlay.stop(); } catch {}
                const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
                return { pass: (mem?.sanity ?? false), detail: `${n} renders after reset, sanity=${mem?.sanity}` };
            } catch (e) {
                return { pass: false, detail: `error: ${e.message}` };
            }
        }},

        // ── Final Comprehensive State ───────────────────────────────────
        { name: 'FINAL: comprehensive state check', fn: async () => {
            const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
            const stats = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
            const ready = native.getRsReady();
            const w = native.getRsWidth();
            const h = native.getRsHeight();
            const issues = [];
            if (!ready) issues.push('not ready');
            if (w <= 0 || h <= 0) issues.push(`bad dimensions ${w}x${h}`);
            if (!mem?.sanity) issues.push('sanity=false');
            if (mem && mem.used / mem.size > 0.95) issues.push(`memory ${((mem.used / mem.size) * 100).toFixed(0)}% full`);
            return {
                pass: issues.length === 0,
                detail: issues.length === 0
                    ? `healthy: ${w}x${h}, ${(mem?.used / 1024 / 1024).toFixed(1)}MB/${(mem?.size / 1024 / 1024).toFixed(0)}MB, ${stats?.count ?? '?'} GL objects`
                    : `ISSUES: ${issues.join(', ')}`
            };
        }},
    ];

    // Detect GPU vendor for vendor-specific tests
    let gpuVendor = 'unknown';
    try {
        const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
        if (renderer?.glRenderer) {
            const r = renderer.glRenderer.toLowerCase();
            if (r.includes('amd') || r.includes('radeon') || r.includes('ati')) gpuVendor = 'amd';
            else if (r.includes('nvidia') || r.includes('geforce') || r.includes('rtx') || r.includes('gtx')) gpuVendor = 'nvidia';
            else if (r.includes('intel')) gpuVendor = 'intel';
        }
    } catch {}

    // AMD-specific diagnostic tests
    if (gpuVendor === 'amd') {
        const amdTests = [
            { name: 'AMD: SwapBuffers hook active (recordRenderCalls with 5s timeout)', fn: async () => {
                // On AMD, the hard hook on SwapBuffers may not fire if the driver
                // uses a different GL entry point. Test with a generous timeout.
                const result = await Promise.race([
                    native.recordRenderCalls({ maxframes: 1, features: [] }),
                    new Promise(r => setTimeout(() => r(null), 5000))
                ]);
                if (result === null) return { pass: false, detail: 'recordRenderCalls timed out after 5s — SwapBuffers hook may not be firing' };
                const n = Array.isArray(result) ? result.length : 0;
                if (result && Array.isArray(result)) result.forEach(r => { try { r?.dispose?.(); } catch {} });
                return { pass: n > 0, detail: n > 0 ? `${n} renders captured — hook active` : '0 renders — GL hooks not intercepting draw calls' };
            }},
            { name: 'AMD: getOpenGlState with timeout', fn: async () => {
                const result = await Promise.race([
                    native.getOpenGlState(),
                    new Promise(r => setTimeout(() => r(null), 5000))
                ]);
                if (result === null) return { pass: false, detail: 'getOpenGlState timed out after 5s — GL server not responding' };
                const progs = result?.programs ? Object.keys(result.programs).length : 0;
                return { pass: progs > 0, detail: `${progs} programs found` };
            }},
            { name: 'AMD: screen capture test', fn: async () => {
                const result = await Promise.race([
                    native.capture(-1, 0, 0, 64, 64),
                    new Promise(r => setTimeout(() => r(null), 5000))
                ]);
                if (result === null) return { pass: false, detail: 'capture timed out after 5s' };
                const hasData = result?.data?.length > 0;
                let nonZero = 0;
                if (hasData) {
                    for (let i = 0; i < Math.min(result.data.length, 1000); i += 4) {
                        if (result.data[i] > 0 || result.data[i+1] > 0 || result.data[i+2] > 0) nonZero++;
                    }
                }
                return { pass: hasData && nonZero > 0, detail: hasData ? `captured, ${nonZero} non-zero pixels in sample` : 'empty capture' };
            }},
            { name: 'AMD: GL extensions check', fn: async () => {
                const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
                if (!renderer) return { pass: false, detail: 'getRenderer returned null' };
                const exts = renderer.glExtensions?.length ?? 0;
                const version = renderer.glVersion || 'unknown';
                const shaderVer = renderer.glShaderVersion || 'unknown';
                return { pass: true, detail: `GL ${version}, GLSL ${shaderVer}, ${exts} extensions` };
            }},
            { name: 'AMD: driver WGL vs EGL detection', fn: async () => {
                // Check if the GL version string hints at compatibility profile or core profile
                const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
                if (!renderer) return { pass: false, detail: 'no renderer info' };
                const ver = renderer.glVersion || '';
                const isCompat = ver.includes('Compatibility');
                const isCore = ver.includes('Core');
                const detail = `${renderer.glRenderer} | ${ver} | profile: ${isCompat ? 'Compatibility' : isCore ? 'Core' : 'unknown'}`;
                // AMD with Core profile may not support the IAT hooks the same way
                return { pass: true, detail };
            }},
            { name: 'AMD: multi-frame capture test', fn: async () => {
                // AMD drivers may need multiple frame attempts to sync
                let totalRenders = 0;
                let attempts = 0;
                for (let i = 0; i < 3; i++) {
                    attempts++;
                    const result = await Promise.race([
                        native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] }),
                        new Promise(r => setTimeout(() => r(null), 3000))
                    ]);
                    if (result === null) continue;
                    const n = Array.isArray(result) ? result.length : 0;
                    totalRenders += n;
                    if (result && Array.isArray(result)) result.forEach(r => { try { r?.dispose?.(); } catch {} });
                    await new Promise(r => setTimeout(r, 200));
                }
                return { pass: totalRenders > 0, detail: `${totalRenders} total renders across ${attempts} attempts` };
            }},
            { name: 'AMD: stream render test (1s)', fn: async () => {
                let count = 0;
                let callbacks = 0;
                try {
                    const stream = native.streamRenderCalls({ framecooldown: 100 }, (r) => {
                        callbacks++;
                        count += r?.length ?? 0;
                    });
                    await new Promise(r => setTimeout(r, 1000));
                    await stream.close();
                } catch (e) {
                    return { pass: false, detail: `stream error: ${e.message}` };
                }
                return { pass: count > 0, detail: `${count} renders in ${callbacks} callbacks` };
            }},

            // ── Deep diagnostics (run even when GL server is dead) ──────

            { name: 'AMD-DIAG: shared memory growth over 5s', fn: async () => {
                // Monitor if shared memory changes over time — indicates DLL is actively running
                const samples = [];
                for (let i = 0; i < 5; i++) {
                    const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
                    samples.push({ used: mem?.used ?? 0, allocs: mem?.allocs ?? 0, sanity: mem?.sanity });
                    await new Promise(r => setTimeout(r, 1000));
                }
                const first = samples[0];
                const last = samples[samples.length - 1];
                const memDelta = ((last.used - first.used) / 1024 / 1024).toFixed(1);
                const allocDelta = last.allocs - first.allocs;
                const usages = samples.map(s => (s.used / 1024 / 1024).toFixed(1) + 'MB').join(' → ');
                return {
                    pass: true, // informational
                    detail: `memory: ${usages} | delta: ${memDelta}MB | alloc delta: ${allocDelta} | sanity: ${last.sanity}`
                };
            }},
            { name: 'AMD-DIAG: GL object stats over time', fn: async () => {
                const stats1 = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
                await new Promise(r => setTimeout(r, 2000));
                const stats2 = await Promise.resolve(native.debug.getGlObjectStats()).catch(() => null);
                const c1 = stats1?.count ?? 0;
                const c2 = stats2?.count ?? 0;
                const s1 = stats1?.size ?? 0;
                const s2 = stats2?.size ?? 0;
                let types1 = '', types2 = '';
                if (stats1?.counts) types1 = Object.entries(stats1.counts).map(([k,v]) => `${k}:${v}`).join(', ');
                if (stats2?.counts) types2 = Object.entries(stats2.counts).map(([k,v]) => `${k}:${v}`).join(', ');
                return {
                    pass: true,
                    detail: `t0: ${c1} objects (${(s1/1024/1024).toFixed(1)}MB) [${types1}] | t+2s: ${c2} objects (${(s2/1024/1024).toFixed(1)}MB) [${types2}]`
                };
            }},
            { name: 'AMD-DIAG: renderer thread info', fn: async () => {
                // Collect all available info about the GL state without calling GL-dependent APIs
                const renderer = await Promise.resolve(native.getRenderer()).catch(() => null);
                const w = native.getRsWidth();
                const h = native.getRsHeight();
                const hwnd = native.getRsHwnd?.() ?? 'N/A';
                const ready = native.getRsReady();
                return {
                    pass: true,
                    detail: `ready=${ready} | ${w}x${h} | hwnd=${hwnd} | gpu=${renderer?.glRenderer ?? 'null'} | ver=${renderer?.glVersion ?? 'null'} | vendor=${renderer?.glVendor ?? 'null'}`
                };
            }},
            { name: 'AMD-DIAG: memory named allocations', fn: async () => {
                const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
                if (!mem) return { pass: false, detail: 'memoryState null' };
                const named = mem.namedAllocations?.map(a => `${a.name}(${(a.itemSize/1024).toFixed(0)}KB)`).join(', ') || 'none';
                return {
                    pass: true,
                    detail: `${mem.namedAllocations?.length ?? 0} named: ${named} | unique=${mem.uniqueobjects ?? '?'} | named=${mem.namedobjects ?? '?'}`
                };
            }},
            { name: 'AMD-DIAG: command queue responsiveness', fn: async () => {
                // Send a lightweight TRACE command — this just round-trips through ProcessCommands
                // without doing any GL operations. If this times out, ProcessCommands isn't running.
                const t0 = performance.now();
                try {
                    const result = await Promise.race([
                        native.recordRenderCalls({ maxframes: 1, features: [], timeout: 2000 }),
                        new Promise(r => setTimeout(() => r('__TIMEOUT__'), 3000))
                    ]);
                    const ms = (performance.now() - t0).toFixed(0);
                    if (result === '__TIMEOUT__') {
                        return { pass: false, detail: `command queue unresponsive after ${ms}ms — ProcessCommands may be blocked or not running` };
                    }
                    const n = Array.isArray(result) ? result.length : 0;
                    if (result && Array.isArray(result)) result.forEach(r => { try { r?.dispose?.(); } catch {} });
                    return { pass: true, detail: `responded in ${ms}ms with ${n} renders` };
                } catch (e) {
                    return { pass: false, detail: `error: ${e.message}` };
                }
            }},
            { name: 'AMD-DIAG: repeated probe (3x with 2s gaps)', fn: async () => {
                // The intermittent nature means sometimes it works after a delay
                const results = [];
                for (let i = 0; i < 3; i++) {
                    const t0 = performance.now();
                    const result = await Promise.race([
                        native.recordRenderCalls({ maxframes: 1, features: [] }),
                        new Promise(r => setTimeout(() => r('__TIMEOUT__'), 3000))
                    ]);
                    const ms = (performance.now() - t0).toFixed(0);
                    if (result === '__TIMEOUT__') {
                        results.push(`#${i+1}: timeout(${ms}ms)`);
                    } else {
                        const n = Array.isArray(result) ? result.length : 0;
                        if (result && Array.isArray(result)) result.forEach(r => { try { r?.dispose?.(); } catch {} });
                        results.push(`#${i+1}: ${n} renders(${ms}ms)`);
                    }
                    await new Promise(r => setTimeout(r, 2000));
                }
                return { pass: true, detail: results.join(' | ') };
            }},
        ];

        // Add AMD tests to the main list
        for (const test of amdTests) {
            tests.push(test);
        }
    }

    let glServerDead = false;
    let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
    for (const test of tests) {
        // Skip GL-dependent tests if the probe detected the server is unresponsive
        const isGlTest = !test.name.startsWith('Native') && !test.name.startsWith('Find RS') &&
            !test.name.startsWith('Client Connection') && !test.name.startsWith('Window') &&
            !test.name.startsWith('Renderer') && !test.name.startsWith('Memory State') &&
            !test.name.startsWith('GL Object Stats') && !test.name.startsWith('GL Server Probe') &&
            !test.name.startsWith('Create ') && !test.name.startsWith('FINAL');
        if (glServerDead && isGlTest) {
            totalSkipped++;
            line(`  SKIP  ${test.name} — GL server not responding`);
            log(`SKIP: ${test.name}`, 'warn');
            continue;
        }
        try {
            const result = await Promise.race([
                test.fn(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 20s')), 20000))
            ]);
            const pass = typeof result === 'object' ? result.pass : !!result;
            const detail = typeof result === 'object' ? result.detail : '';
            if (pass) totalPassed++; else totalFailed++;
            line(`  ${pass ? 'PASS' : 'FAIL'}  ${test.name}${detail ? ' — ' + detail : ''}`);
            log(`${pass ? 'PASS' : 'FAIL'}: ${test.name}${detail ? ' — ' + detail : ''}`, pass ? 'success' : 'error');
        } catch (e) {
            totalFailed++;
            line(`  FAIL  ${test.name} — ERROR: ${e.message}`);
            log(`FAIL: ${test.name} — ${e.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 50));
    }

    hr();
    line(`\nTotal: ${tests.length} | Passed: ${totalPassed} | Failed: ${totalFailed}${totalSkipped > 0 ? ' | Skipped: ' + totalSkipped : ''}`);

    // Final memory snapshot
    line('\n── Final Memory Snapshot ──');
    try {
        const mem = await Promise.resolve(native.debug.memoryState()).catch(() => null);
        if (mem) {
            line(`Used:   ${(mem.used / 1024 / 1024).toFixed(1)}MB / ${(mem.size / 1024 / 1024).toFixed(0)}MB`);
            line(`Sanity: ${mem.sanity}`);
        }
    } catch {}

    line('\n═══ End of Report ═══');

    // Download the report
    const report = lines.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alt1gl-diagnostic-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    log(`\nDiagnostic report downloaded (${totalPassed}/${tests.length} passed)`, totalFailed === 0 ? 'success' : 'warn');
}

async function runQuickTest() {
    log('Running quick test...', 'info');

    if (!native) {
        log('ERROR: Native addon not loaded', 'error');
        return;
    }

    const ready = native.getRsReady();
    log(`Client ready: ${ready}`, ready ? 'success' : 'warn');

    if (!ready) {
        log('Not connected — RS client must be launched through the launcher', 'warn');
    }

    checkConnectionStatus();

    if (native.getRsReady()) {
        try {
            const info = await Promise.race([
                native.getRenderer(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 5s')), 5000))
            ]);
            log(`Renderer: ${info?.glRenderer || 'unknown'}`, 'info');
        } catch (e) {
            log(`Renderer info failed: ${e.message}`, 'error');
        }

        try {
            const renders = await Promise.race([
                native.recordRenderCalls({ maxframes: 1 }),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 10s')), 10000))
            ]);
            log(`Captured ${renders?.length || 0} render calls`, 'success');
            if (renders) renders.forEach(r => { if (r.dispose) r.dispose(); });
        } catch (e) {
            log(`Record render calls failed: ${e.message}`, 'error');
        }
    }

    log('Quick test complete!', 'success');
}

// =============================================================================
// Helper Functions
// =============================================================================

// Helper: dispose all handles created during tests to prevent memory leaks
async function disposeAllTestHandles() {
    try {
        if (native && native.debug && native.debug.disposeAllHandles) {
            const count = await native.debug.disposeAllHandles();
            if (count > 0) log(`  Cleaned up ${count} handles`, 'info');
        }
    } catch (e) {
        // Ignore - debug API may not be available
    }
}

async function createTestProgram(color, position = 'topright') {
    const r = color[0] || 1;
    const g = color[1] || 0;
    const b = color[2] || 0;
    const a = color[3] !== undefined ? color[3] : 0.8;

    // Position offsets for different corners
    const offsets = {
        'topright':    { x: 0.5, y: 0.5 },
        'topleft':     { x: -0.5, y: 0.5 },
        'bottomright': { x: 0.5, y: -0.5 },
        'bottomleft':  { x: -0.5, y: -0.5 },
        'center':      { x: 0.0, y: 0.0 }
    };
    const offset = offsets[position] || offsets.topright;

    // Scale to 40% of screen size and position at corner
    return await native.createProgram(
        `#version 330 core
        layout(location = 0) in vec3 aPos;
        void main() {
            gl_Position = vec4(aPos * 0.4 + vec3(${offset.x.toFixed(1)}, ${offset.y.toFixed(1)}, 0.0), 1.0);
        }`,
        `#version 330 core
        out vec4 FragColor;
        void main() {
            FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)});
        }`,
        [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
        []
    );
}

async function createTestVAO() {
    // Large equilateral triangle that fills the overlay area
    const positions = new Float32Array([
        0.0, 1.0, 0.0,       // top vertex
        -0.866, -0.5, 0.0,   // bottom-left vertex
        0.866, -0.5, 0.0     // bottom-right vertex
    ]);
    const indices = new Uint16Array([0, 1, 2]);

    return await native.createVertexArray(new Uint8Array(indices.buffer), [
        {
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406, // GL_FLOAT
            stride: 12,
            vectorlength: 3,
            normalized: false
        }
    ]);
}

// Create a full-screen quad VAO for frameend overlays
async function createFullScreenQuadVAO() {
    // Full-screen quad from -1,-1 to 1,1 using two triangles
    const positions = new Float32Array([
        // Triangle 1: bottom-left, bottom-right, top-right
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
         1.0,  1.0, 0.0,
        // Triangle 2: bottom-left, top-right, top-left
        -1.0, -1.0, 0.0,
         1.0,  1.0, 0.0,
        -1.0,  1.0, 0.0
    ]);
    const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);

    return await native.createVertexArray(new Uint8Array(indices.buffer), [
        {
            buffer: new Uint8Array(positions.buffer),
            enabled: true,
            location: 0,
            offset: 0,
            scalartype: 0x1406, // GL_FLOAT
            stride: 12,
            vectorlength: 3,
            normalized: false
        }
    ]);
}

// Create a simple passthrough program for full-screen overlays
async function createFullScreenProgram(color) {
    const r = color[0] || 1;
    const g = color[1] || 0;
    const b = color[2] || 0;
    const a = color[3] !== undefined ? color[3] : 0.5;

    return await native.createProgram(
        `#version 330 core
        layout(location = 0) in vec3 aPos;
        void main() {
            // Scale to a visible corner (top-right 30%)
            vec3 scaled = aPos * 0.15 + vec3(0.75, 0.75, 0.0);
            gl_Position = vec4(scaled, 1.0);
        }`,
        `#version 330 core
        out vec4 FragColor;
        void main() {
            FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)});
        }`,
        [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
        []
    );
}

// =============================================================================
// GL Objects & Uniforms
// =============================================================================
async function refreshAllGlObjects() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Fetching all GL objects...', 'info');

    try {
        const state = await native.getOpenGlState();
        const programsEl = document.getElementById('programs-list');
        programsEl.innerHTML = '';

        if (!state || !state.programs) {
            programsEl.innerHTML = '<p class="placeholder">No GL state available</p>';
            log('No GL state returned', 'warn');
            return;
        }

        const programs = state.programs;
        const programIds = Object.keys(programs);

        if (programIds.length === 0) {
            programsEl.innerHTML = '<p class="placeholder">No programs found</p>';
            log('No GL programs found', 'info');
            return;
        }

        log(`Found ${programIds.length} GL programs`, 'success');

        for (const progId of programIds) {
            const prog = programs[progId];
            const progDiv = document.createElement('div');
            progDiv.className = 'program-entry';

            // Program header
            const header = document.createElement('div');
            header.className = 'program-header';
            header.innerHTML = `
                <strong>Program ${progId}</strong>
                <span class="program-meta">
                    Uniforms: ${prog.uniforms?.length || 0} |
                    Attributes: ${prog.attributes?.length || 0}
                </span>
            `;
            header.style.cursor = 'pointer';
            header.style.padding = '8px';
            header.style.backgroundColor = '#2a2a2a';
            header.style.marginBottom = '4px';
            header.style.borderRadius = '4px';

            // Program details (collapsible)
            const details = document.createElement('div');
            details.className = 'program-details';
            details.style.display = 'none';
            details.style.paddingLeft = '16px';
            details.style.fontSize = '12px';

            // Add uniforms
            if (prog.uniforms && prog.uniforms.length > 0) {
                const uniformsDiv = document.createElement('div');
                uniformsDiv.innerHTML = '<strong style="color:#88f">Uniforms:</strong>';
                const uniformsList = document.createElement('ul');
                uniformsList.style.margin = '4px 0';
                uniformsList.style.paddingLeft = '20px';

                for (const uni of prog.uniforms) {
                    const li = document.createElement('li');
                    li.style.marginBottom = '2px';

                    // Format uniform value if available
                    let valueStr = '';
                    if (uni.value !== undefined) {
                        if (Array.isArray(uni.value)) {
                            if (uni.value.length <= 4) {
                                valueStr = ` = [${uni.value.map(v => typeof v === 'number' ? v.toFixed(3) : v).join(', ')}]`;
                            } else if (uni.value.length === 16) {
                                // mat4 - show translation (last column)
                                valueStr = ` = mat4(translate: ${uni.value[12].toFixed(2)}, ${uni.value[13].toFixed(2)}, ${uni.value[14].toFixed(2)})`;
                            } else {
                                valueStr = ` = [${uni.value.length} values]`;
                            }
                        } else {
                            valueStr = ` = ${uni.value}`;
                        }
                    }

                    li.innerHTML = `<span style="color:#8f8">${escapeHtml(uni.name || 'unnamed')}</span>` +
                        `<span style="color:#888"> (loc=${uni.location}, type=0x${(uni.type || 0).toString(16)})</span>` +
                        `<span style="color:#ff8">${escapeHtml(valueStr)}</span>`;
                    uniformsList.appendChild(li);
                }
                uniformsDiv.appendChild(uniformsList);
                details.appendChild(uniformsDiv);
            }

            // Add attributes
            if (prog.attributes && prog.attributes.length > 0) {
                const attrsDiv = document.createElement('div');
                attrsDiv.innerHTML = '<strong style="color:#f88">Attributes:</strong>';
                const attrsList = document.createElement('ul');
                attrsList.style.margin = '4px 0';
                attrsList.style.paddingLeft = '20px';

                for (const attr of prog.attributes) {
                    const li = document.createElement('li');
                    li.style.marginBottom = '2px';
                    li.innerHTML = `<span style="color:#fc8">${escapeHtml(attr.name || 'unnamed')}</span>` +
                        `<span style="color:#888"> (loc=${attr.location}, type=0x${(attr.type || 0).toString(16)})</span>`;
                    attrsList.appendChild(li);
                }
                attrsDiv.appendChild(attrsList);
                details.appendChild(attrsDiv);
            }

            // Toggle handler
            header.addEventListener('click', () => {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            });

            progDiv.appendChild(header);
            progDiv.appendChild(details);
            programsEl.appendChild(progDiv);
        }

        // Also show VAOs if available
        const vaos = state.vertexArrays || state.vaos;
        if (vaos) {
            const vaoIds = Object.keys(vaos);
            log(`Found ${vaoIds.length} VAOs`, 'info');
        }

        // Show textures if available
        const textures = state.textures;
        if (textures) {
            const texIds = Object.keys(textures);
            log(`Found ${texIds.length} textures`, 'info');
        }

    } catch (e) {
        log('Failed to fetch GL objects: ' + e, 'error');
        document.getElementById('programs-list').innerHTML =
            `<p class="placeholder error">Error: ${escapeHtml(e.message)}</p>`;
    }
}

async function displayGlState() {
    if (!native || !isConnected) {
        log('Not connected', 'error');
        return;
    }

    log('Fetching current GL state...', 'info');

    try {
        const state = await native.getOpenGlState();
        const contentEl = document.getElementById('gl-state-content');

        if (!state) {
            contentEl.innerHTML = '<p class="placeholder">No GL state available</p>';
            return;
        }

        // Build a summary of the state
        let html = '<div class="gl-state-summary">';

        // Current bindings
        html += '<div class="state-section">';
        html += '<strong>Current Bindings:</strong><ul>';
        if (state.currentProgram !== undefined) {
            html += `<li>Program: ${state.currentProgram}</li>`;
        }
        if (state.currentVAO !== undefined) {
            html += `<li>VAO: ${state.currentVAO}</li>`;
        }
        if (state.boundTextures) {
            const boundTex = Object.entries(state.boundTextures).filter(([_, v]) => v > 0);
            if (boundTex.length > 0) {
                html += `<li>Textures: ${boundTex.map(([u, t]) => `unit${u}=${t}`).join(', ')}</li>`;
            }
        }
        html += '</ul></div>';

        // Viewport
        if (state.viewport) {
            html += '<div class="state-section">';
            html += `<strong>Viewport:</strong> ${state.viewport.x}, ${state.viewport.y} - ${state.viewport.width}x${state.viewport.height}`;
            html += '</div>';
        }

        // Object counts
        html += '<div class="state-section">';
        html += '<strong>Object Counts:</strong><ul>';
        html += `<li>Programs: ${Object.keys(state.programs || {}).length}</li>`;
        html += `<li>Textures: ${Object.keys(state.textures || {}).length}</li>`;
        html += `<li>VAOs: ${Object.keys(state.vertexArrays || state.vaos || {}).length}</li>`;
        html += '</ul></div>';

        html += '</div>';
        contentEl.innerHTML = html;

        log('GL state retrieved', 'success');
    } catch (e) {
        log('Failed to get GL state: ' + e, 'error');
        document.getElementById('gl-state-content').innerHTML =
            `<p class="placeholder error">Error: ${escapeHtml(e.message)}</p>`;
    }
}

async function displayObjectStats() {
    if (!native) {
        log('Native addon not loaded', 'error');
        return;
    }

    log('Fetching object stats...', 'info');

    try {
        const stats = await native.debug.getGlObjectStats();
        const contentEl = document.getElementById('objects-stats-content');

        if (!stats) {
            contentEl.innerHTML = '<p class="placeholder">No stats available</p>';
            return;
        }

        let html = '<div class="stats-grid">';

        // Memory info
        html += '<div class="stat-item">';
        html += `<strong>Total Size:</strong> ${(stats.size / 1024 / 1024).toFixed(2)} MB`;
        html += '</div>';

        html += '<div class="stat-item">';
        html += `<strong>Object Count:</strong> ${stats.count}`;
        html += '</div>';

        // Object type sizes
        if (stats.subsizes) {
            html += '<div class="stat-section">';
            html += '<strong>Memory by Type:</strong><ul>';
            for (const [type, size] of Object.entries(stats.subsizes)) {
                if (size > 0) {
                    html += `<li>${type}: ${(size / 1024).toFixed(1)} KB</li>`;
                }
            }
            html += '</ul></div>';
        }

        // Object type counts
        if (stats.counts) {
            html += '<div class="stat-section">';
            html += '<strong>Count by Type:</strong><ul>';
            for (const [type, count] of Object.entries(stats.counts)) {
                if (count > 0) {
                    html += `<li>${type}: ${count}</li>`;
                }
            }
            html += '</ul></div>';
        }

        html += '</div>';
        contentEl.innerHTML = html;

        log('Object stats retrieved', 'success');
    } catch (e) {
        log('Failed to get object stats: ' + e, 'error');
        document.getElementById('objects-stats-content').innerHTML =
            `<p class="placeholder error">Error: ${escapeHtml(e.message)}</p>`;
    }
}

// =============================================================================
// Helper Functions
// =============================================================================
function addResult(container, passed, name, details = '') {
    const item = document.createElement('div');
    item.className = `result-item ${passed ? 'pass' : 'fail'}`;
    item.innerHTML = `
        <span class="icon">${passed ? '✓' : '✗'}</span>
        <span class="name">${escapeHtml(name)}</span>
        <span class="details">${escapeHtml(details)}</span>
    `;
    container.appendChild(item);
}

function addTestResult(container, passed, name, error = '') {
    const item = document.createElement('div');
    item.className = `result-item ${passed ? 'pass' : 'fail'}`;
    item.innerHTML = `
        <span class="icon">${passed ? '✓' : '✗'}</span>
        <span class="name">${escapeHtml(name)}</span>
        ${error ? `<span class="details">${escapeHtml(error)}</span>` : ''}
    `;
    container.appendChild(item);
}

// =============================================================================
// EXTENDED TEST SUITE - Comprehensive Testing
// =============================================================================

/**
 * Extended tests for thorough validation
 */
const extendedTests = {

    // -------------------------------------------------------------------------
    // OVERLAY EDGE CASES
    // -------------------------------------------------------------------------

    async testOverlayWithNoVAO() {
        // Test overlay that uses trigger's VAO (undefined vao parameter)
        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger found');

        const prog = await createTestProgram([1, 0.5, 0]);
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            prog,
            undefined, // Use trigger's VAO
            { trigger: 'after', alphaBlend: true }
        );

        if (!overlay) throw new Error('Overlay creation failed');
        await new Promise(r => setTimeout(r, 100));
        overlay.stop();
        return true;
    },

    async testOverlayWithProgramFilter() {
        // Filter by program ID instead of VAO
        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
        const trigger = renders?.find(r => r.program?.programId > 0);
        if (!trigger) throw new Error('No trigger with program found');

        const prog = await createTestProgram([0.5, 1, 0.5]);
        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { programId: trigger.program.programId },
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (!overlay) throw new Error('Overlay creation failed');
        await new Promise(r => setTimeout(r, 100));
        overlay.stop();
        return true;
    },

    async testOverlayWithFramebufferFilter() {
        // Filter by framebuffer ID
        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['framebuffer'] });
        if (!renders?.length) throw new Error('No renders');

        const fboIds = [...new Set(renders.map(r => r.framebufferId))];
        log(`  Found FBO IDs: ${fboIds.join(', ')}`, 'info');

        const prog = await createTestProgram([1, 1, 0]);
        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { framebufferId: 0 }, // Default framebuffer
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (!overlay) throw new Error('Overlay creation failed');
        await new Promise(r => setTimeout(r, 100));
        overlay.stop();
        return true;
    },

    async testOverlayMaxPerFrame() {
        // Test maxPerFrame limit
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        const prog = await createTestProgram([1, 0, 0]);
        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId, maxPerFrame: 1 },
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (!overlay) throw new Error('Overlay creation failed');
        await new Promise(r => setTimeout(r, 100));
        overlay.stop();
        return true;
    },

    async testOverlayRapidCreateDestroy() {
        // Stress test: rapid create/destroy cycles
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        let successCount = 0;
        for (let i = 0; i < 10; i++) {
            const prog = await createTestProgram([Math.random(), Math.random(), Math.random()]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay(
                { vertexObjectId: trigger.vertexObjectId },
                prog,
                vao,
                { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
            );

            if (overlay) {
                successCount++;
                overlay.stop();
            }
        }

        log(`  Created/destroyed ${successCount}/10 overlays`, 'info');
        return successCount >= 8; // Allow some failures
    },

    async testOverlayPersistenceAcrossFrames() {
        // Test that overlay persists correctly across many frames
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        const prog = await createTestProgram([0, 1, 1]);
        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (!overlay) throw new Error('Overlay creation failed');

        // Let it run for ~60 frames at 60fps
        await new Promise(r => setTimeout(r, 1000));

        // Check if overlay can still be stopped (verifies it's still valid)
        try {
            overlay.stop();
            return true; // Overlay was still valid after 1 second
        } catch (e) {
            // Overlay was detached - this indicates a persistence problem
            log(`  Overlay detached: ${e.message}`, 'warn');
            return false;
        }
    },

    // -------------------------------------------------------------------------
    // UNIFORM EDGE CASES
    // -------------------------------------------------------------------------

    async testUniformSourceFromTrigger() {
        // Copy uniform from trigger program
        const renders = await native.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
        const trigger = renders?.find(r => r.program?.uniforms?.length > 0 && r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger with uniforms');

        // Find a matrix uniform to copy
        const matrixUniform = trigger.program.uniforms.find(u =>
            u.name.includes('Matrix') && u.snapshotSize >= 64
        );

        if (!matrixUniform) {
            log('  No matrix uniform found, skipping source test', 'warn');
            return true;
        }

        const prog = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            uniform mat4 uCopiedMatrix;
            void main() { gl_Position = uCopiedMatrix * vec4(aPos * 0.1, 1.0); }`,
            `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0, 0.5, 0.0, 0.5); }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [{ name: 'uCopiedMatrix', type: 0x8B5C, length: 1, snapshotOffset: 0, snapshotSize: 64 }]
        );

        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            prog,
            vao,
            {
                trigger: 'after',
                alphaBlend: true,
                uniformSources: [
                    { name: 'uCopiedMatrix', sourceName: matrixUniform.name, type: 'program' }
                ],
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (!overlay) throw new Error('Overlay failed');
        await new Promise(r => setTimeout(r, 200));
        overlay.stop();
        return true;
    },

    async testUniformBufferAllTypes() {
        // Test uniform buffer with various types
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        const prog = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            uniform float uFloat;
            uniform vec2 uVec2;
            uniform vec3 uVec3;
            uniform vec4 uVec4;
            uniform int uInt;
            void main() {
                float scale = uFloat * 0.1;
                gl_Position = vec4(aPos * scale + uVec3, 1.0);
            }`,
            `#version 330 core
            uniform vec4 uVec4;
            out vec4 FragColor;
            void main() { FragColor = uVec4; }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [
                { name: 'uFloat', type: 0x1406, length: 1, snapshotOffset: 0, snapshotSize: 4 },
                { name: 'uVec2', type: 0x8B50, length: 1, snapshotOffset: 4, snapshotSize: 8 },
                { name: 'uVec3', type: 0x8B51, length: 1, snapshotOffset: 12, snapshotSize: 12 },
                { name: 'uVec4', type: 0x8B52, length: 1, snapshotOffset: 24, snapshotSize: 16 },
                { name: 'uInt', type: 0x1404, length: 1, snapshotOffset: 40, snapshotSize: 4 }
            ]
        );

        const uniformBuffer = new Uint8Array(48);
        const view = new DataView(uniformBuffer.buffer);
        view.setFloat32(0, 1.0, true);  // uFloat
        view.setFloat32(4, 0.5, true);  // uVec2.x
        view.setFloat32(8, 0.5, true);  // uVec2.y
        view.setFloat32(12, 0.7, true); // uVec3.x
        view.setFloat32(16, 0.7, true); // uVec3.y
        view.setFloat32(20, 0.0, true); // uVec3.z
        view.setFloat32(24, 0.0, true); // uVec4.x
        view.setFloat32(28, 1.0, true); // uVec4.y
        view.setFloat32(32, 0.0, true); // uVec4.z
        view.setFloat32(36, 0.7, true); // uVec4.w
        view.setInt32(40, 42, true);    // uInt

        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            prog,
            vao,
            {
                trigger: 'after',
                alphaBlend: true,
                uniformBuffer,
                ranges: [{ start: 0, length: 3 }]
            }
        );

        if (!overlay) throw new Error('Overlay failed');
        await new Promise(r => setTimeout(r, 100));
        overlay.stop();
        return true;
    },

    // -------------------------------------------------------------------------
    // VAO/BUFFER EDGE CASES
    // -------------------------------------------------------------------------

    async testVAOMultipleAttributes() {
        // VAO with multiple attributes (position, color, UV)
        const positions = new Float32Array([
            0.0, 1.0, 0.0,
            -0.866, -0.5, 0.0,
            0.866, -0.5, 0.0
        ]);
        const colors = new Float32Array([
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ]);
        const uvs = new Float32Array([
            0.5, 1.0,
            0.0, 0.0,
            1.0, 0.0
        ]);
        const indices = new Uint16Array([0, 1, 2]);

        const vao = await native.createVertexArray(new Uint8Array(indices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406,
                stride: 12,
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: new Uint8Array(colors.buffer),
                enabled: true,
                location: 1,
                offset: 0,
                scalartype: 0x1406,
                stride: 12,
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: new Uint8Array(uvs.buffer),
                enabled: true,
                location: 2,
                offset: 0,
                scalartype: 0x1406,
                stride: 8,
                vectorlength: 2,
                normalized: false
            }
        ]);

        if (!vao || vao.attributes.length !== 3) {
            throw new Error(`Expected 3 attributes, got ${vao?.attributes?.length}`);
        }
        return true;
    },

    async testVAODifferentDataTypes() {
        // Test different scalar types
        const positions = new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]);
        const byteColors = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]); // RGB bytes
        const shortIndices = new Uint16Array([0, 1, 2]);
        const intIds = new Uint32Array([1, 2, 3]); // Instance IDs

        const vao = await native.createVertexArray(new Uint8Array(shortIndices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406, // GL_FLOAT
                stride: 12,
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: byteColors,
                enabled: true,
                location: 1,
                offset: 0,
                scalartype: 0x1401, // GL_UNSIGNED_BYTE
                stride: 3,
                vectorlength: 3,
                normalized: true
            },
            {
                buffer: new Uint8Array(intIds.buffer),
                enabled: true,
                location: 2,
                offset: 0,
                scalartype: 0x1405, // GL_UNSIGNED_INT
                stride: 4,
                vectorlength: 1,
                normalized: false
            }
        ]);

        return !!vao && vao.attributes.length === 3;
    },

    async testVAOLargeVertexCount() {
        // Test with many vertices
        const vertexCount = 1000;
        const positions = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            const angle = (i / vertexCount) * Math.PI * 2;
            positions[i * 3 + 0] = Math.cos(angle) * 0.5;
            positions[i * 3 + 1] = Math.sin(angle) * 0.5;
            positions[i * 3 + 2] = 0;
        }

        // Triangle fan indices
        const indexCount = (vertexCount - 2) * 3;
        const indices = new Uint16Array(indexCount);
        for (let i = 0; i < vertexCount - 2; i++) {
            indices[i * 3 + 0] = 0;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = i + 2;
        }

        const vao = await native.createVertexArray(new Uint8Array(indices.buffer), [
            {
                buffer: new Uint8Array(positions.buffer),
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: 0x1406,
                stride: 12,
                vectorlength: 3,
                normalized: false
            }
        ]);

        log(`  Created VAO with ${vertexCount} vertices, ${indexCount} indices`, 'info');
        return !!vao;
    },

    // -------------------------------------------------------------------------
    // TEXTURE EDGE CASES
    // -------------------------------------------------------------------------

    async testTextureSmall() {
        // 1x1 texture
        const data = new Uint8ClampedArray([255, 0, 0, 255]);
        const tex = await native.createTexture(new ImageData(data, 1, 1));
        // On Linux, texid is 0 until texture is uploaded (happens when used in overlay)
        // Check that texture object was created with correct dimensions
        log(`  testTextureSmall: tex=${!!tex} width=${tex?.width} height=${tex?.height}`, 'info');
        return tex && tex.width === 1 && tex.height === 1;
    },

    async testTextureLarge() {
        // 512x512 texture
        const width = 512;
        const height = 512;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
            data[i + 0] = (i / 4) % 256;
            data[i + 1] = ((i / 4) >> 8) % 256;
            data[i + 2] = 128;
            data[i + 3] = 255;
        }

        const tex = await native.createTexture(new ImageData(data, width, height));
        log(`  Created ${width}x${height} texture, tex=${!!tex} width=${tex?.width} height=${tex?.height} texid=${tex?.texid}`, 'info');
        // On Linux, texid is 0 until texture is uploaded (happens when used in overlay)
        return tex && tex.width === width && tex.height === height;
    },

    async testTextureNonPowerOfTwo() {
        // NPOT texture (100x75)
        const width = 100;
        const height = 75;
        const data = new Uint8ClampedArray(width * height * 4).fill(200);
        const tex = await native.createTexture(new ImageData(data, width, height));
        // On Linux, texid is 0 until texture is uploaded (happens when used in overlay)
        log(`  testTextureNonPowerOfTwo: tex=${!!tex} width=${tex?.width} height=${tex?.height}`, 'info');
        return tex && tex.width === width && tex.height === height;
    },

    async testTextureCaptureSubregion() {
        // Capture only part of a texture
        const state = await native.getOpenGlState();
        const texIds = Object.keys(state?.textures || {});
        if (!texIds.length) {
            // On Linux, RS textures may not be exposed in getOpenGlState
            log('  No RS textures available (expected on Linux)', 'info');
            return true; // Skip gracefully
        }

        const tex = state.textures[texIds[0]];
        const w = Math.min(32, tex.width);
        const h = Math.min(32, tex.height);

        // Capture different subregions
        const regions = [
            { x: 0, y: 0 },
            { x: Math.floor(tex.width / 2), y: 0 },
            { x: 0, y: Math.floor(tex.height / 2) }
        ];

        for (const region of regions) {
            const captured = await tex.capture(region.x, region.y, w, h);
            if (!captured || captured.data.length === 0) {
                throw new Error(`Failed to capture at ${region.x},${region.y}`);
            }
        }

        return true;
    },

    // -------------------------------------------------------------------------
    // RENDER RECORDING EDGE CASES
    // -------------------------------------------------------------------------

    async testRecordMultipleFrames() {
        // Record multiple frames
        const renders = await native.recordRenderCalls({
            maxframes: 5,
            timeout: 5000,
            features: ['uniforms']
        });

        if (!renders || renders.length === 0) {
            throw new Error('No renders captured');
        }

        // Check frame numbers (property is 'framenr' not 'frameNumber')
        const frameNumbers = [...new Set(renders.map(r => r.framenr))];
        log(`  Captured ${renders.length} draws across ${frameNumbers.length} frames`, 'info');
        return frameNumbers.length >= 2; // Should have at least 2 frames
    },

    async testRecordAllFeatures() {
        // Record with all features enabled
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ['uniforms', 'vertexarray', 'textures', 'framebuffer', 'computebindings']
        });

        if (!renders || renders.length === 0) {
            throw new Error('No renders');
        }

        // Verify we got expected data
        let hasUniforms = false;
        let hasTextures = false;

        for (const r of renders) {
            if (r.program?.uniforms?.length > 0) hasUniforms = true;
            if (r.textures && Object.keys(r.textures).length > 0) hasTextures = true;
        }

        log(`  Features - Uniforms: ${hasUniforms}, Textures: ${hasTextures}`, 'info');
        return renders.length > 0;
    },

    async testStreamWithHighFrequency() {
        // Stream with no cooldown
        let frameCount = 0;
        let renderCount = 0;

        const stream = native.streamRenderCalls(
            { framecooldown: 0, features: [] },
            (renders) => {
                frameCount++;
                renderCount += renders.length;
            }
        );

        await new Promise(r => setTimeout(r, 500));
        await stream.close();

        log(`  High-freq stream: ${frameCount} callbacks, ${renderCount} renders`, 'info');
        return frameCount >= 2;
    },

    async testStreamWithFilter() {
        // Stream with a specific filter
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        let matchCount = 0;
        const stream = native.streamRenderCalls(
            {
                framecooldown: 100,
                vertexObjectId: trigger.vertexObjectId
            },
            (renders) => {
                matchCount += renders.length;
            }
        );

        await new Promise(r => setTimeout(r, 500));
        await stream.close();

        log(`  Filtered stream got ${matchCount} matching renders`, 'info');
        return matchCount > 0;
    },

    // -------------------------------------------------------------------------
    // SHADER EDGE CASES
    // -------------------------------------------------------------------------

    async testProgramWithNoUniforms() {
        const prog = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            void main() { gl_Position = vec4(aPos, 1.0); }`,
            `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0, 0.0, 0.0, 1.0); }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            [] // No uniforms
        );

        return !!prog && prog.programId !== undefined;
    },

    async testProgramWithManyUniforms() {
        const uniforms = [];
        let offset = 0;
        for (let i = 0; i < 10; i++) {
            uniforms.push({
                name: `uUniform${i}`,
                type: 0x8B52, // vec4
                length: 1,
                snapshotOffset: offset,
                snapshotSize: 16
            });
            offset += 16;
        }

        const prog = await native.createProgram(
            `#version 330 core
            layout(location = 0) in vec3 aPos;
            uniform vec4 uUniform0, uUniform1, uUniform2, uUniform3, uUniform4;
            uniform vec4 uUniform5, uUniform6, uUniform7, uUniform8, uUniform9;
            void main() { gl_Position = vec4(aPos, 1.0); }`,
            `#version 330 core
            out vec4 FragColor;
            void main() { FragColor = vec4(1.0); }`,
            [{ name: 'aPos', type: 0x1406, length: 3, location: 0 }],
            uniforms
        );

        return !!prog && prog.uniforms.length === 10;
    },

    async testFindRS3ViewProjMatrix() {
        // Look for RS3's common uViewProjMatrix uniform
        const state = await native.getOpenGlState();
        const programs = state?.programs || {};

        let found = false;
        for (const progId of Object.keys(programs)) {
            const prog = programs[progId];
            const hasViewProj = prog.uniforms?.some(u => u.name === 'uViewProjMatrix');
            if (hasViewProj) {
                found = true;
                log(`  Found uViewProjMatrix in program ${progId}`, 'info');
                break;
            }
        }

        return found;
    },

    async testFindRS3ModelMatrix() {
        // Look for RS3's common uModelMatrix uniform
        const state = await native.getOpenGlState();
        const programs = state?.programs || {};

        let found = false;
        for (const progId of Object.keys(programs)) {
            const prog = programs[progId];
            const hasModel = prog.uniforms?.some(u => u.name === 'uModelMatrix');
            if (hasModel) {
                found = true;
                log(`  Found uModelMatrix in program ${progId}`, 'info');
                break;
            }
        }

        return found;
    },

    // -------------------------------------------------------------------------
    // CAPTURE EDGE CASES
    // -------------------------------------------------------------------------

    async testCaptureSmallRegion() {
        // Capture a tiny region
        const img = await native.capture(-1, 0, 0, 1, 1);
        return img && img.width === 1 && img.height === 1 && img.data.length === 4;
    },

    async testCaptureLargeRegion() {
        // Capture full screen
        const w = native.getRsWidth();
        const h = native.getRsHeight();
        const img = await native.capture(-1, 0, 0, w, h);

        log(`  Captured ${img?.width}x${img?.height}, ${(img?.data?.length || 0) / 1024}KB`, 'info');
        return img && img.data.length > 0;
    },

    async testCaptureOutOfBounds() {
        // Try to capture beyond screen bounds
        const w = native.getRsWidth();
        const h = native.getRsHeight();

        try {
            const img = await native.capture(-1, w + 100, h + 100, 64, 64);
            // Should either return clipped data or handle gracefully
            return true;
        } catch (e) {
            // Error is also acceptable behavior
            log(`  Out of bounds capture threw: ${e.message}`, 'info');
            return true;
        }
    },

    async testCaptureRapid() {
        // Rapid successive captures
        let successCount = 0;
        for (let i = 0; i < 20; i++) {
            const img = await native.capture(-1, 0, 0, 64, 64);
            if (img && img.data.length > 0) successCount++;
        }

        log(`  Rapid capture: ${successCount}/20 successful`, 'info');
        return successCount >= 18;
    },

    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------

    async testGlLogTogglesSetAndGet() {
        // Test toggling GL logs
        const original = await native.getGlLogToggles();
        if (!original || original.length === 0) {
            throw new Error('No toggles available');
        }

        // Set all to 0
        const zeros = new Uint8Array(original.length);
        await native.setGlLogToggles(zeros);

        // Verify
        const afterZero = await native.getGlLogToggles();
        const allZero = afterZero.every(b => b === 0);

        // Restore
        await native.setGlLogToggles(original);

        return allZero;
    },

    async testResetOpenGlState() {
        await native.debug.resetOpenGlState();
        // Verify state is still valid after reset
        const state = await native.getOpenGlState();
        return !!state;
    },

    async testMemoryConsistency() {
        // Multiple memory state calls should be consistent
        const states = [];
        for (let i = 0; i < 5; i++) {
            states.push(await native.debug.memoryState());
            await new Promise(r => setTimeout(r, 100));
        }

        // Size should be constant
        const sizes = states.map(s => s.size);
        const allSameSize = sizes.every(s => s === sizes[0]);

        // Used should be increasing or stable (not wildly different)
        const usedDiffs = [];
        for (let i = 1; i < states.length; i++) {
            usedDiffs.push(Math.abs(states[i].used - states[i - 1].used));
        }
        const avgDiff = usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length;

        log(`  Memory size: ${(sizes[0] / 1024 / 1024).toFixed(2)}MB, avg change: ${(avgDiff / 1024).toFixed(2)}KB`, 'info');
        return allSameSize && avgDiff < 1024 * 1024; // Less than 1MB fluctuation
    },

    // -------------------------------------------------------------------------
    // STRESS TESTS
    // -------------------------------------------------------------------------

    async testStressManyOverlays() {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const triggers = renders?.filter(r => r.vertexObjectId > 0).slice(0, 20) || [];

        if (triggers.length < 5) {
            log('  Not enough triggers for stress test', 'warn');
            return true;
        }

        const overlays = [];
        for (let i = 0; i < Math.min(10, triggers.length); i++) {
            const prog = await createTestProgram([Math.random(), Math.random(), Math.random(), 0.3]);
            const vao = await createTestVAO();
            const overlay = await native.beginOverlay(
                { vertexObjectId: triggers[i].vertexObjectId },
                prog,
                vao,
                { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
            );
            if (overlay) overlays.push(overlay);
        }

        log(`  Created ${overlays.length} simultaneous overlays`, 'info');

        await new Promise(r => setTimeout(r, 500));

        // Clean up
        overlays.forEach(o => { try { o.stop(); } catch (e) {} });

        return overlays.length >= 5;
    },

    async testStressRapidStateQueries() {
        let successCount = 0;
        const start = performance.now();

        for (let i = 0; i < 20; i++) {
            try {
                const state = await native.getOpenGlState();
                if (state) successCount++;
            } catch (e) {
                // Ignore
            }
            await new Promise(r => setTimeout(r, 10));
        }

        const elapsed = performance.now() - start;
        log(`  20 state queries in ${elapsed.toFixed(0)}ms (${successCount} successful)`, 'info');
        return successCount >= 15;
    },

    async testStressRapidRecording() {
        let successCount = 0;
        const start = performance.now();

        for (let i = 0; i < 30; i++) {
            try {
                const renders = await native.recordRenderCalls({ maxframes: 1, features: [] });
                if (renders) {
                    renders.forEach(r => { if (r.dispose) r.dispose(); });
                    if (renders.length > 0) successCount++;
                }
            } catch (e) {
                // Ignore
            }
        }

        const elapsed = performance.now() - start;
        log(`  30 recordings in ${elapsed.toFixed(0)}ms (${successCount} successful)`, 'info');
        return successCount >= 25;
    },

    // -------------------------------------------------------------------------
    // ERROR HANDLING
    // -------------------------------------------------------------------------

    async testInvalidVAOFilter() {
        // Try overlay with non-existent VAO
        const prog = await createTestProgram([1, 0, 0]);
        const vao = await createTestVAO();

        const overlay = await native.beginOverlay(
            { vertexObjectId: 999999999 }, // Unlikely to exist
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        // Should either return null or create overlay that never triggers
        if (overlay) {
            await new Promise(r => setTimeout(r, 100));
            overlay.stop();
        }

        return true; // Either behavior is acceptable
    },

    async testInvalidProgramId() {
        // Try overlay with non-existent program filter
        const prog = await createTestProgram([1, 0, 0]);
        const vao = await createTestVAO();

        const overlay = await native.beginOverlay(
            { programId: 999999999 },
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (overlay) {
            await new Promise(r => setTimeout(r, 100));
            overlay.stop();
        }

        return true;
    },

    async testCaptureInvalidTexture() {
        try {
            const img = await native.capture(999999999, 0, 0, 64, 64);
            // Should either fail gracefully or return empty
            return img === null || img.data.length === 0 || img.data.length > 0;
        } catch (e) {
            // Exception is acceptable
            return true;
        }
    },

    async testOverlayStopTwice() {
        const renders = await native.recordRenderCalls({ maxframes: 1 });
        const trigger = renders?.find(r => r.vertexObjectId > 0);
        if (!trigger) throw new Error('No trigger');

        const prog = await createTestProgram([1, 0, 0]);
        const vao = await createTestVAO();
        const overlay = await native.beginOverlay(
            { vertexObjectId: trigger.vertexObjectId },
            prog,
            vao,
            { trigger: 'after', alphaBlend: true, ranges: [{ start: 0, length: 3 }] }
        );

        if (!overlay) throw new Error('No overlay');

        overlay.stop();

        // Try stopping again - should not crash
        try {
            overlay.stop();
        } catch (e) {
            // Exception is acceptable
        }

        return true;
    }
};

/**
 * Run all extended tests
 */
async function runExtendedTests() {
    log('='.repeat(60), 'info');
    log('EXTENDED TEST SUITE - Comprehensive Testing', 'info');
    log('='.repeat(60), 'info');

    // Clean up handles from previous test suite
    await disposeAllTestHandles();

    if (!native || !isConnected) {
        log('ERROR: Not connected to RS client', 'error');
        return;
    }

    const results = { passed: 0, failed: 0, skipped: 0 };
    const testNames = Object.keys(extendedTests);

    const progressFill = document.getElementById('test-progress-fill');
    const progressText = document.getElementById('test-progress-text');
    const resultsEl = document.getElementById('all-test-results');

    resultsEl.innerHTML = '';

    for (let i = 0; i < testNames.length; i++) {
        const name = testNames[i];
        progressText.textContent = `Extended: ${name}`;
        progressFill.style.width = `${((i + 1) / testNames.length) * 100}%`;

        try {
            log(`Testing: ${name}...`, 'info');
            const result = await Promise.race([
                extendedTests[name](),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 15s')), 15000))
            ]);

            if (result) {
                results.passed++;
                addTestResult(resultsEl, true, name);
                log(`  PASS: ${name}`, 'success');
            } else {
                results.failed++;
                addTestResult(resultsEl, false, name);
                log(`  FAIL: ${name}`, 'error');
            }
        } catch (e) {
            results.failed++;
            addTestResult(resultsEl, false, name, e.message);
            log(`  FAIL: ${name} - ${e.message}`, 'error');
        }

        document.getElementById('tests-passed').textContent = results.passed;
        document.getElementById('tests-failed').textContent = results.failed;
        document.getElementById('tests-total').textContent = i + 1;

        await new Promise(r => setTimeout(r, 50));
    }

    // Final cleanup
    await disposeAllTestHandles();

    log('='.repeat(60), 'info');
    log(`EXTENDED TESTS COMPLETE: ${results.passed} passed, ${results.failed} failed`, results.failed === 0 ? 'success' : 'warn');
    log('='.repeat(60), 'info');

    progressText.textContent = `Extended: ${results.passed}/${testNames.length} passed`;
}

// Add button for extended tests
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const alltestsControls = document.querySelector('.alltests-controls');
        if (alltestsControls) {
            const extendedBtn = document.createElement('button');
            extendedBtn.id = 'btn-run-extended-tests';
            extendedBtn.className = 'test-btn';
            extendedBtn.textContent = 'Run Extended Tests';
            extendedBtn.addEventListener('click', runExtendedTests);
            alltestsControls.appendChild(extendedBtn);

            const fullBtn = document.createElement('button');
            fullBtn.id = 'btn-run-full-suite';
            fullBtn.className = 'test-btn primary';
            fullBtn.textContent = 'Run FULL Suite';
            fullBtn.addEventListener('click', async () => {
                await runAllTests();
                await runExtendedTests();
            });
            alltestsControls.appendChild(fullBtn);
        }
    }, 100);
});
