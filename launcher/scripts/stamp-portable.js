const path = require('path');
const fs = require('fs');
const rcedit = require('rcedit');

async function main() {
  const releaseDir = path.join(__dirname, '..', 'release');
  const icoPath = path.join(__dirname, '..', 'assets', 'app-icon.ico');

  // Find the portable exe
  const files = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe'));
  if (files.length === 0) {
    console.log('[stamp-portable] No exe found in release/');
    return;
  }

  for (const file of files) {
    const exePath = path.join(releaseDir, file);
    console.log('[stamp-portable] Stamping:', file);
    try {
      await rcedit(exePath, { icon: icoPath });
      const size = fs.statSync(exePath).size;
      console.log('[stamp-portable] Done -', (size / 1024 / 1024).toFixed(1), 'MB');
    } catch (e) {
      console.error('[stamp-portable] Failed:', e.message);
    }
  }
}

main();
