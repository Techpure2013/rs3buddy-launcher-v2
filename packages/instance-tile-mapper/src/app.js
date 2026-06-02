// Instance Tile Mapper — Tile-level offset mapping

const CHUNK_SIZE = 64;
const TILE_SIZE = 512;

// ── State ──
let native = null;
let isConnected = false;
let isTracking = false;
let trackInterval = null;
let map = null;
let currentFloor = 0;
let tileLayer = null;

// Player position
let playerPos = null;
let lastSurfaceTile = null;  // Last position on surface (x < 6400) before instance entry
let entranceTiles = [];       // Tiles that teleport into this instance [{lng, lat}]

// Offset mapping
let refInstance = null;  // {lng, lat, floor, meshData}
let refPublic = null;    // {lng, lat}
let offset = null;       // {dLng, dLat}
let waitingForMapClick = false;
let selectingEntranceTiles = false;

// Map layers
let markersGroup = null;
let chunkGridGroup = null;
let tileGridGroup = null;
let playerMarker = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    log('Instance Tile Mapper initializing...', 'info');

    if (globalThis.alt1gl || globalThis._alt1gl) {
        native = new Proxy({}, {
            get(_, prop) {
                const api = globalThis.alt1gl || globalThis._alt1gl;
                if (!api) throw new Error('alt1gl not available');
                return api[prop];
            }
        });
        log('Native addon found', 'success');
    } else {
        log('Native addon not available — map-only mode', 'warn');
    }

    initMap();
    setupListeners();
    setInterval(checkConnection, 2000);
    checkConnection();
});

// ── Connection ──
function checkConnection() {
    const was = isConnected;
    try { isConnected = native && native.getRsReady() > 0; } catch { isConnected = false; }

    document.getElementById('statusDot').className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
    document.getElementById('statusText').textContent = isConnected ? 'Connected' : 'Disconnected';
    document.getElementById('btnTrack').disabled = !isConnected;
    document.getElementById('btnScan').disabled = !isConnected;

    if (!was && isConnected) log('Connected to RS client', 'success');
    if (was && !isConnected && isTracking) stopTracking();
}

// ── Event Listeners ──
function setupListeners() {
    document.getElementById('btnTrack').addEventListener('click', toggleTracking);
    document.getElementById('btnScan').addEventListener('click', scanFloors);
    document.getElementById('btnSetInstance').addEventListener('click', setInstanceTile);
    document.getElementById('btnClearOffset').addEventListener('click', clearOffset);
    document.getElementById('btnCancelPublic').addEventListener('click', cancelWaitForMap);
    document.getElementById('btnFollowPlayer').addEventListener('click', followPlayerOnMap);
    document.getElementById('btnExportJson').addEventListener('click', exportJson);
    document.getElementById('btnExportTileMarker').addEventListener('click', exportTileMarker);
    document.getElementById('btnCopyOffset').addEventListener('click', copyOffset);
    document.getElementById('btnAddEntrance').addEventListener('click', addEntranceTile);
    document.getElementById('btnClearEntrances').addEventListener('click', clearEntranceTiles);
    document.getElementById('showChunkGrid').addEventListener('change', toggleChunkGrid);
    document.getElementById('showTileGrid').addEventListener('change', toggleTileGrid);

    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', () => setMapFloor(+btn.dataset.floor));
    });
}

// ── Leaflet Map ──
function initMap() {
    const crs = L.Util.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(1, 16 + 0.5, -1, 200 * 64 - (16 + 0.5))
    });

    map = L.map('map', {
        crs,
        bounds: [[0, 0], [12800, 6400]],
        maxBounds: [[-500, -500], [13300, 6900]],
        maxBoundsViscosity: 0.5,
        zoom: -1,
        center: [3288, 3023],
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        zoomControl: true,
        minZoom: -4,
        maxZoom: 5
    });

    setMapFloor(0);
    markersGroup = L.layerGroup().addTo(map);
    chunkGridGroup = L.layerGroup();
    tileGridGroup = L.layerGroup();

    map.on('mousemove', (e) => {
        const lng = Math.floor(e.latlng.lng);
        const lat = Math.floor(e.latlng.lat);
        const cx = Math.floor(lng / CHUNK_SIZE);
        const cz = Math.floor(lat / CHUNK_SIZE);
        let text = `Tile: ${lng}, ${lat}  |  Chunk: ${cx}, ${cz}`;
        if (offset) {
            text += `  |  Instance: ${lng - offset.dLng}, ${lat - offset.dLat}`;
        }
        document.getElementById('mapCoords').textContent = text;
    });

    map.on('click', onMapClick);
    log('Map initialized', 'success');
}

function setMapFloor(floor) {
    currentFloor = floor;
    if (tileLayer) map.removeLayer(tileLayer);

    tileLayer = L.tileLayer(
        `https://runeapps.org/s3/map4/live/topdown-${floor}/{z}/{x}-{y}.webp`,
        {
            tileSize: 512, maxNativeZoom: 5, minZoom: -4, maxZoom: 5,
            opacity: 0.8, noWrap: true, bounds: [[0, 0], [12800, 6400]],
            updateWhenZooming: false, updateWhenIdle: true, keepBuffer: 100
        }
    ).addTo(map);

    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.toggle('active', +btn.dataset.floor === floor);
    });
}

function onMapClick(e) {
    const visualCenterX = Math.floor(e.latlng.lng - 0.5) + 0.5;
    const visualCenterY = Math.floor(e.latlng.lat + 0.5) - 0.5;
    const lng = visualCenterX - 0.5;
    const lat = visualCenterY + 0.5;

    // Entrance tile selection mode — add clicked tile, stay in mode for more
    if (selectingEntranceTiles) {
        const key = `${lng},${lat}`;
        if (entranceTiles.find(t => `${t.lng},${t.lat}` === key)) {
            log(`Tile ${key} already added`, 'warn');
        } else {
            entranceTiles.push({ lng, lat });
            updateEntranceTileDisplay();
            log(`Entrance tile added: ${lng}, ${lat} — click more or press Done`, 'success');
        }
        return;
    }

    // Public reference click mode
    if (!waitingForMapClick) return;

    refPublic = { lng, lat };
    offset = {
        dLng: refPublic.lng - refInstance.lng,
        dLat: refPublic.lat - refInstance.lat
    };

    log(`Public tile: (${lng}, ${lat})  →  Offset: (${offset.dLng}, ${offset.dLat})`, 'success');

    document.getElementById('refPublic').textContent = `${lng}, ${lat}`;
    document.getElementById('refOffset').textContent = `dLng: ${offset.dLng}, dLat: ${offset.dLat}`;

    cancelWaitForMap();
    document.getElementById('convertedPanel').style.display = '';
    updateExportButtons();
    updateMapMarkers();
}

// ── Position Tracking ──
function toggleTracking() {
    isTracking ? stopTracking() : startTracking();
}

function startTracking() {
    isTracking = true;
    document.getElementById('btnTrack').textContent = 'Stop Tracking';
    document.getElementById('btnTrack').classList.replace('btn-primary', 'btn-danger');
    document.getElementById('btnSetInstance').disabled = false;
    log('Tracking started', 'info');
    pollPosition();
    trackInterval = setInterval(pollPosition, 500);
}

function stopTracking() {
    isTracking = false;
    if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }
    document.getElementById('btnTrack').textContent = 'Start Tracking';
    document.getElementById('btnTrack').classList.replace('btn-danger', 'btn-primary');
    document.getElementById('btnSetInstance').disabled = true;
    log('Tracking stopped', 'info');
}

// Cached player mesh for fast re-detection
let cachedPlayerMesh = null; // {vaoId, programId, timestamp}
const PLAYER_CACHE_TIMEOUT = 30000;

async function pollPosition() {
    if (!isConnected) return;
    try {
        // Get ALL renders (not just floor) to find the player mesh
        const renders = await native.recordRenderCalls({
            maxframes: 1, framecooldown: 50,
            features: ['uniforms'],
            skipHandles: true
        });
        if (renders.length === 0) return;

        // Find player via tinted occlusion mesh (same as RS3 Tile Marker)
        const pos = findPlayerPosition(renders);
        if (!pos) return;

        playerPos = {
            tileLng: pos.x,
            tileLat: pos.z,
            chunkX: Math.floor(pos.x / CHUNK_SIZE),
            chunkZ: Math.floor(pos.z / CHUNK_SIZE),
            height: pos.y,
            floor: 0 // TODO
        };

        document.getElementById('posTile').textContent = `${playerPos.tileLng}, ${playerPos.tileLat}`;
        document.getElementById('posChunk').textContent = `${playerPos.chunkX}, ${playerPos.chunkZ}`;
        document.getElementById('posHeight').textContent = Math.round(playerPos.height * TILE_SIZE);
        document.getElementById('posFloor').textContent = playerPos.floor;

        // Entrance tile detection: track surface→instance transition
        if (playerPos.tileLng >= 6400) {
            // In instance space — capture last surface tile as entrance
            if (lastSurfaceTile) {
                const key = `${lastSurfaceTile.lng},${lastSurfaceTile.lat}`;
                if (!entranceTiles.find(t => `${t.lng},${t.lat}` === key)) {
                    entranceTiles.push({ ...lastSurfaceTile });
                    log(`Entrance tile captured: ${key}`, 'success');
                    updateEntranceTileDisplay();
                }
                lastSurfaceTile = null;
            }
        } else {
            // On surface — track last tile before instance jump
            lastSurfaceTile = { lng: playerPos.tileLng, lat: playerPos.tileLat };
        }

        if (offset) {
            const pubLng = playerPos.tileLng + offset.dLng;
            const pubLat = playerPos.tileLat + offset.dLat;
            const pubCX = Math.floor(pubLng / CHUNK_SIZE);
            const pubCZ = Math.floor(pubLat / CHUNK_SIZE);
            document.getElementById('livePubTile').textContent = `${pubLng}, ${pubLat}`;
            document.getElementById('livePubChunk').textContent = `${pubCX}, ${pubCZ}`;

            updatePlayerMarker(pubLat, pubLng + 1);
        }
    } catch {}
}

// Find player by scanning for tinted animated occlusion mesh
// Same approach as RS3 Tile Marker's PlayerPositionTracker
function findPlayerPosition(renders) {
    // Fast path: try cached mesh first
    if (cachedPlayerMesh && Date.now() - cachedPlayerMesh.timestamp < PLAYER_CACHE_TIMEOUT) {
        for (const r of renders) {
            if (r.vertexObjectId !== cachedPlayerMesh.vaoId) continue;
            if (r.program?.programId !== cachedPlayerMesh.programId) continue;
            const pos = extractPlayerFromRender(r);
            if (pos) return pos;
        }
        cachedPlayerMesh = null;
    }

    // Full scan: find tinted animated mesh
    const candidates = [];
    for (const r of renders) {
        if (!r.program || !r.uniformState) continue;

        // Need uModelMatrix and uTint
        const modelU = r.program.uniforms.find(u => u.name === 'uModelMatrix');
        const tintU = r.program.uniforms.find(u => u.name === 'uTint');
        if (!modelU || !tintU) continue;

        // Check if animated (has bone-related uniforms)
        const hasBones = r.program.uniforms.some(u =>
            u.name.includes('Bone') || u.name.includes('bone') || u.name === 'uBoneMatrices'
        );
        if (!hasBones) continue;

        // Read tint values
        const tintOffset = tintU.snapshotOffset;
        const tv = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + tintOffset);
        const tR = tv.getFloat32(0, true);
        const tG = tv.getFloat32(4, true);
        const tB = tv.getFloat32(8, true);
        const tA = tv.getFloat32(12, true);

        // Occlusion mesh: RGB ~0, alpha <= 0.6
        const rgbSum = Math.abs(tR) + Math.abs(tG) + Math.abs(tB);
        if (rgbSum > 0.1 || tA > 0.6) continue;

        // Extract position from model matrix
        const mOffset = modelU.snapshotOffset;
        const mv = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + mOffset);
        const rawX = mv.getFloat32(12 * 4, true);
        const rawY = mv.getFloat32(13 * 4, true);
        const rawZ = mv.getFloat32(14 * 4, true);

        if (rawX === 0 && rawZ === 0) continue;

        // Tile position (same formula as RS3 Tile Marker)
        const x = Math.round(rawX / TILE_SIZE) - 2;
        const y = rawY / TILE_SIZE;
        const z = Math.round(rawZ / TILE_SIZE) - 1;

        candidates.push({ x, y, z, tintAlpha: tA, vaoId: r.vertexObjectId, programId: r.program.programId });
    }

    if (candidates.length === 0) return null;

    // Pick best: closest tint alpha to 0.5
    candidates.sort((a, b) => Math.abs(a.tintAlpha - 0.5) - Math.abs(b.tintAlpha - 0.5));
    const best = candidates[0];

    // Cache for fast path
    cachedPlayerMesh = { vaoId: best.vaoId, programId: best.programId, timestamp: Date.now() };

    return best;
}

function extractPlayerFromRender(r) {
    if (!r.program || !r.uniformState) return null;
    const modelU = r.program.uniforms.find(u => u.name === 'uModelMatrix');
    if (!modelU) return null;

    const mv = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + modelU.snapshotOffset);
    const rawX = mv.getFloat32(12 * 4, true);
    const rawY = mv.getFloat32(13 * 4, true);
    const rawZ = mv.getFloat32(14 * 4, true);

    if (rawX === 0 && rawZ === 0) return null;

    return {
        x: Math.round(rawX / TILE_SIZE) - 2,
        y: rawY / TILE_SIZE,
        z: Math.round(rawZ / TILE_SIZE) - 1,
    };
}

function extractCamera(render) {
    for (const name of ['uInvViewMatrix', 'uViewMatrix']) {
        const u = render.program.uniforms.find(u => u.name === name);
        if (!u || !render.uniformState) continue;
        const v = new DataView(render.uniformState.buffer, render.uniformState.byteOffset + u.snapshotOffset);
        if (name === 'uInvViewMatrix') {
            return { x: v.getFloat32(48, true), y: v.getFloat32(52, true), z: v.getFloat32(56, true) };
        }
        if (name === 'uViewMatrix') {
            const m = [];
            for (let i = 0; i < 16; i++) m.push(v.getFloat32(i * 4, true));
            // Column-major 4x4 view matrix
            // Camera pos = -transpose(rotation) * translation
            // rotation rows: [m[0],m[4],m[8]], [m[1],m[5],m[9]], [m[2],m[6],m[10]]
            // translation: [m[12], m[13], m[14]]
            const tx = m[12], ty = m[13], tz = m[14];
            const cx = -(m[0]*tx + m[4]*ty + m[8]*tz);
            const cy = -(m[1]*tx + m[5]*ty + m[9]*tz);
            const cz = -(m[2]*tx + m[6]*ty + m[10]*tz);
            if (isFinite(cx) && Math.abs(cx) < 1e9) return { x: cx, y: cy, z: cz };
        }
    }
    return null;
}

function estimateCenter(renders) {
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const r of renders) {
        const u = r.program.uniforms.find(u => u.name === 'uModelMatrix');
        if (!u || !r.uniformState) continue;
        const v = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + u.snapshotOffset);
        sx += v.getFloat32(48, true); sy += v.getFloat32(52, true); sz += v.getFloat32(56, true);
        n++;
    }
    if (!n) return null;
    return { x: sx/n + CHUNK_SIZE*TILE_SIZE/2, y: sy/n, z: sz/n + CHUNK_SIZE*TILE_SIZE/2 };
}

function detectFloor(renders, playerY) {
    const yValues = [];
    for (const r of renders) {
        const u = r.program.uniforms.find(u => u.name === 'uModelMatrix');
        if (!u || !r.uniformState) continue;
        const v = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + u.snapshotOffset);
        yValues.push(v.getFloat32(52, true));
    }
    if (yValues.length === 0) return 0;
    const unique = [...new Set(yValues.map(y => Math.round(y / 100) * 100))].sort((a, b) => a - b);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unique.length; i++) {
        const d = Math.abs(playerY - unique[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

// ── Floor Scanning ──
async function scanFloors() {
    if (!isConnected) return;
    log('Scanning floor renders...', 'info');
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 3, framecooldown: 150,
            features: ['uniforms'],
            hasInput: 'aMaterialSettingsSlotXY3'
        });
        const chunks = new Set();
        for (const r of renders) {
            if (!r.program.inputs.find(q => q.name === 'aMaterialSettingsSlotXY3')) continue;
            const u = r.program.uniforms.find(u => u.name === 'uModelMatrix');
            if (!u || !r.uniformState) continue;
            const v = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + u.snapshotOffset);
            const cx = Math.floor(v.getFloat32(48, true) / CHUNK_SIZE / TILE_SIZE);
            const cz = Math.floor(v.getFloat32(56, true) / CHUNK_SIZE / TILE_SIZE);
            chunks.add(`${cx},${cz}`);
        }
        log(`Found ${renders.length} renders across ${chunks.size} chunks`, 'success');
    } catch (e) {
        log('Scan error: ' + e.message, 'error');
    }
}

// ── Offset Mapping ──
async function setInstanceTile() {
    if (!playerPos) { log('No position data — start tracking first', 'warn'); return; }
    if (!isConnected) { log('Not connected', 'warn'); return; }

    log('Capturing floor mesh data around player...', 'info');

    // Capture floor renders with vertex data
    let meshData = null;
    try {
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            framecooldown: 100,
            features: ['vertexarray', 'uniforms'],
            hasInput: 'aMaterialSettingsSlotXY3'
        });

        const chunks = [];
        for (const r of renders) {
            if (!r.program.inputs.find(q => q.name === 'aMaterialSettingsSlotXY3')) continue;

            const u = r.program.uniforms.find(u => u.name === 'uModelMatrix');
            if (!u || !r.uniformState) continue;
            const v = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + u.snapshotOffset);
            const worldX = v.getFloat32(48, true);
            const modelY = v.getFloat32(52, true);
            const worldZ = v.getFloat32(56, true);
            const chunkX = Math.floor(worldX / CHUNK_SIZE / TILE_SIZE);
            const chunkZ = Math.floor(worldZ / CHUNK_SIZE / TILE_SIZE);

            // Extract vertex count and hash from vertex data
            const va = r.vertexArray;
            let vertCount = 0;
            let vertHash = null;
            if (va) {
                const attrs = (va.attributes || []).filter(a => a != null);
                const posAttr = attrs.find(a => a.enabled && a.buffer && a.buffer.length > 0 && a.vectorlength >= 2);
                if (posAttr) {
                    const scalarSize = posAttr.scalartype === 5126 ? 4 : posAttr.scalartype === 5123 ? 2 : 1;
                    const stride = posAttr.stride || (posAttr.vectorlength * scalarSize);
                    vertCount = Math.floor((posAttr.buffer.length - (posAttr.offset || 0)) / stride);

                    // FNV-1a hash for fingerprinting
                    let h = 0x811c9dc5;
                    const buf = posAttr.buffer;
                    for (let i = 0; i < Math.min(buf.length, 4096); i++) {
                        h ^= buf[i];
                        h = Math.imul(h, 0x01000193);
                    }
                    vertHash = (h >>> 0).toString(16).padStart(8, '0');
                }
            }

            chunks.push({
                chunkX, chunkZ, modelY: Math.round(modelY),
                vaoId: r.vertexObjectId,
                vertCount,
                vertHash,
                tileRange: {
                    lngMin: chunkX * CHUNK_SIZE, lngMax: (chunkX + 1) * CHUNK_SIZE,
                    latMin: chunkZ * CHUNK_SIZE, latMax: (chunkZ + 1) * CHUNK_SIZE
                }
            });
        }

        meshData = {
            captureTime: new Date().toISOString(),
            playerTile: { lng: playerPos.tileLng, lat: playerPos.tileLat },
            playerHeight: Math.round(playerPos.height),
            floor: playerPos.floor,
            chunksVisible: chunks.length,
            chunks
        };

        log(`Captured ${chunks.length} floor chunks (${chunks.reduce((s, c) => s + c.vertCount, 0)} total verts)`, 'success');
    } catch (e) {
        log('Mesh capture failed: ' + e.message, 'warn');
    }

    refInstance = {
        lng: playerPos.tileLng,
        lat: playerPos.tileLat,
        floor: playerPos.floor,
        meshData
    };
    document.getElementById('refInstance').textContent = `${refInstance.lng}, ${refInstance.lat} (floor ${refInstance.floor}, ${meshData ? meshData.chunksVisible + ' chunks' : 'no mesh'})`;

    // Now wait for map click
    waitingForMapClick = true;
    document.getElementById('pendingPublic').style.display = 'flex';
    document.body.classList.add('crosshair-cursor');
    log(`Instance tile set: (${refInstance.lng}, ${refInstance.lat}) — now click the map`, 'info');
}

function cancelWaitForMap() {
    waitingForMapClick = false;
    document.getElementById('pendingPublic').style.display = 'none';
    document.body.classList.remove('crosshair-cursor');
    if (selectingEntranceTiles) stopEntranceSelection();
}

function clearOffset() {
    refInstance = null;
    refPublic = null;
    offset = null;
    waitingForMapClick = false;
    document.getElementById('refInstance').textContent = '-- click "Set Instance Tile" --';
    document.getElementById('refPublic').textContent = '-- click the map --';
    document.getElementById('refOffset').textContent = '--';
    document.getElementById('convertedPanel').style.display = 'none';
    document.getElementById('pendingPublic').style.display = 'none';
    document.body.classList.remove('crosshair-cursor');
    if (markersGroup) markersGroup.clearLayers();
    playerMarker = null;
    updateExportButtons();
    log('Offset cleared', 'info');
}

// ── Map Markers ──
function updateMapMarkers() {
    if (!markersGroup) return;
    markersGroup.clearLayers();
    playerMarker = null;

    if (!refPublic) return;

    // Reference point marker
    const refIcon = L.divIcon({
        className: 'tile-marker-icon ref-marker',
        html: 'REF',
        iconSize: [30, 18],
        iconAnchor: [15, 9]
    });
    // Visual coords: x = lng + 0.5, y = lat - 0.5 (from convertManualCoordToVisual)
    const visX = refPublic.lng + 0.5;
    const visY = refPublic.lat - 0.5;

    L.marker([refPublic.lat, refPublic.lng + 1], { icon: refIcon })
        .addTo(markersGroup)
        .bindPopup(`Reference: Instance (${refInstance.lng}, ${refInstance.lat}) → Public (${refPublic.lng}, ${refPublic.lat})`);

    // Rectangle: [y, x] to [y+1, x+1] (same as TileHighlighting.tsx)
    L.rectangle(
        [[visY, visX], [visY + 1, visX + 1]],
        { color: '#ff4444', weight: 2, fillOpacity: 0.4, interactive: false }
    ).addTo(markersGroup);
}

function updatePlayerMarker(lat, lng) {
    if (!markersGroup || !offset) return;

    if (playerMarker) {
        playerMarker.setLatLng([lat, lng]);
    } else {
        const icon = L.divIcon({
            className: 'tile-marker-icon player-marker',
            html: 'YOU',
            iconSize: [30, 18],
            iconAnchor: [15, 9]
        });
        playerMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
            .addTo(markersGroup);
    }
}

function followPlayerOnMap() {
    if (!playerPos || !offset) return;
    const pubLng = playerPos.tileLng + offset.dLng;
    const pubLat = playerPos.tileLat + offset.dLat;
    // Visual coords: x = lng + 0.5, y = lat - 0.5
    map.setView([pubLat - 0.5, pubLng + 0.5], Math.max(map.getZoom(), 2));
}

// ── Chunk/Tile Grid ──
let chunkGridVisible = false;
let tileGridVisible = false;

function toggleChunkGrid() {
    chunkGridVisible = document.getElementById('showChunkGrid').checked;
    if (chunkGridVisible) {
        chunkGridGroup.addTo(map);
        drawChunkGrid();
        map.on('moveend', drawChunkGrid);
    } else {
        map.removeLayer(chunkGridGroup);
        map.off('moveend', drawChunkGrid);
    }
}

function drawChunkGrid() {
    chunkGridGroup.clearLayers();
    const zoom = map.getZoom();
    if (zoom < 1) return;
    const bounds = map.getBounds();
    const sx = Math.max(0, Math.floor(bounds.getWest() / CHUNK_SIZE));
    const ex = Math.min(100, Math.ceil(bounds.getEast() / CHUNK_SIZE));
    const sz = Math.max(0, Math.floor(bounds.getSouth() / CHUNK_SIZE));
    const ez = Math.min(200, Math.ceil(bounds.getNorth() / CHUNK_SIZE));
    if ((ex - sx) * (ez - sz) > 400) return;

    for (let x = sx; x < ex; x++) {
        for (let z = sz; z < ez; z++) {
            L.rectangle([[z * CHUNK_SIZE, x * CHUNK_SIZE], [(z + 1) * CHUNK_SIZE, (x + 1) * CHUNK_SIZE]],
                { color: '#fff', weight: 1, fillOpacity: 0, interactive: false }
            ).addTo(chunkGridGroup);
            L.marker([z * CHUNK_SIZE + 32, x * CHUNK_SIZE + 32], {
                icon: L.divIcon({
                    className: '',
                    html: `<div style="color:#fff;font-size:20px;font-weight:bold;font-family:Consolas;">${x}, ${z}</div>`,
                    iconSize: [80, 24], iconAnchor: [40, 12]
                }), interactive: false
            }).addTo(chunkGridGroup);
        }
    }
}

function toggleTileGrid() {
    tileGridVisible = document.getElementById('showTileGrid').checked;
    if (tileGridVisible) {
        tileGridGroup.addTo(map);
        drawTileGrid();
        map.on('moveend', drawTileGrid);
        map.on('zoomend', drawTileGrid);
    } else {
        map.removeLayer(tileGridGroup);
        map.off('moveend', drawTileGrid);
        map.off('zoomend', drawTileGrid);
        lastGridBounds = null;
        lastGridInterval = null;
    }
}

// Graticule config matching RS3QuestMapBuddy exactly
const GRID_INTERVALS = [
    { min_zoom: -6, interval: 1024 },
    { min_zoom: -5, interval: 512 },
    { min_zoom: -4, interval: 128 },
    { min_zoom: -3, interval: 64 },
    { min_zoom: 0.5, interval: 8 },
    { min_zoom: 1, interval: 4 },
    { min_zoom: 2, interval: 1 },
];
const GRID_OFFSET = { x: 0.5, y: 0.5 };
const GRID_STYLE = { color: '#111111', opacity: 0.3, weight: 1, interactive: false };
let lastGridBounds = null;
let lastGridInterval = null;

function drawTileGrid() {
    const zoom = map.getZoom();

    // Pick smallest interval where zoom >= min_zoom (same as lodash.minBy)
    let interval = null;
    for (const iv of GRID_INTERVALS) {
        if (zoom >= iv.min_zoom) {
            if (interval === null || iv.interval < interval) interval = iv.interval;
        }
    }

    // Cache: skip redraw if bounds still contain viewport and interval unchanged
    const bounds = map.getBounds();
    if (lastGridBounds && lastGridInterval === interval && lastGridBounds.contains(bounds)) return;

    tileGridGroup.clearLayers();

    if (!interval) { lastGridBounds = null; lastGridInterval = null; return; }

    // Pad bounds by 50% for smooth scrolling (matches Graticule.ts)
    const padded = bounds.pad(0.5);
    lastGridBounds = padded;
    lastGridInterval = interval;

    const mins = {
        x: Math.floor(padded.getWest() / interval) * interval,
        y: Math.floor(padded.getSouth() / interval) * interval
    };
    const counts = {
        x: Math.ceil((padded.getEast() - padded.getWest()) / interval),
        y: Math.ceil((padded.getNorth() - padded.getSouth()) / interval)
    };

    // Build all lines as a single multi-polyline (much faster than individual polylines)
    const lines = [];

    // Vertical lines (x varies)
    for (let i = 0; i <= counts.x; i++) {
        const x = mins.x + i * interval + GRID_OFFSET.x - 1;
        lines.push([[padded.getSouth(), x], [padded.getNorth(), x]]);
    }

    // Horizontal lines (y varies)
    for (let j = 0; j <= counts.y; j++) {
        const y = mins.y + j * interval + GRID_OFFSET.y - 1;
        lines.push([[y, padded.getWest()], [y, padded.getEast()]]);
    }

    L.polyline(lines, GRID_STYLE).addTo(tileGridGroup);
}

// ── Entrance Tiles ──
function updateEntranceTileDisplay() {
    const list = document.getElementById('entranceTileList');
    const empty = document.getElementById('entranceTilesEmpty');
    if (!list) return;

    list.innerHTML = '';
    if (entranceTiles.length === 0) {
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    for (let i = 0; i < entranceTiles.length; i++) {
        const t = entranceTiles[i];
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:3px;';
        row.innerHTML = `<span style="font-family:monospace;font-size:13px;color:#4fc3f7;">${t.lng}, ${t.lat}</span>` +
            `<button class="btn btn-small btn-danger" style="padding:1px 6px;font-size:10px;" data-idx="${i}">✕</button>`;
        row.querySelector('button').addEventListener('click', () => {
            entranceTiles.splice(i, 1);
            updateEntranceTileDisplay();
            log(`Removed entrance tile ${t.lng},${t.lat}`, 'info');
        });
        list.appendChild(row);
    }
}

function addEntranceTile() {
    if (selectingEntranceTiles) {
        // Already selecting — stop
        stopEntranceSelection();
        return;
    }
    // Enter map-click selection mode
    selectingEntranceTiles = true;
    document.getElementById('btnAddEntrance').textContent = 'Done Selecting';
    document.getElementById('btnAddEntrance').classList.add('btn-active');
    document.getElementById('entranceSelectHint').style.display = '';
    document.body.classList.add('crosshair-cursor');
    log('Click entrance tiles on the map — press "Done Selecting" when finished', 'info');
}

function stopEntranceSelection() {
    selectingEntranceTiles = false;
    document.getElementById('btnAddEntrance').textContent = 'Select on Map';
    document.getElementById('btnAddEntrance').classList.remove('btn-active');
    document.getElementById('entranceSelectHint').style.display = 'none';
    document.body.classList.remove('crosshair-cursor');
}

function clearEntranceTiles() {
    entranceTiles = [];
    updateEntranceTileDisplay();
    log('Entrance tiles cleared', 'info');
}

// ── Export ──
function updateExportButtons() {
    const has = !!offset;
    document.getElementById('btnExportJson').disabled = !has;
    document.getElementById('btnExportTileMarker').disabled = !has;
    document.getElementById('btnCopyOffset').disabled = !has;
}

function exportJson() {
    if (!offset) return;

    // Build mesh hash → public chunk mappings
    // Each instance chunk + offset = public chunk. The hash is stable across visits.
    const meshMappings = [];
    if (refInstance.meshData && refInstance.meshData.chunks.length > 0) {
        for (const chunk of refInstance.meshData.chunks) {
            if (!chunk.vertHash) continue;
            meshMappings.push({
                meshHash: chunk.vertHash,
                publicChunkX: chunk.chunkX + Math.round(offset.dLng / CHUNK_SIZE),
                publicChunkZ: chunk.chunkZ + Math.round(offset.dLat / CHUNK_SIZE),
                floor: refInstance.floor,
                vertCount: chunk.vertCount
            });
        }
    }

    const data = {
        version: 2,
        timestamp: new Date().toISOString(),
        publicReference: refPublic,
        floor: refInstance.floor,
        // Mesh hash mappings — the stable cross-session data
        meshMappings,
        // Legacy offset — only valid for current session
        offset,
        // Entrance tiles — surface tiles that teleport into this instance
        entranceTiles,
        instanceReference: {
            lng: refInstance.lng,
            lat: refInstance.lat,
            floor: refInstance.floor
        },
        meshData: refInstance.meshData || null
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mesh-mapping-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    log(`Exported ${meshMappings.length} mesh→public mappings`, 'success');
}

function exportTileMarker() {
    if (!offset) return;

    const markers = [];
    let id = 1;
    const floor = refInstance.floor;

    // Reference point marker
    markers.push({ id: `itm-${id++}`, x: refPublic.lng, y: refPublic.lat, floor, color: '#ff4444', label: 'REF (spawn)', groupId: undefined });

    // If we have mesh data, create markers for all visible chunk borders on the public map
    if (refInstance.meshData && refInstance.meshData.chunks.length > 0) {
        for (const chunk of refInstance.meshData.chunks) {
            // Convert instance chunk tiles to public tiles using offset
            const pubLngMin = chunk.tileRange.lngMin + offset.dLng;
            const pubLngMax = chunk.tileRange.lngMax + offset.dLng;
            const pubLatMin = chunk.tileRange.latMin + offset.dLat;
            const pubLatMax = chunk.tileRange.latMax + offset.dLat;
            const label = `${chunk.chunkX},${chunk.chunkZ}`;

            // Chunk border markers (every 4 tiles)
            for (let x = pubLngMin; x < pubLngMax; x += 4) {
                markers.push({ id: `itm-${id++}`, x, y: pubLatMin, floor, color: '#00d4ff', label, groupId: undefined });
                markers.push({ id: `itm-${id++}`, x, y: pubLatMax - 1, floor, color: '#00d4ff', label, groupId: undefined });
            }
            for (let z = pubLatMin + 4; z < pubLatMax - 1; z += 4) {
                markers.push({ id: `itm-${id++}`, x: pubLngMin, y: z, floor, color: '#00d4ff', label, groupId: undefined });
                markers.push({ id: `itm-${id++}`, x: pubLngMax - 1, y: z, floor, color: '#00d4ff', label, groupId: undefined });
            }

            // Chunk center marker
            const cx = Math.floor((pubLngMin + pubLngMax) / 2);
            const cz = Math.floor((pubLatMin + pubLatMax) / 2);
            markers.push({ id: `itm-${id++}`, x: cx, y: cz, floor, color: '#ffaa00', label: `C ${label}`, groupId: undefined });
        }
    } else {
        // Fallback: just border the chunk containing the reference point
        const cx = Math.floor(refPublic.lng / CHUNK_SIZE) * CHUNK_SIZE;
        const cz = Math.floor(refPublic.lat / CHUNK_SIZE) * CHUNK_SIZE;
        for (let x = cx; x < cx + CHUNK_SIZE; x += 4) {
            markers.push({ id: `itm-${id++}`, x, y: cz, floor, color: '#00d4ff', label: 'border', groupId: undefined });
            markers.push({ id: `itm-${id++}`, x, y: cz + CHUNK_SIZE - 1, floor, color: '#00d4ff', label: 'border', groupId: undefined });
        }
        for (let z = cz + 4; z < cz + CHUNK_SIZE - 1; z += 4) {
            markers.push({ id: `itm-${id++}`, x: cx, y: z, floor, color: '#00d4ff', label: 'border', groupId: undefined });
            markers.push({ id: `itm-${id++}`, x: cx + CHUNK_SIZE - 1, y: z, floor, color: '#00d4ff', label: 'border', groupId: undefined });
        }
    }

    const blob = new Blob([JSON.stringify(markers, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tile-markers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    log(`Exported ${markers.length} tile markers for ${refInstance.meshData ? refInstance.meshData.chunks.length : 1} chunks`, 'success');
}

function copyOffset() {
    if (!offset) return;
    const text = `Offset: dLng=${offset.dLng}, dLat=${offset.dLat}\nInstance: (${refInstance.lng}, ${refInstance.lat})\nPublic: (${refPublic.lng}, ${refPublic.lat})`;
    navigator.clipboard.writeText(text)
        .then(() => log('Offset copied', 'success'))
        .catch(e => log('Copy failed: ' + e.message, 'error'));
}

// ── Log ──
function log(msg, level = 'info') {
    const out = document.getElementById('logOutput');
    const div = document.createElement('div');
    div.className = `log-${level}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}
