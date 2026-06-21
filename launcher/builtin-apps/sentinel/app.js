"use strict";
// ── SDK transport (public API over loopback; CSP allows http://localhost:*) ──
const PORT = new URLSearchParams(location.search).get("port") || "4400";
const BASE = `http://127.0.0.1:${PORT}`;
async function api(method, path, body) {
  try {
    const r = await fetch(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json", "X-Client-Name": "sentinel" } : { "X-Client-Name": "sentinel" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
const GET = (p) => api("GET", p);
const POST = (p, b) => api("POST", p, b);
const DEL = (p) => api("DELETE", p);

// ── Preset storage (launcher appWindowApi → %APPDATA%, else localStorage) ──
// appWindowApi.read/writeAppData are STRING-based (launcher does fs.read/writeFileSync
// utf-8), so JSON.stringify on write + JSON.parse on read; the try/catch self-heals
// older "[object Object]" writes.
const APP = "Sentinel";
const hasAppData = !!(window.appWindowApi && window.appWindowApi.readAppData);
async function listPresetFiles() {
  if (hasAppData) {
    const idx = await window.appWindowApi.readAppData(APP, "index.json");
    try { return (idx ? JSON.parse(idx).files : []) || []; } catch { return []; }
  }
  return JSON.parse(localStorage.getItem("sentinel:index") || "[]");
}
async function setPresetIndex(files) {
  if (hasAppData) await window.appWindowApi.writeAppData(APP, "index.json", JSON.stringify({ files }));
  else localStorage.setItem("sentinel:index", JSON.stringify(files));
}
async function readPreset(file) {
  if (hasAppData) {
    const s = await window.appWindowApi.readAppData(APP, file);
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  }
  const s = localStorage.getItem("sentinel:" + file); return s ? JSON.parse(s) : null;
}
async function writePreset(file, obj) {
  const files = await listPresetFiles();
  if (!files.includes(file)) { files.push(file); await setPresetIndex(files); }
  if (hasAppData) await window.appWindowApi.writeAppData(APP, file, JSON.stringify(obj));
  else localStorage.setItem("sentinel:" + file, JSON.stringify(obj));
}
async function deletePresetFile(file) {
  const files = (await listPresetFiles()).filter((f) => f !== file);
  await setPresetIndex(files);
  if (hasAppData) await window.appWindowApi.writeAppData(APP, file, JSON.stringify(null));
  else localStorage.removeItem("sentinel:" + file);
}

// ── Preset normalisation (AFK Warden format → evaluable alerters) ──
const STAT = { hp:"hitpoints", hitpoints:"hitpoints", hitpoint:"hitpoints", health:"hitpoints", life:"hitpoints", constitution:"hitpoints",
  pray:"prayer", prayer:"prayer",
  adren:"adrenaline", adrenaline:"adrenaline", adrenalin:"adrenaline",
  sum:"summoning", summ:"summoning", summon:"summoning", summoning:"summoning" };
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
// Supported alerter types. AFK Warden also ships dialogtextsimple / craftmenu /
// xpcounter / etc. — those need game-UI readers (dialog box, production menu, XP
// counter) we don't expose, so they're collected in `skipped` and reported, not
// silently dropped.
const SUPPORTED = ["chat", "actionbar", "inactive"];
function normalizePreset(raw) {
  const out = []; const skipped = []; let id = 0;
  for (const a of (raw && raw.alerters) || []) {
    const type = norm(a.type || "chat");
    const nm = (a.name || "").trim();
    if (!SUPPORTED.includes(type)) { if (nm) skipped.push({ name: nm, type }); continue; }
    const lines = a.lines || [];
    const okChat = type === "chat" && lines.length > 0;
    const okBar = type === "actionbar" && typeof a.treshold === "number" && !!a.stat;
    const okTimer = type === "inactive" && typeof a.delay === "number";
    if (!okChat && !okBar && !okTimer) { if (nm) skipped.push({ name: nm, type }); continue; }
    const fire = [], reset = [];
    for (const l of lines) { if (l && l.text) (l.percent === 0 ? reset : fire).push(norm(l.text)); }
    const al = { id: id++, name: nm || ("Alert " + id), type,
      tooltip: (a.tooltip || "").trim(), sound: (a.alarm && a.alarm.sound) || null,
      audioData: (a.alarm && a.alarm.audioData) || null, audioMime: (a.alarm && a.alarm.audioMime) || null,
      tooltipImage: a.tooltipImage || null, tooltipImageMime: a.tooltipImageMime || null,
      dismiss: a.dismiss === "refocus" ? "refocus" : "timed", fireTexts: fire, resetTexts: reset };
    if (type === "actionbar") { al.stat = STAT[norm(a.stat)] || norm(a.stat); al.hl = a.higherlower === "higher" ? "higher" : "lower"; al.thresh = a.treshold; }
    else if (type === "inactive") al.delaySec = a.delay;
    out.push(al);
  }
  return { name: (raw && raw.name) || "Preset", alerters: out, skipped };
}
// ── Audio: played IN-APP via Web Audio (this window is an Electron renderer).
//    The launcher runs the engine as plain node with NO audio host, so POST
//    /api/sound is silent there; Web Audio also dodges the window CSP + file://
//    limits since it decodes raw bytes (no URL loaded). Embedded base64 and
//    http(s) URLs decode to buffers; anything else (file path / upload:*) beeps. ──
let _actx = null;
function actx() { if (!_actx) _actx = new AudioContext(); if (_actx.state === "suspended") _actx.resume(); return _actx; }
function beep() {
  try {
    const ctx = actx(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "square"; o.frequency.value = 880; g.gain.value = 0.18; o.connect(g); g.connect(ctx.destination);
    o.start(); g.gain.setTargetAtTime(0.0001, ctx.currentTime + 0.22, 0.05); o.stop(ctx.currentTime + 0.45);
  } catch {}
}
function playBuffer(arrbuf) { try { actx().decodeAudioData(arrbuf, (buf) => { const ctx = actx(); const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(); }, () => beep()); } catch { beep(); } }
function playEmbedded(b64) { try { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); playBuffer(u8.buffer); } catch { beep(); } }
async function playUrl(url) { try { const r = await fetch(url); playBuffer(await r.arrayBuffer()); } catch { beep(); } }

// ── Runtime ──
const TICK = 250, TOAST = 4500, RENAG = 2500, MAXT = 6;
let running = false, paused = false, timer = null;
let alerters = [], rt = new Map(), toasts = [], fires = 0, prevChat = [], lastActivity = 0;
let curSeq = -1, lastChat = "(none)";
let cursorTipActive = false, cursorTipSeq = -1, cursorTipAlerter = null, cursorTipAt = 0;
let lastDrawKey = "", activeName = null, activeFile = null, collapsed = true, skippedAlerters = [];
// "Tooltip on your mouse" is a NATIVE engine capability (POST /api/tooltip): a
// click-through window pinned to the OS cursor anywhere on screen.

function logln(s) { const el = document.getElementById("log"); el.textContent += s + "\n"; el.scrollTop = el.scrollHeight; }
// Match-time normalisation: lower-case, drop punctuation, and collapse the RS-font
// look-alikes i/l/1 — AFK Warden presets are full of l↔i OCR typos ("Butterfiy",
// "famiiiar", "successfuliy") that our cleaner reader spells correctly, so an exact
// substring match would never fire. Collapsing them bridges both spellings.
const matchNorm = (s) => (s == null ? "" : String(s)).toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/[il1]/g, "l").replace(/\s+/g, " ").trim();
const hit = (line, needles) => { const L = matchNorm(line); return needles.some((n) => { const m = matchNorm(n); return m && L.includes(m); }); };
const esc = (s) => (s == null ? "" : String(s)).replace(/[\r\n]+/g, " ");
// Lines NEW this tick (multiset diff vs last tick) — process each chat message
// once, on the tick it appears. Robust to NXT fade garbling: a clean capture of a
// message is a distinct (new) text, so it still registers as fresh and matches.
function freshLines(prev, cur) {
  const c = new Map();
  for (const t of prev) c.set(t, (c.get(t) || 0) + 1);
  const out = [];
  for (const t of cur) { const n = c.get(t) || 0; if (n > 0) c.set(t, n - 1); else out.push(t); }
  return out;
}
function pickColor(a) {
  const n = (a.name + " " + (a.tooltip || "")).toLowerCase();
  if (/hp|health|heal|pray|low|stun|death|\bdie\b|lobby/.test(n)) return "#c0392b";
  if (/overload|antifire|antipoison|aura|book|poison|familiar|incense|cannon/.test(n)) return "#2d6cdf";
  return "#d98a1f";
}

async function loadAlerters(boss) {
  const g = await readPreset("globals.json"); const gp = g ? normalizePreset(g) : { alerters: [], skipped: [] };
  const bp = boss ? normalizePreset(boss) : { alerters: [], skipped: [] };
  alerters = [...gp.alerters, ...bp.alerters].map((a, i) => ({ ...a, id: i, enabled: true }));
  skippedAlerters = bp.skipped.concat(gp.skipped);
  rt = new Map(alerters.map((a) => [a.id, { active:false, firedAt:0 }]));
  toasts = []; prevChat = []; lastActivity = Date.now();
}

function playSound(a) {
  if (a && a.audioData) return playEmbedded(a.audioData);   // embedded → travels with the preset
  const ref = a && a.sound;
  if (ref && /^https?:/i.test(ref)) return playUrl(ref);    // hosted URL
  beep();                                                   // file path / upload:* / none → default beep
}

function fire(a, now) {
  fires++;
  playSound(a);
  if (a.dismiss === "refocus") {
    // Desktop tooltip pinned to the real mouse anywhere on screen; cleared when
    // the mouse returns to the RS client (seq bump).
    cursorTipActive = true; cursorTipSeq = curSeq; cursorTipAlerter = a; cursorTipAt = now;
    // exclusive: an image tooltip if one is attached, else the text pill
    if (a.tooltipImage) POST("/api/tooltip", { image: a.tooltipImage });
    else POST("/api/tooltip", { text: a.tooltip || a.name });
    logln("▸ FIRE: " + a.name + " — tooltip follows your mouse until you return to the game");
  } else {
    toasts.push({ name:a.name, tip:a.tooltip, color:pickColor(a), until: now + TOAST });
    if (toasts.length > MAXT) toasts = toasts.slice(-MAXT);
    logln("▸ FIRE: " + a.name);
  }
}

async function tick() {
  try {
    const now = Date.now();
    // input first (mouse seq) — drives the refocus tooltip dismiss
    const input = await GET("/api/input");
    if (input && input.seq != null) curSeq = input.seq;

    // in-game panel interaction: collapse the header / toggle an alert on|off.
    // The engine hit-tests; we drain the click events here. Works while paused.
    const uev = await GET("/api/ui/events");
    for (const e of (uev && uev.events) || []) {
      if (e.type === "close") { collapsed = true; continue; }
      if (e.type !== "click" || !e.id) continue;
      if (e.id === "hdr") collapsed = !collapsed;
      else if (e.id.indexOf("toggle:") === 0) {
        const a = alerters[+e.id.slice(7)];
        if (a) { a.enabled = !a.enabled; const st = rt.get(a.id); if (st) st.active = false; logln((a.enabled ? "● enabled " : "○ muted ") + a.name); }
      }
    }

    if (!paused && alerters.length) {
      // ── chat: scan EVERY newly-appeared line (not just the newest) so a clean
      //    capture of a message fires it even when nearby captures are garbled by
      //    NXT's chat fade. Each line is "fresh" only the tick it shows up.
      const chat = await GET("/api/chat");
      const cur = [];
      for (const l of (chat && chat.lines) || []) { const t = norm(l.text); if (t) cur.push(t); }
      lastChat = cur.length ? cur[cur.length - 1] : "(none)";
      const fresh = freshLines(prevChat, cur);
      prevChat = cur;
      if (fresh.length) lastActivity = now;
      for (const t of fresh) {
        logln("chat: " + t);
        for (const a of alerters) {
          if (a.type === "chat" && a.enabled && a.fireTexts.length && hit(t, a.fireTexts)) fire(a, now);
        }
      }
      // ── bars + timers (evaluated every tick) ──
      const needBars = alerters.some((a) => a.type === "actionbar" && a.enabled);
      const bars = needBars ? await GET("/api/bars") : null;
      for (const a of alerters) {
        const st = rt.get(a.id); if (!st) continue;
        if (!a.enabled) { st.active = false; continue; }
        if (a.type === "actionbar") {
          const bar = bars && bars.bars && bars.bars.find((b) => b.name === a.stat && b.found);
          if (bar && bar.value != null && bar.max) { const pct = bar.value / bar.max * 100; const inz = a.hl === "higher" ? pct >= a.thresh : pct <= a.thresh; if (inz && !st.active) { fire(a, now); st.active = true; st.firedAt = now; } if (!inz) st.active = false; }
        } else if (a.type === "inactive") {
          if (now - lastActivity >= a.delaySec * 1000) { if (!st.active) { fire(a, now); st.active = true; } } else st.active = false;
        }
      }
      // ── desktop cursor tooltip: clear when the mouse returns to the game ──
      // seq bumps ONLY on mouse activity over the RS render window, so a change
      // since the tooltip fired means the user is back on the client.
      if (cursorTipActive) {
        if (curSeq !== cursorTipSeq) { DEL("/api/tooltip"); cursorTipActive = false; logln("✓ refocus — tooltip cleared"); }
        else if (now - cursorTipAt > RENAG) { playSound(cursorTipAlerter); cursorTipAt = now; }
      }
    }

    toasts = toasts.filter((t) => t.until > Date.now());
    await renderUI();
    refreshStatus();
  } catch (e) { logln("tick error: " + (e && e.message)); }
}

// ── In-game overlay: interactive UI layer. The engine hit-tests clicks; we poll
//    GET /api/ui/events (drained in tick). One panel: a collapsible header + a row
//    per loaded alert (name + on/off toggle) + active fire banners. Interactive
//    rows consume the click so it doesn't reach the game. Re-POSTed only on change.
async function renderUI() {
  if (!running) return;
  const on = alerters.filter((a) => a.enabled).length, off = alerters.length - on;
  // Header bar: the title is the DRAG HANDLE (drag to move the panel — the engine
  // remembers the dragged origin across re-renders); the ▸/▾ on the right is a
  // separate clickable target for collapse, so a drag never toggles collapse.
  const kids = [{
    type: "row",
    props: { draggable: true, justify: "between", align: "center", gap: 12, pad: [5, 9], radius: 6, bg: paused ? "#5a3a00d8" : "#000000cc" },
    children: [
      { type: "label", props: { draggable: true, fontSize: 14, color: "#fff",
        text: `Sentinel · ${esc(activeName || "globals")} — ${on} on${off ? ` / ${off} off` : ""}` }, children: [] },
      { type: "button", props: { id: "hdr", clickable: true, variant: "plain", icon: collapsed ? "caretRight" : "caretDown", iconSize: 16, color: "#fff", width: 30, height: 24, radius: 5 }, children: [] },
    ],
  }];
  if (!collapsed) {
    alerters.forEach((a, i) => kids.push({
      type: "row",
      props: { id: `toggle:${i}`, clickable: true, justify: "between", gap: 12, pad: [3, 7], radius: 5, bg: a.enabled ? "#14351bdd" : "#262626dd" },
      children: [
        { type: "label", props: { text: esc(a.name), fontSize: 13, color: a.enabled ? "#e8e8e8" : "#8a8a8a" }, children: [] },
        { type: "label", props: { text: a.enabled ? "● ON" : "○ off", fontSize: 12, color: a.enabled ? "#3ad15a" : "#777" }, children: [] },
      ],
    }));
    if (!alerters.length) kids.push({ type: "label", props: { text: "(no alerts loaded)", fontSize: 12, color: "#999", pad: [2, 7] }, children: [] });
  }
  for (const t of toasts) kids.push({ type: "label", props: { text: esc(t.name + (t.tip ? " — " + t.tip : "")), fontSize: 15, color: "#fff", bg: (t.color || "#d98a1f") + "ee", pad: [6, 9], radius: 6 }, children: [] });
  const tree = { type: "panel", props: { anchor: "top-left", pad: 8, gap: 5, bg: "#0c0c0cb3", radius: 10, color: "#fff" }, children: kids };
  const key = JSON.stringify(tree);
  if (key === lastDrawKey) return; lastDrawKey = key;
  await POST("/api/ui", tree);
}

async function start() { if (timer) return; running = true; paused = false; lastActivity = Date.now(); timer = setInterval(tick, TICK); logln("started"); refreshStatus(); }
function pause() { paused = !paused; logln(paused ? "paused" : "resumed"); refreshStatus(); }
async function stop() { if (timer) clearInterval(timer); timer = null; running = false; paused = false; toasts = []; lastDrawKey = ""; DEL("/api/tooltip"); cursorTipActive = false; await DEL("/api/ui"); DEL("/api/draw?group=sentinel"); logln("stopped"); refreshStatus(); }

function refreshStatus() {
  const pill = document.getElementById("runpill");
  pill.textContent = !running ? "stopped" : (paused ? "paused" : "running");
  pill.className = "pill " + (!running ? "" : (paused ? "pause" : "run"));
  document.getElementById("statline").textContent =
    (activeName ? `Preset: ${activeName}` : "Global alerts only") + ` · ${alerters.length} alerts${skippedAlerters.length ? ` (${skippedAlerters.length} skipped)` : ""} · ${fires} fired · newest chat: ${lastChat}`;
}

// ── JSON textarea (programmatic set → also refresh the Sounds list) ──
function setJson(obj) { document.getElementById("json").value = JSON.stringify(obj, null, 2); renderSounds(); }
function currentJson() { try { return JSON.parse(document.getElementById("json").value); } catch (e) { alert("Invalid JSON: " + e.message); return null; } }

// ── Preset list + load ──
async function refreshPresetList() {
  const sel = document.getElementById("presetSel");
  const files = (await listPresetFiles()).filter((f) => f !== "globals.json");
  sel.innerHTML = files.map((f) => `<option value="${f}">${f}</option>`).join("") || `<option value="">(no boss presets)</option>`;
}
async function loadSelected() {
  const file = document.getElementById("presetSel").value;
  const boss = file ? await readPreset(file) : null;
  activeFile = file || null; activeName = boss ? (boss.name || file) : "Global alerts";
  await loadAlerters(boss);
  setJson(boss || { name:"New preset", baseName:"", alerters:[] });
  document.getElementById("saveName").value = file || "";
  if (!running) await start();
  logln(`loaded ${activeName} (${alerters.length} alerts)`);
  if (skippedAlerters.length) logln("⚠ " + skippedAlerters.length + " unsupported alert(s) skipped: " + skippedAlerters.map((s) => `${s.name} [${s.type}]`).join(", "));
  refreshStatus();
}

document.getElementById("loadBtn").onclick = loadSelected;
document.getElementById("startBtn").onclick = () => start();
document.getElementById("pauseBtn").onclick = () => pause();
document.getElementById("stopBtn").onclick = () => stop();
document.getElementById("testBtn").onclick = () => { if (!alerters.length) loadAlerters(null).then(() => { if (alerters[0]) fire(alerters[0], Date.now()); }); else if (alerters[0]) fire(alerters[0], Date.now()); };
document.getElementById("testStun").onclick = () => fire({ name:"Stunned — return to the client!", tooltip:"You've been stunned. Move your mouse back to the game.", dismiss:"refocus", sound:"upload:0:stunned" }, Date.now());

document.getElementById("aType").onchange = (e) => {
  document.getElementById("fChat").classList.toggle("hide", e.target.value !== "chat");
  document.getElementById("fBar").classList.toggle("hide", e.target.value !== "actionbar");
  document.getElementById("fTimer").classList.toggle("hide", e.target.value !== "inactive");
};
document.getElementById("addBtn").onclick = () => {
  const j = currentJson(); if (!j) return; if (!Array.isArray(j.alerters)) j.alerters = [];
  const type = document.getElementById("aType").value;
  const a = { name: document.getElementById("aName").value || "Alert", type, tooltip: document.getElementById("aTip").value.trim(), alarm: { sound: document.getElementById("aSound").value || null, repeat: false }, dismiss: document.getElementById("aDismiss").value };
  if (type === "chat") { a.lines = []; const f = document.getElementById("aFire").value.trim(); const r = document.getElementById("aReset").value.trim(); if (f) a.lines.push({ text:f, percent:100 }); if (r) a.lines.push({ text:r, percent:0 }); }
  else if (type === "actionbar") { a.stat = document.getElementById("aStat").value; a.higherlower = document.getElementById("aHL").value; a.treshold = Number(document.getElementById("aThresh").value); }
  else { a.delay = Number(document.getElementById("aDelay").value); }
  j.alerters.push(a); setJson(j); logln("added alert: " + a.name);
};

document.getElementById("importBtn").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return; let obj;
  try { obj = JSON.parse(await f.text()); } catch { alert("Not valid JSON"); return; }
  const file = f.name.toLowerCase().endsWith(".json") ? f.name : f.name + ".json";
  await writePreset(file, obj); await refreshPresetList(); document.getElementById("presetSel").value = file; logln("imported " + file);
};
document.getElementById("newBtn").onclick = () => { setJson({ name:"New preset", baseName:"", alerters:[] }); document.getElementById("saveName").value = ""; };
document.getElementById("dupBtn").onclick = () => { document.getElementById("saveName").value = ""; logln("edit the JSON + save under a new name"); };
document.getElementById("delBtn").onclick = async () => { const file = document.getElementById("presetSel").value; if (!file) return; if (!confirm("Delete " + file + "?")) return; await deletePresetFile(file); await refreshPresetList(); logln("deleted " + file); };
document.getElementById("saveBtn").onclick = async () => {
  const j = currentJson(); if (!j) return; let name = document.getElementById("saveName").value.trim(); if (!name) { alert("Enter a file name"); return; }
  if (!name.toLowerCase().endsWith(".json")) name += ".json";
  await writePreset(name, j); await refreshPresetList(); document.getElementById("presetSel").value = name; logln("saved " + name);
};

// ── Sounds: attach audio per alert so it travels INSIDE the shared preset ──
let _attachIdx = -1;
const escHtml = (s) => (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const b64kb = (s) => Math.round((s.length * 0.75) / 1024);
function fileToBase64(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const s = String(r.result); res(s.slice(s.indexOf(",") + 1)); }; r.onerror = rej; r.readAsDataURL(f); }); }
function renderSounds() {
  const host = document.getElementById("soundsList"); if (!host) return;
  let j; try { j = JSON.parse(document.getElementById("json").value); } catch { host.innerHTML = '<p class="muted">Fix the preset JSON to manage sounds.</p>'; return; }
  const al = (j && j.alerters) || [];
  if (!al.length) { host.innerHTML = '<p class="muted">No alerts in this preset yet.</p>'; return; }
  host.innerHTML = "";
  al.forEach((a, i) => {
    const am = a.alarm || {}; const has = !!am.audioData;
    const status = has ? `embedded ✓ (${b64kb(am.audioData)} KB)` : (am.sound ? escHtml(am.sound) : "default alarm");
    const row = document.createElement("div"); row.className = "row sb sndrow";
    const left = document.createElement("div"); left.style.cssText = "display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;";
    const nameEl = document.createElement("span"); nameEl.style.fontWeight = "600"; nameEl.textContent = a.name || "Alert " + (i + 1); left.appendChild(nameEl);
    // tooltip: an IMAGE or TEXT — mutually exclusive (one replaces the other)
    const tipRow = document.createElement("div"); tipRow.className = "row"; tipRow.style.cssText = "gap:6px;align-items:center;";
    if (a.tooltipImage) {
      const img = document.createElement("img"); img.src = `data:${a.tooltipImageMime || "image/png"};base64,${a.tooltipImage}`;
      img.style.cssText = "height:34px;max-width:140px;border-radius:4px;background:#00000033;"; tipRow.appendChild(img);
      const lbl = document.createElement("span"); lbl.className = "muted"; lbl.style.fontSize = "12px"; lbl.textContent = "tooltip = image"; tipRow.appendChild(lbl);
      const rm = document.createElement("button"); rm.textContent = "Remove image"; rm.onclick = () => { delete a.tooltipImage; delete a.tooltipImageMime; commitSounds(j); }; tipRow.appendChild(rm);
    } else {
      const tip = document.createElement("input"); tip.type = "text"; tip.placeholder = "tooltip text shown when it fires…"; tip.value = a.tooltip || "";
      tip.style.cssText = "width:230px;max-width:48vw;font-size:12px;padding:3px 6px;";
      tip.onchange = () => { a.tooltip = tip.value.trim(); commitSounds(j); };
      tipRow.appendChild(tip);
      const useImg = document.createElement("button"); useImg.textContent = "Use image…"; useImg.title = "Show an image on the cursor instead of text"; useImg.onclick = () => { _imgIdx = i; document.getElementById("imageFile").click(); }; tipRow.appendChild(useImg);
    }
    left.appendChild(tipRow);
    const st = document.createElement("span"); st.className = "muted"; st.style.fontSize = "12px"; st.textContent = "sound: " + status; left.appendChild(st);
    const btns = document.createElement("div"); btns.className = "row";
    const att = document.createElement("button"); att.textContent = has ? "Replace…" : "Attach…"; att.onclick = () => { _attachIdx = i; document.getElementById("soundFile").click(); };
    btns.appendChild(att);
    if (has) {
      const prev = document.createElement("button"); prev.textContent = "▶"; prev.title = "Preview sound"; prev.onclick = () => playEmbedded(am.audioData); btns.appendChild(prev);
      const clr = document.createElement("button"); clr.textContent = "✕"; clr.title = "Remove embedded sound"; clr.className = "warn"; clr.onclick = () => { delete a.alarm.audioData; delete a.alarm.audioMime; commitSounds(j); }; btns.appendChild(clr);
    }
    row.appendChild(left); row.appendChild(btns); host.appendChild(row);
  });
}
async function commitSounds(j) {
  document.getElementById("json").value = JSON.stringify(j, null, 2);
  renderSounds();
  const name = document.getElementById("saveName").value.trim();
  if (name) {
    const file = name.toLowerCase().endsWith(".json") ? name : name + ".json";
    await writePreset(file, j); await refreshPresetList(); document.getElementById("presetSel").value = file;
    if (file === activeFile) { await loadAlerters(await readPreset(file)); refreshStatus(); } // make new sounds live
  }
}
document.getElementById("soundFile").onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f || _attachIdx < 0) return;
  if (f.size > 3 * 1024 * 1024 && !confirm(`${f.name} is ${(f.size / 1048576).toFixed(1)} MB — embedding it makes the preset that much bigger to share. Continue?`)) return;
  let j; try { j = JSON.parse(document.getElementById("json").value); } catch { alert("Fix the preset JSON first."); return; }
  if (!j.alerters || !j.alerters[_attachIdx]) return;
  const b64 = await fileToBase64(f);
  const a = j.alerters[_attachIdx];
  a.alarm = Object.assign({}, a.alarm, { sound: f.name, audioData: b64, audioMime: f.type || "audio/wav" });
  commitSounds(j); logln("attached " + f.name + " → " + (a.name || "alert " + (_attachIdx + 1)));
};

// Attach a tooltip IMAGE to an alert (exclusive with the text tooltip).
let _imgIdx = -1;
document.getElementById("imageFile").onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f || _imgIdx < 0) return;
  if (f.size > 2 * 1024 * 1024 && !confirm(`${f.name} is ${(f.size / 1048576).toFixed(1)} MB — large images bloat the preset to share. Continue?`)) return;
  let j; try { j = JSON.parse(document.getElementById("json").value); } catch { alert("Fix the preset JSON first."); return; }
  if (!j.alerters || !j.alerters[_imgIdx]) return;
  const b64 = await fileToBase64(f);
  const a = j.alerters[_imgIdx];
  a.tooltipImage = b64; a.tooltipImageMime = f.type || "image/png";
  delete a.tooltip; // EXCLUSIVE — the image replaces the text tooltip
  commitSounds(j); logln("tooltip image set on " + (a.name || "alert " + (_imgIdx + 1)));
};

// ── Connection poll + seed ──
async function seedGlobals() {
  if (await readPreset("globals.json")) return;
  await writePreset("globals.json", { name:"Global alerts", baseName:"global", alerters:[
    { name:"Stunned — return to the client!", type:"chat", tooltip:"You've been stunned. Move your mouse back to the game.",
      alarm:{ sound:"upload:0:stunned", repeat:true }, dismiss:"refocus", lines:[{ text:"You've been stunned.", percent:100 }] }
  ]});
  logln("seeded Global alerts (stunned)");
}
setInterval(async () => {
  const s = await GET("/api/status"); const ok = !!(s && s.connected);
  document.getElementById("dot").className = ok ? "on" : "off";
  document.getElementById("conn").textContent = ok ? `connected · :${PORT}` : `no engine on :${PORT}`;
}, 2000);

(async () => {
  await seedGlobals(); await refreshPresetList();
  setJson({ name:"New preset", baseName:"", alerters:[] });
  let sndDebounce;
  document.getElementById("json").addEventListener("input", () => { clearTimeout(sndDebounce); sndDebounce = setTimeout(renderSounds, 200); });
  await loadAlerters(null); // globals active even before a boss preset is chosen
  DEL("/api/draw?group=sentinel"); // clear stale billboards from the earlier draw-layer build
  await start();            // begin monitoring immediately (polls input + shows status in-game)
  logln("Sentinel ready (" + (hasAppData ? "appData" : "localStorage") + "). Monitoring globals (stunned). Load a boss preset to add its alerts.");
})();
