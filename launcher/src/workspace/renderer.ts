/**
 * Workspace Renderer Script
 * Handles UI interactions in the workspace overlay toolbar
 */

// Window.workspaceApi is exposed by the preload script
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).workspaceApi;

// DOM elements
const statusDot = document.getElementById('status-dot') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const appsContainer = document.getElementById('apps-container') as HTMLDivElement;

// Window controls
document.getElementById('btn-minimize')?.addEventListener('click', () => {
  api.minimize();
});

document.getElementById('btn-close')?.addEventListener('click', () => {
  api.close();
});

// Add app button
document.getElementById('add-app-btn')?.addEventListener('click', () => {
  api.openAppPicker();
});

// Status updates
api.onStatus((data: { status: string; message: string }) => {
  console.log('[Workspace Renderer] Status:', data);

  statusText.textContent = data.message;

  // Update status dot
  statusDot.classList.remove('loading', 'disconnected');
  switch (data.status) {
    case 'launching':
    case 'loading':
      statusDot.classList.add('loading');
      break;
    case 'connected':
      // Green (default)
      break;
    case 'error':
    case 'disconnected':
      statusDot.classList.add('disconnected');
      break;
  }
});

// When game is detected/embedded
api.onEmbedded((data: { hwnd: number }) => {
  console.log('[Workspace Renderer] Game detected, hwnd:', data.hwnd);
});

// Load and render apps
async function loadApps(): Promise<void> {
  try {
    const apps = await api.getApps();
    renderApps(apps);
  } catch (e) {
    console.error('[Workspace Renderer] Failed to load apps:', e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderApps(apps: any[]): void {
  // Clear existing app buttons (keep the add button)
  const addBtn = document.getElementById('add-app-btn');
  appsContainer.innerHTML = '';

  // Add app buttons
  apps.forEach(app => {
    const btn = document.createElement('button');
    btn.className = 'app-btn';
    btn.title = app.name;

    if (app.iconUrl) {
      const icon = document.createElement('img');
      icon.className = 'app-btn-icon';
      icon.src = app.iconUrl;
      icon.alt = app.name;
      icon.onerror = () => {
        icon.style.display = 'none';
      };
      btn.appendChild(icon);
    }

    const name = document.createElement('span');
    name.textContent = app.name;
    btn.appendChild(name);

    btn.addEventListener('click', () => {
      api.launchApp(app.appUrl);
    });

    appsContainer.appendChild(btn);
  });

  // Re-add the add button
  if (addBtn) {
    appsContainer.appendChild(addBtn);
  } else {
    const newAddBtn = document.createElement('button');
    newAddBtn.className = 'app-btn';
    newAddBtn.id = 'add-app-btn';
    newAddBtn.textContent = '+ Add';
    newAddBtn.addEventListener('click', () => {
      api.openAppPicker();
    });
    appsContainer.appendChild(newAddBtn);
  }
}

// Listen for app updates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.onAppsUpdated((apps: any[]) => {
  renderApps(apps);
});

// Initial load
loadApps();

// Auto-launch RS when workspace opens
setTimeout(() => {
  api.launch();
}, 500);
