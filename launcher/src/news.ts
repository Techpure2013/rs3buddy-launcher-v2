/**
 * RuneScape News Feed
 * Fetches and caches RSS news from runescape.com
 */

import * as https from 'https';
import type { NewsItem } from './types';

const RSS_URL = 'https://secure.runescape.com/m=news/latest_news.rss';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ITEMS = 5;

interface NewsCache {
  items: NewsItem[];
  fetchedAt: number;
}

let cache: NewsCache | null = null;

/**
 * Fetch RSS XML from a URL, following redirects
 */
function fetchRssXml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchRssXml(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Decode common HTML entities
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extract text content from an XML tag
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return '';
  return decodeEntities((match[1] || match[2] || '').trim());
}

/**
 * Parse RSS XML into NewsItem array
 */
function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_ITEMS) {
    const block = match[1];
    const title = extractTag(block, 'title');
    if (!title) continue;

    // Extract enclosure image URL
    const enclosureMatch = block.match(/<enclosure[^>]+url="([^"]*)"[^>]*\/?>/);
    const imageUrl = enclosureMatch ? enclosureMatch[1] : null;

    items.push({
      title,
      category: extractTag(block, 'category') || 'News',
      link: extractTag(block, 'link'),
      pubDate: new Date(extractTag(block, 'pubDate')).toISOString(),
      description: extractTag(block, 'description'),
      imageUrl,
      guid: extractTag(block, 'guid') || extractTag(block, 'link'),
    });
  }

  return items;
}

/**
 * Fetch news items with caching
 */
export async function fetchNews(): Promise<NewsItem[]> {
  // Return cached if fresh
  if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
    return cache.items;
  }

  try {
    console.log('[News] Fetching RSS feed...');
    const xml = await fetchRssXml(RSS_URL);
    const items = parseRssItems(xml);
    console.log(`[News] Parsed ${items.length} items`);

    cache = { items, fetchedAt: Date.now() };
    return items;
  } catch (e) {
    console.error('[News] Failed to fetch news:', e);
    // Return stale cache if available
    if (cache) {
      console.log('[News] Returning stale cached items');
      return cache.items;
    }
    return [];
  }
}
