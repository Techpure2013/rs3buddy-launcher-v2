/**
 * RS3 Daily Info - Fetches daily game data from community APIs and calculates rotations
 */
import * as https from 'https';

// === Types ===
export interface VoiceOfSeren {
  district1: string;
  district2: string;
}

export interface VisWax {
  slot1: string;
  slot2: string[];
  slot3: string;
}

export interface DailyInfo {
  vos: VoiceOfSeren | null;
  visWax: VisWax | null;
  spotlight: string;
  resetCountdown: { hours: number; minutes: number; seconds: number };
}

// === Cache (5 min TTL) ===
let cache: { data: DailyInfo | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

/** Invalidate the cache so the next getDailyInfo() fetches fresh data */
export function clearDailyInfoCache(): void {
  cache = { data: null, timestamp: 0 };
}

// === HTTP helper ===
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// === Voice of Seren ===
async function fetchVoS(): Promise<VoiceOfSeren | null> {
  // Freshness check: VoS changes every UTC hour
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000) * 3600000;
  function isFresh(timestamp: any): boolean {
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(ts)) return false;
    return ts >= currentHour && ts < currentHour + 3600000;
  }

  // Try techpure.dev first (custom endpoint), fallback to WeirdGloop
  const endpoints = [
    'https://techpure.dev/api/vos',
    'https://api.weirdgloop.org/runescape/vos'
  ];
  for (const url of endpoints) {
    try {
      const raw = await fetchUrl(url);
      const data = JSON.parse(raw);
      if (data.district1 && data.district2) {
        // Only accept data from the current hour
        if (data.timestamp && !isFresh(data.timestamp)) {
          console.log(`[DailyInfo] VoS data from ${url} is stale, trying next`);
          continue;
        }
        return { district1: data.district1, district2: data.district2 };
      }
    } catch (e) {
      console.error(`[DailyInfo] VoS fetch failed from ${url}:`, e);
      continue;
    }
  }
  return null;
}

// === VIS Wax (Rune Goldberg Machine) ===
async function fetchVisWax(): Promise<VisWax | null> {
  try {
    const url = 'https://runescape.wiki/api.php?action=parse&title=API&text={{Rune+Goldberg+Machine/Current+combinations}}&format=json&prop=text&disablelimitreport=1&contentmodel=wikitext';
    const raw = await fetchUrl(url);
    const data = JSON.parse(raw);
    const html: string = data?.parse?.text?.['*'] || '';

    // Extract rune names from <a> tags with title="X rune"
    // First table: row 3 has slot1 rune (rowspan=3), rows 3-5 have slot2 runes
    const runePattern = /<a[^>]+title="(\w[\w\s]*?) rune"[^>]*>\w[\w\s]*?<\/a>/g;
    const allRunes: string[] = [];
    let match;
    while ((match = runePattern.exec(html)) !== null) {
      allRunes.push(match[1]);
    }

    // First table structure: Slot1 rune appears first, then Slot2 runes (3 options)
    // The first occurrence is slot1, next 3 unique ones are slot2
    if (allRunes.length === 0) return null;

    const slot1 = allRunes[0];
    const slot2: string[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < allRunes.length && slot2.length < 3; i++) {
      if (!seen.has(allRunes[i])) {
        seen.add(allRunes[i]);
        slot2.push(allRunes[i]);
      }
    }

    return { slot1, slot2, slot3: 'Random (use RC cape to check)' };
  } catch (e) {
    console.error('[DailyInfo] VIS Wax fetch failed:', e);
    return null;
  }
}

// === Minigame Spotlight (3-day rotation, 27 minigames) ===
const SPOTLIGHT_GAMES = [
  'Pest Control', 'Soul Wars', 'Fist of Guthix', 'Barbarian Assault',
  'Conquest', 'Castle Wars', 'Stealing Creation', 'Cabbage Facepunch Bonanza',
  'Heist', 'Mobilising Armies', 'Barbarian Assault', 'Conquest',
  'Fist of Guthix', 'Castle Wars', 'Pest Control', 'Soul Wars',
  'Stealing Creation', 'Cabbage Facepunch Bonanza', 'Heist',
  'Mobilising Armies', 'Castle Wars', 'Fist of Guthix', 'Pest Control',
  'Barbarian Assault', 'Soul Wars', 'Conquest', 'Stealing Creation'
];
// Epoch: January 1, 2024 00:00 UTC was Pest Control (index 0)
const SPOTLIGHT_EPOCH = Date.UTC(2024, 0, 1);
const SPOTLIGHT_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function getSpotlight(): string {
  const now = Date.now();
  const elapsed = now - SPOTLIGHT_EPOCH;
  const index = Math.floor(elapsed / SPOTLIGHT_PERIOD_MS) % SPOTLIGHT_GAMES.length;
  return SPOTLIGHT_GAMES[index];
}

// === Reset Countdown ===
function getResetCountdown(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

// === Main fetch function ===
export async function getDailyInfo(): Promise<DailyInfo> {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
    // Update countdown even from cache
    cache.data.resetCountdown = getResetCountdown();
    return cache.data;
  }

  const [vos, visWax] = await Promise.all([
    fetchVoS(),
    fetchVisWax()
  ]);

  const info: DailyInfo = {
    vos,
    visWax,
    spotlight: getSpotlight(),
    resetCountdown: getResetCountdown()
  };

  cache = { data: info, timestamp: now };
  return info;
}
