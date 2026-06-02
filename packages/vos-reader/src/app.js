/**
 * VoS Reader - Voice of Seren capture & auto-detect tool
 * Uses GL render pipeline (recordRenderCalls + sprite CRC32 hashing)
 * to identify active VoS clan icons, then submits to the community API.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = 'https://techpure.dev/api/vos';
const SHARED_DATA_URL = 'alt1-builtin://shared-data/data/spritehash.batch.json';

const GL_TYPES = {
  0x1400: { size: 1, read: 'getInt8' },
  0x1401: { size: 1, read: 'getUint8' },
  0x1402: { size: 2, read: 'getInt16' },
  0x1403: { size: 2, read: 'getUint16' },
  0x1404: { size: 4, read: 'getInt32' },
  0x1405: { size: 4, read: 'getUint32' },
  0x1406: { size: 4, read: 'getFloat32' },
};

// VoS clan icon sprite IDs - map of spriteId -> clan name
const VOS_SPRITE_IDS = {
  24204: 'Amlodd',
  24205: 'Iorwerth',
  24206: 'Crwys',
  24207: 'Hefin',
  24208: 'Ithell',
  24209: 'Cadarn',
  24210: 'Meilyr',
  24211: 'Trahaearn'
};

// ─── CRC32 ───────────────────────────────────────────────────────────────────

const POLY = 0xedb88320;
const crc32_table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let fwd = i;
  for (let j = 8; j > 0; j--) {
    fwd = (fwd & 1) ? ((fwd >>> 1) ^ POLY) : (fwd >>> 1);
  }
  crc32_table[i] = fwd & 0xffffffff;
}

function crc32(buf, crc = 0, start = 0, end = buf.length) {
  crc = crc ^ 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = (crc >>> 8) ^ crc32_table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// CRITICAL: blue=0 is replaced with blue=1 before hashing (matches native quirk)
function imgcrc(imageData) {
  const data = new Uint8Array(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 2] === 0) data[i + 2] = 1;
  }
  return crc32(data);
}

// ─── GL Utility Functions ────────────────────────────────────────────────────

function getUniformValue(uniformState, uniform) {
  const type = GL_TYPES[uniform.type.scalarType];
  if (!type) return [[0]];
  const view = new DataView(uniformState.buffer, uniformState.byteOffset, uniformState.byteLength);
  const values = [];
  for (let a = 0; a < uniform.length; a++) {
    const sub = [];
    for (let b = 0; b < uniform.type.vectorLength; b++) {
      sub.push(view[type.read](
        uniform.snapshotOffset + uniform.type.vectorLength * type.size * a + type.size * b,
        true
      ));
    }
    values.push(sub);
  }
  return values;
}

// GL normalization divisors: when attr.normalized is true, integer values
// are mapped to [0,1] (unsigned) or [-1,1] (signed) by dividing by max value
var GL_NORM_DIVISORS = {
  0x1400: 127,        // GL_BYTE
  0x1401: 255,        // GL_UNSIGNED_BYTE
  0x1402: 32767,      // GL_SHORT
  0x1403: 65535,      // GL_UNSIGNED_SHORT
  0x1404: 2147483647, // GL_INT
  0x1405: 4294967295, // GL_UNSIGNED_INT
};

function makeAttrGetter(attr) {
  const buf = new DataView(attr.buffer.buffer, attr.buffer.byteOffset, attr.buffer.byteLength);
  const type = GL_TYPES[attr.scalartype];
  if (!type) return function () { return 0; };
  // Always normalize integer types — the serialized `normalized` flag is unreliable
  // (often false even when the GPU normalizes uint8→float for shader consumption).
  // Float types (0x1406) have no entry in GL_NORM_DIVISORS so divisor stays 1.
  const divisor = GL_NORM_DIVISORS[attr.scalartype] || 1;
  return function (vertexIndex, component) {
    if (component < attr.vectorlength) {
      return buf[type.read](attr.offset + vertexIndex * attr.stride + component * type.size, true) / divisor;
    }
    return component === 3 ? 1 : 0;
  };
}

function decodeIndices(vertexArray, renderRanges, renderMode, indexType) {
  let ntriangles = 0;
  for (const range of renderRanges) {
    ntriangles += renderMode === 'triangles' ? range.length / 3 : range.length - 2;
  }
  const indices = new Uint32Array(ntriangles * 3);

  if (!vertexArray.indexBuffer || vertexArray.indexBuffer.byteLength === 0) {
    let id = 0, offset = 0;
    for (const range of renderRanges) {
      for (let b = 0; b < range.length;) {
        if (renderMode === 'strips' && b !== 0) { id -= 2; b -= 2; }
        indices[offset++] = id++;
        indices[offset++] = id++;
        indices[offset++] = id++;
        b += 3;
      }
    }
  } else {
    const type = GL_TYPES[indexType];
    if (!type) return indices;
    // GL index buffers only use unsigned types
    const INDEX_ARRAYS = { 0x1401: Uint8Array, 0x1403: Uint16Array, 0x1405: Uint32Array };
    const TypedArray = INDEX_ARRAYS[indexType] || Uint16Array;
    const buf = vertexArray.indexBuffer;
    const view = new TypedArray(buf.buffer, buf.byteOffset, buf.byteLength / type.size);
    let c = 0;
    for (const range of renderRanges) {
      let b = 0;
      const ptr = range.start / type.size;
      while (b < range.length) {
        if (renderMode === 'strips' && b !== 0) b -= 2;
        indices[c++] = view[ptr + b++];
        indices[c++] = view[ptr + b++];
        indices[c++] = view[ptr + b++];
      }
    }
  }
  return indices;
}

// ─── Sprite Hash Database ────────────────────────────────────────────────────

let spriteHashes = new Map(); // CRC32 hash -> { id, sub }
let vosExpectedHashes = new Map(); // hash -> spriteId for VoS sprites

async function loadSpriteDatabase() {
  try {
    const res = await fetch(SHARED_DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json(); // array of { id, sub, hash }
    for (const entry of data) {
      spriteHashes.set(entry.hash, { id: entry.id, sub: entry.sub });
    }
    // Build reverse lookup for VoS sprites
    var vosIds = [24204, 24205, 24206, 24207, 24208, 24209, 24210, 24211];
    for (const entry of data) {
      if (vosIds.indexOf(entry.id) !== -1) {
        vosExpectedHashes.set(entry.hash, entry.id);
      }
    }
    return spriteHashes.size;
  } catch (e) {
    console.warn('Failed to load sprite database:', e);
    return 0;
  }
}

// ─── UI Sprite Extraction ────────────────────────────────────────────────────

async function getUISprites(renders) {
  const sprites = [];
  const eps = 0.4;
  // Size cap: skip texture regions whose pixel area exceeds this limit.
  // VoS icons are 80x80 (25KB). Large UI panels can be 2048x2048 (16MB) which OOMs.
  // Cap at 1MB per capture (262144 pixels = ~512x512).
  const MAX_CAPTURE_AREA = 262144;
  // Total capture limit to prevent memory exhaustion from many small captures
  const MAX_CAPTURES = 3000;
  var captureCount = 0;
  const diag = {
    total: renders.length,
    hasProgram: 0,
    isUi: 0,
    hasDiffuseMap: 0,
    hasTexture: 0,
    hasAtlasAttrs: 0,
    quadsProcessed: 0,
    quadsCanCapture: 0,
    quadsHashed: 0,
    skippedSize: 0,
    skippedCaptureCap: 0,
    skippedZeroTexbox: 0,
    skippedZeroScreen: 0,
    skippedWhitespace: 0
  };

  for (const render of renders) {
    if (!render.program || !render.vertexArray ||
        !render.vertexArray.attributes || render.vertexArray.attributes.length === 0) {
      try { render.dispose(); } catch (_) {}
      continue;
    }

    diag.hasProgram++;

    const isUi = render.program.inputs.some(function (i) { return i.name === 'aVertexPosition2D'; });
    if (!isUi) {
      try { render.dispose(); } catch (_) {}
      continue;
    }

    diag.isUi++;

    const diffuseUniform = render.program.uniforms.find(function (u) { return u.name === 'uDiffuseMap'; });
    if (!diffuseUniform || !diffuseUniform.snapshotTracked) continue;

    diag.hasDiffuseMap++;

    // Get sampler ID → use TextureSnapshot (has actual pixel data from texturesnapshot feature)
    const samplerValue = getUniformValue(render.uniformState, diffuseUniform);
    const samplerId = samplerValue[0][0];
    const tex = render.samplers[samplerId];
    if (!tex) {
      continue;
    }

    diag.hasTexture++;

    // Use base TrackedTexture dimensions for UV→pixel math.
    // TextureSnapshot.width/height can report buffer byte sizes, not pixel dimensions.
    const texW = (tex.base && tex.base.width) ? tex.base.width : tex.width;
    const texH = (tex.base && tex.base.height) ? tex.base.height : tex.height;
    try {
    const getters = {};
    for (const progInput of render.program.inputs) {
      const attr = render.vertexArray.attributes[progInput.location];
      if (attr && attr.enabled) {
        getters[progInput.name] = makeAttrGetter(attr);
      } else {
        getters[progInput.name] = function () { return 0; };
      }
    }

    if (!getters.aTextureUVAtlasMin || !getters.aTextureUVAtlasExtents) continue;

    diag.hasAtlasAttrs++;

    const indices = decodeIndices(render.vertexArray, render.renderRanges, render.renderMode, render.indexType);

    for (let a = 0; a < indices.length; a += 6) {
      if (a + 5 >= indices.length) break;

      diag.quadsProcessed++;

      const botright = indices[a + 0];
      const topleft  = indices[a + 2];
      const botleft  = indices[a + 3];

      let texboxx = Math.floor(texW * getters.aTextureUVAtlasMin(topleft, 0) + eps);
      let texboxy = Math.floor(texH * getters.aTextureUVAtlasMin(topleft, 1) + eps);
      let texboxw = Math.floor(texW * getters.aTextureUVAtlasExtents(topleft, 0) + eps);
      let texboxh = Math.floor(texH * getters.aTextureUVAtlasExtents(topleft, 1) + eps);

      texboxw = Math.abs(texboxw);
      texboxh = Math.abs(texboxh);

      if (texboxw === 0 || texboxh === 0) { diag.skippedZeroTexbox++; continue; }

      // Skip large texture regions — prevents OOM from huge ArrayBuffer allocations
      if (texboxw * texboxh > MAX_CAPTURE_AREA) { diag.skippedSize++; continue; }

      // Screen position
      const xb  = getters.aVertexPosition2D(botleft, 0);
      const yb  = getters.aVertexPosition2D(botleft, 1);
      const dxx = getters.aVertexPosition2D(botright, 0) - xb;
      const dyy = getters.aVertexPosition2D(topleft, 1)  - yb;

      if (dxx === 0 || dyy === 0) { diag.skippedZeroScreen++; continue; }

      if (getters.aTextureUV) {
        const samplex = Math.floor(texW * getters.aTextureUV(topleft, 0) + eps);
        const sampley = Math.floor(texH * getters.aTextureUV(topleft, 1) + eps);
        if (samplex < -60000 || sampley < -60000) { diag.skippedWhitespace++; continue; }
      }

      // Enforce capture limit
      if (captureCount >= MAX_CAPTURES) {
        diag.skippedCaptureCap++;
        continue;
      }

      diag.quadsCanCapture++;
      try {
        const fragImg = tex.capture(texboxx, texboxy, texboxw, texboxh);
        captureCount++;
        const hash = imgcrc(fragImg);
        const known = spriteHashes.get(hash);
        diag.quadsHashed++;

        sprites.push({
            spriteId: known ? known.id : -1,
            sub: known ? known.sub : 0,
            hash: hash,
            x: xb,
            y: yb,
            width: dxx,
            height: dyy,
            texW: texboxw,
            texH: texboxh,
            texture: tex,
            texX: texboxx,
            texY: texboxy
          });
      } catch (e) {
        if (!diag._captureErrors) diag._captureErrors = 0;
        if (diag._captureErrors < 3) {
          console.error('[VoS] capture/hash error:', e, 'coords:', texboxx, texboxy, texboxw, texboxh);
        }
        diag._captureErrors++;
      }
    }
    } catch (renderErr) {
      // Skip renders with invalid buffer data (e.g. pre-injection vertex buffers)
    }
  }

  // Size histogram and match stats
  var sizeHist = {};
  var anyDbMatch = 0;
  var vosLikeCount = 0;
  for (var si = 0; si < sprites.length; si++) {
    var s = sprites[si];
    var sizeKey = s.texW + 'x' + s.texH;
    sizeHist[sizeKey] = (sizeHist[sizeKey] || 0) + 1;
    if (s.spriteId !== -1) anyDbMatch++;
    // VoS icons are 80x80 — look for anything near that size
    if (s.texW >= 60 && s.texW <= 100 && s.texH >= 60 && s.texH <= 100) {
      vosLikeCount++;
    }
  }
  console.log('[VoS] Size histogram:', JSON.stringify(sizeHist));
  console.log('[VoS] DB matches: ' + anyDbMatch + '/' + sprites.length + ', VoS-sized (60-100px): ' + vosLikeCount);

  return { sprites: sprites, diag: diag };
}

// ─── VoS Detection ──────────────────────────────────────────────────────────

// Detection: match known VoS sprite IDs to clan names
function detectVoSClans(allSprites) {
  if (Object.keys(VOS_SPRITE_IDS).length === 0) return null;

  const matches = allSprites.filter(function (s) { return VOS_SPRITE_IDS[s.spriteId]; });
  if (matches.length < 2) return null;

  // Sort by X position (leftmost first)
  matches.sort(function (a, b) { return a.x - b.x; });

  // Deduplicate by sprite ID (take first occurrence)
  const seen = new Set();
  const unique = [];
  for (const m of matches) {
    if (!seen.has(m.spriteId)) {
      seen.add(m.spriteId);
      unique.push(m);
    }
  }

  if (unique.length >= 2) {
    return [VOS_SPRITE_IDS[unique[0].spriteId], VOS_SPRITE_IDS[unique[1].spriteId]];
  }
  return null;
}

// ─── Wiki Fallback ───────────────────────────────────────────────────────────

async function fetchCurrentVoS() {
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000) * 3600000;

  function isFresh(timestamp) {
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    if (isNaN(ts)) return false;
    return ts >= currentHour && ts < currentHour + 3600000;
  }

  // Try user's API first
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      if (data.district1 && data.district2) {
        if (data.timestamp && isFresh(data.timestamp)) {
          return { district1: data.district1, district2: data.district2, source: 'api' };
        }
      }
    }
  } catch (e) {
    // Fall through to wiki
  }

  // Try wiki API
  try {
    const res = await fetch('https://api.weirdgloop.org/runescape/vos');
    if (res.ok) {
      const data = await res.json();
      if (data.district1 && data.district2) {
        if (data.timestamp && isFresh(data.timestamp)) {
          return { district1: data.district1, district2: data.district2, source: 'wiki' };
        }
      }
    }
  } catch (e) {
    // No data available
  }

  return null;
}

// ─── DOM / UI ────────────────────────────────────────────────────────────────

let native = null;

document.addEventListener('DOMContentLoaded', async function () {
  native = window.alt1gl || window.native || (globalThis && globalThis.alt1gl);

  const status          = document.getElementById('status');
  const captureBtn      = document.getElementById('captureBtn');
  const previewRow      = document.getElementById('previewRow');
  const preview1        = document.getElementById('preview1');
  const preview2        = document.getElementById('preview2');
  const result          = document.getElementById('result');
  const logEl           = document.getElementById('log');
  const currentVos      = document.getElementById('currentVos');
  const currentVosClans = document.getElementById('currentVosClans');
  const currentVosSource = document.getElementById('currentVosSource');

  function log(msg) {
    const t = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.textContent = '[' + t + '] ' + msg;
    logEl.insertBefore(div, logEl.firstChild);
    if (logEl.children.length > 100) logEl.removeChild(logEl.lastChild);
  }

  function setStatus(text, cls) {
    status.textContent = text;
    status.className = 'status ' + cls;
  }

  function updateCurrentVosDisplay(district1, district2, source) {
    currentVosClans.textContent = district1 + ' & ' + district2;
    currentVosSource.textContent = 'Source: ' + (source === 'api' ? 'TechPure API' : source === 'wiki' ? 'Wiki API' : 'Detected');
    currentVos.style.display = 'block';
  }

  // Load sprite hash database
  const dbSize = await loadSpriteDatabase();
  if (dbSize > 0) {
    log('Loaded sprite database: ' + dbSize + ' hashes');
  } else {
    log('Sprite database unavailable');
  }

  // Fetch current VoS data
  const vosData = await fetchCurrentVoS();
  if (vosData) {
    log('Current VoS: ' + vosData.district1 + ' & ' + vosData.district2 + ' (from ' + vosData.source + ')');
    updateCurrentVosDisplay(vosData.district1, vosData.district2, vosData.source);
  } else {
    log('No current VoS data - capture to detect');
    result.textContent = 'No data available - capture to detect';
    result.className = 'result warn';
  }

  // ── Connection Check ─────────────────────────────────────────────────────

  if (!native) {
    setStatus('No native addon', 'err');
    log('Launch through Alt1GL Launcher');
    return;
  }

  log('Native addon found');

  function checkConnection() {
    try {
      if (native.getRsReady()) {
        const w = native.getRsWidth();
        const h = native.getRsHeight();
        setStatus('Connected ' + w + 'x' + h, 'ok');
        captureBtn.disabled = false;
        return true;
      }
    } catch (e) { /* ignore */ }
    setStatus('Waiting for RS3...', 'wait');
    captureBtn.disabled = true;
    return false;
  }

  checkConnection();
  setInterval(checkConnection, 3000);

  // ── Preview Drawing ──────────────────────────────────────────────────────

  function drawPreview(canvas, imageData) {
    const tmp = document.createElement('canvas');
    tmp.width = imageData.width;
    tmp.height = imageData.height;
    tmp.getContext('2d').putImageData(imageData, 0, 0);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }

  // ── Capture Button ───────────────────────────────────────────────────────

  captureBtn.addEventListener('click', async function () {
    if (!checkConnection()) return;
    captureBtn.disabled = true;
    result.textContent = '';
    log('Recording render calls...');

    let renders = null;
    try {
      renders = await native.recordRenderCalls({
        features: ['vertexarray', 'uniforms', 'texturesnapshot'],
        maxframes: 1
      });

      if (!renders || renders.length === 0) {
        log('No render calls captured - is the game visible?');
        result.textContent = 'No render data - ensure RS3 is rendering';
        result.className = 'result err';
        captureBtn.disabled = false;
        return;
      }

      log('Captured ' + renders.length + ' render invocations');

      // Extract all UI sprites
      const spriteResult = await getUISprites(renders);
      const allSprites = spriteResult.sprites;
      const diag = spriteResult.diag;
      var pipelineMsg = diag.hasProgram + ' valid -> ' +
        diag.isUi + ' UI -> ' +
        diag.hasDiffuseMap + ' diffuse -> ' +
        diag.hasTexture + ' tex -> ' +
        diag.hasAtlasAttrs + ' atlas -> ' +
        diag.quadsProcessed + ' quads -> ' +
        diag.quadsCanCapture + ' captured | ' +
        'skip: ' + diag.skippedZeroTexbox + ' zeroTex, ' +
        diag.skippedZeroScreen + ' zeroScreen, ' +
        diag.skippedWhitespace + ' white, ' +
        diag.skippedSize + ' large, ' +
        diag.skippedCaptureCap + ' cap';
      log('Identified ' + allSprites.length + ' UI sprites (pipeline: ' + pipelineMsg + ')');
      console.log('[VoS] Pipeline:', pipelineMsg);

      const clans = detectVoSClans(allSprites);
      if (clans && clans.length === 2) {
        log('Detected VoS: ' + clans[0] + ' & ' + clans[1]);
        result.textContent = 'Detected: ' + clans[0] + ' & ' + clans[1];
        result.className = 'result ok';

        // Show preview of first two matching sprites
        const matched = allSprites.filter(function (s) { return VOS_SPRITE_IDS[s.spriteId]; });
        matched.sort(function (a, b) { return a.x - b.x; });
        if (matched.length >= 2) {
          try {
            const img1 = await matched[0].texture.capture(matched[0].texX, matched[0].texY, matched[0].texW, matched[0].texH);
            const img2 = await matched[1].texture.capture(matched[1].texX, matched[1].texY, matched[1].texW, matched[1].texH);
            drawPreview(preview1, img1);
            drawPreview(preview2, img2);
            previewRow.style.display = 'flex';
          } catch (e) {
            // Preview is non-critical
          }
        }

        // Auto-submit after successful detection
        log('Auto-submitting to API...');
        try {
          const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ district1: clans[0], district2: clans[1] })
          });

          const data = await res.json().catch(function () { return null; });

          if (res.ok) {
            result.textContent = 'Submitted: ' + clans[0] + ' & ' + clans[1];
            result.className = 'result ok';
            log('API updated successfully');
            updateCurrentVosDisplay(clans[0], clans[1], 'detected');
            // Notify launcher to refresh daily info immediately
            if (window.appWindowApi && window.appWindowApi.notifyDailyInfoChanged) {
              window.appWindowApi.notifyDailyInfoChanged();
            }
          } else if (res.status === 429 && data) {
            result.textContent = 'Already reported: ' + data.district1 + ' & ' + data.district2;
            result.className = 'result ok';
            log('VoS already reported this hour');
            updateCurrentVosDisplay(data.district1, data.district2, 'api');
          } else {
            result.textContent = 'Detected but API error: ' + res.status;
            result.className = 'result warn';
            log('API error: HTTP ' + res.status);
          }
        } catch (e) {
          result.textContent = 'Detected but failed to reach API';
          result.className = 'result warn';
          log('API post failed: ' + e.message);
        }
      } else {
        log('Could not detect 2 VoS clans - found ' + (clans ? clans.length : 0) + ' matches');
        result.textContent = 'Detection failed - try again in Prifddinas';
        result.className = 'result warn';
      }

    } catch (e) {
      log('Capture failed: ' + (e.message || e));
      result.textContent = 'Capture failed: ' + (e.message || 'unknown error');
      result.className = 'result err';
    } finally {
      // Dispose all render invocations to release native handles and prevent memory leaks
      if (renders) {
        for (var i = 0; i < renders.length; i++) {
          try { renders[i].dispose(); } catch (_) {}
        }
        renders = null;
      }
    }

    captureBtn.disabled = false;
  });

  log('Ready - check current VoS or capture when in Prifddinas');
});
