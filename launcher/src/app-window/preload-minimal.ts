/**
 * Minimal App Window Preload Script - for debugging crashes
 */

console.log('[MinimalPreload] Starting...');

import { ipcRenderer } from 'electron';

// Just expose a minimal window API
const appWindowApi = {
  close: () => ipcRenderer.send('app-window:close'),
  getTitle: () => ipcRenderer.invoke('app-window:get-title'),
};

(window as any).appWindowApi = appWindowApi;

// Inject a simple titlebar
function injectTitlebar(): void {
  const titlebar = document.createElement('div');
  titlebar.id = 'alt1gl-titlebar';
  titlebar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    z-index: 999999;
    -webkit-app-region: drag;
  `;

  const title = document.createElement('span');
  title.style.cssText = 'color: white; font-size: 12px;';
  title.textContent = 'Loading...';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    -webkit-app-region: no-drag;
  `;
  closeBtn.onclick = () => ipcRenderer.send('app-window:close');

  titlebar.appendChild(title);
  titlebar.appendChild(closeBtn);
  document.body.insertBefore(titlebar, document.body.firstChild);

  ipcRenderer.invoke('app-window:get-title').then((t: string) => {
    title.textContent = t;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTitlebar);
} else {
  injectTitlebar();
}

console.log('[MinimalPreload] Done');
