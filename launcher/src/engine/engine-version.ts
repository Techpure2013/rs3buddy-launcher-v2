/** Strip a leading `v` / `engine-v` and split into numeric parts. */
function parts(v: string): number[] {
  const cleaned = v.replace(/^engine-/, "").replace(/^v/, "").trim();
  return cleaned.split(".").map((n) => parseInt(n, 10) || 0);
}

/** True if `remote` is a strictly newer semver than `local` (null local => true). */
export function isNewer(remote: string, local: string | null): boolean {
  if (!local) return true;
  const r = parts(remote);
  const l = parts(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

/** Parse a version.json string -> version, or null if malformed/missing. */
export function parseVersionJson(text: string): string | null {
  try {
    const o = JSON.parse(text);
    return typeof o?.version === "string" ? o.version : null;
  } catch {
    return null;
  }
}

/** Join a dist base (with or without trailing slash) + an asset filename. */
export function assetUrl(base: string, name: string): string {
  return base.replace(/\/+$/, "") + "/" + name;
}
