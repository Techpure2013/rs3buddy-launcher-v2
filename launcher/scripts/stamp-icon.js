const path = require('path');
const rcedit = require('rcedit');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icoPath = path.join(__dirname, '..', 'assets', 'app-icon.ico');

  console.log('[stamp-icon] Stamping icon onto:', exePath);
  console.log('[stamp-icon] Icon:', icoPath);

  try {
    await rcedit(exePath, { icon: icoPath });
    console.log('[stamp-icon] Icon stamped successfully');
  } catch (e) {
    console.error('[stamp-icon] Failed to stamp icon:', e.message);
  }
};
