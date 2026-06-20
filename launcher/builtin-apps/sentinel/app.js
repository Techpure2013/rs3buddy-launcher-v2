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
const APP = "Sentinel";
const hasAppData = !!(window.appWindowApi && window.appWindowApi.readAppData);
// appWindowApi.read/writeAppData are STRING-based (launcher does fs.read/writeFileSync
// utf-8), so JSON.stringify on write + JSON.parse on read. (Older builds wrote raw
// objects → "[object Object]" on disk; the try/catch below self-heals that.)
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
const STAT = { hp:"hitpoints", hitpoints:"hitpoints", health:"hitpoints", pray:"prayer", prayer:"prayer", adren:"adrenaline", adrenaline:"adrenaline", summ:"summoning", summoning:"summoning" };
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
function normalizePreset(raw) {
  const out = []; let id = 0;
  for (const a of (raw && raw.alerters) || []) {
    const type = norm(a.type || "chat");
    if (!["chat","actionbar","inactive"].includes(type)) continue;
    const lines = a.lines || [];
    const okChat = type === "chat" && lines.length > 0;
    const okBar = type === "actionbar" && typeof a.treshold === "number" && !!a.stat;
    const okTimer = type === "inactive" && typeof a.delay === "number";
    if (!okChat && !okBar && !okTimer) continue;
    const fire = [], reset = [];
    for (const l of lines) { if (l && l.text) (l.percent === 0 ? reset : fire).push(norm(l.text)); }
    const al = { id: id++, name: (a.name || "").trim() || ("Alert " + id), type,
      tooltip: (a.tooltip || "").trim(), sound: (a.alarm && a.alarm.sound) || null,
      dismiss: a.dismiss === "refocus" ? "refocus" : "timed", fireTexts: fire, resetTexts: reset };
    if (type === "actionbar") { al.stat = STAT[norm(a.stat)] || norm(a.stat); al.hl = a.higherlower === "higher" ? "higher" : "lower"; al.thresh = a.treshold; }
    else if (type === "inactive") al.delaySec = a.delay;
    out.push(al);
  }
  return { name: (raw && raw.name) || "Preset", alerters: out };
}
function resolveSound(ref) {
  if (!ref) return null;
  if (/^(file|data|https?):/i.test(ref) || /^[a-z]:[\\/]/i.test(ref) || ref.startsWith("/")) return ref;
  return "C:/Windows/Media/Alarm01.wav"; // upload:* and unknowns → default alarm
}

// ── Runtime ──
const TICK = 250, TOAST = 4500, RENAG = 2500, MAXT = 6, TIP_DX = 18, TIP_DY = 18;
let running = false, paused = false, timer = null;
let alerters = [], rt = new Map(), toasts = [], fires = 0, prevChat = [], lastActivity = 0;
let curX = 0, curY = 0, curSeq = -1, lastChat = "(none)";
let cursorTipActive = false, cursorTipSeq = -1, cursorTipSound = null, cursorTipAt = 0;
// Desktop "tooltip on your mouse" is a NATIVE engine capability: POST /api/tooltip
// {text} shows a click-through window pinned to the OS cursor anywhere on screen;
// DELETE /api/tooltip hides it. Works for any SDK consumer, not just the launcher.
let lastDrawKey = "", activeName = null, activeFile = null;

function logln(s) { const el = document.getElementById("log"); el.textContent += s + "\n"; el.scrollTop = el.scrollHeight; }
const hit = (line, needles) => needles.some((n) => n && line.includes(n));
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
  const g = await readPreset("globals.json"); const gl = g ? normalizePreset(g).alerters : [];
  const bl = boss ? normalizePreset(boss).alerters : [];
  alerters = [...gl, ...bl].map((a, i) => ({ ...a, id: i }));
  rt = new Map(alerters.map((a) => [a.id, { active:false, firedAt:0 }]));
  toasts = []; prevChat = []; lastActivity = Date.now();
}

function fire(a, now) {
  fires++;
  const f = resolveSound(a.sound); if (f) POST("/api/sound", { file:f, volume:1 });
  if (a.dismiss === "refocus") {
    // Desktop tooltip pinned to the real mouse anywhere on screen; the launcher
    // follows the global cursor, and we hide it when the mouse returns to RS.
    const tip = a.tooltip || a.name;
    cursorTipActive = true; cursorTipSeq = curSeq; cursorTipSound = a.sound; cursorTipAt = now;
    POST("/api/tooltip", { text: tip });
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
    // input first (mouse pos + seq) — drives tooltip placement + refocus dismiss
    const input = await GET("/api/input");
    if (input) { if (input.x != null) curX = input.x; if (input.y != null) curY = input.y; if (input.seq != null) curSeq = input.seq; }

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
          if (a.type === "chat" && a.fireTexts.length && hit(t, a.fireTexts)) fire(a, now);
        }
      }
      // ── bars + timers (evaluated every tick) ──
      const needBars = alerters.some((a) => a.type === "actionbar");
      const bars = needBars ? await GET("/api/bars") : null;
      for (const a of alerters) {
        const st = rt.get(a.id); if (!st) continue;
        if (a.type === "actionbar") {
          const bar = bars && bars.bars && bars.bars.find((b) => b.name === a.stat && b.found);
          if (bar && bar.value != null && bar.max) { const pct = bar.value / bar.max * 100; const inz = a.hl === "higher" ? pct >= a.thresh : pct <= a.thresh; if (inz && !st.active) { fire(a, now); st.active = true; st.firedAt = now; } if (!inz) st.active = false; }
        } else if (a.type === "inactive") {
          if (now - lastActivity >= a.delaySec * 1000) { if (!st.active) { fire(a, now); st.active = true; } } else st.active = false;
        } else if (a.type === "chat" && a.dismiss !== "refocus" && a.resetTexts.length === 0 && st.active && now - st.firedAt > TOAST) {
          st.active = false; // timed chat w/o a reset line re-arms after the banner window
        }
      }
      // ── desktop cursor tooltip: clear when the mouse returns to the game ──
      // seq bumps ONLY on mouse activity over the RS render window, so a change
      // since the tooltip fired means the user is back on the client.
      if (cursorTipActive) {
        if (curSeq !== cursorTipSeq) { DEL("/api/tooltip"); cursorTipActive = false; logln("✓ refocus — tooltip cleared"); }
        else if (now - cursorTipAt > RENAG) { const f = resolveSound(cursorTipSound); if (f) POST("/api/sound", { file:f, volume:1 }); cursorTipAt = now; }
      }
    }

    toasts = toasts.filter((t) => t.until > Date.now());
    await renderDraw();
    refreshStatus();
  } catch (e) { logln("tick error: " + (e && e.message)); }
}

// ── In-game overlay (draw layer; control lives in this window, display in-game) ──
function safe(s) { return (s || "").replace(/[\r\n]+/g, " "); }
function billboard(x, y, text, color, bg, fontSize) {
  return { kind:"billboard", anchor:{ mode:"screen", screen:{ x, y } }, text:safe(text),
    color, background:bg, padding:8, halign:"left", valign:"top", fontSize, group:"sentinel" };
}
async function renderDraw() {
  if (!running) return;
  const items = [];
  items.push(billboard(10, 10, `Sentinel: ${activeName || "globals"} (${paused ? "paused" : "on"})`, "#ffffff", "#000000cc", 13));
  let by = 42;
  for (const t of toasts) { items.push(billboard(10, by, t.name + (t.tip ? "  —  " + t.tip : ""), "#ffffff", t.color + "ee", 16)); by += 34; }
  const key = JSON.stringify(items);
  if (key === lastDrawKey) return; lastDrawKey = key;
  await POST("/api/draw/scene", items);
}

async function start() { if (timer) return; running = true; paused = false; lastActivity = Date.now(); timer = setInterval(tick, TICK); logln("started"); refreshStatus(); }
function pause() { paused = !paused; logln(paused ? "paused" : "resumed"); refreshStatus(); }
async function stop() { if (timer) clearInterval(timer); timer = null; running = false; paused = false; toasts = []; lastDrawKey = ""; DEL("/api/tooltip"); cursorTipActive = false; await DEL("/api/draw?group=sentinel"); await DEL("/api/draw"); logln("stopped"); refreshStatus(); }

function refreshStatus() {
  const pill = document.getElementById("runpill");
  pill.textContent = !running ? "stopped" : (paused ? "paused" : "running");
  pill.className = "pill " + (!running ? "" : (paused ? "pause" : "run"));
  document.getElementById("statline").textContent =
    (activeName ? `Preset: ${activeName}` : "Global alerts only") + ` · ${alerters.length} alerts · ${fires} fired · newest chat: ${lastChat}`;
}

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
  document.getElementById("json").value = JSON.stringify(boss || { name:"New preset", baseName:"", alerters:[] }, null, 2);
  document.getElementById("saveName").value = file || "";
  if (!running) await start();
  logln(`loaded ${activeName} (${alerters.length} alerts)`); refreshStatus();
}
function currentJson() { try { return JSON.parse(document.getElementById("json").value); } catch (e) { alert("Invalid JSON: " + e.message); return null; } }

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
  const a = { name: document.getElementById("aName").value || "Alert", type, tooltip: "", alarm: { sound: document.getElementById("aSound").value || null, repeat: false }, dismiss: document.getElementById("aDismiss").value };
  if (type === "chat") { a.lines = []; const f = document.getElementById("aFire").value.trim(); const r = document.getElementById("aReset").value.trim(); if (f) a.lines.push({ text:f, percent:100 }); if (r) a.lines.push({ text:r, percent:0 }); }
  else if (type === "actionbar") { a.stat = document.getElementById("aStat").value; a.higherlower = document.getElementById("aHL").value; a.treshold = Number(document.getElementById("aThresh").value); }
  else { a.delay = Number(document.getElementById("aDelay").value); }
  j.alerters.push(a); document.getElementById("json").value = JSON.stringify(j, null, 2); logln("added alert: " + a.name);
};

document.getElementById("importBtn").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return; let obj;
  try { obj = JSON.parse(await f.text()); } catch { alert("Not valid JSON"); return; }
  const file = f.name.toLowerCase().endsWith(".json") ? f.name : f.name + ".json";
  await writePreset(file, obj); await refreshPresetList(); document.getElementById("presetSel").value = file; logln("imported " + file);
};
document.getElementById("newBtn").onclick = () => { document.getElementById("json").value = JSON.stringify({ name:"New preset", baseName:"", alerters:[] }, null, 2); document.getElementById("saveName").value = ""; };
document.getElementById("dupBtn").onclick = () => { document.getElementById("saveName").value = ""; logln("edit the JSON + save under a new name"); };
document.getElementById("delBtn").onclick = async () => { const file = document.getElementById("presetSel").value; if (!file) return; if (!confirm("Delete " + file + "?")) return; await deletePresetFile(file); await refreshPresetList(); logln("deleted " + file); };
document.getElementById("saveBtn").onclick = async () => {
  const j = currentJson(); if (!j) return; let name = document.getElementById("saveName").value.trim(); if (!name) { alert("Enter a file name"); return; }
  if (!name.toLowerCase().endsWith(".json")) name += ".json";
  await writePreset(name, j); await refreshPresetList(); document.getElementById("presetSel").value = name; logln("saved " + name);
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
  document.getElementById("json").value = JSON.stringify({ name:"New preset", baseName:"", alerters:[] }, null, 2);
  await loadAlerters(null); // globals active even before a boss preset is chosen
  await start();            // begin monitoring immediately (polls input + shows status in-game)
  logln("Sentinel ready (" + (hasAppData ? "appData" : "localStorage") + "). Monitoring globals (stunned). Load a boss preset to add its alerts.");
})();
