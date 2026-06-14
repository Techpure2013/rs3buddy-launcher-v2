/**
 * Main Window Renderer
 * Handles UI interactions for the RS3 Launcher Buddy main window
 */

import type { AppConfig, SessionInfo, InstalledApp, GameAccount, ConnectedClient, HotkeyConflictRequest } from '../types';
import { generateFontAtlas, canGenerateFontAtlas } from '../font-atlas';

// Voice of Seren clan icons (local sprites)
const VOS_CLAN_ICONS: Record<string, string> = {
  'Amlodd': 'assets/vos/amlodd.png',
  'Cadarn': 'assets/vos/cadarn.png',
  'Crwys': 'assets/vos/crwys.png',
  'Hefin': 'assets/vos/hefin.png',
  'Iorwerth': 'assets/vos/iorwerth.png',
  'Ithell': 'assets/vos/ithell.png',
  'Meilyr': 'assets/vos/meilyr.png',
  'Trahaearn': 'assets/vos/trahaearn.png',
};

// State
let sessions: SessionInfo[] = [];
let apps: InstalledApp[] = [];
let connectedClients: Map<number, ConnectedClient> = new Map();
let config: AppConfig = {
  jagexLauncherPath: null,
  rs2ClientPath: null,
  alt1glLibPath: null,
  startMinimized: false,
  closeToTray: true
};

// Selected account state
interface SelectedAccount {
  sessionIndex: number;
  characterId: string | null;
  displayName: string;
}
let selectedAccount: SelectedAccount | null = null;

// Jagex Launcher installation state
interface JagexLauncherState {
  installed: boolean;
  method?: string;
  path?: string;
  flatpakAvailable?: boolean;
}
let jagexLauncherState: JagexLauncherState = { installed: false };

// DOM Elements interface
interface Elements {
  tabBtns: NodeListOf<HTMLButtonElement>;
  tabContents: NodeListOf<HTMLElement>;
  headerVersion: HTMLElement | null;
  // Account (new dropdown style)
  accountSectionWrapper: HTMLElement | null;
  accountSection: HTMLElement | null;
  loginBtn: HTMLButtonElement | null;
  logoutBtn: HTMLButtonElement | null;
  accountDropdown: HTMLElement | null;
  accountDropdownSelected: HTMLElement | null;
  accountDropdownMenu: HTMLElement | null;
  selectedAccountName: HTMLElement | null;
  // Connected clients
  clientsStatusBar: HTMLElement | null;
  clientsStatusToggle: HTMLElement | null;
  clientsStatusDot: HTMLElement | null;
  clientsStatusText: HTMLElement | null;
  clientsExpandIcon: HTMLElement | null;
  clientsStatusDetails: HTMLElement | null;
  clientsList: HTMLElement | null;
  // Launch
  launchBtn: HTMLButtonElement | null;
  launchJagexBtn: HTMLButtonElement | null;
  appsGrid: HTMLElement | null;
  addAppBtn: HTMLButtonElement | null;
  addAppCard: HTMLElement | null;
  addAppModal: HTMLElement | null;
  appUrlInput: HTMLInputElement | null;
  appDisplayNameInput: HTMLInputElement | null;
  confirmAddApp: HTMLButtonElement | null;
  cancelAddApp: HTMLButtonElement | null;
  closeAddAppModal: HTMLButtonElement | null;
  jagexLauncherPath: HTMLElement | null;
  jagexLauncherStatus: HTMLElement | null;
  // Jagex Launcher install modal
  installLauncherModal: HTMLElement | null;
  installLauncherProgress: HTMLElement | null;
  installLauncherMessage: HTMLElement | null;
  installFlatpakBtn: HTMLButtonElement | null;
  closeInstallModal: HTMLButtonElement | null;
  rs2ClientPath: HTMLElement | null;
  rs2ClientStatus: HTMLElement | null;
  alt1glLibPath: HTMLElement | null;
  alt1glLibStatus: HTMLElement | null;
  themeBtns: NodeListOf<HTMLButtonElement>;
  launchOnStartup: HTMLInputElement | null;
  startMinimized: HTMLInputElement | null;
  enableGlOverlay: HTMLInputElement | null;
  glOverlayConfirmModal: HTMLElement | null;
  closeGlOverlayModal: HTMLButtonElement | null;
  glOverlayCancel: HTMLButtonElement | null;
  glOverlayConfirm: HTMLButtonElement | null;
  minimizeBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement | null;
  // Hotkey conflict modal
  hotkeyConflictModal: HTMLElement | null;
  closeHotkeyConflictModal: HTMLButtonElement | null;
  conflictOriginalKey: HTMLElement | null;
  conflictAppName: HTMLElement | null;
  conflictAlternativeKey: HTMLElement | null;
  hotkeyAlternativeMessage: HTMLElement | null;
  hotkeyNoAlternativeMessage: HTMLElement | null;
  hotkeyConflictSettings: HTMLButtonElement | null;
  hotkeyConflictAccept: HTMLButtonElement | null;
  // Hotkeys settings
  hotkeysEnabled: HTMLInputElement | null;
  hotkeysOnlyWhenFocused: HTMLInputElement | null;
  hotkeysHeader: HTMLElement | null;
  hotkeysContent: HTMLElement | null;
  hotkeysAppsList: HTMLElement | null;
  noHotkeys: HTMLElement | null;
  // Hotkey manager modal
  hotkeyManagerModal: HTMLElement | null;
  hotkeyManagerTitle: HTMLElement | null;
  hotkeyManagerList: HTMLElement | null;
  closeHotkeyManager: HTMLButtonElement | null;
  hotkeyManagerClose: HTMLButtonElement | null;
  // Profile elements
  profilesList: HTMLElement | null;
  noProfiles: HTMLElement | null;
  createProfileBtn: HTMLButtonElement | null;
  profileAssignments: HTMLElement | null;
  assignmentsList: HTMLElement | null;
  noAssignments: HTMLElement | null;
  profileModal: HTMLElement | null;
  profileModalTitle: HTMLElement | null;
  profileNameInput: HTMLInputElement | null;
  confirmProfile: HTMLButtonElement | null;
  cancelProfile: HTMLButtonElement | null;
  closeProfileModal: HTMLButtonElement | null;
  assignProfileModal: HTMLElement | null;
  assignProfileModalTitle: HTMLElement | null;
  assignProfileDescription: HTMLElement | null;
  profileSelectList: HTMLElement | null;
  cancelAssignProfile: HTMLButtonElement | null;
  closeAssignProfileModal: HTMLButtonElement | null;
  // Daily Dashboard
  dailyDashboard: HTMLElement | null;
  dailyResetTimer: HTMLElement | null;
  vosClanIcon1: HTMLImageElement | null;
  vosClanName1: HTMLElement | null;
  vosClanIcon2: HTMLImageElement | null;
  vosClanName2: HTMLElement | null;
  visWaxValue: HTMLElement | null;
  spotlightValue: HTMLElement | null;
  // News
  newsSection: HTMLElement | null;
  newsList: HTMLElement | null;
  // Hiscores
  hiscoresPlayerInput: HTMLInputElement | null;
  hiscoresSearchBtn: HTMLButtonElement | null;
  hiscoresResult: HTMLElement | null;
  hiscoresPlayerHeader: HTMLElement | null;
  hiscoresGrid: HTMLElement | null;
  hiscoresEmpty: HTMLElement | null;
  hiscoresError: HTMLElement | null;
  // GE Price Checker
  geSearchInput: HTMLInputElement | null;
  geSearchDropdown: HTMLElement | null;
  geEmpty: HTMLElement | null;
  geLoading: HTMLElement | null;
  geError: HTMLElement | null;
  geErrorText: HTMLElement | null;
  geResult: HTMLElement | null;
  geItemImage: HTMLImageElement | null;
  geItemName: HTMLElement | null;
  geItemId: HTMLElement | null;
  geWikiLink: HTMLAnchorElement | null;
  gePrice: HTMLElement | null;
  gePriceMeta: HTMLElement | null;
  geChartCanvas: HTMLCanvasElement | null;
  geReportsCard: HTMLElement | null;
  geReportsList: HTMLElement | null;
  geDescriptionCard: HTMLElement | null;
  geDescriptionText: HTMLElement | null;
  // Developer SDK tab
  sdkVersion: HTMLElement | null;
  sdkLoading: HTMLElement | null;
  sdkError: HTMLElement | null;
  sdkErrorText: HTMLElement | null;
  sdkRetryBtn: HTMLButtonElement | null;
  sdkClientsList: HTMLElement | null;
}

// Get DOM elements
const elements: Elements = {
  tabBtns: document.querySelectorAll<HTMLButtonElement>('.tab-btn'),
  tabContents: document.querySelectorAll<HTMLElement>('.tab-content'),
  headerVersion: document.getElementById('headerVersion'),
  // Account (new dropdown style)
  accountSectionWrapper: document.getElementById('accountSectionWrapper'),
  accountSection: document.getElementById('accountSection'),
  loginBtn: document.getElementById('loginBtn') as HTMLButtonElement | null,
  logoutBtn: document.getElementById('logoutBtn') as HTMLButtonElement | null,
  accountDropdown: document.getElementById('accountDropdown'),
  accountDropdownSelected: document.getElementById('accountDropdownSelected'),
  accountDropdownMenu: document.getElementById('accountDropdownMenu'),
  selectedAccountName: document.getElementById('selectedAccountName'),
  // Connected clients
  clientsStatusBar: document.getElementById('clientsStatusBar'),
  clientsStatusToggle: document.getElementById('clientsStatusToggle'),
  clientsStatusDot: document.getElementById('clientsStatusDot'),
  clientsStatusText: document.getElementById('clientsStatusText'),
  clientsExpandIcon: document.getElementById('clientsExpandIcon'),
  clientsStatusDetails: document.getElementById('clientsStatusDetails'),
  clientsList: document.getElementById('clientsList'),
  // Launch
  launchBtn: document.getElementById('launchBtn') as HTMLButtonElement | null,
  launchJagexBtn: document.getElementById('launchJagexBtn') as HTMLButtonElement | null,
  appsGrid: document.getElementById('appsGrid'),
  addAppBtn: document.getElementById('addAppBtn') as HTMLButtonElement | null,
  addAppCard: document.getElementById('addAppCard'),
  addAppModal: document.getElementById('addAppModal'),
  appUrlInput: document.getElementById('appUrlInput') as HTMLInputElement | null,
  appDisplayNameInput: document.getElementById('appDisplayNameInput') as HTMLInputElement | null,
  confirmAddApp: document.getElementById('confirmAddApp') as HTMLButtonElement | null,
  cancelAddApp: document.getElementById('cancelAddApp') as HTMLButtonElement | null,
  closeAddAppModal: document.getElementById('closeAddAppModal') as HTMLButtonElement | null,
  jagexLauncherPath: document.getElementById('jagexLauncherPath'),
  jagexLauncherStatus: document.getElementById('jagexLauncherStatus'),
  // Jagex Launcher install modal
  installLauncherModal: document.getElementById('installLauncherModal'),
  installLauncherProgress: document.getElementById('installLauncherProgress'),
  installLauncherMessage: document.getElementById('installLauncherMessage'),
  installFlatpakBtn: document.getElementById('installFlatpakBtn') as HTMLButtonElement | null,
  closeInstallModal: document.getElementById('closeInstallModal') as HTMLButtonElement | null,
  rs2ClientPath: document.getElementById('rs2ClientPath'),
  rs2ClientStatus: document.getElementById('rs2ClientStatus'),
  alt1glLibPath: document.getElementById('alt1glLibPath'),
  alt1glLibStatus: document.getElementById('alt1glLibStatus'),
  themeBtns: document.querySelectorAll<HTMLButtonElement>('.theme-btn'),
  launchOnStartup: document.getElementById('launchOnStartup') as HTMLInputElement | null,
  startMinimized: document.getElementById('startMinimized') as HTMLInputElement | null,
  enableGlOverlay: document.getElementById('enableGlOverlay') as HTMLInputElement | null,
  glOverlayConfirmModal: document.getElementById('glOverlayConfirmModal'),
  closeGlOverlayModal: document.getElementById('closeGlOverlayModal') as HTMLButtonElement | null,
  glOverlayCancel: document.getElementById('glOverlayCancel') as HTMLButtonElement | null,
  glOverlayConfirm: document.getElementById('glOverlayConfirm') as HTMLButtonElement | null,
  minimizeBtn: document.getElementById('minimizeBtn') as HTMLButtonElement | null,
  closeBtn: document.getElementById('closeBtn') as HTMLButtonElement | null,
  // Hotkey conflict modal
  hotkeyConflictModal: document.getElementById('hotkeyConflictModal'),
  closeHotkeyConflictModal: document.getElementById('closeHotkeyConflictModal') as HTMLButtonElement | null,
  conflictOriginalKey: document.getElementById('conflictOriginalKey'),
  conflictAppName: document.getElementById('conflictAppName'),
  conflictAlternativeKey: document.getElementById('conflictAlternativeKey'),
  hotkeyAlternativeMessage: document.getElementById('hotkeyAlternativeMessage'),
  hotkeyNoAlternativeMessage: document.getElementById('hotkeyNoAlternativeMessage'),
  hotkeyConflictSettings: document.getElementById('hotkeyConflictSettings') as HTMLButtonElement | null,
  hotkeyConflictAccept: document.getElementById('hotkeyConflictAccept') as HTMLButtonElement | null,
  // Hotkeys settings
  hotkeysEnabled: document.getElementById('hotkeysEnabled') as HTMLInputElement | null,
  hotkeysOnlyWhenFocused: document.getElementById('hotkeysOnlyWhenFocused') as HTMLInputElement | null,
  hotkeysHeader: document.getElementById('hotkeysHeader'),
  hotkeysContent: document.getElementById('hotkeysContent'),
  hotkeysAppsList: document.getElementById('hotkeysAppsList'),
  noHotkeys: document.getElementById('noHotkeys'),
  // Hotkey manager modal
  hotkeyManagerModal: document.getElementById('hotkeyManagerModal'),
  hotkeyManagerTitle: document.getElementById('hotkeyManagerTitle'),
  hotkeyManagerList: document.getElementById('hotkeyManagerList'),
  closeHotkeyManager: document.getElementById('closeHotkeyManager') as HTMLButtonElement | null,
  hotkeyManagerClose: document.getElementById('hotkeyManagerClose') as HTMLButtonElement | null,
  // Profile elements
  profilesList: document.getElementById('profilesList'),
  noProfiles: document.getElementById('noProfiles'),
  createProfileBtn: document.getElementById('createProfileBtn') as HTMLButtonElement | null,
  profileAssignments: document.getElementById('profileAssignments'),
  assignmentsList: document.getElementById('assignmentsList'),
  noAssignments: document.getElementById('noAssignments'),
  profileModal: document.getElementById('profileModal'),
  profileModalTitle: document.getElementById('profileModalTitle'),
  profileNameInput: document.getElementById('profileNameInput') as HTMLInputElement | null,
  confirmProfile: document.getElementById('confirmProfile') as HTMLButtonElement | null,
  cancelProfile: document.getElementById('cancelProfile') as HTMLButtonElement | null,
  closeProfileModal: document.getElementById('closeProfileModal') as HTMLButtonElement | null,
  assignProfileModal: document.getElementById('assignProfileModal'),
  assignProfileModalTitle: document.getElementById('assignProfileModalTitle'),
  assignProfileDescription: document.getElementById('assignProfileDescription'),
  profileSelectList: document.getElementById('profileSelectList'),
  cancelAssignProfile: document.getElementById('cancelAssignProfile') as HTMLButtonElement | null,
  closeAssignProfileModal: document.getElementById('closeAssignProfileModal') as HTMLButtonElement | null,
  // Daily Dashboard
  dailyDashboard: document.getElementById('dailyDashboard'),
  dailyResetTimer: document.getElementById('dailyResetTimer'),
  vosClanIcon1: document.getElementById('vosClanIcon1') as HTMLImageElement | null,
  vosClanName1: document.getElementById('vosClanName1'),
  vosClanIcon2: document.getElementById('vosClanIcon2') as HTMLImageElement | null,
  vosClanName2: document.getElementById('vosClanName2'),
  visWaxValue: document.getElementById('visWaxValue'),
  spotlightValue: document.getElementById('spotlightValue'),
  // News
  newsSection: document.getElementById('newsSection'),
  newsList: document.getElementById('newsList'),
  // Hiscores
  hiscoresPlayerInput: document.getElementById('hiscoresPlayerInput') as HTMLInputElement | null,
  hiscoresSearchBtn: document.getElementById('hiscoresSearchBtn') as HTMLButtonElement | null,
  hiscoresResult: document.getElementById('hiscoresResult'),
  hiscoresPlayerHeader: document.getElementById('hiscoresPlayerHeader'),
  hiscoresGrid: document.getElementById('hiscoresGrid'),
  hiscoresEmpty: document.getElementById('hiscoresEmpty'),
  hiscoresError: document.getElementById('hiscoresError'),
  // GE Price Checker
  geSearchInput: document.getElementById('geSearchInput') as HTMLInputElement,
  geSearchDropdown: document.getElementById('geSearchDropdown'),
  geEmpty: document.getElementById('geEmpty'),
  geLoading: document.getElementById('geLoading'),
  geError: document.getElementById('geError'),
  geErrorText: document.getElementById('geErrorText'),
  geResult: document.getElementById('geResult'),
  geItemImage: document.getElementById('geItemImage') as HTMLImageElement,
  geItemName: document.getElementById('geItemName'),
  geItemId: document.getElementById('geItemId'),
  geWikiLink: document.getElementById('geWikiLink') as HTMLAnchorElement,
  gePrice: document.getElementById('gePrice'),
  gePriceMeta: document.getElementById('gePriceMeta'),
  geChartCanvas: document.getElementById('geChartCanvas') as HTMLCanvasElement,
  geReportsCard: document.getElementById('geReportsCard'),
  geReportsList: document.getElementById('geReportsList'),
  geDescriptionCard: document.getElementById('geDescriptionCard'),
  geDescriptionText: document.getElementById('geDescriptionText'),
  // Developer SDK tab
  sdkVersion: document.getElementById('sdkVersion'),
  sdkLoading: document.getElementById('sdkLoading'),
  sdkError: document.getElementById('sdkError'),
  sdkErrorText: document.getElementById('sdkErrorText'),
  sdkRetryBtn: document.getElementById('sdkRetryBtn') as HTMLButtonElement | null,
  sdkClientsList: document.getElementById('sdkClientsList'),
};

// Initialize
async function init(): Promise<void> {
  await loadConfig();
  await loadSessions();
  await loadApps();
  await loadConnectedClients();
  await loadStartupSetting();
  await loadStartMinimizedSetting();
  await checkJagexLauncherInstallation();
  await loadHotkeySettings();
  setupEventListeners();
  loadTheme();

  // Initialize toolbar profiles
  initProfileEventListeners();
  loadProfiles();

  // Load news feed (non-blocking)
  loadNews();

  // Load daily info dashboard
  loadDailyInfo();
  // Update reset timer every second
  setInterval(updateResetTimer, 1000);
  // Refresh daily info every 5 minutes
  setInterval(loadDailyInfo, 5 * 60 * 1000);
  // Refresh immediately when VoS Reader (or other app) signals new data
  window.api.onRefreshDailyInfo(() => loadDailyInfo());

  // Engine auto-update banner: a small bottom bar shown while the native engine
  // downloads/installs at startup. Auto-dismisses on completion; no banner if the
  // engine is already up to date.
  setupEngineUpdateBanner();

  // Developer SDK: listen for per-client download progress.
  setupSdkDownloadProgress();

  // Display app version
  window.api.getAppVersion().then(v => {
    if (elements.headerVersion) elements.headerVersion.textContent = `v${v}`;
  });
}

// Check if Jagex Launcher is installed and update button accordingly
async function checkJagexLauncherInstallation(): Promise<void> {
  const status = await window.api.jagexLauncher.checkInstalled();
  const flatpakAvailable = await window.api.jagexLauncher.isFlatpakAvailable();

  jagexLauncherState = {
    installed: status.installed,
    method: status.method,
    path: status.path,
    flatpakAvailable
  };

  updateJagexLauncherButton();
}

// Update the Jagex Launcher button based on installation state
function updateJagexLauncherButton(): void {
  if (!elements.launchJagexBtn) return;

  const launchText = elements.launchJagexBtn.querySelector('.launch-text');
  const launchIcon = elements.launchJagexBtn.querySelector('.launch-icon');

  if (jagexLauncherState.installed) {
    // Launcher is installed - show "Open Jagex Launcher"
    if (launchText) launchText.textContent = 'Open Jagex Launcher';
    if (launchIcon) launchIcon.innerHTML = '&#x1F3AE;';
    elements.launchJagexBtn.classList.remove('install-mode');
  } else {
    // Launcher not installed - show "Install Jagex Launcher"
    if (launchText) launchText.textContent = 'Install Jagex Launcher';
    if (launchIcon) launchIcon.innerHTML = '&#x2B07;';  // Download arrow
    elements.launchJagexBtn.classList.add('install-mode');
  }
}

// Load startup setting
async function loadStartupSetting(): Promise<void> {
  const enabled = await window.api.getLaunchOnStartup();
  if (elements.launchOnStartup) {
    elements.launchOnStartup.checked = enabled;
  }
}

// Load start minimized setting
async function loadStartMinimizedSetting(): Promise<void> {
  const enabled = await window.api.getStartMinimized();
  if (elements.startMinimized) {
    elements.startMinimized.checked = enabled;
  }
}

// Load connected clients
async function loadConnectedClients(): Promise<void> {
  const clients = await window.api.getConnectedClients();
  connectedClients.clear();
  clients.forEach(client => connectedClients.set(client.id, client));
  updateClientsUI();
}

// Update clients UI
function updateClientsUI(): void {
  const count = connectedClients.size;

  // Update status bar
  if (elements.clientsStatusBar) {
    elements.clientsStatusBar.classList.toggle('has-clients', count > 0);
  }

  // Update status text
  if (elements.clientsStatusText) {
    if (count === 0) {
      elements.clientsStatusText.textContent = 'No clients connected';
    } else if (count === 1) {
      elements.clientsStatusText.textContent = '1 client connected';
    } else {
      elements.clientsStatusText.textContent = `${count} clients connected`;
    }
  }

  // Update client list inside details
  if (elements.clientsList) {
    elements.clientsList.innerHTML = '';
    for (const client of connectedClients.values()) {
      const item = createClientItem(client);
      elements.clientsList.appendChild(item);
    }
  }

  updateLaunchButtonState();
}

// Create client item element
function createClientItem(client: ConnectedClient): HTMLElement {
  const item = document.createElement('div');
  item.className = 'client-item';
  item.dataset.clientId = String(client.id);

  const icon = document.createElement('img');
  icon.className = 'client-item-icon';
  icon.src = 'assets/runescape-icon.png';
  icon.alt = '';
  icon.width = 24;
  icon.height = 24;

  const indicator = document.createElement('div');
  indicator.className = `client-indicator ${client.injected ? 'injected' : 'pending'}`;

  const info = document.createElement('div');
  info.className = 'client-info';

  const name = document.createElement('div');
  name.className = 'client-name';
  name.textContent = client.windowTitle || 'RuneScape';

  const details = document.createElement('div');
  details.className = 'client-details';
  details.textContent = `PID: ${client.pid} • ID: ${client.id}`;

  info.appendChild(name);
  info.appendChild(details);

  const status = document.createElement('div');
  status.className = `client-status ${client.injected ? '' : 'pending'}`;
  status.textContent = client.injected ? 'Overlay Active' : 'Connecting...';

  item.appendChild(icon);
  item.appendChild(indicator);
  item.appendChild(info);
  item.appendChild(status);

  return item;
}

// Update a single client's injection status in the UI
function updateClientInjectionStatus(clientId: number, injected: boolean): void {
  const client = connectedClients.get(clientId);
  if (client) {
    client.injected = injected;
  }

  // Update UI element
  const item = elements.clientsList?.querySelector(`[data-client-id="${clientId}"]`);
  if (item) {
    const indicator = item.querySelector('.client-indicator');
    const status = item.querySelector('.client-status');
    if (indicator) {
      indicator.className = `client-indicator ${injected ? 'injected' : 'pending'}`;
    }
    if (status) {
      status.className = `client-status ${injected ? '' : 'pending'}`;
      status.textContent = injected ? 'Overlay Active' : 'Connecting...';
    }
  }
}

// Load config
async function loadConfig(): Promise<void> {
  config = await window.api.getConfig();
  updatePathsUI();
}

// Load sessions
async function loadSessions(): Promise<void> {
  sessions = await window.api.getSessions();
  updateAccountsUI();
  loadProfiles();
}

// Load apps
async function loadApps(): Promise<void> {
  apps = await window.api.getApps();
  updateAppsUI();
}

// Update paths UI in settings
function updatePathsUI(): void {
  // Jagex Launcher
  if (elements.jagexLauncherPath && elements.jagexLauncherStatus) {
    if (config.jagexLauncherPath) {
      elements.jagexLauncherPath.textContent = truncatePath(config.jagexLauncherPath, 35);
      elements.jagexLauncherPath.title = config.jagexLauncherPath;
      elements.jagexLauncherStatus.className = 'setting-status found';
    } else {
      elements.jagexLauncherPath.textContent = 'Not found';
      elements.jagexLauncherStatus.className = 'setting-status not-found';
    }
  }

  // RS2 Client
  if (elements.rs2ClientPath && elements.rs2ClientStatus) {
    if (config.rs2ClientPath) {
      elements.rs2ClientPath.textContent = truncatePath(config.rs2ClientPath, 35);
      elements.rs2ClientPath.title = config.rs2ClientPath;
      elements.rs2ClientStatus.className = 'setting-status found';
    } else {
      elements.rs2ClientPath.textContent = 'Not found';
      elements.rs2ClientStatus.className = 'setting-status not-found';
    }
  }

  // Alt1GL Library
  if (elements.alt1glLibPath && elements.alt1glLibStatus) {
    if (config.alt1glLibPath) {
      elements.alt1glLibPath.textContent = truncatePath(config.alt1glLibPath, 35);
      elements.alt1glLibPath.title = config.alt1glLibPath;
      elements.alt1glLibStatus.className = 'setting-status found';
    } else {
      elements.alt1glLibPath.textContent = 'Not found';
      elements.alt1glLibStatus.className = 'setting-status not-found';
    }
  }

  updateLaunchButtonState();
}

// Update accounts UI (dropdown style)
function updateAccountsUI(): void {
  const hasAccounts = sessions.length > 0;

  // Update section wrapper class for styling
  if (elements.accountSectionWrapper) {
    elements.accountSectionWrapper.classList.toggle('has-account', hasAccounts);
  }

  // Show/hide the login button vs account section
  if (elements.loginBtn) {
    elements.loginBtn.style.display = hasAccounts ? 'none' : 'block';
  }

  if (elements.accountSection) {
    elements.accountSection.style.display = hasAccounts ? 'block' : 'none';
  }

  if (!hasAccounts) {
    selectedAccount = null;
    updateLaunchButtonState();
    return;
  }

  // Build list of all accounts for dropdown
  const allAccounts: { sessionIndex: number; account: GameAccount }[] = [];
  sessions.forEach((session, index) => {
    const accounts = session.accounts || [];
    if (accounts.length === 0) {
      // Session with no accounts - treat as single account
      allAccounts.push({
        sessionIndex: index,
        account: { displayName: 'Jagex Account', accountId: '' }
      });
    } else {
      accounts.forEach(account => {
        allAccounts.push({ sessionIndex: index, account });
      });
    }
  });

  // Auto-select first account if none selected
  if (!selectedAccount && allAccounts.length > 0) {
    const first = allAccounts[0];
    selectedAccount = {
      sessionIndex: first.sessionIndex,
      characterId: first.account.accountId || null,
      displayName: first.account.displayName || 'Jagex Account'
    };
  }

  // Update selected display
  if (elements.selectedAccountName) {
    elements.selectedAccountName.textContent = selectedAccount?.displayName || 'Select Account';
  }

  // Populate dropdown menu
  if (elements.accountDropdownMenu) {
    elements.accountDropdownMenu.innerHTML = '';

    allAccounts.forEach(({ sessionIndex, account }) => {
      const item = document.createElement('div');
      item.className = 'account-dropdown-item';
      if (selectedAccount &&
          selectedAccount.sessionIndex === sessionIndex &&
          selectedAccount.characterId === (account.accountId || null)) {
        item.classList.add('selected');
      }

      const icon = document.createElement('span');
      icon.className = 'account-icon';
      icon.textContent = '\u{1F464}';

      const info = document.createElement('div');
      info.className = 'account-info';

      const displayName = document.createElement('span');
      displayName.className = 'account-display-name';
      displayName.textContent = account.displayName || 'Jagex Account';

      info.appendChild(displayName);

      item.appendChild(icon);
      item.appendChild(info);

      item.onclick = () => {
        selectedAccount = {
          sessionIndex,
          characterId: account.accountId || null,
          displayName: account.displayName || 'Jagex Account'
        };
        updateAccountsUI();
        closeAccountDropdown();
      };

      elements.accountDropdownMenu!.appendChild(item);
    });

    // Add "Add Account" option
    const addItem = document.createElement('div');
    addItem.className = 'account-dropdown-item';
    addItem.innerHTML = '<span class="account-icon">+</span><div class="account-info"><span class="account-display-name">Add Another Account</span></div>';
    addItem.onclick = () => {
      window.api.openLogin();
      closeAccountDropdown();
    };
    elements.accountDropdownMenu.appendChild(addItem);
  }

  updateLaunchButtonState();
}

// Toggle account dropdown
function toggleAccountDropdown(): void {
  elements.accountDropdown?.classList.toggle('open');
}

// Close account dropdown
function closeAccountDropdown(): void {
  elements.accountDropdown?.classList.remove('open');
}

// Update apps UI
function updateAppsUI(): void {
  if (!elements.appsGrid || !elements.addAppCard) return;

  // Clear existing apps (except add card)
  const existingCards = elements.appsGrid.querySelectorAll('.app-card:not(.add-app-card)');
  existingCards.forEach(card => card.remove());

  // Add app cards
  apps.forEach(app => {
    const card = createAppCard(app);
    elements.appsGrid!.insertBefore(card, elements.addAppCard);
  });
}

// Create app card element
function createAppCard(app: InstalledApp): HTMLElement {
  const card = document.createElement('div');
  card.className = 'app-card';
  card.title = app.description || app.displayName || app.appName;
  card.style.cursor = 'pointer';
  card.onclick = () => {
    window.api.openApp(app);
  };

  const icon = document.createElement('div');
  icon.className = 'app-icon';
  if (app.iconUrl) {
    const img = document.createElement('img');
    img.src = app.iconUrl;
    img.onerror = () => {
      icon.textContent = '\u{1F4E6}';
      img.remove();
    };
    icon.appendChild(img);
  } else {
    icon.textContent = '\u{1F4E6}';
  }

  const name = document.createElement('span');
  name.className = 'app-name';
  name.textContent = app.displayName || app.appName || 'Unknown App';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'app-remove';
  removeBtn.innerHTML = '\u00D7';
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeApp(app.configUrl);
  };

  card.appendChild(icon);
  card.appendChild(name);
  card.appendChild(removeBtn);

  return card;
}

// Update launch button state
function updateLaunchButtonState(): void {
  const hasAccounts = sessions.length > 0 && selectedAccount !== null;

  // Show/hide the play button based on whether user has accounts
  if (elements.launchBtn) {
    // Only show play button when logged in with an account
    elements.launchBtn.style.display = hasAccounts ? 'flex' : 'none';
    elements.launchBtn.disabled = !hasAccounts;

    const launchText = elements.launchBtn.querySelector('.launch-text');
    if (launchText) {
      if (hasAccounts && selectedAccount) {
        launchText.textContent = `Play as ${selectedAccount.displayName}`;
      } else {
        launchText.textContent = 'Play';
      }
    }
  }
}

// Setup event listeners
function setupEventListeners(): void {
  // Tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      if (tabId) {
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
        // Lazy-load the SDK client manifest the first time the tab is opened.
        if (tabId === 'sdk') {
          loadSdkManifestOnce();
        }
      }
    });
  });

  // Developer SDK: retry manifest load
  elements.sdkRetryBtn?.addEventListener('click', () => {
    sdkManifestLoaded = false;
    loadSdkManifestOnce();
  });

  // Login
  elements.loginBtn?.addEventListener('click', () => {
    window.api.openLogin();
  });

  // Account dropdown
  elements.accountDropdownSelected?.addEventListener('click', () => {
    toggleAccountDropdown();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.accountDropdown && !elements.accountDropdown.contains(e.target as Node)) {
      closeAccountDropdown();
    }
  });

  // Connected clients status toggle
  elements.clientsStatusToggle?.addEventListener('click', () => {
    const isExpanded = elements.clientsStatusBar?.classList.toggle('expanded');
    if (elements.clientsStatusDetails) {
      elements.clientsStatusDetails.style.display = isExpanded ? 'block' : 'none';
    }
  });

  // Logout button
  elements.logoutBtn?.addEventListener('click', async () => {
    if (sessions.length > 0) {
      // Logout all sessions
      for (const session of sessions) {
        await window.api.logout(session.id);
      }
      await loadSessions();
    }
  });

  // Launch buttons
  elements.launchBtn?.addEventListener('click', async () => {
    if (selectedAccount) {
      await launchWithAccount(selectedAccount.sessionIndex, selectedAccount.characterId);
    }
  });

  elements.launchJagexBtn?.addEventListener('click', launchViaJagex);

  // Apps — hide add/remove in beta build
  if (window.api.isBetaBuild) {
    elements.addAppBtn?.remove();
    elements.addAppCard?.remove();
  } else {
    elements.addAppBtn?.addEventListener('click', showAddAppModal);
    elements.addAppCard?.addEventListener('click', showAddAppModal);
  }
  elements.closeAddAppModal?.addEventListener('click', hideAddAppModal);
  elements.cancelAddApp?.addEventListener('click', hideAddAppModal);
  elements.confirmAddApp?.addEventListener('click', addApp);

  // Jagex Launcher Install Modal
  elements.closeInstallModal?.addEventListener('click', hideInstallLauncherModal);
  elements.installFlatpakBtn?.addEventListener('click', async () => {
    // If button says "Check Again", just re-check installation
    if (elements.installFlatpakBtn?.textContent === 'Check Again') {
      await checkJagexLauncherInstallation();
      if (jagexLauncherState.installed) {
        hideInstallLauncherModal();
      } else if (elements.installLauncherMessage) {
        elements.installLauncherMessage.innerHTML = '<p>Jagex Launcher still not detected. Please complete the installation.</p>';
      }
    } else {
      await installJagexLauncher();
    }
  });

  // Theme
  elements.themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      if (theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('alt1gl-theme', theme);
      }
    });
  });

  // Launch on startup toggle
  elements.launchOnStartup?.addEventListener('change', async () => {
    const enabled = elements.launchOnStartup?.checked ?? false;
    const result = await window.api.setLaunchOnStartup(enabled);
    if (!result.success) {
      // Revert checkbox if failed
      if (elements.launchOnStartup) {
        elements.launchOnStartup.checked = !enabled;
      }
      console.error('Failed to set launch on startup:', 'error' in result ? result.error : 'Unknown error');
    }
  });

  // Start minimized to tray toggle
  elements.startMinimized?.addEventListener('change', async () => {
    const enabled = elements.startMinimized?.checked ?? false;
    const result = await window.api.setStartMinimized(enabled);
    if (!result.success) {
      // Revert checkbox if failed
      if (elements.startMinimized) {
        elements.startMinimized.checked = !enabled;
      }
      console.error('Failed to set start minimized:', 'error' in result ? result.error : 'Unknown error');
    }
  });

  // GL Overlay toggle — single setting with confirmation modal
  // Read initial state from main process (single source of truth), not localStorage
  let glOverlayEnabled = false;

  // Async fetch from main process — update checkbox when ready
  window.api.getInjectionSettings().then((saved: any) => {
    glOverlayEnabled = saved?.enabled ?? false;
    if (elements.enableGlOverlay) elements.enableGlOverlay.checked = glOverlayEnabled;
  }).catch(() => {
    // Fallback to localStorage if IPC fails
    try {
      const local = JSON.parse(localStorage.getItem('alt1gl-injection-settings') || '{}');
      glOverlayEnabled = local.enabled ?? false;
      if (elements.enableGlOverlay) elements.enableGlOverlay.checked = glOverlayEnabled;
    } catch {}
  });

  function saveGlOverlaySetting(enabled: boolean) {
    glOverlayEnabled = enabled;
    const settings = { enabled, overlay: enabled, glHooks: enabled, autoInject: enabled };
    localStorage.setItem('alt1gl-injection-settings', JSON.stringify(settings));
    window.api.setInjectionSettings(settings);
    if (elements.enableGlOverlay) elements.enableGlOverlay.checked = enabled;
  }

  // Use change event — more reliable than click + preventDefault for toggle switches.
  // When enabling: immediately revert the checkbox, show confirmation, set on confirm.
  // When disabling: save directly (no confirmation needed).
  elements.enableGlOverlay?.addEventListener('change', () => {
    const checkbox = elements.enableGlOverlay!;
    if (checkbox.checked && !glOverlayEnabled) {
      // User toggled ON — revert checkbox immediately, show confirmation first
      checkbox.checked = false;
      if (elements.glOverlayConfirmModal) {
        elements.glOverlayConfirmModal.classList.add('active');
      }
    } else if (!checkbox.checked && glOverlayEnabled) {
      // User toggled OFF — save directly
      saveGlOverlaySetting(false);
    }
  });

  elements.glOverlayConfirm?.addEventListener('click', () => {
    if (elements.glOverlayConfirmModal) elements.glOverlayConfirmModal.classList.remove('active');
    saveGlOverlaySetting(true);
  });

  elements.glOverlayCancel?.addEventListener('click', () => {
    if (elements.glOverlayConfirmModal) elements.glOverlayConfirmModal.classList.remove('active');
    // Ensure checkbox is visually OFF (matches internal state)
    if (elements.enableGlOverlay) elements.enableGlOverlay.checked = false;
  });

  elements.closeGlOverlayModal?.addEventListener('click', () => {
    if (elements.glOverlayConfirmModal) elements.glOverlayConfirmModal.classList.remove('active');
    if (elements.enableGlOverlay) elements.enableGlOverlay.checked = false;
  });

  // Window controls
  elements.minimizeBtn?.addEventListener('click', () => window.api.minimizeWindow());
  elements.closeBtn?.addEventListener('click', () => window.api.closeWindow());

  // Auth events
  window.api.onLoginSuccess(async () => {
    await loadSessions();
    updateLaunchButtonState();
  });

  window.api.onLoginError((data) => {
    alert('Login failed: ' + data.error);
  });

  // Client events
  window.api.onClientConnected((data) => {
    console.log('[Renderer] Client connected:', data.client);
    connectedClients.set(data.client.id, data.client);
    updateClientsUI();
    loadProfiles();
  });

  window.api.onClientDisconnected((data) => {
    console.log('[Renderer] Client disconnected:', data.clientId);
    connectedClients.delete(data.clientId);
    updateClientsUI();
    loadProfiles();
    // Reset font atlas flag so we can send again on next launch
    if (connectedClients.size === 0) {
      fontAtlasSent = false;
    }
  });

  window.api.onClientInjected((data) => {
    console.log('[Renderer] Client injected:', data.clientId, data.success);
    updateClientInjectionStatus(data.clientId, data.success);
  });

  // Legacy events (for backwards compatibility)
  window.api.onRs2ClientStarted((data) => {
    console.log('[Renderer] RS2 client started:', data.pid);
  });

  window.api.onRs2ClientStopped((data) => {
    console.log('[Renderer] RS2 client stopped:', data?.pid);
  });

  // Overlay ready event - FreeType handles font rendering natively now,
  // no need to send a Canvas2D font atlas via IPC
  window.api.onOverlayReady(() => {
    console.log('[Renderer] Overlay ready (using native FreeType font)');
  });

  // Show add app modal event (from toolbar)
  window.api.onShowAddAppModal(() => {
    console.log('[Renderer] Received show-add-app-modal event from toolbar');
    // Add a small delay to allow the window to become visible and focused first
    // This is important when triggered from the toolbar while the window was hidden
    setTimeout(() => {
      console.log('[Renderer] Opening add app modal...');
      showAddAppModal();
    }, 150);
  });

  // Apps updated event (from protocol handler adding apps)
  window.api.onAppsUpdated(async () => {
    console.log('[Renderer] Apps updated externally, refreshing list');
    await loadApps();
  });

  // Show settings event (from tray or overlay)
  window.api.onShowSettings((section?: string) => {
    console.log('[Renderer] Received show-settings event, section:', section);
    switchToTab('settings');
    // If section is 'hotkeys', expand the hotkeys section
    if (section === 'hotkeys' && elements.hotkeysHeader && elements.hotkeysContent) {
      // Remove collapsed class to expand the section
      elements.hotkeysHeader.classList.remove('collapsed');
      elements.hotkeysContent.classList.remove('collapsed');
      // Scroll to the hotkeys section
      elements.hotkeysHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Refresh the hotkeys list
      refreshHotkeysAppsList();
    }
  });

  // Hotkey conflict resolution modal
  window.api.onHotkeyConflict((request) => {
    console.log('[Renderer] Received hotkey conflict request:', request);
    showHotkeyConflictModal(request);
  });

  // Set up hotkey conflict modal handlers
  setupHotkeyConflictModalHandlers();

  // Set up hotkey settings listeners
  setupHotkeySettingsListeners();

  // Auto-update notification
  window.api.onUpdateAvailable((data) => {
    showUpdateBanner(data.version, data.size);
  });

  window.api.onUpdateDownloadProgress((data) => {
    const progressBar = document.getElementById('update-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${data.percent}%`;
    }
    const applyBtn = document.getElementById('update-apply') as HTMLButtonElement;
    if (applyBtn && applyBtn.textContent?.startsWith('Downloading')) {
      applyBtn.textContent = `Downloading... ${data.percent}%`;
    }
  });

  window.api.onUpdateStatus((data: { status: string }) => {
    const applyBtn = document.getElementById('update-apply') as HTMLButtonElement;
    if (data.status === 'restarting' && applyBtn) {
      applyBtn.textContent = 'Restarting...';
      applyBtn.style.background = '#2ecc71';
    }
  });

  // Hiscores search
  elements.hiscoresSearchBtn?.addEventListener('click', searchHiscores);
  elements.hiscoresPlayerInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchHiscores();
  });

  // GE Price Checker
  setupGESearch();

  // Attribution links - open in external browser
  document.querySelectorAll('.attribution-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = (e.currentTarget as HTMLElement).getAttribute('data-url');
      if (url) {
        window.api.openExternal(url).catch((err: any) => console.error('[Renderer] openExternal failed:', err));
      }
    });
  });
}

// Show update banner
function showUpdateBanner(version: string, size: number): void {
  // Don't show duplicate banners
  if (document.getElementById('update-banner')) return;

  const sizeMB = (size / (1024 * 1024)).toFixed(1);

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: #1a1a2e;
    border: 1px solid #4a9eff;
    border-radius: 8px;
    padding: 16px 20px;
    color: #e0e0e0;
    font-size: 13px;
    z-index: 10000;
    max-width: 320px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    font-family: inherit;
  `;

  banner.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #4a9eff;">Update Available</div>
    <div style="margin-bottom: 12px;">Version ${version} is ready (${sizeMB} MB)</div>
    <div id="update-progress" style="display: none; margin-bottom: 8px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
      <div id="update-progress-bar" style="height: 100%; background: #4a9eff; width: 0%; transition: width 0.3s;"></div>
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="update-dismiss" style="
        background: transparent;
        border: 1px solid #555;
        color: #aaa;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Later</button>
      <button id="update-apply" style="
        background: #4a9eff;
        border: none;
        color: white;
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      ">Update Now</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('update-dismiss')!.onclick = () => {
    banner.remove();
  };

  document.getElementById('update-apply')!.onclick = async () => {
    const applyBtn = document.getElementById('update-apply') as HTMLButtonElement;
    const dismissBtn = document.getElementById('update-dismiss') as HTMLButtonElement;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Downloading...';
    dismissBtn.style.display = 'none';

    const progressContainer = document.getElementById('update-progress')!;
    progressContainer.style.display = 'block';

    try {
      await window.api.applyUpdate();
    } catch (e) {
      applyBtn.textContent = 'Update Failed';
      applyBtn.disabled = false;
      dismissBtn.style.display = '';
    }
  };
}

// Switch to a specific tab by name
function switchToTab(tabName: string): void {
  const tabBtn = document.querySelector<HTMLButtonElement>(`.tab-btn[data-tab="${tabName}"]`);
  if (tabBtn) {
    // Remove active from all tabs
    elements.tabBtns.forEach(b => b.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));
    // Activate the target tab
    tabBtn.classList.add('active');
    const tabContent = document.getElementById(`tab-${tabName}`);
    tabContent?.classList.add('active');
  }
}

// Launch with specific account
async function launchWithAccount(
  sessionIndex: number,
  characterId: string | null
): Promise<void> {
  if (!elements.launchBtn) return;

  elements.launchBtn.disabled = true;
  const launchText = elements.launchBtn.querySelector('.launch-text');
  if (launchText) {
    launchText.textContent = 'Launching...';
  }

  const result = await window.api.launchRuneScape({ sessionIndex, characterId });

  if (result.success) {
    updateGameStatus('waiting');
  } else {
    alert('Launch failed: ' + ('error' in result ? result.error : 'Unknown error'));
    elements.launchBtn.disabled = false;
    updateLaunchButtonState();
  }
}

// Launch via Jagex Launcher or Install if not present
async function launchViaJagex(): Promise<void> {
  if (!elements.launchJagexBtn) return;

  // If launcher is not installed, show install modal
  if (!jagexLauncherState.installed) {
    showInstallLauncherModal();
    return;
  }

  elements.launchJagexBtn.disabled = true;
  const launchText = elements.launchJagexBtn.querySelector('.launch-text');
  if (launchText) {
    launchText.textContent = 'Opening...';
  }

  const result = await window.api.launchViaJagex();

  if (result.success) {
    updateGameStatus('waiting');
  } else {
    alert('Launch failed: ' + ('error' in result ? result.error : 'Unknown error'));
  }

  elements.launchJagexBtn.disabled = false;
  if (launchText) {
    launchText.textContent = 'Open Jagex Launcher';
  }
}

// Show the install launcher modal
function showInstallLauncherModal(): void {
  if (!elements.installLauncherModal) return;

  elements.installLauncherModal.classList.add('active');

  // Update message based on platform
  if (elements.installLauncherMessage) {
    const isLinux = navigator.platform.toLowerCase().includes('linux');
    if (isLinux) {
      if (jagexLauncherState.flatpakAvailable) {
        elements.installLauncherMessage.innerHTML = `
          <p>Jagex Launcher is not installed.</p>
          <p>Click "Install via Flatpak" to install it automatically.</p>
        `;
      } else {
        elements.installLauncherMessage.innerHTML = `
          <p>Jagex Launcher is not installed.</p>
          <p>Flatpak is required but not installed on your system.</p>
          <p>Click the button below to install Flatpak first.</p>
        `;
      }
    } else {
      elements.installLauncherMessage.innerHTML = `
        <p>Jagex Launcher is not installed.</p>
        <p>Click "Download & Install" to download the installer.</p>
      `;
    }
  }

  // Show/hide appropriate install button
  if (elements.installFlatpakBtn) {
    const isLinux = navigator.platform.toLowerCase().includes('linux');
    if (isLinux && jagexLauncherState.flatpakAvailable) {
      elements.installFlatpakBtn.style.display = 'block';
      elements.installFlatpakBtn.textContent = 'Install via Flatpak';
    } else if (isLinux && !jagexLauncherState.flatpakAvailable) {
      elements.installFlatpakBtn.style.display = 'block';
      elements.installFlatpakBtn.textContent = 'Install Flatpak';
    } else if (!isLinux) {
      elements.installFlatpakBtn.style.display = 'block';
      elements.installFlatpakBtn.textContent = 'Download & Install';
    } else {
      elements.installFlatpakBtn.style.display = 'none';
    }
  }

  // Reset progress
  if (elements.installLauncherProgress) {
    elements.installLauncherProgress.style.display = 'none';
  }
}

// Hide the install launcher modal
function hideInstallLauncherModal(): void {
  if (!elements.installLauncherModal) return;
  elements.installLauncherModal.classList.remove('active');
}

// Install Jagex Launcher
async function installJagexLauncher(): Promise<void> {
  if (!elements.installFlatpakBtn || !elements.installLauncherProgress || !elements.installLauncherMessage) return;

  const isLinux = navigator.platform.toLowerCase().includes('linux');

  // Check if we need to install Flatpak first (Linux only)
  if (isLinux && !jagexLauncherState.flatpakAvailable) {
    await installFlatpakFirst();
    return;
  }

  elements.installFlatpakBtn.disabled = true;
  elements.installFlatpakBtn.textContent = 'Installing...';
  elements.installLauncherProgress.style.display = 'block';
  elements.installLauncherProgress.textContent = 'Starting installation...';

  // Set up progress listener
  const cleanupProgress = window.api.jagexLauncher.onInstallProgress((data) => {
    if (elements.installLauncherProgress) {
      elements.installLauncherProgress.textContent = data.message;
      if (data.progress !== undefined) {
        elements.installLauncherProgress.textContent += ` (${Math.round(data.progress)}%)`;
      }
    }
  });

  let result;
  if (isLinux) {
    result = await window.api.jagexLauncher.installFlatpak();
  } else {
    // Windows - download then run installer
    const downloadResult = await window.api.jagexLauncher.downloadWindows();
    if (downloadResult.success && downloadResult.installerPath) {
      elements.installLauncherProgress.textContent = 'Running installer...';
      result = await window.api.jagexLauncher.runInstaller(downloadResult.installerPath);
      if (result.success) {
        elements.installLauncherMessage.innerHTML = `
          <p>Installer has been launched.</p>
          <p>Please complete the installation wizard, then click "Check Again" to detect it.</p>
        `;
        elements.installFlatpakBtn.textContent = 'Check Again';
        elements.installFlatpakBtn.disabled = false;
        elements.installLauncherProgress.style.display = 'none';
        cleanupProgress();
        return;
      }
    } else {
      result = downloadResult;
    }
  }

  cleanupProgress();

  if (result.success) {
    elements.installLauncherProgress.textContent = 'Installation complete!';
    elements.installLauncherMessage.innerHTML = '<p>Jagex Launcher has been installed successfully!</p>';

    // Re-check installation status
    await checkJagexLauncherInstallation();

    // Reload config to pick up new path
    await loadConfig();

    // Close modal after a short delay
    setTimeout(() => {
      hideInstallLauncherModal();
    }, 1500);
  } else {
    elements.installLauncherProgress.textContent = 'Installation failed';
    elements.installLauncherMessage.innerHTML = `<p>Installation failed:</p><p class="error">${result.error || 'Unknown error'}</p>`;
    elements.installFlatpakBtn.disabled = false;
    elements.installFlatpakBtn.textContent = isLinux ? 'Retry Install' : 'Retry Download';
  }
}

// Install Flatpak first (requires sudo)
async function installFlatpakFirst(): Promise<void> {
  if (!elements.installFlatpakBtn || !elements.installLauncherProgress || !elements.installLauncherMessage) return;

  // Confirm with user
  const confirmed = confirm(
    'Flatpak is required to install Jagex Launcher on Linux.\n\n' +
    'Do you want to install Flatpak now?\n\n' +
    'This will require your password for administrator access.'
  );

  if (!confirmed) {
    return;
  }

  elements.installFlatpakBtn.disabled = true;
  elements.installFlatpakBtn.textContent = 'Installing Flatpak...';
  elements.installLauncherProgress.style.display = 'block';
  elements.installLauncherProgress.textContent = 'Installing Flatpak (password required)...';

  // Set up progress listener
  const cleanupProgress = window.api.jagexLauncher.onInstallProgress((data) => {
    if (elements.installLauncherProgress) {
      elements.installLauncherProgress.textContent = data.message;
    }
  });

  const result = await window.api.jagexLauncher.installFlatpakSystem();

  cleanupProgress();

  if (result.success) {
    elements.installLauncherProgress.textContent = 'Flatpak installed successfully!';

    // Re-check flatpak availability
    jagexLauncherState.flatpakAvailable = await window.api.jagexLauncher.isFlatpakAvailable();

    if (jagexLauncherState.flatpakAvailable) {
      elements.installLauncherMessage.innerHTML = `
        <p>Flatpak has been installed!</p>
        <p>Click "Install via Flatpak" to install Jagex Launcher.</p>
      `;
      elements.installFlatpakBtn.textContent = 'Install via Flatpak';
      elements.installFlatpakBtn.disabled = false;
    } else {
      elements.installLauncherMessage.innerHTML = `
        <p>Flatpak installation completed, but it may require a system restart.</p>
        <p>Please restart your computer and try again.</p>
      `;
      elements.installFlatpakBtn.textContent = 'Close';
      elements.installFlatpakBtn.disabled = false;
    }
  } else {
    elements.installLauncherProgress.textContent = 'Flatpak installation failed';
    elements.installLauncherMessage.innerHTML = `<p>Failed to install Flatpak:</p><p class="error">${result.error || 'Unknown error'}</p>`;
    elements.installFlatpakBtn.disabled = false;
    elements.installFlatpakBtn.textContent = 'Retry';
  }
}

// Logout
async function logout(sessionId: string): Promise<void> {
  await window.api.logout(sessionId);
  await loadSessions();
  updateLaunchButtonState();
}

// Update game status (simplified - client UI shows detailed status now)
function updateGameStatus(status: 'running' | 'waiting' | 'stopped', _pid?: number): void {
  switch (status) {
    case 'waiting':
      // Keep launch button disabled while waiting
      if (elements.launchBtn) {
        elements.launchBtn.disabled = true;
        const launchText = elements.launchBtn.querySelector('.launch-text');
        if (launchText) {
          launchText.textContent = 'Waiting...';
        }
      }
      break;
    case 'stopped':
      if (elements.launchBtn) {
        elements.launchBtn.disabled = false;
      }
      updateLaunchButtonState();
      break;
    // 'running' status is now handled by client events
  }
}

// Show add app modal
function showAddAppModal(): void {
  if (!elements.addAppModal || !elements.appUrlInput) return;

  // Switch to Apps tab first (important when called from toolbar)
  const appsTabBtn = document.querySelector('[data-tab="apps"]') as HTMLElement | null;
  if (appsTabBtn) {
    appsTabBtn.click();
  }

  elements.addAppModal.classList.add('active');
  elements.appUrlInput.value = '';
  if (elements.appDisplayNameInput) {
    elements.appDisplayNameInput.value = '';
  }

  // Use setTimeout to ensure focus takes effect after any pending operations
  // This helps on Windows where focus can be unreliable after dialogs
  setTimeout(() => {
    if (elements.appUrlInput) {
      elements.appUrlInput.focus();
      // Force focus by clicking on the input as well (Windows workaround)
      elements.appUrlInput.click();
    }
  }, 100);
}

// Hide add app modal
function hideAddAppModal(): void {
  elements.addAppModal?.classList.remove('active');
}

// ============================================
// Hotkey Conflict Modal
// ============================================

let currentConflictRequest: HotkeyConflictRequest | null = null;

// Show hotkey conflict modal
function showHotkeyConflictModal(request: HotkeyConflictRequest): void {
  if (!elements.hotkeyConflictModal) return;

  currentConflictRequest = request;

  // Update modal content
  if (elements.conflictOriginalKey) {
    elements.conflictOriginalKey.textContent = request.originalAccelerator;
  }
  if (elements.conflictAppName) {
    elements.conflictAppName.textContent = request.conflictingAppName;
  }

  if (request.alternativeSuggestion) {
    // Show alternative suggestion
    if (elements.conflictAlternativeKey) {
      elements.conflictAlternativeKey.textContent = request.alternativeSuggestion.accelerator;
    }
    if (elements.hotkeyAlternativeMessage) {
      elements.hotkeyAlternativeMessage.style.display = 'block';
    }
    if (elements.hotkeyNoAlternativeMessage) {
      elements.hotkeyNoAlternativeMessage.style.display = 'none';
    }
    if (elements.hotkeyConflictAccept) {
      elements.hotkeyConflictAccept.style.display = 'inline-block';
      elements.hotkeyConflictAccept.textContent = `Use ${request.alternativeSuggestion.modifiers}+Key`;
    }
  } else {
    // No alternative available
    if (elements.hotkeyAlternativeMessage) {
      elements.hotkeyAlternativeMessage.style.display = 'none';
    }
    if (elements.hotkeyNoAlternativeMessage) {
      elements.hotkeyNoAlternativeMessage.style.display = 'block';
    }
    if (elements.hotkeyConflictAccept) {
      elements.hotkeyConflictAccept.style.display = 'none';
    }
  }

  elements.hotkeyConflictModal.classList.add('active');
}

// Hide hotkey conflict modal
function hideHotkeyConflictModal(): void {
  elements.hotkeyConflictModal?.classList.remove('active');
  currentConflictRequest = null;
}

// Handle conflict resolution actions
function resolveHotkeyConflict(accepted: boolean, useAlternative: boolean, openSettings: boolean): void {
  if (!currentConflictRequest) return;

  window.api.resolveHotkeyConflict({
    requestId: currentConflictRequest.requestId,
    accepted,
    useAlternative,
    openSettings
  });

  hideHotkeyConflictModal();

  // If opening settings, switch to the settings tab
  if (openSettings) {
    switchToTab('settings');
    // TODO: Could scroll to/highlight hotkeys section when we add it
  }
}

// Set up hotkey conflict modal button handlers
function setupHotkeyConflictModalHandlers(): void {
  // Close button
  elements.closeHotkeyConflictModal?.addEventListener('click', () => {
    resolveHotkeyConflict(false, false, false);
  });

  // Accept alternative button
  elements.hotkeyConflictAccept?.addEventListener('click', () => {
    resolveHotkeyConflict(true, true, false);
  });

  // Open settings button
  elements.hotkeyConflictSettings?.addEventListener('click', () => {
    resolveHotkeyConflict(false, false, true);
  });

  // Click outside to close
  elements.hotkeyConflictModal?.addEventListener('click', (e) => {
    if (e.target === elements.hotkeyConflictModal) {
      resolveHotkeyConflict(false, false, false);
    }
  });
}

// ============================================
// Hotkey Settings Functions
// ============================================

// Hotkey rebind state
let rebindingHotkeyId: string | null = null;
let currentHotkeyApp: string | null = null;

// Cached hotkeys for the modal
let cachedHotkeys: Array<{
  id: string;
  displayAccelerator: string;
  action: string;
  appName: string;
  enabled: boolean;
  isDefault: boolean;
  description?: string;
}> = [];

// Load hotkey settings
async function loadHotkeySettings(): Promise<void> {
  try {
    const settings = await window.api.getHotkeySettings();
    if (elements.hotkeysEnabled) {
      elements.hotkeysEnabled.checked = settings.enabled;
    }
    if (elements.hotkeysOnlyWhenFocused) {
      elements.hotkeysOnlyWhenFocused.checked = settings.onlyWhenFocused;
    }
    await refreshHotkeysAppsList();
  } catch (e) {
    console.error('[Renderer] Failed to load hotkey settings:', e);
  }
}

// Refresh the apps list (groups hotkeys by app)
async function refreshHotkeysAppsList(): Promise<void> {
  try {
    const hotkeys = await window.api.getRegisteredHotkeys();
    cachedHotkeys = hotkeys;

    if (!elements.hotkeysAppsList || !elements.noHotkeys) return;

    if (hotkeys.length === 0) {
      elements.noHotkeys.style.display = 'block';
      // Remove any existing app buttons
      elements.hotkeysAppsList.querySelectorAll('.hotkey-app-btn').forEach(btn => btn.remove());
      return;
    }

    elements.noHotkeys.style.display = 'none';

    // Group hotkeys by app name
    const appGroups = new Map<string, typeof hotkeys>();
    for (const hk of hotkeys) {
      const existing = appGroups.get(hk.appName) || [];
      existing.push(hk);
      appGroups.set(hk.appName, existing);
    }

    // Remove existing app buttons
    elements.hotkeysAppsList.querySelectorAll('.hotkey-app-btn').forEach(btn => btn.remove());

    // Create a button for each app
    for (const [appName, appHotkeys] of appGroups) {
      const btn = document.createElement('button');
      btn.className = 'hotkey-app-btn';
      btn.innerHTML = `
        <span class="app-name">${escapeHtml(appName)}</span>
        <span class="hotkey-count">${appHotkeys.length} hotkey${appHotkeys.length !== 1 ? 's' : ''}</span>
      `;
      btn.addEventListener('click', () => openHotkeyManager(appName));
      elements.hotkeysAppsList.appendChild(btn);
    }
  } catch (e) {
    console.error('[Renderer] Failed to refresh hotkeys apps list:', e);
  }
}

// Open the hotkey manager modal for a specific app
function openHotkeyManager(appName: string): void {
  currentHotkeyApp = appName;

  if (elements.hotkeyManagerTitle) {
    elements.hotkeyManagerTitle.textContent = `${appName} Hotkeys`;
  }

  refreshHotkeyManagerList();
  elements.hotkeyManagerModal?.classList.add('active');
}

// Close the hotkey manager modal
function closeHotkeyManagerModal(): void {
  elements.hotkeyManagerModal?.classList.remove('active');
  currentHotkeyApp = null;
  rebindingHotkeyId = null;
}

// Refresh the hotkey list inside the modal
function refreshHotkeyManagerList(): void {
  if (!elements.hotkeyManagerList || !currentHotkeyApp) return;

  const appHotkeys = cachedHotkeys.filter(hk => hk.appName === currentHotkeyApp);

  elements.hotkeyManagerList.innerHTML = appHotkeys.map(hotkey => `
    <div class="hotkey-item" data-hotkey-id="${escapeHtml(hotkey.id)}">
      <div class="hotkey-info">
        <span class="hotkey-action">${escapeHtml(hotkey.action)}</span>
        ${hotkey.description ? `<span class="hotkey-description">${escapeHtml(hotkey.description)}</span>` : ''}
      </div>
      <div class="hotkey-controls">
        <span class="hotkey-key-display" id="hotkey-display-${escapeHtml(hotkey.id)}">${escapeHtml(hotkey.displayAccelerator)}</span>
        <button class="hotkey-rebind-btn" data-hotkey-id="${escapeHtml(hotkey.id)}">Rebind</button>
      </div>
    </div>
  `).join('');

  // Add click handlers for rebind buttons
  elements.hotkeyManagerList.querySelectorAll('.hotkey-rebind-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hotkeyId = (e.target as HTMLElement).getAttribute('data-hotkey-id') || '';
      if (hotkeyId) {
        startRebindHotkey(hotkeyId);
      }
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start rebinding a hotkey
function startRebindHotkey(hotkeyId: string): void {
  // If already rebinding another key, cancel it
  if (rebindingHotkeyId !== null) {
    cancelRebind();
  }

  rebindingHotkeyId = hotkeyId;

  // Update the display to show recording state
  const display = document.getElementById(`hotkey-display-${hotkeyId}`);
  if (display) {
    display.textContent = 'Press key...';
    display.classList.add('recording');
  }

  // Add keyboard listener
  document.addEventListener('keydown', handleRebindKeydown);
  document.addEventListener('keyup', handleRebindKeyup);
}

// Cancel rebind
function cancelRebind(): void {
  if (rebindingHotkeyId === null) return;

  const display = document.getElementById(`hotkey-display-${rebindingHotkeyId}`);
  if (display) {
    display.classList.remove('recording');
  }

  document.removeEventListener('keydown', handleRebindKeydown);
  document.removeEventListener('keyup', handleRebindKeyup);
  rebindingHotkeyId = null;

  // Refresh to restore original key display
  refreshHotkeyManagerList();
}

// Handle keydown during rebind
function handleRebindKeydown(e: KeyboardEvent): void {
  e.preventDefault();
  e.stopPropagation();

  // Escape cancels rebind
  if (e.key === 'Escape') {
    cancelRebind();
    return;
  }

  // Ignore modifier-only keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return;
  }

  if (rebindingHotkeyId === null) return;

  // Build modifier string
  const modifiers: string[] = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.altKey) modifiers.push('Alt');
  if (e.metaKey) modifiers.push('Meta');

  // Build accelerator string (Electron format)
  const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const accelerator = [...modifiers, keyName].join('+');

  // Update display
  const display = document.getElementById(`hotkey-display-${rebindingHotkeyId}`);
  if (display) {
    display.textContent = accelerator;
  }
}

// Handle keyup during rebind - this is when we actually apply the change
function handleRebindKeyup(e: KeyboardEvent): void {
  // Ignore modifier-only keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return;
  }

  if (rebindingHotkeyId === null) return;

  const hotkeyId = rebindingHotkeyId;
  const display = document.getElementById(`hotkey-display-${hotkeyId}`);
  const newAccelerator = display?.textContent || '';

  // Clean up
  document.removeEventListener('keydown', handleRebindKeydown);
  document.removeEventListener('keyup', handleRebindKeyup);
  rebindingHotkeyId = null;

  if (display) {
    display.classList.remove('recording');
  }

  // Apply the new hotkey
  if (newAccelerator && newAccelerator !== 'Press key...') {
    applyRebind(hotkeyId, newAccelerator);
  } else {
    refreshHotkeyManagerList();
  }
}

// Apply the rebind to the backend
async function applyRebind(hotkeyId: string, newAccelerator: string): Promise<void> {
  try {
    const result = await window.api.rebindHotkey(hotkeyId, newAccelerator);
    if (!result.success) {
      alert(result.error || 'Failed to rebind hotkey');
    }
    // Refresh both the modal and the cached data
    await refreshHotkeysAppsList();
    refreshHotkeyManagerList();
  } catch (e) {
    console.error('[Renderer] Failed to apply rebind:', e);
    refreshHotkeyManagerList();
  }
}

// Setup hotkey settings event listeners
function setupHotkeySettingsListeners(): void {
  // Collapsible header
  elements.hotkeysHeader?.addEventListener('click', () => {
    elements.hotkeysHeader?.classList.toggle('collapsed');
    elements.hotkeysContent?.classList.toggle('collapsed');
  });

  // Global hotkeys enabled toggle
  elements.hotkeysEnabled?.addEventListener('change', async (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    await window.api.setHotkeysEnabled(enabled);
  });

  // Only when RS focused toggle
  elements.hotkeysOnlyWhenFocused?.addEventListener('change', async (e) => {
    const onlyWhenFocused = (e.target as HTMLInputElement).checked;
    await window.api.setHotkeysOnlyWhenFocused(onlyWhenFocused);
  });

  // Hotkey manager modal close buttons
  elements.closeHotkeyManager?.addEventListener('click', closeHotkeyManagerModal);
  elements.hotkeyManagerClose?.addEventListener('click', closeHotkeyManagerModal);

  // Click outside modal to close
  elements.hotkeyManagerModal?.addEventListener('click', (e) => {
    if (e.target === elements.hotkeyManagerModal) {
      closeHotkeyManagerModal();
    }
  });
}

// Add app
async function addApp(): Promise<void> {
  if (!elements.appUrlInput || !elements.confirmAddApp) return;

  const url = elements.appUrlInput.value.trim();
  if (!url) {
    alert('Please enter a URL');
    return;
  }

  const displayName = elements.appDisplayNameInput?.value.trim() || undefined;

  elements.confirmAddApp.disabled = true;
  elements.confirmAddApp.textContent = 'Adding...';

  const result = await window.api.addApp(url, displayName);

  elements.confirmAddApp.disabled = false;
  elements.confirmAddApp.textContent = 'Add App';

  if (result.success) {
    hideAddAppModal();
    await loadApps();
  } else {
    alert('Failed to add app: ' + ('error' in result ? result.error : 'Unknown error'));
  }
}

// Remove app
async function removeApp(configUrl: string): Promise<void> {
  if (!confirm('Remove this app?')) return;

  await window.api.removeApp(configUrl);
  await loadApps();

  // Restore focus after confirm dialog steals it (Windows workaround)
  // Focus on the add app button since body can't receive focus
  setTimeout(() => {
    if (elements.addAppBtn) {
      elements.addAppBtn.focus();
    } else if (elements.addAppCard) {
      // Fallback: click somewhere in the apps grid to restore focus context
      elements.addAppCard.click();
    }
  }, 50);
}

// Load theme
function loadTheme(): void {
  const savedTheme = localStorage.getItem('alt1gl-theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  elements.themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
  });
}

// Truncate path helper
function truncatePath(path: string, maxLength: number): string {
  if (!path || path.length <= maxLength) return path;
  return '...' + path.substring(path.length - maxLength + 3);
}

// ============================================
// Toolbar Profile Management
// ============================================

// Profile state
let editingProfileId: string | null = null;
let assigningClientPid: number = 0;
let assigningCharacterId: string = '';
let assigningCharacterName: string = '';

// Load and render profiles
async function loadProfiles(): Promise<void> {
  try {
    const profiles = await window.api.profiles.getAll();
    const assignments = await window.api.profiles.getAssignments();
    renderProfiles(profiles, assignments);
    renderAssignments(assignments, profiles);
  } catch (e) {
    console.error('[Renderer] Failed to load profiles:', e);
  }
}

// Render profile cards
function renderProfiles(profiles: Array<{ id: string; name: string; createdAt: number }>, assignments: Array<{ characterId: string; characterName?: string; profileId: string }>): void {
  if (!elements.profilesList || !elements.noProfiles) return;

  // Clear existing cards
  elements.profilesList.querySelectorAll('.profile-card').forEach(el => el.remove());

  if (profiles.length === 0) {
    elements.noProfiles.style.display = 'block';
    elements.noProfiles.innerHTML = '<span class="text-muted">No profiles. Click "+ New Profile" to create one.</span>';
    return;
  }

  elements.noProfiles.style.display = 'none';

  for (const profile of profiles) {
    const assignedCount = assignments.filter(a => a.profileId === profile.id).length;
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.profileId = profile.id;

    const isDefault = profile.id === 'default';
    const badgeHtml = isDefault
      ? '<span class="profile-badge badge-default">Default</span>'
      : '';

    card.innerHTML = `
      <div class="profile-card-info">
        <div class="profile-card-name">${escapeHtml(profile.name)}${badgeHtml}</div>
        <div class="profile-card-meta">${assignedCount} character${assignedCount !== 1 ? 's' : ''} assigned</div>
      </div>
      <div class="profile-card-actions">
        <button class="btn-icon" data-action="rename" title="Rename">&#x270E;</button>
        ${!isDefault ? '<button class="btn-icon btn-danger" data-action="delete" title="Delete">&#x2715;</button>' : ''}
      </div>
    `;

    // Attach event listeners
    card.querySelector('[data-action="rename"]')?.addEventListener('click', () => openRenameProfile(profile.id, profile.name));
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteProfile(profile.id, profile.name));

    elements.profilesList.appendChild(card);
  }
}

// Render character assignments
function renderAssignments(assignments: Array<{ characterId: string; characterName?: string; profileId: string }>, profiles: Array<{ id: string; name: string }>): void {
  if (!elements.profileAssignments || !elements.assignmentsList || !elements.noAssignments) return;

  // Always show the section
  elements.profileAssignments.style.display = 'block';

  // Clear existing cards
  elements.assignmentsList.querySelectorAll('.assignment-card').forEach(el => el.remove());

  // Collect all known characters: from sessions + from persisted assignments + from connected clients
  const characters: Map<string, { id: string; name: string; connected: boolean; pid: number }> = new Map();

  // 1. Characters from logged-in sessions (primary source)
  for (const session of sessions) {
    for (const account of session.accounts) {
      characters.set(account.accountId, {
        id: account.accountId,
        name: account.displayName,
        connected: false,
        pid: 0
      });
    }
  }

  // 2. Characters from connected clients (mark as connected)
  for (const client of connectedClients.values()) {
    if (client.characterId) {
      const existing = characters.get(client.characterId);
      if (existing) {
        existing.connected = true;
        existing.pid = client.pid;
        // Update name from client if available
        if (client.characterName) existing.name = client.characterName;
      } else {
        characters.set(client.characterId, {
          id: client.characterId,
          name: client.characterName || client.characterId,
          connected: true,
          pid: client.pid
        });
      }
    } else {
      // RS2 client without Jagex login -- show using PID as identifier
      const syntheticId = `pid:${client.pid}`;
      if (!characters.has(syntheticId)) {
        characters.set(syntheticId, {
          id: '',  // No characterId for persistence
          name: client.windowTitle || `Client (PID ${client.pid})`,
          connected: true,
          pid: client.pid
        });
      }
    }
  }

  // 3. Characters from persisted assignments (in case session expired but assignment remains)
  for (const assignment of assignments) {
    if (!characters.has(assignment.characterId)) {
      characters.set(assignment.characterId, {
        id: assignment.characterId,
        name: assignment.characterName || assignment.characterId,
        connected: false,
        pid: 0
      });
    }
  }

  if (characters.size === 0) {
    elements.noAssignments.style.display = 'block';
    elements.noAssignments.innerHTML = '<span class="text-muted">Log in or launch a game client to assign profiles.</span>';
    return;
  }

  elements.noAssignments.style.display = 'none';

  // Render a card for each character
  for (const char of characters.values()) {
    const existingAssignment = assignments.find(a => a.characterId === char.id);
    const profile = existingAssignment ? profiles.find(p => p.id === existingAssignment.profileId) : null;

    const connectedBadge = char.connected
      ? '<span class="client-profile-badge" style="margin-left:6px;">Connected</span>'
      : '';

    const card = document.createElement('div');
    card.className = 'assignment-card';
    card.innerHTML = `
      <div class="assignment-info">
        <span class="assignment-character">${escapeHtml(char.name)}${connectedBadge}</span>
        <span class="assignment-profile">Profile: ${escapeHtml(profile?.name || 'Default')}</span>
      </div>
      <button class="btn btn-small" data-action="assign">${existingAssignment ? 'Change' : 'Assign'}</button>
    `;
    card.querySelector('[data-action="assign"]')?.addEventListener('click', () => {
      openAssignProfile(char.pid, char.id, char.name);
    });
    elements.assignmentsList.appendChild(card);
  }
}

// Open create profile modal
function openCreateProfile(): void {
  editingProfileId = null;
  if (elements.profileModalTitle) elements.profileModalTitle.textContent = 'Create Profile';
  if (elements.profileNameInput) elements.profileNameInput.value = '';
  if (elements.confirmProfile) elements.confirmProfile.textContent = 'Create';
  elements.profileModal?.classList.add('active');
  elements.profileNameInput?.focus();
}

// Open rename profile modal
function openRenameProfile(profileId: string, currentName: string): void {
  editingProfileId = profileId;
  if (elements.profileModalTitle) elements.profileModalTitle.textContent = 'Rename Profile';
  if (elements.profileNameInput) elements.profileNameInput.value = currentName;
  if (elements.confirmProfile) elements.confirmProfile.textContent = 'Rename';
  elements.profileModal?.classList.add('active');
  elements.profileNameInput?.focus();
}

// Confirm create or rename
async function confirmProfileAction(): Promise<void> {
  const name = elements.profileNameInput?.value.trim();
  if (!name) return;

  try {
    if (editingProfileId) {
      await window.api.profiles.rename(editingProfileId, name);
    } else {
      await window.api.profiles.create(name);
    }
    closeProfileModal();
    await loadProfiles();
  } catch (e) {
    console.error('[Renderer] Profile action failed:', e);
  }
}

// Delete a profile
async function deleteProfile(profileId: string, profileName: string): Promise<void> {
  if (!confirm(`Delete profile "${profileName}"? Characters assigned to it will revert to the default profile.`)) return;

  try {
    await window.api.profiles.delete(profileId);
    await loadProfiles();
  } catch (e) {
    console.error('[Renderer] Failed to delete profile:', e);
  }
}

// Close profile modal
function closeProfileModal(): void {
  elements.profileModal?.classList.remove('active');
  editingProfileId = null;
}

// Open assign profile modal for a connected client
function openAssignProfile(pid: number, characterId: string, characterName: string): void {
  assigningClientPid = pid;
  assigningCharacterId = characterId;
  assigningCharacterName = characterName;

  if (elements.assignProfileModalTitle) {
    elements.assignProfileModalTitle.textContent = 'Assign Profile';
  }
  if (elements.assignProfileDescription) {
    elements.assignProfileDescription.textContent = characterName
      ? `Select a profile for "${characterName}":`
      : 'Select a profile for this client:';
  }

  // Populate profile options
  populateProfileSelectList();
  elements.assignProfileModal?.classList.add('active');
}

// Populate the profile select list
async function populateProfileSelectList(): Promise<void> {
  if (!elements.profileSelectList) return;

  const profiles = await window.api.profiles.getAll();
  elements.profileSelectList.innerHTML = '';

  for (const profile of profiles) {
    const btn = document.createElement('button');
    btn.className = 'profile-select-option';
    btn.textContent = profile.name;
    btn.addEventListener('click', async () => {
      try {
        // Assign character to profile
        if (assigningCharacterId) {
          await window.api.profiles.assign(assigningCharacterId, profile.id, assigningCharacterName);
        }
        // If we have a live PID, also set runtime mapping
        if (assigningClientPid > 0) {
          await window.api.profiles.setForPid(assigningClientPid, profile.id);
        }
        closeAssignProfileModal();
        await loadProfiles();
      } catch (e) {
        console.error('[Renderer] Failed to assign profile:', e);
      }
    });
    elements.profileSelectList.appendChild(btn);
  }
}

// Close assign profile modal
function closeAssignProfileModal(): void {
  elements.assignProfileModal?.classList.remove('active');
  assigningClientPid = 0;
  assigningCharacterId = '';
  assigningCharacterName = '';
}

// Initialize profile event listeners
function initProfileEventListeners(): void {
  elements.createProfileBtn?.addEventListener('click', openCreateProfile);
  elements.confirmProfile?.addEventListener('click', confirmProfileAction);
  elements.cancelProfile?.addEventListener('click', closeProfileModal);
  elements.closeProfileModal?.addEventListener('click', closeProfileModal);
  elements.cancelAssignProfile?.addEventListener('click', closeAssignProfileModal);
  elements.closeAssignProfileModal?.addEventListener('click', closeAssignProfileModal);

  // Enter key in profile name input
  elements.profileNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmProfileAction();
    if (e.key === 'Escape') closeProfileModal();
  });
}

// Font atlas state - only send once per session
let fontAtlasSent = false;

// Generate and send font atlas to overlay
async function sendFontAtlasToOverlay(): Promise<void> {
  if (fontAtlasSent || !canGenerateFontAtlas()) {
    return;
  }

  try {
    console.log('[Renderer] Generating font atlas...');
    const atlas = generateFontAtlas();
    console.log('[Renderer] Font atlas generated:', atlas.textureWidth, 'x', atlas.textureHeight);

    // Small delay to ensure overlay IPC message queue is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await window.api.sendFontAtlas({
      textureWidth: atlas.textureWidth,
      textureHeight: atlas.textureHeight,
      glyphWidth: atlas.glyphWidth,
      glyphHeight: atlas.glyphHeight,
      firstChar: atlas.firstChar,
      lastChar: atlas.lastChar,
      charsPerRow: atlas.charsPerRow,
      pixels: atlas.pixels,
      charWidths: atlas.charWidths
    });

    if (result.success) {
      console.log('[Renderer] Font atlas sent to overlay successfully');
      fontAtlasSent = true;
    } else {
      console.log('[Renderer] Failed to send font atlas:', 'error' in result ? result.error : 'unknown');
    }
  } catch (e) {
    console.error('[Renderer] Error generating/sending font atlas:', e);
  }
}

// ============================================
// Daily Info Dashboard
// ============================================

async function loadDailyInfo(): Promise<void> {
  try {
    const info = await window.api.getDailyInfo();

    // Voice of Seren
    if (info.vos) {
      if (elements.vosClanIcon1) {
        elements.vosClanIcon1.src = VOS_CLAN_ICONS[info.vos.district1] || '';
        elements.vosClanIcon1.alt = info.vos.district1;
        elements.vosClanIcon1.style.display = VOS_CLAN_ICONS[info.vos.district1] ? 'block' : 'none';
      }
      if (elements.vosClanName1) elements.vosClanName1.textContent = info.vos.district1;
      if (elements.vosClanIcon2) {
        elements.vosClanIcon2.src = VOS_CLAN_ICONS[info.vos.district2] || '';
        elements.vosClanIcon2.alt = info.vos.district2;
        elements.vosClanIcon2.style.display = VOS_CLAN_ICONS[info.vos.district2] ? 'block' : 'none';
      }
      if (elements.vosClanName2) elements.vosClanName2.textContent = info.vos.district2;
    } else {
      if (elements.vosClanName1) elements.vosClanName1.textContent = 'Unavailable';
      if (elements.vosClanName2) elements.vosClanName2.textContent = '';
      if (elements.vosClanIcon1) elements.vosClanIcon1.style.display = 'none';
      if (elements.vosClanIcon2) elements.vosClanIcon2.style.display = 'none';
    }

    // VIS Wax
    if (elements.visWaxValue) {
      if (info.visWax) {
        const slot2Str = info.visWax.slot2.length > 0 ? info.visWax.slot2.join(', ') : '?';
        elements.visWaxValue.innerHTML =
          `<b>Slot 1:</b> ${info.visWax.slot1}<br>` +
          `<b>Slot 2:</b> ${slot2Str}<br>` +
          `<b>Slot 3:</b> ${info.visWax.slot3}`;
      } else {
        elements.visWaxValue.textContent = 'Unavailable';
      }
    }

    // Minigame Spotlight
    if (elements.spotlightValue) {
      elements.spotlightValue.textContent = info.spotlight || 'Unavailable';
    }

    // Update reset timer
    updateResetTimer();
  } catch (e) {
    console.error('[Renderer] Failed to load daily info:', e);
  }
}

function updateResetTimer(): void {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (elements.dailyResetTimer) {
    elements.dailyResetTimer.textContent = `Reset in ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

// ============================================
// News Feed
// ============================================

async function loadNews(): Promise<void> {
  try {
    const news = await window.api.getNews();

    if (news.length === 0) return;

    if (elements.newsSection) {
      elements.newsSection.style.display = 'block';
    }

    if (elements.newsList) {
      elements.newsList.innerHTML = '';
      const itemsToShow = news.slice(0, 4);
      for (const item of itemsToShow) {
        elements.newsList.appendChild(createNewsCard(item));
      }
    }
  } catch (e) {
    console.error('[Renderer] Failed to load news:', e);
  }
}

function createNewsCard(item: { title: string; category: string; link: string; pubDate: string; description: string; imageUrl: string | null }): HTMLElement {
  const card = document.createElement('div');
  card.className = 'news-card';
  card.addEventListener('click', () => {
    window.api.openExternal(item.link);
  });

  if (item.imageUrl) {
    const thumb = document.createElement('div');
    thumb.className = 'news-thumbnail';
    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.title;
    img.loading = 'lazy';
    img.onerror = () => { thumb.style.display = 'none'; };
    thumb.appendChild(img);
    card.appendChild(thumb);
  }

  const content = document.createElement('div');
  content.className = 'news-content';

  const title = document.createElement('div');
  title.className = 'news-title';
  title.textContent = item.title;

  const meta = document.createElement('div');
  meta.className = 'news-meta';

  const category = document.createElement('span');
  category.className = 'news-category';
  category.textContent = item.category;

  const date = document.createElement('span');
  date.className = 'news-date';
  date.textContent = formatRelativeDate(item.pubDate);

  meta.appendChild(category);
  meta.appendChild(date);
  content.appendChild(title);
  content.appendChild(meta);
  card.appendChild(content);

  return card;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ==========================================
// GE Price Checker
// ==========================================
let geSearchTimeout: ReturnType<typeof setTimeout> | null = null;
let geSelectedIndex = -1;
let geSearchResults: Array<{name: string; id: number | null; icon: string | null; source: string}> = [];

function formatGoldPrice(price: number): string {
  if (price >= 1_000_000_000) return (price / 1_000_000_000).toFixed(2) + 'B';
  if (price >= 1_000_000) return (price / 1_000_000).toFixed(1) + 'M';
  if (price >= 1_000) return (price / 1_000).toFixed(1) + 'K';
  return price.toLocaleString();
}

function setupGESearch(): void {
  const input = elements.geSearchInput;
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (geSearchTimeout) clearTimeout(geSearchTimeout);
    if (query.length < 2) {
      hideGEDropdown();
      return;
    }
    geSearchTimeout = setTimeout(() => searchGEItems(query), 300);
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      geSelectedIndex = Math.min(geSelectedIndex + 1, geSearchResults.length - 1);
      updateGEDropdownHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      geSelectedIndex = Math.max(geSelectedIndex - 1, 0);
      updateGEDropdownHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (geSelectedIndex >= 0 && geSelectedIndex < geSearchResults.length) {
        const item = geSearchResults[geSelectedIndex];
        selectGEItem(item.name, item.id);
      } else if (input.value.trim()) {
        selectGEItem(input.value.trim());
      }
    } else if (e.key === 'Escape') {
      hideGEDropdown();
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target as Node) && !elements.geSearchDropdown?.contains(e.target as Node)) {
      hideGEDropdown();
    }
  });
}

async function searchGEItems(query: string): Promise<void> {
  try {
    const results = await window.api.geSearch(query);
    geSearchResults = results;
    geSelectedIndex = -1;
    if (results.length > 0) {
      showGEDropdown(results);
    } else {
      hideGEDropdown();
    }
  } catch (e) {
    console.error('[GE] Search failed:', e);
    hideGEDropdown();
  }
}

function showGEDropdown(items: Array<{name: string; id: number | null; icon: string | null; source: string}>): void {
  const dropdown = elements.geSearchDropdown;
  if (!dropdown) return;
  dropdown.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'ge-search-option';
    if (item.icon) {
      const img = document.createElement('img');
      img.src = item.icon;
      img.width = 20;
      img.height = 20;
      img.style.marginRight = '8px';
      img.style.verticalAlign = 'middle';
      img.style.imageRendering = 'pixelated';
      el.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = item.name;
    el.appendChild(span);
    el.addEventListener('click', () => selectGEItem(item.name, item.id));
    el.addEventListener('mouseenter', () => {
      geSelectedIndex = i;
      updateGEDropdownHighlight();
    });
    dropdown.appendChild(el);
  });
  dropdown.style.display = 'block';
}

function hideGEDropdown(): void {
  if (elements.geSearchDropdown) {
    elements.geSearchDropdown.style.display = 'none';
  }
  geSearchResults = [];
  geSelectedIndex = -1;
}

function updateGEDropdownHighlight(): void {
  const dropdown = elements.geSearchDropdown;
  if (!dropdown) return;
  const options = dropdown.querySelectorAll('.ge-search-option');
  options.forEach((el, i) => {
    el.classList.toggle('active', i === geSelectedIndex);
  });
}

async function selectGEItem(itemName: string, itemId?: number | null): Promise<void> {
  hideGEDropdown();
  if (elements.geSearchInput) elements.geSearchInput.value = itemName;

  // Show loading
  if (elements.geEmpty) elements.geEmpty.style.display = 'none';
  if (elements.geError) elements.geError.style.display = 'none';
  if (elements.geResult) elements.geResult.style.display = 'none';
  if (elements.geLoading) elements.geLoading.style.display = 'block';

  try {
    const data = await window.api.geItemInfo(itemName, itemId || undefined);
    if (!data || (!data.price && !data.description)) {
      showGEError('Item not found or no GE data available.');
      return;
    }
    renderGEResult(data);
  } catch (e) {
    console.error('[GE] Item info failed:', e);
    showGEError('Failed to fetch item data. Please try again.');
  } finally {
    if (elements.geLoading) elements.geLoading.style.display = 'none';
  }
}

function showGEError(msg: string): void {
  if (elements.geLoading) elements.geLoading.style.display = 'none';
  if (elements.geResult) elements.geResult.style.display = 'none';
  if (elements.geEmpty) elements.geEmpty.style.display = 'none';
  if (elements.geErrorText) elements.geErrorText.textContent = msg;
  if (elements.geError) elements.geError.style.display = 'block';
}

function renderGEResult(data: any): void {
  if (elements.geResult) elements.geResult.style.display = 'block';
  if (elements.geEmpty) elements.geEmpty.style.display = 'none';
  if (elements.geError) elements.geError.style.display = 'none';

  // Item header
  if (elements.geItemImage) {
    if (data.image) {
      elements.geItemImage.src = data.image;
      elements.geItemImage.style.display = 'block';
    } else {
      elements.geItemImage.style.display = 'none';
    }
  }
  if (elements.geItemName) elements.geItemName.textContent = data.name;
  if (elements.geItemId) elements.geItemId.textContent = data.itemId ? `Item ID: ${data.itemId}` : '';

  // Wiki link
  if (elements.geWikiLink) {
    elements.geWikiLink.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (data.wikiUrl) {
        window.api.openExternal(data.wikiUrl).catch((err: any) => console.error('[Renderer] Wiki link failed:', err));
      }
    };
  }

  // Price
  if (elements.gePrice) {
    elements.gePrice.textContent = data.price > 0 ? formatGoldPrice(data.price) + ' gp' : 'Not tradeable';
  }
  if (elements.gePriceMeta) {
    const parts: string[] = [];
    if (data.price > 0) parts.push(`Exact: ${data.price.toLocaleString()} gp`);
    if (data.volume > 0) parts.push(`Vol: ${data.volume.toLocaleString()}`);
    const sourceLabel = data.source === 'geprice' ? 'GEPrices.com' : 'Wiki';
    if (data.weeklyChangePercent && data.weeklyChangePercent !== 0) {
      const sign = data.weeklyChangePercent > 0 ? '+' : '';
      const color = data.weeklyChangePercent > 0 ? '#3fb950' : '#f85149';
      elements.gePriceMeta.innerHTML = parts.join(' | ') +
        ` | <span style="color:${color}">${sign}${data.weeklyChangePercent.toFixed(1)}% this period</span>` +
        ` | <span style="color:#888">via ${sourceLabel}</span>`;
    } else {
      elements.gePriceMeta.textContent = parts.join(' | ') + ` | via ${sourceLabel}`;
    }
  }

  // Description
  if (elements.geDescriptionCard && elements.geDescriptionText) {
    if (data.description) {
      // Truncate to first 2 sentences or 200 chars
      let desc = data.description;
      const sentences = desc.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 2) {
        desc = sentences.slice(0, 2).join('').trim();
      }
      if (desc.length > 250) desc = desc.substring(0, 250) + '...';
      elements.geDescriptionText.textContent = desc;
      elements.geDescriptionCard.style.display = 'block';
    } else {
      elements.geDescriptionCard.style.display = 'none';
    }
  }

  // Price chart
  if (elements.geChartCanvas && data.history && data.history.length > 1) {
    drawPriceChart(elements.geChartCanvas, data.history);
  }

  // Recent reports from GEPrices.com
  if (elements.geReportsCard && elements.geReportsList) {
    if (data.reports && data.reports.length > 0) {
      elements.geReportsList.innerHTML = '';
      for (const report of data.reports) {
        const row = document.createElement('div');
        row.className = 'ge-report-row';

        const isBuy = report.type.includes('buy');
        const typeLabel = isBuy ? 'INSTANT BUY' : 'INSTANT SELL';
        const typeColor = isBuy ? '#3fb950' : '#f85149';

        const dateStr = formatReportDate(report.date);

        row.innerHTML =
          `<div class="ge-report-left">` +
            `<span class="ge-report-type" style="color:${typeColor}">${typeLabel}</span>` +
            `<span class="ge-report-reporter">${report.reporter}</span>` +
          `</div>` +
          `<div class="ge-report-right">` +
            `<span class="ge-report-price">${formatGoldPrice(report.price)}</span>` +
            `<span class="ge-report-date">${dateStr}</span>` +
          `</div>`;
        elements.geReportsList.appendChild(row);
      }
      elements.geReportsCard.style.display = 'block';
    } else {
      elements.geReportsCard.style.display = 'none';
    }
  }
}

function formatReportDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function drawPriceChart(canvas: HTMLCanvasElement, history: Array<{ price: number; timestamp: number }>): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sort by timestamp
  history.sort((a, b) => a.timestamp - b.timestamp);

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  // Draw grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH * i / 4);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, 'rgba(88,166,255,0.15)');
  gradient.addColorStop(1, 'rgba(88,166,255,0)');

  ctx.beginPath();
  ctx.moveTo(padding.left, h - padding.bottom);
  for (let i = 0; i < history.length; i++) {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + chartH - ((prices[i] - minPrice) / range) * chartH;
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(padding.left + chartW, h - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (let i = 0; i < history.length; i++) {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + chartH - ((prices[i] - minPrice) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Draw min/max labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px IBM Plex Sans, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatGoldPrice(maxPrice), padding.left + 4, padding.top + 12);
  ctx.fillText(formatGoldPrice(minPrice), padding.left + 4, h - padding.bottom - 4);

  // Draw time labels
  ctx.textAlign = 'center';
  if (history.length > 0) {
    const startDate = new Date(history[0].timestamp);
    const endDate = new Date(history[history.length - 1].timestamp);
    ctx.fillText(startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), padding.left + 20, h - 6);
    ctx.fillText(endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), w - padding.right - 20, h - 6);
  }
}

// ============================================
// Hiscores
// ============================================

const SKILL_NAMES = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
  'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining',
  'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction', 'Summoning',
  'Dungeoneering', 'Divination', 'Invention', 'Archaeology', 'Necromancy'
];

const MAX_LEVELS: Record<string, number> = {
  'Invention': 150,
  'default': 99
};

let lastSearchedPlayer = '';

function parsePlayerStats(rawData: string): { rank: number; totalLevel: number; totalXp: number; levels: number[]; xp: number[] } | null {
  if (!rawData) return null;

  const statsArray = rawData.split(/\s+/).map(line => line.split(','));
  if (statsArray.length < 30) return null;

  const overallRank = parseInt(statsArray[0][0], 10);
  const totalLevel = parseInt(statsArray[0][1], 10);
  const totalXp = parseInt(statsArray[0][2], 10) || 0;
  if (isNaN(totalLevel)) return null;

  const levels: number[] = [];
  const xp: number[] = [];
  for (let i = 1; i < statsArray.length && levels.length < 29; i++) {
    levels.push(parseInt(statsArray[i][1], 10) || 1);
    xp.push(parseInt(statsArray[i][2], 10) || 0);
  }

  return { rank: overallRank, totalLevel, totalXp, levels, xp };
}

async function searchHiscores(): Promise<void> {
  const playerName = elements.hiscoresPlayerInput?.value.trim();
  if (!playerName) return;

  // Show loading state
  if (elements.hiscoresSearchBtn) {
    elements.hiscoresSearchBtn.disabled = true;
    elements.hiscoresSearchBtn.textContent = 'Searching...';
  }
  if (elements.hiscoresError) elements.hiscoresError.style.display = 'none';
  if (elements.hiscoresResult) elements.hiscoresResult.style.display = 'none';
  if (elements.hiscoresEmpty) elements.hiscoresEmpty.style.display = 'none';

  try {
    const rawData = await window.api.getHiscores(playerName);

    if (!rawData) {
      showHiscoresError('Player not found or service unavailable.');
      return;
    }

    const stats = parsePlayerStats(rawData);
    if (!stats) {
      showHiscoresError('Failed to parse player data.');
      return;
    }

    lastSearchedPlayer = playerName;
    renderHiscoresResult(playerName, stats);
  } catch (e) {
    console.error('[Renderer] Hiscores search failed:', e);
    showHiscoresError('Failed to fetch hiscores. Please try again.');
  } finally {
    if (elements.hiscoresSearchBtn) {
      elements.hiscoresSearchBtn.disabled = false;
      elements.hiscoresSearchBtn.textContent = 'Search';
    }
  }
}

function renderHiscoresResult(playerName: string, stats: { rank: number; totalLevel: number; totalXp: number; levels: number[]; xp: number[] }): void {
  // Show result, hide empty/error
  if (elements.hiscoresResult) elements.hiscoresResult.style.display = 'block';
  if (elements.hiscoresEmpty) elements.hiscoresEmpty.style.display = 'none';
  if (elements.hiscoresError) elements.hiscoresError.style.display = 'none';

  // Render player header
  if (elements.hiscoresPlayerHeader) {
    elements.hiscoresPlayerHeader.innerHTML = '';

    const overallIcon = document.createElement('img');
    overallIcon.className = 'hiscores-overall-icon';
    overallIcon.src = 'assets/skills/overall.png';
    overallIcon.alt = 'Overall';
    overallIcon.width = 24;
    overallIcon.height = 24;

    const nameEl = document.createElement('div');
    nameEl.className = 'hiscores-player-name';
    nameEl.textContent = playerName;

    const metaEl = document.createElement('div');
    metaEl.className = 'hiscores-player-meta';
    metaEl.textContent = `Total: ${stats.totalLevel.toLocaleString()} | XP: ${stats.totalXp.toLocaleString()} | Rank: ${stats.rank > 0 ? stats.rank.toLocaleString() : 'Unranked'}`;

    elements.hiscoresPlayerHeader.appendChild(overallIcon);
    elements.hiscoresPlayerHeader.appendChild(nameEl);
    elements.hiscoresPlayerHeader.appendChild(metaEl);
  }

  // Render skills grid
  if (elements.hiscoresGrid) {
    elements.hiscoresGrid.innerHTML = '';

    for (let i = 0; i < SKILL_NAMES.length && i < stats.levels.length; i++) {
      const skillName = SKILL_NAMES[i];
      const level = stats.levels[i];
      const maxLevel = MAX_LEVELS[skillName] || MAX_LEVELS['default'];
      const isMaxed = level >= maxLevel;

      const card = document.createElement('div');
      card.className = `hiscores-skill${isMaxed ? ' maxed' : ''}`;

      const iconEl = document.createElement('img');
      iconEl.className = 'hiscores-skill-icon';
      iconEl.src = `assets/skills/${skillName.toLowerCase()}.png`;
      iconEl.alt = skillName;
      iconEl.width = 20;
      iconEl.height = 20;

      const nameEl = document.createElement('div');
      nameEl.className = 'hiscores-skill-name';
      nameEl.textContent = skillName;

      const levelEl = document.createElement('div');
      levelEl.className = 'hiscores-skill-level';
      levelEl.textContent = String(level);

      const xpEl = document.createElement('div');
      xpEl.className = 'hiscores-skill-xp';
      xpEl.textContent = (stats.xp[i] || 0).toLocaleString() + ' xp';

      card.appendChild(iconEl);
      card.appendChild(nameEl);
      card.appendChild(levelEl);
      card.appendChild(xpEl);

      elements.hiscoresGrid.appendChild(card);
    }
  }
}

function showHiscoresError(message: string): void {
  if (elements.hiscoresError) {
    elements.hiscoresError.textContent = message;
    elements.hiscoresError.style.display = 'block';
  }
  if (elements.hiscoresResult) elements.hiscoresResult.style.display = 'none';
  if (elements.hiscoresEmpty) elements.hiscoresEmpty.style.display = 'none';
}

// ============================================================================
// Developer SDK tab — client library manifest + download/extract
// ============================================================================

// Manifest entry shape (mirrors launcher/src/sdk.ts).
interface SdkClientEntry {
  id: string;
  label: string;
  file: string;
  bytes?: number;
  sha256?: string;
  install: string;
  snippet: string;
}

// Guard so the manifest only auto-loads once (refreshable via the Retry button).
let sdkManifestLoaded = false;
// Cache the entries so the download handler can look them up by id.
let sdkClients: SdkClientEntry[] = [];

// (escapeHtml is defined once globally above and reused here.)

// Show one of the three SDK states: 'loading' | 'error' | 'list'.
function setSdkState(state: 'loading' | 'error' | 'list', errorMsg?: string): void {
  if (elements.sdkLoading) elements.sdkLoading.style.display = state === 'loading' ? 'block' : 'none';
  if (elements.sdkError) elements.sdkError.style.display = state === 'error' ? 'block' : 'none';
  if (elements.sdkClientsList) elements.sdkClientsList.style.display = state === 'list' ? 'flex' : 'none';
  if (state === 'error' && elements.sdkErrorText) {
    elements.sdkErrorText.textContent = errorMsg || 'Could not load the client manifest.';
  }
}

// Load the manifest once (lazy, on first SDK tab open). Re-entrant-safe.
async function loadSdkManifestOnce(): Promise<void> {
  if (sdkManifestLoaded) return;
  sdkManifestLoaded = true;
  await loadSdkManifest();
}

// Fetch + render the clients manifest. Friendly inline error on any failure.
async function loadSdkManifest(): Promise<void> {
  setSdkState('loading');
  try {
    const res = await window.api.sdk.getManifest();
    if (!res.ok || !res.manifest) {
      // Surface the configured URL when it's still the placeholder, so the dev
      // knows exactly what to set.
      const hint = res.placeholder
        ? ' Set MANIFEST_URL in launcher/src/sdk.ts to the public release URL.'
        : '';
      setSdkState('error', (res.error || 'Could not load the client manifest.') + hint);
      return;
    }
    const manifest = res.manifest;
    sdkClients = manifest.clients || [];
    if (elements.sdkVersion) {
      elements.sdkVersion.textContent = manifest.clientsVersion
        ? `clients v${manifest.clientsVersion}`
        : '';
    }
    renderSdkClients(sdkClients);
  } catch (e) {
    console.error('[SDK] Manifest load failed:', e);
    setSdkState('error', 'Failed to load the client manifest. You may be offline.');
  }
}

// Render one card per client entry.
function renderSdkClients(clients: SdkClientEntry[]): void {
  if (!elements.sdkClientsList) return;
  if (!clients.length) {
    setSdkState('error', 'The manifest did not list any clients.');
    return;
  }

  elements.sdkClientsList.innerHTML = clients
    .map(
      (c) => `
      <div class="sdk-card" data-client-id="${escapeHtml(c.id)}">
        <div class="sdk-card-header">
          <span class="sdk-card-label">${escapeHtml(c.label)}</span>
        </div>
        <div class="sdk-card-install">${escapeHtml(c.install)}</div>
        <pre class="sdk-snippet">${escapeHtml(c.snippet)}</pre>
        <div class="sdk-card-actions">
          <button class="btn btn-primary btn-small sdk-download-btn" data-client-id="${escapeHtml(c.id)}">Download</button>
          <span class="sdk-card-status" data-status-for="${escapeHtml(c.id)}"></span>
        </div>
      </div>`,
    )
    .join('');

  // Wire each Download button.
  elements.sdkClientsList
    .querySelectorAll<HTMLButtonElement>('.sdk-download-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.clientId;
        if (id) downloadSdkClient(id);
      });
    });

  setSdkState('list');
}

// Find a card's inline status element by client id.
function sdkStatusEl(id: string): HTMLElement | null {
  return elements.sdkClientsList?.querySelector<HTMLElement>(`[data-status-for="${CSS.escape(id)}"]`) || null;
}

// Download + extract flow: pick folder -> download+extract -> show success + snippet.
async function downloadSdkClient(id: string): Promise<void> {
  const entry = sdkClients.find((c) => c.id === id);
  if (!entry) return;

  const card = elements.sdkClientsList?.querySelector<HTMLElement>(`.sdk-card[data-client-id="${CSS.escape(id)}"]`);
  const btn = card?.querySelector<HTMLButtonElement>('.sdk-download-btn') || null;
  const status = sdkStatusEl(id);

  const setStatus = (text: string, cls: '' | 'success' | 'error' = '') => {
    if (!status) return;
    status.textContent = text;
    status.className = 'sdk-card-status' + (cls ? ' ' + cls : '');
  };

  // 1) Native directory picker.
  let destDir: string | null = null;
  try {
    destDir = await window.api.sdk.pickDirectory();
  } catch (e) {
    setStatus('Could not open the folder picker.', 'error');
    return;
  }
  if (!destDir) {
    // User cancelled — leave the card as-is.
    return;
  }

  // 2) Download + extract.
  if (btn) btn.disabled = true;
  setStatus('Starting download...', '');

  try {
    const result = await window.api.sdk.downloadClient(entry, destDir);
    if (result.success && result.folder) {
      // 3) Success: show folder path + the snippet again as a copy-ready reminder.
      const existing = card?.querySelector('.sdk-card-success');
      if (existing) existing.remove();
      if (card) {
        const box = document.createElement('div');
        box.className = 'sdk-card-success';
        box.innerHTML =
          `Extracted to <span class="sdk-success-path">${escapeHtml(result.folder)}</span>` +
          `<pre class="sdk-snippet" style="margin-top:8px;">${escapeHtml(entry.snippet)}</pre>`;
        card.appendChild(box);
      }
      setStatus('Done', 'success');
    } else {
      setStatus(result.error || 'Download failed.', 'error');
    }
  } catch (e) {
    console.error('[SDK] Download failed:', e);
    setStatus('Download failed. Please try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Update the per-card status text with live download progress (0..1).
function setupSdkDownloadProgress(): void {
  window.api.sdk.onDownloadProgress(({ id, fraction }) => {
    const status = sdkStatusEl(id);
    if (!status) return;
    const pct = Math.round((fraction ?? 0) * 100);
    status.textContent = `Downloading... ${pct}%`;
    status.className = 'sdk-card-status';
  });
}

// Engine auto-update progress banner. Creates a small fixed bottom bar on the
// first progress event and updates/dismisses it as the engine downloads.
function setupEngineUpdateBanner(): void {
  let el: HTMLElement | null = null;

  const ensure = (): HTMLElement => {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'engine-update-banner';
    el.innerHTML =
      '<span class="eub-text">Updating engine…</span>' +
      '<div class="eub-bar"><div class="eub-fill"></div></div>';
    document.body.appendChild(el);
    return el;
  };
  const dismiss = (delayMs: number): void => {
    window.setTimeout(() => { if (el) { el.remove(); el = null; } }, delayMs);
  };

  window.api.onEngineUpdateProgress((p) => {
    if (!p) return;
    if (p.phase === 'uptodate') { if (el) { el.remove(); el = null; } return; }
    const node = ensure();
    const text = node.querySelector('.eub-text') as HTMLElement;
    const fill = node.querySelector('.eub-fill') as HTMLElement;
    if (p.phase === 'checking') text.textContent = 'Checking for engine update…';
    if (p.phase === 'downloading') {
      const pct = Math.round((p.fraction ?? 0) * 100);
      text.textContent = `Downloading engine… ${pct}%`;
      fill.style.width = `${pct}%`;
    }
    if (p.phase === 'extracting') { text.textContent = 'Installing engine…'; fill.style.width = '100%'; }
    if (p.phase === 'done') { text.textContent = 'Engine updated'; dismiss(2000); }
    if (p.phase === 'error') { text.textContent = 'Engine update failed (using cached)'; dismiss(4000); }
  });
}

// Initialize on load
init();
