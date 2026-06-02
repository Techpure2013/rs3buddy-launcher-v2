import * as https from "https";
import * as fs from "fs";

const UA = "RS3-Launcher-Buddy";

/** GET a URL as text, following redirects. Rejects on non-2xx (after redirects). */
export function fetchText(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error("too many redirects"));
          return;
        }
        res.resume();
        fetchText(res.headers.location, maxRedirects - 1).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
  });
}

/** Download a URL to destPath, following redirects, reporting progress (0..1). */
export function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (fraction: number, received: number, total: number) => void,
  maxRedirects = 5,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error("too many redirects"));
          return;
        }
        res.resume();
        downloadFile(res.headers.location, destPath, onProgress, maxRedirects - 1).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }
      const total = parseInt(res.headers["content-length"] ?? "0", 10);
      let received = 0;
      const file = fs.createWriteStream(destPath);
      res.on("data", (c: Buffer) => {
        received += c.length;
        if (onProgress && total > 0) onProgress(received / total, received, total);
      });
      res.pipe(file);
      file.on("finish", () => file.close((err) => (err ? reject(err) : resolve())));
      file.on("error", (e) => {
        fs.rm(destPath, { force: true }, () => reject(e));
      });
    });
    req.on("error", reject);
  });
}
