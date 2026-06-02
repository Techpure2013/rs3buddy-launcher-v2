"use strict";
(() => {
  // src/launcher/renderer.ts
  var VOS_CLAN_ICONS = {
    "Amlodd": "assets/vos/amlodd.png",
    "Cadarn": "assets/vos/cadarn.png",
    "Crwys": "assets/vos/crwys.png",
    "Hefin": "assets/vos/hefin.png",
    "Iorwerth": "assets/vos/iorwerth.png",
    "Ithell": "assets/vos/ithell.png",
    "Meilyr": "assets/vos/meilyr.png",
    "Trahaearn": "assets/vos/trahaearn.png"
  };
  var sessions = [];
  var apps = [];
  var connectedClients = /* @__PURE__ */ new Map();
  var config = {
    jagexLauncherPath: null,
    rs2ClientPath: null,
    alt1glLibPath: null,
    startMinimized: false,
    closeToTray: true
  };
  var selectedAccount = null;
  var jagexLauncherState = { installed: false };
  var elements = {
    tabBtns: document.querySelectorAll(".tab-btn"),
    tabContents: document.querySelectorAll(".tab-content"),
    headerVersion: document.getElementById("headerVersion"),
    // Account (new dropdown style)
    accountSectionWrapper: document.getElementById("accountSectionWrapper"),
    accountSection: document.getElementById("accountSection"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    accountDropdown: document.getElementById("accountDropdown"),
    accountDropdownSelected: document.getElementById("accountDropdownSelected"),
    accountDropdownMenu: document.getElementById("accountDropdownMenu"),
    selectedAccountName: document.getElementById("selectedAccountName"),
    // Connected clients
    clientsStatusBar: document.getElementById("clientsStatusBar"),
    clientsStatusToggle: document.getElementById("clientsStatusToggle"),
    clientsStatusDot: document.getElementById("clientsStatusDot"),
    clientsStatusText: document.getElementById("clientsStatusText"),
    clientsExpandIcon: document.getElementById("clientsExpandIcon"),
    clientsStatusDetails: document.getElementById("clientsStatusDetails"),
    clientsList: document.getElementById("clientsList"),
    // Launch
    launchBtn: document.getElementById("launchBtn"),
    launchJagexBtn: document.getElementById("launchJagexBtn"),
    appsGrid: document.getElementById("appsGrid"),
    addAppBtn: document.getElementById("addAppBtn"),
    addAppCard: document.getElementById("addAppCard"),
    addAppModal: document.getElementById("addAppModal"),
    appUrlInput: document.getElementById("appUrlInput"),
    appDisplayNameInput: document.getElementById("appDisplayNameInput"),
    confirmAddApp: document.getElementById("confirmAddApp"),
    cancelAddApp: document.getElementById("cancelAddApp"),
    closeAddAppModal: document.getElementById("closeAddAppModal"),
    jagexLauncherPath: document.getElementById("jagexLauncherPath"),
    jagexLauncherStatus: document.getElementById("jagexLauncherStatus"),
    // Jagex Launcher install modal
    installLauncherModal: document.getElementById("installLauncherModal"),
    installLauncherProgress: document.getElementById("installLauncherProgress"),
    installLauncherMessage: document.getElementById("installLauncherMessage"),
    installFlatpakBtn: document.getElementById("installFlatpakBtn"),
    closeInstallModal: document.getElementById("closeInstallModal"),
    rs2ClientPath: document.getElementById("rs2ClientPath"),
    rs2ClientStatus: document.getElementById("rs2ClientStatus"),
    alt1glLibPath: document.getElementById("alt1glLibPath"),
    alt1glLibStatus: document.getElementById("alt1glLibStatus"),
    themeBtns: document.querySelectorAll(".theme-btn"),
    launchOnStartup: document.getElementById("launchOnStartup"),
    startMinimized: document.getElementById("startMinimized"),
    enableGlOverlay: document.getElementById("enableGlOverlay"),
    glOverlayConfirmModal: document.getElementById("glOverlayConfirmModal"),
    closeGlOverlayModal: document.getElementById("closeGlOverlayModal"),
    glOverlayCancel: document.getElementById("glOverlayCancel"),
    glOverlayConfirm: document.getElementById("glOverlayConfirm"),
    minimizeBtn: document.getElementById("minimizeBtn"),
    closeBtn: document.getElementById("closeBtn"),
    // Hotkey conflict modal
    hotkeyConflictModal: document.getElementById("hotkeyConflictModal"),
    closeHotkeyConflictModal: document.getElementById("closeHotkeyConflictModal"),
    conflictOriginalKey: document.getElementById("conflictOriginalKey"),
    conflictAppName: document.getElementById("conflictAppName"),
    conflictAlternativeKey: document.getElementById("conflictAlternativeKey"),
    hotkeyAlternativeMessage: document.getElementById("hotkeyAlternativeMessage"),
    hotkeyNoAlternativeMessage: document.getElementById("hotkeyNoAlternativeMessage"),
    hotkeyConflictSettings: document.getElementById("hotkeyConflictSettings"),
    hotkeyConflictAccept: document.getElementById("hotkeyConflictAccept"),
    // Hotkeys settings
    hotkeysEnabled: document.getElementById("hotkeysEnabled"),
    hotkeysOnlyWhenFocused: document.getElementById("hotkeysOnlyWhenFocused"),
    hotkeysHeader: document.getElementById("hotkeysHeader"),
    hotkeysContent: document.getElementById("hotkeysContent"),
    hotkeysAppsList: document.getElementById("hotkeysAppsList"),
    noHotkeys: document.getElementById("noHotkeys"),
    // Hotkey manager modal
    hotkeyManagerModal: document.getElementById("hotkeyManagerModal"),
    hotkeyManagerTitle: document.getElementById("hotkeyManagerTitle"),
    hotkeyManagerList: document.getElementById("hotkeyManagerList"),
    closeHotkeyManager: document.getElementById("closeHotkeyManager"),
    hotkeyManagerClose: document.getElementById("hotkeyManagerClose"),
    // Profile elements
    profilesList: document.getElementById("profilesList"),
    noProfiles: document.getElementById("noProfiles"),
    createProfileBtn: document.getElementById("createProfileBtn"),
    profileAssignments: document.getElementById("profileAssignments"),
    assignmentsList: document.getElementById("assignmentsList"),
    noAssignments: document.getElementById("noAssignments"),
    profileModal: document.getElementById("profileModal"),
    profileModalTitle: document.getElementById("profileModalTitle"),
    profileNameInput: document.getElementById("profileNameInput"),
    confirmProfile: document.getElementById("confirmProfile"),
    cancelProfile: document.getElementById("cancelProfile"),
    closeProfileModal: document.getElementById("closeProfileModal"),
    assignProfileModal: document.getElementById("assignProfileModal"),
    assignProfileModalTitle: document.getElementById("assignProfileModalTitle"),
    assignProfileDescription: document.getElementById("assignProfileDescription"),
    profileSelectList: document.getElementById("profileSelectList"),
    cancelAssignProfile: document.getElementById("cancelAssignProfile"),
    closeAssignProfileModal: document.getElementById("closeAssignProfileModal"),
    // Daily Dashboard
    dailyDashboard: document.getElementById("dailyDashboard"),
    dailyResetTimer: document.getElementById("dailyResetTimer"),
    vosClanIcon1: document.getElementById("vosClanIcon1"),
    vosClanName1: document.getElementById("vosClanName1"),
    vosClanIcon2: document.getElementById("vosClanIcon2"),
    vosClanName2: document.getElementById("vosClanName2"),
    visWaxValue: document.getElementById("visWaxValue"),
    spotlightValue: document.getElementById("spotlightValue"),
    // News
    newsSection: document.getElementById("newsSection"),
    newsList: document.getElementById("newsList"),
    // Hiscores
    hiscoresPlayerInput: document.getElementById("hiscoresPlayerInput"),
    hiscoresSearchBtn: document.getElementById("hiscoresSearchBtn"),
    hiscoresResult: document.getElementById("hiscoresResult"),
    hiscoresPlayerHeader: document.getElementById("hiscoresPlayerHeader"),
    hiscoresGrid: document.getElementById("hiscoresGrid"),
    hiscoresEmpty: document.getElementById("hiscoresEmpty"),
    hiscoresError: document.getElementById("hiscoresError"),
    // GE Price Checker
    geSearchInput: document.getElementById("geSearchInput"),
    geSearchDropdown: document.getElementById("geSearchDropdown"),
    geEmpty: document.getElementById("geEmpty"),
    geLoading: document.getElementById("geLoading"),
    geError: document.getElementById("geError"),
    geErrorText: document.getElementById("geErrorText"),
    geResult: document.getElementById("geResult"),
    geItemImage: document.getElementById("geItemImage"),
    geItemName: document.getElementById("geItemName"),
    geItemId: document.getElementById("geItemId"),
    geWikiLink: document.getElementById("geWikiLink"),
    gePrice: document.getElementById("gePrice"),
    gePriceMeta: document.getElementById("gePriceMeta"),
    geChartCanvas: document.getElementById("geChartCanvas"),
    geReportsCard: document.getElementById("geReportsCard"),
    geReportsList: document.getElementById("geReportsList"),
    geDescriptionCard: document.getElementById("geDescriptionCard"),
    geDescriptionText: document.getElementById("geDescriptionText")
  };
  async function init() {
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
    initProfileEventListeners();
    loadProfiles();
    loadNews();
    loadDailyInfo();
    setInterval(updateResetTimer, 1e3);
    setInterval(loadDailyInfo, 5 * 60 * 1e3);
    window.api.onRefreshDailyInfo(() => loadDailyInfo());
    setupEngineUpdateBanner();
    window.api.getAppVersion().then((v) => {
      if (elements.headerVersion)
        elements.headerVersion.textContent = `v${v}`;
    });
  }
  async function checkJagexLauncherInstallation() {
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
  function updateJagexLauncherButton() {
    if (!elements.launchJagexBtn)
      return;
    const launchText = elements.launchJagexBtn.querySelector(".launch-text");
    const launchIcon = elements.launchJagexBtn.querySelector(".launch-icon");
    if (jagexLauncherState.installed) {
      if (launchText)
        launchText.textContent = "Open Jagex Launcher";
      if (launchIcon)
        launchIcon.innerHTML = "&#x1F3AE;";
      elements.launchJagexBtn.classList.remove("install-mode");
    } else {
      if (launchText)
        launchText.textContent = "Install Jagex Launcher";
      if (launchIcon)
        launchIcon.innerHTML = "&#x2B07;";
      elements.launchJagexBtn.classList.add("install-mode");
    }
  }
  async function loadStartupSetting() {
    const enabled = await window.api.getLaunchOnStartup();
    if (elements.launchOnStartup) {
      elements.launchOnStartup.checked = enabled;
    }
  }
  async function loadStartMinimizedSetting() {
    const enabled = await window.api.getStartMinimized();
    if (elements.startMinimized) {
      elements.startMinimized.checked = enabled;
    }
  }
  async function loadConnectedClients() {
    const clients = await window.api.getConnectedClients();
    connectedClients.clear();
    clients.forEach((client) => connectedClients.set(client.id, client));
    updateClientsUI();
  }
  function updateClientsUI() {
    const count = connectedClients.size;
    if (elements.clientsStatusBar) {
      elements.clientsStatusBar.classList.toggle("has-clients", count > 0);
    }
    if (elements.clientsStatusText) {
      if (count === 0) {
        elements.clientsStatusText.textContent = "No clients connected";
      } else if (count === 1) {
        elements.clientsStatusText.textContent = "1 client connected";
      } else {
        elements.clientsStatusText.textContent = `${count} clients connected`;
      }
    }
    if (elements.clientsList) {
      elements.clientsList.innerHTML = "";
      for (const client of connectedClients.values()) {
        const item = createClientItem(client);
        elements.clientsList.appendChild(item);
      }
    }
    updateLaunchButtonState();
  }
  function createClientItem(client) {
    const item = document.createElement("div");
    item.className = "client-item";
    item.dataset.clientId = String(client.id);
    const icon = document.createElement("img");
    icon.className = "client-item-icon";
    icon.src = "assets/runescape-icon.png";
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    const indicator = document.createElement("div");
    indicator.className = `client-indicator ${client.injected ? "injected" : "pending"}`;
    const info = document.createElement("div");
    info.className = "client-info";
    const name = document.createElement("div");
    name.className = "client-name";
    name.textContent = client.windowTitle || "RuneScape";
    const details = document.createElement("div");
    details.className = "client-details";
    details.textContent = `PID: ${client.pid} \u2022 ID: ${client.id}`;
    info.appendChild(name);
    info.appendChild(details);
    const status = document.createElement("div");
    status.className = `client-status ${client.injected ? "" : "pending"}`;
    status.textContent = client.injected ? "Overlay Active" : "Connecting...";
    item.appendChild(icon);
    item.appendChild(indicator);
    item.appendChild(info);
    item.appendChild(status);
    return item;
  }
  function updateClientInjectionStatus(clientId, injected) {
    const client = connectedClients.get(clientId);
    if (client) {
      client.injected = injected;
    }
    const item = elements.clientsList?.querySelector(`[data-client-id="${clientId}"]`);
    if (item) {
      const indicator = item.querySelector(".client-indicator");
      const status = item.querySelector(".client-status");
      if (indicator) {
        indicator.className = `client-indicator ${injected ? "injected" : "pending"}`;
      }
      if (status) {
        status.className = `client-status ${injected ? "" : "pending"}`;
        status.textContent = injected ? "Overlay Active" : "Connecting...";
      }
    }
  }
  async function loadConfig() {
    config = await window.api.getConfig();
    updatePathsUI();
  }
  async function loadSessions() {
    sessions = await window.api.getSessions();
    updateAccountsUI();
    loadProfiles();
  }
  async function loadApps() {
    apps = await window.api.getApps();
    updateAppsUI();
  }
  function updatePathsUI() {
    if (elements.jagexLauncherPath && elements.jagexLauncherStatus) {
      if (config.jagexLauncherPath) {
        elements.jagexLauncherPath.textContent = truncatePath(config.jagexLauncherPath, 35);
        elements.jagexLauncherPath.title = config.jagexLauncherPath;
        elements.jagexLauncherStatus.className = "setting-status found";
      } else {
        elements.jagexLauncherPath.textContent = "Not found";
        elements.jagexLauncherStatus.className = "setting-status not-found";
      }
    }
    if (elements.rs2ClientPath && elements.rs2ClientStatus) {
      if (config.rs2ClientPath) {
        elements.rs2ClientPath.textContent = truncatePath(config.rs2ClientPath, 35);
        elements.rs2ClientPath.title = config.rs2ClientPath;
        elements.rs2ClientStatus.className = "setting-status found";
      } else {
        elements.rs2ClientPath.textContent = "Not found";
        elements.rs2ClientStatus.className = "setting-status not-found";
      }
    }
    if (elements.alt1glLibPath && elements.alt1glLibStatus) {
      if (config.alt1glLibPath) {
        elements.alt1glLibPath.textContent = truncatePath(config.alt1glLibPath, 35);
        elements.alt1glLibPath.title = config.alt1glLibPath;
        elements.alt1glLibStatus.className = "setting-status found";
      } else {
        elements.alt1glLibPath.textContent = "Not found";
        elements.alt1glLibStatus.className = "setting-status not-found";
      }
    }
    updateLaunchButtonState();
  }
  function updateAccountsUI() {
    const hasAccounts = sessions.length > 0;
    if (elements.accountSectionWrapper) {
      elements.accountSectionWrapper.classList.toggle("has-account", hasAccounts);
    }
    if (elements.loginBtn) {
      elements.loginBtn.style.display = hasAccounts ? "none" : "block";
    }
    if (elements.accountSection) {
      elements.accountSection.style.display = hasAccounts ? "block" : "none";
    }
    if (!hasAccounts) {
      selectedAccount = null;
      updateLaunchButtonState();
      return;
    }
    const allAccounts = [];
    sessions.forEach((session, index) => {
      const accounts = session.accounts || [];
      if (accounts.length === 0) {
        allAccounts.push({
          sessionIndex: index,
          account: { displayName: "Jagex Account", accountId: "" }
        });
      } else {
        accounts.forEach((account) => {
          allAccounts.push({ sessionIndex: index, account });
        });
      }
    });
    if (!selectedAccount && allAccounts.length > 0) {
      const first = allAccounts[0];
      selectedAccount = {
        sessionIndex: first.sessionIndex,
        characterId: first.account.accountId || null,
        displayName: first.account.displayName || "Jagex Account"
      };
    }
    if (elements.selectedAccountName) {
      elements.selectedAccountName.textContent = selectedAccount?.displayName || "Select Account";
    }
    if (elements.accountDropdownMenu) {
      elements.accountDropdownMenu.innerHTML = "";
      allAccounts.forEach(({ sessionIndex, account }) => {
        const item = document.createElement("div");
        item.className = "account-dropdown-item";
        if (selectedAccount && selectedAccount.sessionIndex === sessionIndex && selectedAccount.characterId === (account.accountId || null)) {
          item.classList.add("selected");
        }
        const icon = document.createElement("span");
        icon.className = "account-icon";
        icon.textContent = "\u{1F464}";
        const info = document.createElement("div");
        info.className = "account-info";
        const displayName = document.createElement("span");
        displayName.className = "account-display-name";
        displayName.textContent = account.displayName || "Jagex Account";
        info.appendChild(displayName);
        item.appendChild(icon);
        item.appendChild(info);
        item.onclick = () => {
          selectedAccount = {
            sessionIndex,
            characterId: account.accountId || null,
            displayName: account.displayName || "Jagex Account"
          };
          updateAccountsUI();
          closeAccountDropdown();
        };
        elements.accountDropdownMenu.appendChild(item);
      });
      const addItem = document.createElement("div");
      addItem.className = "account-dropdown-item";
      addItem.innerHTML = '<span class="account-icon">+</span><div class="account-info"><span class="account-display-name">Add Another Account</span></div>';
      addItem.onclick = () => {
        window.api.openLogin();
        closeAccountDropdown();
      };
      elements.accountDropdownMenu.appendChild(addItem);
    }
    updateLaunchButtonState();
  }
  function toggleAccountDropdown() {
    elements.accountDropdown?.classList.toggle("open");
  }
  function closeAccountDropdown() {
    elements.accountDropdown?.classList.remove("open");
  }
  function updateAppsUI() {
    if (!elements.appsGrid || !elements.addAppCard)
      return;
    const existingCards = elements.appsGrid.querySelectorAll(".app-card:not(.add-app-card)");
    existingCards.forEach((card) => card.remove());
    apps.forEach((app) => {
      const card = createAppCard(app);
      elements.appsGrid.insertBefore(card, elements.addAppCard);
    });
  }
  function createAppCard(app) {
    const card = document.createElement("div");
    card.className = "app-card";
    card.title = app.description || app.displayName || app.appName;
    card.style.cursor = "pointer";
    card.onclick = () => {
      window.api.openApp(app);
    };
    const icon = document.createElement("div");
    icon.className = "app-icon";
    if (app.iconUrl) {
      const img = document.createElement("img");
      img.src = app.iconUrl;
      img.onerror = () => {
        icon.textContent = "\u{1F4E6}";
        img.remove();
      };
      icon.appendChild(img);
    } else {
      icon.textContent = "\u{1F4E6}";
    }
    const name = document.createElement("span");
    name.className = "app-name";
    name.textContent = app.displayName || app.appName || "Unknown App";
    const removeBtn = document.createElement("button");
    removeBtn.className = "app-remove";
    removeBtn.innerHTML = "\xD7";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeApp(app.configUrl);
    };
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(removeBtn);
    return card;
  }
  function updateLaunchButtonState() {
    const hasAccounts = sessions.length > 0 && selectedAccount !== null;
    if (elements.launchBtn) {
      elements.launchBtn.style.display = hasAccounts ? "flex" : "none";
      elements.launchBtn.disabled = !hasAccounts;
      const launchText = elements.launchBtn.querySelector(".launch-text");
      if (launchText) {
        if (hasAccounts && selectedAccount) {
          launchText.textContent = `Play as ${selectedAccount.displayName}`;
        } else {
          launchText.textContent = "Play";
        }
      }
    }
  }
  function setupEventListeners() {
    elements.tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        elements.tabBtns.forEach((b) => b.classList.remove("active"));
        elements.tabContents.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        if (tabId) {
          document.getElementById(`tab-${tabId}`)?.classList.add("active");
        }
      });
    });
    elements.loginBtn?.addEventListener("click", () => {
      window.api.openLogin();
    });
    elements.accountDropdownSelected?.addEventListener("click", () => {
      toggleAccountDropdown();
    });
    document.addEventListener("click", (e) => {
      if (elements.accountDropdown && !elements.accountDropdown.contains(e.target)) {
        closeAccountDropdown();
      }
    });
    elements.clientsStatusToggle?.addEventListener("click", () => {
      const isExpanded = elements.clientsStatusBar?.classList.toggle("expanded");
      if (elements.clientsStatusDetails) {
        elements.clientsStatusDetails.style.display = isExpanded ? "block" : "none";
      }
    });
    elements.logoutBtn?.addEventListener("click", async () => {
      if (sessions.length > 0) {
        for (const session of sessions) {
          await window.api.logout(session.id);
        }
        await loadSessions();
      }
    });
    elements.launchBtn?.addEventListener("click", async () => {
      if (selectedAccount) {
        await launchWithAccount(selectedAccount.sessionIndex, selectedAccount.characterId);
      }
    });
    elements.launchJagexBtn?.addEventListener("click", launchViaJagex);
    if (window.api.isBetaBuild) {
      elements.addAppBtn?.remove();
      elements.addAppCard?.remove();
    } else {
      elements.addAppBtn?.addEventListener("click", showAddAppModal);
      elements.addAppCard?.addEventListener("click", showAddAppModal);
    }
    elements.closeAddAppModal?.addEventListener("click", hideAddAppModal);
    elements.cancelAddApp?.addEventListener("click", hideAddAppModal);
    elements.confirmAddApp?.addEventListener("click", addApp);
    elements.closeInstallModal?.addEventListener("click", hideInstallLauncherModal);
    elements.installFlatpakBtn?.addEventListener("click", async () => {
      if (elements.installFlatpakBtn?.textContent === "Check Again") {
        await checkJagexLauncherInstallation();
        if (jagexLauncherState.installed) {
          hideInstallLauncherModal();
        } else if (elements.installLauncherMessage) {
          elements.installLauncherMessage.innerHTML = "<p>Jagex Launcher still not detected. Please complete the installation.</p>";
        }
      } else {
        await installJagexLauncher();
      }
    });
    elements.themeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        elements.themeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const theme = btn.dataset.theme;
        if (theme) {
          document.body.setAttribute("data-theme", theme);
          localStorage.setItem("alt1gl-theme", theme);
        }
      });
    });
    elements.launchOnStartup?.addEventListener("change", async () => {
      const enabled = elements.launchOnStartup?.checked ?? false;
      const result = await window.api.setLaunchOnStartup(enabled);
      if (!result.success) {
        if (elements.launchOnStartup) {
          elements.launchOnStartup.checked = !enabled;
        }
        console.error("Failed to set launch on startup:", "error" in result ? result.error : "Unknown error");
      }
    });
    elements.startMinimized?.addEventListener("change", async () => {
      const enabled = elements.startMinimized?.checked ?? false;
      const result = await window.api.setStartMinimized(enabled);
      if (!result.success) {
        if (elements.startMinimized) {
          elements.startMinimized.checked = !enabled;
        }
        console.error("Failed to set start minimized:", "error" in result ? result.error : "Unknown error");
      }
    });
    let glOverlayEnabled = false;
    window.api.getInjectionSettings().then((saved) => {
      glOverlayEnabled = saved?.enabled ?? false;
      if (elements.enableGlOverlay)
        elements.enableGlOverlay.checked = glOverlayEnabled;
    }).catch(() => {
      try {
        const local = JSON.parse(localStorage.getItem("alt1gl-injection-settings") || "{}");
        glOverlayEnabled = local.enabled ?? false;
        if (elements.enableGlOverlay)
          elements.enableGlOverlay.checked = glOverlayEnabled;
      } catch {
      }
    });
    function saveGlOverlaySetting(enabled) {
      glOverlayEnabled = enabled;
      const settings = { enabled, overlay: enabled, glHooks: enabled, autoInject: enabled };
      localStorage.setItem("alt1gl-injection-settings", JSON.stringify(settings));
      window.api.setInjectionSettings(settings);
      if (elements.enableGlOverlay)
        elements.enableGlOverlay.checked = enabled;
    }
    elements.enableGlOverlay?.addEventListener("change", () => {
      const checkbox = elements.enableGlOverlay;
      if (checkbox.checked && !glOverlayEnabled) {
        checkbox.checked = false;
        if (elements.glOverlayConfirmModal) {
          elements.glOverlayConfirmModal.classList.add("active");
        }
      } else if (!checkbox.checked && glOverlayEnabled) {
        saveGlOverlaySetting(false);
      }
    });
    elements.glOverlayConfirm?.addEventListener("click", () => {
      if (elements.glOverlayConfirmModal)
        elements.glOverlayConfirmModal.classList.remove("active");
      saveGlOverlaySetting(true);
    });
    elements.glOverlayCancel?.addEventListener("click", () => {
      if (elements.glOverlayConfirmModal)
        elements.glOverlayConfirmModal.classList.remove("active");
      if (elements.enableGlOverlay)
        elements.enableGlOverlay.checked = false;
    });
    elements.closeGlOverlayModal?.addEventListener("click", () => {
      if (elements.glOverlayConfirmModal)
        elements.glOverlayConfirmModal.classList.remove("active");
      if (elements.enableGlOverlay)
        elements.enableGlOverlay.checked = false;
    });
    elements.minimizeBtn?.addEventListener("click", () => window.api.minimizeWindow());
    elements.closeBtn?.addEventListener("click", () => window.api.closeWindow());
    window.api.onLoginSuccess(async () => {
      await loadSessions();
      updateLaunchButtonState();
    });
    window.api.onLoginError((data) => {
      alert("Login failed: " + data.error);
    });
    window.api.onClientConnected((data) => {
      console.log("[Renderer] Client connected:", data.client);
      connectedClients.set(data.client.id, data.client);
      updateClientsUI();
      loadProfiles();
    });
    window.api.onClientDisconnected((data) => {
      console.log("[Renderer] Client disconnected:", data.clientId);
      connectedClients.delete(data.clientId);
      updateClientsUI();
      loadProfiles();
      if (connectedClients.size === 0) {
        fontAtlasSent = false;
      }
    });
    window.api.onClientInjected((data) => {
      console.log("[Renderer] Client injected:", data.clientId, data.success);
      updateClientInjectionStatus(data.clientId, data.success);
    });
    window.api.onRs2ClientStarted((data) => {
      console.log("[Renderer] RS2 client started:", data.pid);
    });
    window.api.onRs2ClientStopped((data) => {
      console.log("[Renderer] RS2 client stopped:", data?.pid);
    });
    window.api.onOverlayReady(() => {
      console.log("[Renderer] Overlay ready (using native FreeType font)");
    });
    window.api.onShowAddAppModal(() => {
      console.log("[Renderer] Received show-add-app-modal event from toolbar");
      setTimeout(() => {
        console.log("[Renderer] Opening add app modal...");
        showAddAppModal();
      }, 150);
    });
    window.api.onAppsUpdated(async () => {
      console.log("[Renderer] Apps updated externally, refreshing list");
      await loadApps();
    });
    window.api.onShowSettings((section) => {
      console.log("[Renderer] Received show-settings event, section:", section);
      switchToTab("settings");
      if (section === "hotkeys" && elements.hotkeysHeader && elements.hotkeysContent) {
        elements.hotkeysHeader.classList.remove("collapsed");
        elements.hotkeysContent.classList.remove("collapsed");
        elements.hotkeysHeader.scrollIntoView({ behavior: "smooth", block: "start" });
        refreshHotkeysAppsList();
      }
    });
    window.api.onHotkeyConflict((request) => {
      console.log("[Renderer] Received hotkey conflict request:", request);
      showHotkeyConflictModal(request);
    });
    setupHotkeyConflictModalHandlers();
    setupHotkeySettingsListeners();
    window.api.onUpdateAvailable((data) => {
      showUpdateBanner(data.version, data.size);
    });
    window.api.onUpdateDownloadProgress((data) => {
      const progressBar = document.getElementById("update-progress-bar");
      if (progressBar) {
        progressBar.style.width = `${data.percent}%`;
      }
      const applyBtn = document.getElementById("update-apply");
      if (applyBtn && applyBtn.textContent?.startsWith("Downloading")) {
        applyBtn.textContent = `Downloading... ${data.percent}%`;
      }
    });
    window.api.onUpdateStatus((data) => {
      const applyBtn = document.getElementById("update-apply");
      if (data.status === "restarting" && applyBtn) {
        applyBtn.textContent = "Restarting...";
        applyBtn.style.background = "#2ecc71";
      }
    });
    elements.hiscoresSearchBtn?.addEventListener("click", searchHiscores);
    elements.hiscoresPlayerInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        searchHiscores();
    });
    setupGESearch();
    document.querySelectorAll(".attribution-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = e.currentTarget.getAttribute("data-url");
        if (url) {
          window.api.openExternal(url).catch((err) => console.error("[Renderer] openExternal failed:", err));
        }
      });
    });
  }
  function showUpdateBanner(version, size) {
    if (document.getElementById("update-banner"))
      return;
    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    const banner = document.createElement("div");
    banner.id = "update-banner";
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
    document.getElementById("update-dismiss").onclick = () => {
      banner.remove();
    };
    document.getElementById("update-apply").onclick = async () => {
      const applyBtn = document.getElementById("update-apply");
      const dismissBtn = document.getElementById("update-dismiss");
      applyBtn.disabled = true;
      applyBtn.textContent = "Downloading...";
      dismissBtn.style.display = "none";
      const progressContainer = document.getElementById("update-progress");
      progressContainer.style.display = "block";
      try {
        await window.api.applyUpdate();
      } catch (e) {
        applyBtn.textContent = "Update Failed";
        applyBtn.disabled = false;
        dismissBtn.style.display = "";
      }
    };
  }
  function switchToTab(tabName) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) {
      elements.tabBtns.forEach((b) => b.classList.remove("active"));
      elements.tabContents.forEach((c) => c.classList.remove("active"));
      tabBtn.classList.add("active");
      const tabContent = document.getElementById(`tab-${tabName}`);
      tabContent?.classList.add("active");
    }
  }
  async function launchWithAccount(sessionIndex, characterId) {
    if (!elements.launchBtn)
      return;
    elements.launchBtn.disabled = true;
    const launchText = elements.launchBtn.querySelector(".launch-text");
    if (launchText) {
      launchText.textContent = "Launching...";
    }
    const result = await window.api.launchRuneScape({ sessionIndex, characterId });
    if (result.success) {
      updateGameStatus("waiting");
    } else {
      alert("Launch failed: " + ("error" in result ? result.error : "Unknown error"));
      elements.launchBtn.disabled = false;
      updateLaunchButtonState();
    }
  }
  async function launchViaJagex() {
    if (!elements.launchJagexBtn)
      return;
    if (!jagexLauncherState.installed) {
      showInstallLauncherModal();
      return;
    }
    elements.launchJagexBtn.disabled = true;
    const launchText = elements.launchJagexBtn.querySelector(".launch-text");
    if (launchText) {
      launchText.textContent = "Opening...";
    }
    const result = await window.api.launchViaJagex();
    if (result.success) {
      updateGameStatus("waiting");
    } else {
      alert("Launch failed: " + ("error" in result ? result.error : "Unknown error"));
    }
    elements.launchJagexBtn.disabled = false;
    if (launchText) {
      launchText.textContent = "Open Jagex Launcher";
    }
  }
  function showInstallLauncherModal() {
    if (!elements.installLauncherModal)
      return;
    elements.installLauncherModal.classList.add("active");
    if (elements.installLauncherMessage) {
      const isLinux = navigator.platform.toLowerCase().includes("linux");
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
    if (elements.installFlatpakBtn) {
      const isLinux = navigator.platform.toLowerCase().includes("linux");
      if (isLinux && jagexLauncherState.flatpakAvailable) {
        elements.installFlatpakBtn.style.display = "block";
        elements.installFlatpakBtn.textContent = "Install via Flatpak";
      } else if (isLinux && !jagexLauncherState.flatpakAvailable) {
        elements.installFlatpakBtn.style.display = "block";
        elements.installFlatpakBtn.textContent = "Install Flatpak";
      } else if (!isLinux) {
        elements.installFlatpakBtn.style.display = "block";
        elements.installFlatpakBtn.textContent = "Download & Install";
      } else {
        elements.installFlatpakBtn.style.display = "none";
      }
    }
    if (elements.installLauncherProgress) {
      elements.installLauncherProgress.style.display = "none";
    }
  }
  function hideInstallLauncherModal() {
    if (!elements.installLauncherModal)
      return;
    elements.installLauncherModal.classList.remove("active");
  }
  async function installJagexLauncher() {
    if (!elements.installFlatpakBtn || !elements.installLauncherProgress || !elements.installLauncherMessage)
      return;
    const isLinux = navigator.platform.toLowerCase().includes("linux");
    if (isLinux && !jagexLauncherState.flatpakAvailable) {
      await installFlatpakFirst();
      return;
    }
    elements.installFlatpakBtn.disabled = true;
    elements.installFlatpakBtn.textContent = "Installing...";
    elements.installLauncherProgress.style.display = "block";
    elements.installLauncherProgress.textContent = "Starting installation...";
    const cleanupProgress = window.api.jagexLauncher.onInstallProgress((data) => {
      if (elements.installLauncherProgress) {
        elements.installLauncherProgress.textContent = data.message;
        if (data.progress !== void 0) {
          elements.installLauncherProgress.textContent += ` (${Math.round(data.progress)}%)`;
        }
      }
    });
    let result;
    if (isLinux) {
      result = await window.api.jagexLauncher.installFlatpak();
    } else {
      const downloadResult = await window.api.jagexLauncher.downloadWindows();
      if (downloadResult.success && downloadResult.installerPath) {
        elements.installLauncherProgress.textContent = "Running installer...";
        result = await window.api.jagexLauncher.runInstaller(downloadResult.installerPath);
        if (result.success) {
          elements.installLauncherMessage.innerHTML = `
          <p>Installer has been launched.</p>
          <p>Please complete the installation wizard, then click "Check Again" to detect it.</p>
        `;
          elements.installFlatpakBtn.textContent = "Check Again";
          elements.installFlatpakBtn.disabled = false;
          elements.installLauncherProgress.style.display = "none";
          cleanupProgress();
          return;
        }
      } else {
        result = downloadResult;
      }
    }
    cleanupProgress();
    if (result.success) {
      elements.installLauncherProgress.textContent = "Installation complete!";
      elements.installLauncherMessage.innerHTML = "<p>Jagex Launcher has been installed successfully!</p>";
      await checkJagexLauncherInstallation();
      await loadConfig();
      setTimeout(() => {
        hideInstallLauncherModal();
      }, 1500);
    } else {
      elements.installLauncherProgress.textContent = "Installation failed";
      elements.installLauncherMessage.innerHTML = `<p>Installation failed:</p><p class="error">${result.error || "Unknown error"}</p>`;
      elements.installFlatpakBtn.disabled = false;
      elements.installFlatpakBtn.textContent = isLinux ? "Retry Install" : "Retry Download";
    }
  }
  async function installFlatpakFirst() {
    if (!elements.installFlatpakBtn || !elements.installLauncherProgress || !elements.installLauncherMessage)
      return;
    const confirmed = confirm(
      "Flatpak is required to install Jagex Launcher on Linux.\n\nDo you want to install Flatpak now?\n\nThis will require your password for administrator access."
    );
    if (!confirmed) {
      return;
    }
    elements.installFlatpakBtn.disabled = true;
    elements.installFlatpakBtn.textContent = "Installing Flatpak...";
    elements.installLauncherProgress.style.display = "block";
    elements.installLauncherProgress.textContent = "Installing Flatpak (password required)...";
    const cleanupProgress = window.api.jagexLauncher.onInstallProgress((data) => {
      if (elements.installLauncherProgress) {
        elements.installLauncherProgress.textContent = data.message;
      }
    });
    const result = await window.api.jagexLauncher.installFlatpakSystem();
    cleanupProgress();
    if (result.success) {
      elements.installLauncherProgress.textContent = "Flatpak installed successfully!";
      jagexLauncherState.flatpakAvailable = await window.api.jagexLauncher.isFlatpakAvailable();
      if (jagexLauncherState.flatpakAvailable) {
        elements.installLauncherMessage.innerHTML = `
        <p>Flatpak has been installed!</p>
        <p>Click "Install via Flatpak" to install Jagex Launcher.</p>
      `;
        elements.installFlatpakBtn.textContent = "Install via Flatpak";
        elements.installFlatpakBtn.disabled = false;
      } else {
        elements.installLauncherMessage.innerHTML = `
        <p>Flatpak installation completed, but it may require a system restart.</p>
        <p>Please restart your computer and try again.</p>
      `;
        elements.installFlatpakBtn.textContent = "Close";
        elements.installFlatpakBtn.disabled = false;
      }
    } else {
      elements.installLauncherProgress.textContent = "Flatpak installation failed";
      elements.installLauncherMessage.innerHTML = `<p>Failed to install Flatpak:</p><p class="error">${result.error || "Unknown error"}</p>`;
      elements.installFlatpakBtn.disabled = false;
      elements.installFlatpakBtn.textContent = "Retry";
    }
  }
  function updateGameStatus(status, _pid) {
    switch (status) {
      case "waiting":
        if (elements.launchBtn) {
          elements.launchBtn.disabled = true;
          const launchText = elements.launchBtn.querySelector(".launch-text");
          if (launchText) {
            launchText.textContent = "Waiting...";
          }
        }
        break;
      case "stopped":
        if (elements.launchBtn) {
          elements.launchBtn.disabled = false;
        }
        updateLaunchButtonState();
        break;
    }
  }
  function showAddAppModal() {
    if (!elements.addAppModal || !elements.appUrlInput)
      return;
    const appsTabBtn = document.querySelector('[data-tab="apps"]');
    if (appsTabBtn) {
      appsTabBtn.click();
    }
    elements.addAppModal.classList.add("active");
    elements.appUrlInput.value = "";
    if (elements.appDisplayNameInput) {
      elements.appDisplayNameInput.value = "";
    }
    setTimeout(() => {
      if (elements.appUrlInput) {
        elements.appUrlInput.focus();
        elements.appUrlInput.click();
      }
    }, 100);
  }
  function hideAddAppModal() {
    elements.addAppModal?.classList.remove("active");
  }
  var currentConflictRequest = null;
  function showHotkeyConflictModal(request) {
    if (!elements.hotkeyConflictModal)
      return;
    currentConflictRequest = request;
    if (elements.conflictOriginalKey) {
      elements.conflictOriginalKey.textContent = request.originalAccelerator;
    }
    if (elements.conflictAppName) {
      elements.conflictAppName.textContent = request.conflictingAppName;
    }
    if (request.alternativeSuggestion) {
      if (elements.conflictAlternativeKey) {
        elements.conflictAlternativeKey.textContent = request.alternativeSuggestion.accelerator;
      }
      if (elements.hotkeyAlternativeMessage) {
        elements.hotkeyAlternativeMessage.style.display = "block";
      }
      if (elements.hotkeyNoAlternativeMessage) {
        elements.hotkeyNoAlternativeMessage.style.display = "none";
      }
      if (elements.hotkeyConflictAccept) {
        elements.hotkeyConflictAccept.style.display = "inline-block";
        elements.hotkeyConflictAccept.textContent = `Use ${request.alternativeSuggestion.modifiers}+Key`;
      }
    } else {
      if (elements.hotkeyAlternativeMessage) {
        elements.hotkeyAlternativeMessage.style.display = "none";
      }
      if (elements.hotkeyNoAlternativeMessage) {
        elements.hotkeyNoAlternativeMessage.style.display = "block";
      }
      if (elements.hotkeyConflictAccept) {
        elements.hotkeyConflictAccept.style.display = "none";
      }
    }
    elements.hotkeyConflictModal.classList.add("active");
  }
  function hideHotkeyConflictModal() {
    elements.hotkeyConflictModal?.classList.remove("active");
    currentConflictRequest = null;
  }
  function resolveHotkeyConflict(accepted, useAlternative, openSettings) {
    if (!currentConflictRequest)
      return;
    window.api.resolveHotkeyConflict({
      requestId: currentConflictRequest.requestId,
      accepted,
      useAlternative,
      openSettings
    });
    hideHotkeyConflictModal();
    if (openSettings) {
      switchToTab("settings");
    }
  }
  function setupHotkeyConflictModalHandlers() {
    elements.closeHotkeyConflictModal?.addEventListener("click", () => {
      resolveHotkeyConflict(false, false, false);
    });
    elements.hotkeyConflictAccept?.addEventListener("click", () => {
      resolveHotkeyConflict(true, true, false);
    });
    elements.hotkeyConflictSettings?.addEventListener("click", () => {
      resolveHotkeyConflict(false, false, true);
    });
    elements.hotkeyConflictModal?.addEventListener("click", (e) => {
      if (e.target === elements.hotkeyConflictModal) {
        resolveHotkeyConflict(false, false, false);
      }
    });
  }
  var rebindingHotkeyId = null;
  var currentHotkeyApp = null;
  var cachedHotkeys = [];
  async function loadHotkeySettings() {
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
      console.error("[Renderer] Failed to load hotkey settings:", e);
    }
  }
  async function refreshHotkeysAppsList() {
    try {
      const hotkeys = await window.api.getRegisteredHotkeys();
      cachedHotkeys = hotkeys;
      if (!elements.hotkeysAppsList || !elements.noHotkeys)
        return;
      if (hotkeys.length === 0) {
        elements.noHotkeys.style.display = "block";
        elements.hotkeysAppsList.querySelectorAll(".hotkey-app-btn").forEach((btn) => btn.remove());
        return;
      }
      elements.noHotkeys.style.display = "none";
      const appGroups = /* @__PURE__ */ new Map();
      for (const hk of hotkeys) {
        const existing = appGroups.get(hk.appName) || [];
        existing.push(hk);
        appGroups.set(hk.appName, existing);
      }
      elements.hotkeysAppsList.querySelectorAll(".hotkey-app-btn").forEach((btn) => btn.remove());
      for (const [appName, appHotkeys] of appGroups) {
        const btn = document.createElement("button");
        btn.className = "hotkey-app-btn";
        btn.innerHTML = `
        <span class="app-name">${escapeHtml(appName)}</span>
        <span class="hotkey-count">${appHotkeys.length} hotkey${appHotkeys.length !== 1 ? "s" : ""}</span>
      `;
        btn.addEventListener("click", () => openHotkeyManager(appName));
        elements.hotkeysAppsList.appendChild(btn);
      }
    } catch (e) {
      console.error("[Renderer] Failed to refresh hotkeys apps list:", e);
    }
  }
  function openHotkeyManager(appName) {
    currentHotkeyApp = appName;
    if (elements.hotkeyManagerTitle) {
      elements.hotkeyManagerTitle.textContent = `${appName} Hotkeys`;
    }
    refreshHotkeyManagerList();
    elements.hotkeyManagerModal?.classList.add("active");
  }
  function closeHotkeyManagerModal() {
    elements.hotkeyManagerModal?.classList.remove("active");
    currentHotkeyApp = null;
    rebindingHotkeyId = null;
  }
  function refreshHotkeyManagerList() {
    if (!elements.hotkeyManagerList || !currentHotkeyApp)
      return;
    const appHotkeys = cachedHotkeys.filter((hk) => hk.appName === currentHotkeyApp);
    elements.hotkeyManagerList.innerHTML = appHotkeys.map((hotkey) => `
    <div class="hotkey-item" data-hotkey-id="${escapeHtml(hotkey.id)}">
      <div class="hotkey-info">
        <span class="hotkey-action">${escapeHtml(hotkey.action)}</span>
        ${hotkey.description ? `<span class="hotkey-description">${escapeHtml(hotkey.description)}</span>` : ""}
      </div>
      <div class="hotkey-controls">
        <span class="hotkey-key-display" id="hotkey-display-${escapeHtml(hotkey.id)}">${escapeHtml(hotkey.displayAccelerator)}</span>
        <button class="hotkey-rebind-btn" data-hotkey-id="${escapeHtml(hotkey.id)}">Rebind</button>
      </div>
    </div>
  `).join("");
    elements.hotkeyManagerList.querySelectorAll(".hotkey-rebind-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const hotkeyId = e.target.getAttribute("data-hotkey-id") || "";
        if (hotkeyId) {
          startRebindHotkey(hotkeyId);
        }
      });
    });
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function startRebindHotkey(hotkeyId) {
    if (rebindingHotkeyId !== null) {
      cancelRebind();
    }
    rebindingHotkeyId = hotkeyId;
    const display = document.getElementById(`hotkey-display-${hotkeyId}`);
    if (display) {
      display.textContent = "Press key...";
      display.classList.add("recording");
    }
    document.addEventListener("keydown", handleRebindKeydown);
    document.addEventListener("keyup", handleRebindKeyup);
  }
  function cancelRebind() {
    if (rebindingHotkeyId === null)
      return;
    const display = document.getElementById(`hotkey-display-${rebindingHotkeyId}`);
    if (display) {
      display.classList.remove("recording");
    }
    document.removeEventListener("keydown", handleRebindKeydown);
    document.removeEventListener("keyup", handleRebindKeyup);
    rebindingHotkeyId = null;
    refreshHotkeyManagerList();
  }
  function handleRebindKeydown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      cancelRebind();
      return;
    }
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return;
    }
    if (rebindingHotkeyId === null)
      return;
    const modifiers = [];
    if (e.ctrlKey)
      modifiers.push("Ctrl");
    if (e.shiftKey)
      modifiers.push("Shift");
    if (e.altKey)
      modifiers.push("Alt");
    if (e.metaKey)
      modifiers.push("Meta");
    const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const accelerator = [...modifiers, keyName].join("+");
    const display = document.getElementById(`hotkey-display-${rebindingHotkeyId}`);
    if (display) {
      display.textContent = accelerator;
    }
  }
  function handleRebindKeyup(e) {
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return;
    }
    if (rebindingHotkeyId === null)
      return;
    const hotkeyId = rebindingHotkeyId;
    const display = document.getElementById(`hotkey-display-${hotkeyId}`);
    const newAccelerator = display?.textContent || "";
    document.removeEventListener("keydown", handleRebindKeydown);
    document.removeEventListener("keyup", handleRebindKeyup);
    rebindingHotkeyId = null;
    if (display) {
      display.classList.remove("recording");
    }
    if (newAccelerator && newAccelerator !== "Press key...") {
      applyRebind(hotkeyId, newAccelerator);
    } else {
      refreshHotkeyManagerList();
    }
  }
  async function applyRebind(hotkeyId, newAccelerator) {
    try {
      const result = await window.api.rebindHotkey(hotkeyId, newAccelerator);
      if (!result.success) {
        alert(result.error || "Failed to rebind hotkey");
      }
      await refreshHotkeysAppsList();
      refreshHotkeyManagerList();
    } catch (e) {
      console.error("[Renderer] Failed to apply rebind:", e);
      refreshHotkeyManagerList();
    }
  }
  function setupHotkeySettingsListeners() {
    elements.hotkeysHeader?.addEventListener("click", () => {
      elements.hotkeysHeader?.classList.toggle("collapsed");
      elements.hotkeysContent?.classList.toggle("collapsed");
    });
    elements.hotkeysEnabled?.addEventListener("change", async (e) => {
      const enabled = e.target.checked;
      await window.api.setHotkeysEnabled(enabled);
    });
    elements.hotkeysOnlyWhenFocused?.addEventListener("change", async (e) => {
      const onlyWhenFocused = e.target.checked;
      await window.api.setHotkeysOnlyWhenFocused(onlyWhenFocused);
    });
    elements.closeHotkeyManager?.addEventListener("click", closeHotkeyManagerModal);
    elements.hotkeyManagerClose?.addEventListener("click", closeHotkeyManagerModal);
    elements.hotkeyManagerModal?.addEventListener("click", (e) => {
      if (e.target === elements.hotkeyManagerModal) {
        closeHotkeyManagerModal();
      }
    });
  }
  async function addApp() {
    if (!elements.appUrlInput || !elements.confirmAddApp)
      return;
    const url = elements.appUrlInput.value.trim();
    if (!url) {
      alert("Please enter a URL");
      return;
    }
    const displayName = elements.appDisplayNameInput?.value.trim() || void 0;
    elements.confirmAddApp.disabled = true;
    elements.confirmAddApp.textContent = "Adding...";
    const result = await window.api.addApp(url, displayName);
    elements.confirmAddApp.disabled = false;
    elements.confirmAddApp.textContent = "Add App";
    if (result.success) {
      hideAddAppModal();
      await loadApps();
    } else {
      alert("Failed to add app: " + ("error" in result ? result.error : "Unknown error"));
    }
  }
  async function removeApp(configUrl) {
    if (!confirm("Remove this app?"))
      return;
    await window.api.removeApp(configUrl);
    await loadApps();
    setTimeout(() => {
      if (elements.addAppBtn) {
        elements.addAppBtn.focus();
      } else if (elements.addAppCard) {
        elements.addAppCard.click();
      }
    }, 50);
  }
  function loadTheme() {
    const savedTheme = localStorage.getItem("alt1gl-theme") || "dark";
    document.body.setAttribute("data-theme", savedTheme);
    elements.themeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === savedTheme);
    });
  }
  function truncatePath(path, maxLength) {
    if (!path || path.length <= maxLength)
      return path;
    return "..." + path.substring(path.length - maxLength + 3);
  }
  var editingProfileId = null;
  var assigningClientPid = 0;
  var assigningCharacterId = "";
  var assigningCharacterName = "";
  async function loadProfiles() {
    try {
      const profiles = await window.api.profiles.getAll();
      const assignments = await window.api.profiles.getAssignments();
      renderProfiles(profiles, assignments);
      renderAssignments(assignments, profiles);
    } catch (e) {
      console.error("[Renderer] Failed to load profiles:", e);
    }
  }
  function renderProfiles(profiles, assignments) {
    if (!elements.profilesList || !elements.noProfiles)
      return;
    elements.profilesList.querySelectorAll(".profile-card").forEach((el) => el.remove());
    if (profiles.length === 0) {
      elements.noProfiles.style.display = "block";
      elements.noProfiles.innerHTML = '<span class="text-muted">No profiles. Click "+ New Profile" to create one.</span>';
      return;
    }
    elements.noProfiles.style.display = "none";
    for (const profile of profiles) {
      const assignedCount = assignments.filter((a) => a.profileId === profile.id).length;
      const card = document.createElement("div");
      card.className = "profile-card";
      card.dataset.profileId = profile.id;
      const isDefault = profile.id === "default";
      const badgeHtml = isDefault ? '<span class="profile-badge badge-default">Default</span>' : "";
      card.innerHTML = `
      <div class="profile-card-info">
        <div class="profile-card-name">${escapeHtml(profile.name)}${badgeHtml}</div>
        <div class="profile-card-meta">${assignedCount} character${assignedCount !== 1 ? "s" : ""} assigned</div>
      </div>
      <div class="profile-card-actions">
        <button class="btn-icon" data-action="rename" title="Rename">&#x270E;</button>
        ${!isDefault ? '<button class="btn-icon btn-danger" data-action="delete" title="Delete">&#x2715;</button>' : ""}
      </div>
    `;
      card.querySelector('[data-action="rename"]')?.addEventListener("click", () => openRenameProfile(profile.id, profile.name));
      card.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteProfile(profile.id, profile.name));
      elements.profilesList.appendChild(card);
    }
  }
  function renderAssignments(assignments, profiles) {
    if (!elements.profileAssignments || !elements.assignmentsList || !elements.noAssignments)
      return;
    elements.profileAssignments.style.display = "block";
    elements.assignmentsList.querySelectorAll(".assignment-card").forEach((el) => el.remove());
    const characters = /* @__PURE__ */ new Map();
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
    for (const client of connectedClients.values()) {
      if (client.characterId) {
        const existing = characters.get(client.characterId);
        if (existing) {
          existing.connected = true;
          existing.pid = client.pid;
          if (client.characterName)
            existing.name = client.characterName;
        } else {
          characters.set(client.characterId, {
            id: client.characterId,
            name: client.characterName || client.characterId,
            connected: true,
            pid: client.pid
          });
        }
      } else {
        const syntheticId = `pid:${client.pid}`;
        if (!characters.has(syntheticId)) {
          characters.set(syntheticId, {
            id: "",
            // No characterId for persistence
            name: client.windowTitle || `Client (PID ${client.pid})`,
            connected: true,
            pid: client.pid
          });
        }
      }
    }
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
      elements.noAssignments.style.display = "block";
      elements.noAssignments.innerHTML = '<span class="text-muted">Log in or launch a game client to assign profiles.</span>';
      return;
    }
    elements.noAssignments.style.display = "none";
    for (const char of characters.values()) {
      const existingAssignment = assignments.find((a) => a.characterId === char.id);
      const profile = existingAssignment ? profiles.find((p) => p.id === existingAssignment.profileId) : null;
      const connectedBadge = char.connected ? '<span class="client-profile-badge" style="margin-left:6px;">Connected</span>' : "";
      const card = document.createElement("div");
      card.className = "assignment-card";
      card.innerHTML = `
      <div class="assignment-info">
        <span class="assignment-character">${escapeHtml(char.name)}${connectedBadge}</span>
        <span class="assignment-profile">Profile: ${escapeHtml(profile?.name || "Default")}</span>
      </div>
      <button class="btn btn-small" data-action="assign">${existingAssignment ? "Change" : "Assign"}</button>
    `;
      card.querySelector('[data-action="assign"]')?.addEventListener("click", () => {
        openAssignProfile(char.pid, char.id, char.name);
      });
      elements.assignmentsList.appendChild(card);
    }
  }
  function openCreateProfile() {
    editingProfileId = null;
    if (elements.profileModalTitle)
      elements.profileModalTitle.textContent = "Create Profile";
    if (elements.profileNameInput)
      elements.profileNameInput.value = "";
    if (elements.confirmProfile)
      elements.confirmProfile.textContent = "Create";
    elements.profileModal?.classList.add("active");
    elements.profileNameInput?.focus();
  }
  function openRenameProfile(profileId, currentName) {
    editingProfileId = profileId;
    if (elements.profileModalTitle)
      elements.profileModalTitle.textContent = "Rename Profile";
    if (elements.profileNameInput)
      elements.profileNameInput.value = currentName;
    if (elements.confirmProfile)
      elements.confirmProfile.textContent = "Rename";
    elements.profileModal?.classList.add("active");
    elements.profileNameInput?.focus();
  }
  async function confirmProfileAction() {
    const name = elements.profileNameInput?.value.trim();
    if (!name)
      return;
    try {
      if (editingProfileId) {
        await window.api.profiles.rename(editingProfileId, name);
      } else {
        await window.api.profiles.create(name);
      }
      closeProfileModal();
      await loadProfiles();
    } catch (e) {
      console.error("[Renderer] Profile action failed:", e);
    }
  }
  async function deleteProfile(profileId, profileName) {
    if (!confirm(`Delete profile "${profileName}"? Characters assigned to it will revert to the default profile.`))
      return;
    try {
      await window.api.profiles.delete(profileId);
      await loadProfiles();
    } catch (e) {
      console.error("[Renderer] Failed to delete profile:", e);
    }
  }
  function closeProfileModal() {
    elements.profileModal?.classList.remove("active");
    editingProfileId = null;
  }
  function openAssignProfile(pid, characterId, characterName) {
    assigningClientPid = pid;
    assigningCharacterId = characterId;
    assigningCharacterName = characterName;
    if (elements.assignProfileModalTitle) {
      elements.assignProfileModalTitle.textContent = "Assign Profile";
    }
    if (elements.assignProfileDescription) {
      elements.assignProfileDescription.textContent = characterName ? `Select a profile for "${characterName}":` : "Select a profile for this client:";
    }
    populateProfileSelectList();
    elements.assignProfileModal?.classList.add("active");
  }
  async function populateProfileSelectList() {
    if (!elements.profileSelectList)
      return;
    const profiles = await window.api.profiles.getAll();
    elements.profileSelectList.innerHTML = "";
    for (const profile of profiles) {
      const btn = document.createElement("button");
      btn.className = "profile-select-option";
      btn.textContent = profile.name;
      btn.addEventListener("click", async () => {
        try {
          if (assigningCharacterId) {
            await window.api.profiles.assign(assigningCharacterId, profile.id, assigningCharacterName);
          }
          if (assigningClientPid > 0) {
            await window.api.profiles.setForPid(assigningClientPid, profile.id);
          }
          closeAssignProfileModal();
          await loadProfiles();
        } catch (e) {
          console.error("[Renderer] Failed to assign profile:", e);
        }
      });
      elements.profileSelectList.appendChild(btn);
    }
  }
  function closeAssignProfileModal() {
    elements.assignProfileModal?.classList.remove("active");
    assigningClientPid = 0;
    assigningCharacterId = "";
    assigningCharacterName = "";
  }
  function initProfileEventListeners() {
    elements.createProfileBtn?.addEventListener("click", openCreateProfile);
    elements.confirmProfile?.addEventListener("click", confirmProfileAction);
    elements.cancelProfile?.addEventListener("click", closeProfileModal);
    elements.closeProfileModal?.addEventListener("click", closeProfileModal);
    elements.cancelAssignProfile?.addEventListener("click", closeAssignProfileModal);
    elements.closeAssignProfileModal?.addEventListener("click", closeAssignProfileModal);
    elements.profileNameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        confirmProfileAction();
      if (e.key === "Escape")
        closeProfileModal();
    });
  }
  var fontAtlasSent = false;
  async function loadDailyInfo() {
    try {
      const info = await window.api.getDailyInfo();
      if (info.vos) {
        if (elements.vosClanIcon1) {
          elements.vosClanIcon1.src = VOS_CLAN_ICONS[info.vos.district1] || "";
          elements.vosClanIcon1.alt = info.vos.district1;
          elements.vosClanIcon1.style.display = VOS_CLAN_ICONS[info.vos.district1] ? "block" : "none";
        }
        if (elements.vosClanName1)
          elements.vosClanName1.textContent = info.vos.district1;
        if (elements.vosClanIcon2) {
          elements.vosClanIcon2.src = VOS_CLAN_ICONS[info.vos.district2] || "";
          elements.vosClanIcon2.alt = info.vos.district2;
          elements.vosClanIcon2.style.display = VOS_CLAN_ICONS[info.vos.district2] ? "block" : "none";
        }
        if (elements.vosClanName2)
          elements.vosClanName2.textContent = info.vos.district2;
      } else {
        if (elements.vosClanName1)
          elements.vosClanName1.textContent = "Unavailable";
        if (elements.vosClanName2)
          elements.vosClanName2.textContent = "";
        if (elements.vosClanIcon1)
          elements.vosClanIcon1.style.display = "none";
        if (elements.vosClanIcon2)
          elements.vosClanIcon2.style.display = "none";
      }
      if (elements.visWaxValue) {
        if (info.visWax) {
          const slot2Str = info.visWax.slot2.length > 0 ? info.visWax.slot2.join(", ") : "?";
          elements.visWaxValue.innerHTML = `<b>Slot 1:</b> ${info.visWax.slot1}<br><b>Slot 2:</b> ${slot2Str}<br><b>Slot 3:</b> ${info.visWax.slot3}`;
        } else {
          elements.visWaxValue.textContent = "Unavailable";
        }
      }
      if (elements.spotlightValue) {
        elements.spotlightValue.textContent = info.spotlight || "Unavailable";
      }
      updateResetTimer();
    } catch (e) {
      console.error("[Renderer] Failed to load daily info:", e);
    }
  }
  function updateResetTimer() {
    const now = /* @__PURE__ */ new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1e3 * 60 * 60));
    const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
    const seconds = Math.floor(diff % (1e3 * 60) / 1e3);
    if (elements.dailyResetTimer) {
      elements.dailyResetTimer.textContent = `Reset in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  }
  async function loadNews() {
    try {
      const news = await window.api.getNews();
      if (news.length === 0)
        return;
      if (elements.newsSection) {
        elements.newsSection.style.display = "block";
      }
      if (elements.newsList) {
        elements.newsList.innerHTML = "";
        const itemsToShow = news.slice(0, 4);
        for (const item of itemsToShow) {
          elements.newsList.appendChild(createNewsCard(item));
        }
      }
    } catch (e) {
      console.error("[Renderer] Failed to load news:", e);
    }
  }
  function createNewsCard(item) {
    const card = document.createElement("div");
    card.className = "news-card";
    card.addEventListener("click", () => {
      window.api.openExternal(item.link);
    });
    if (item.imageUrl) {
      const thumb = document.createElement("div");
      thumb.className = "news-thumbnail";
      const img = document.createElement("img");
      img.src = item.imageUrl;
      img.alt = item.title;
      img.loading = "lazy";
      img.onerror = () => {
        thumb.style.display = "none";
      };
      thumb.appendChild(img);
      card.appendChild(thumb);
    }
    const content = document.createElement("div");
    content.className = "news-content";
    const title = document.createElement("div");
    title.className = "news-title";
    title.textContent = item.title;
    const meta = document.createElement("div");
    meta.className = "news-meta";
    const category = document.createElement("span");
    category.className = "news-category";
    category.textContent = item.category;
    const date = document.createElement("span");
    date.className = "news-date";
    date.textContent = formatRelativeDate(item.pubDate);
    meta.appendChild(category);
    meta.appendChild(date);
    content.appendChild(title);
    content.appendChild(meta);
    card.appendChild(content);
    return card;
  }
  function formatRelativeDate(isoDate) {
    const date = new Date(isoDate);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
    if (diffHours < 1)
      return "Just now";
    if (diffHours === 1)
      return "1 hour ago";
    if (diffHours < 24)
      return `${diffHours} hours ago`;
    if (diffDays === 1)
      return "Yesterday";
    if (diffDays < 7)
      return `${diffDays} days ago`;
    return date.toLocaleDateString(void 0, { month: "short", day: "numeric" });
  }
  var geSearchTimeout = null;
  var geSelectedIndex = -1;
  var geSearchResults = [];
  function formatGoldPrice(price) {
    if (price >= 1e9)
      return (price / 1e9).toFixed(2) + "B";
    if (price >= 1e6)
      return (price / 1e6).toFixed(1) + "M";
    if (price >= 1e3)
      return (price / 1e3).toFixed(1) + "K";
    return price.toLocaleString();
  }
  function setupGESearch() {
    const input = elements.geSearchInput;
    if (!input)
      return;
    input.addEventListener("input", () => {
      const query = input.value.trim();
      if (geSearchTimeout)
        clearTimeout(geSearchTimeout);
      if (query.length < 2) {
        hideGEDropdown();
        return;
      }
      geSearchTimeout = setTimeout(() => searchGEItems(query), 300);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        geSelectedIndex = Math.min(geSelectedIndex + 1, geSearchResults.length - 1);
        updateGEDropdownHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        geSelectedIndex = Math.max(geSelectedIndex - 1, 0);
        updateGEDropdownHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (geSelectedIndex >= 0 && geSelectedIndex < geSearchResults.length) {
          const item = geSearchResults[geSelectedIndex];
          selectGEItem(item.name, item.id);
        } else if (input.value.trim()) {
          selectGEItem(input.value.trim());
        }
      } else if (e.key === "Escape") {
        hideGEDropdown();
      }
    });
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !elements.geSearchDropdown?.contains(e.target)) {
        hideGEDropdown();
      }
    });
  }
  async function searchGEItems(query) {
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
      console.error("[GE] Search failed:", e);
      hideGEDropdown();
    }
  }
  function showGEDropdown(items) {
    const dropdown = elements.geSearchDropdown;
    if (!dropdown)
      return;
    dropdown.innerHTML = "";
    items.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "ge-search-option";
      if (item.icon) {
        const img = document.createElement("img");
        img.src = item.icon;
        img.width = 20;
        img.height = 20;
        img.style.marginRight = "8px";
        img.style.verticalAlign = "middle";
        img.style.imageRendering = "pixelated";
        el.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = item.name;
      el.appendChild(span);
      el.addEventListener("click", () => selectGEItem(item.name, item.id));
      el.addEventListener("mouseenter", () => {
        geSelectedIndex = i;
        updateGEDropdownHighlight();
      });
      dropdown.appendChild(el);
    });
    dropdown.style.display = "block";
  }
  function hideGEDropdown() {
    if (elements.geSearchDropdown) {
      elements.geSearchDropdown.style.display = "none";
    }
    geSearchResults = [];
    geSelectedIndex = -1;
  }
  function updateGEDropdownHighlight() {
    const dropdown = elements.geSearchDropdown;
    if (!dropdown)
      return;
    const options = dropdown.querySelectorAll(".ge-search-option");
    options.forEach((el, i) => {
      el.classList.toggle("active", i === geSelectedIndex);
    });
  }
  async function selectGEItem(itemName, itemId) {
    hideGEDropdown();
    if (elements.geSearchInput)
      elements.geSearchInput.value = itemName;
    if (elements.geEmpty)
      elements.geEmpty.style.display = "none";
    if (elements.geError)
      elements.geError.style.display = "none";
    if (elements.geResult)
      elements.geResult.style.display = "none";
    if (elements.geLoading)
      elements.geLoading.style.display = "block";
    try {
      const data = await window.api.geItemInfo(itemName, itemId || void 0);
      if (!data || !data.price && !data.description) {
        showGEError("Item not found or no GE data available.");
        return;
      }
      renderGEResult(data);
    } catch (e) {
      console.error("[GE] Item info failed:", e);
      showGEError("Failed to fetch item data. Please try again.");
    } finally {
      if (elements.geLoading)
        elements.geLoading.style.display = "none";
    }
  }
  function showGEError(msg) {
    if (elements.geLoading)
      elements.geLoading.style.display = "none";
    if (elements.geResult)
      elements.geResult.style.display = "none";
    if (elements.geEmpty)
      elements.geEmpty.style.display = "none";
    if (elements.geErrorText)
      elements.geErrorText.textContent = msg;
    if (elements.geError)
      elements.geError.style.display = "block";
  }
  function renderGEResult(data) {
    if (elements.geResult)
      elements.geResult.style.display = "block";
    if (elements.geEmpty)
      elements.geEmpty.style.display = "none";
    if (elements.geError)
      elements.geError.style.display = "none";
    if (elements.geItemImage) {
      if (data.image) {
        elements.geItemImage.src = data.image;
        elements.geItemImage.style.display = "block";
      } else {
        elements.geItemImage.style.display = "none";
      }
    }
    if (elements.geItemName)
      elements.geItemName.textContent = data.name;
    if (elements.geItemId)
      elements.geItemId.textContent = data.itemId ? `Item ID: ${data.itemId}` : "";
    if (elements.geWikiLink) {
      elements.geWikiLink.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (data.wikiUrl) {
          window.api.openExternal(data.wikiUrl).catch((err) => console.error("[Renderer] Wiki link failed:", err));
        }
      };
    }
    if (elements.gePrice) {
      elements.gePrice.textContent = data.price > 0 ? formatGoldPrice(data.price) + " gp" : "Not tradeable";
    }
    if (elements.gePriceMeta) {
      const parts = [];
      if (data.price > 0)
        parts.push(`Exact: ${data.price.toLocaleString()} gp`);
      if (data.volume > 0)
        parts.push(`Vol: ${data.volume.toLocaleString()}`);
      const sourceLabel = data.source === "geprice" ? "GEPrices.com" : "Wiki";
      if (data.weeklyChangePercent && data.weeklyChangePercent !== 0) {
        const sign = data.weeklyChangePercent > 0 ? "+" : "";
        const color = data.weeklyChangePercent > 0 ? "#3fb950" : "#f85149";
        elements.gePriceMeta.innerHTML = parts.join(" | ") + ` | <span style="color:${color}">${sign}${data.weeklyChangePercent.toFixed(1)}% this period</span> | <span style="color:#888">via ${sourceLabel}</span>`;
      } else {
        elements.gePriceMeta.textContent = parts.join(" | ") + ` | via ${sourceLabel}`;
      }
    }
    if (elements.geDescriptionCard && elements.geDescriptionText) {
      if (data.description) {
        let desc = data.description;
        const sentences = desc.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 2) {
          desc = sentences.slice(0, 2).join("").trim();
        }
        if (desc.length > 250)
          desc = desc.substring(0, 250) + "...";
        elements.geDescriptionText.textContent = desc;
        elements.geDescriptionCard.style.display = "block";
      } else {
        elements.geDescriptionCard.style.display = "none";
      }
    }
    if (elements.geChartCanvas && data.history && data.history.length > 1) {
      drawPriceChart(elements.geChartCanvas, data.history);
    }
    if (elements.geReportsCard && elements.geReportsList) {
      if (data.reports && data.reports.length > 0) {
        elements.geReportsList.innerHTML = "";
        for (const report of data.reports) {
          const row = document.createElement("div");
          row.className = "ge-report-row";
          const isBuy = report.type.includes("buy");
          const typeLabel = isBuy ? "INSTANT BUY" : "INSTANT SELL";
          const typeColor = isBuy ? "#3fb950" : "#f85149";
          const dateStr = formatReportDate(report.date);
          row.innerHTML = `<div class="ge-report-left"><span class="ge-report-type" style="color:${typeColor}">${typeLabel}</span><span class="ge-report-reporter">${report.reporter}</span></div><div class="ge-report-right"><span class="ge-report-price">${formatGoldPrice(report.price)}</span><span class="ge-report-date">${dateStr}</span></div>`;
          elements.geReportsList.appendChild(row);
        }
        elements.geReportsCard.style.display = "block";
      } else {
        elements.geReportsCard.style.display = "none";
      }
    }
  }
  function formatReportDate(iso) {
    try {
      const d = new Date(iso);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
      if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }
  function drawPriceChart(canvas, history) {
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
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
    ctx.clearRect(0, 0, w, h);
    const prices = history.map((h2) => h2.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, "rgba(88,166,255,0.15)");
    gradient.addColorStop(1, "rgba(88,166,255,0)");
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    for (let i = 0; i < history.length; i++) {
      const x = padding.left + i / (history.length - 1) * chartW;
      const y = padding.top + chartH - (prices[i] - minPrice) / range * chartH;
      if (i === 0)
        ctx.lineTo(x, y);
      else
        ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (let i = 0; i < history.length; i++) {
      const x = padding.left + i / (history.length - 1) * chartW;
      const y = padding.top + chartH - (prices[i] - minPrice) / range * chartH;
      if (i === 0)
        ctx.moveTo(x, y);
      else
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px IBM Plex Sans, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(formatGoldPrice(maxPrice), padding.left + 4, padding.top + 12);
    ctx.fillText(formatGoldPrice(minPrice), padding.left + 4, h - padding.bottom - 4);
    ctx.textAlign = "center";
    if (history.length > 0) {
      const startDate = new Date(history[0].timestamp);
      const endDate = new Date(history[history.length - 1].timestamp);
      ctx.fillText(startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }), padding.left + 20, h - 6);
      ctx.fillText(endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }), w - padding.right - 20, h - 6);
    }
  }
  var SKILL_NAMES = [
    "Attack",
    "Defence",
    "Strength",
    "Constitution",
    "Ranged",
    "Prayer",
    "Magic",
    "Cooking",
    "Woodcutting",
    "Fletching",
    "Fishing",
    "Firemaking",
    "Crafting",
    "Smithing",
    "Mining",
    "Herblore",
    "Agility",
    "Thieving",
    "Slayer",
    "Farming",
    "Runecrafting",
    "Hunter",
    "Construction",
    "Summoning",
    "Dungeoneering",
    "Divination",
    "Invention",
    "Archaeology",
    "Necromancy"
  ];
  var MAX_LEVELS = {
    "Invention": 150,
    "default": 99
  };
  var lastSearchedPlayer = "";
  function parsePlayerStats(rawData) {
    if (!rawData)
      return null;
    const statsArray = rawData.split(/\s+/).map((line) => line.split(","));
    if (statsArray.length < 30)
      return null;
    const overallRank = parseInt(statsArray[0][0], 10);
    const totalLevel = parseInt(statsArray[0][1], 10);
    const totalXp = parseInt(statsArray[0][2], 10) || 0;
    if (isNaN(totalLevel))
      return null;
    const levels = [];
    const xp = [];
    for (let i = 1; i < statsArray.length && levels.length < 29; i++) {
      levels.push(parseInt(statsArray[i][1], 10) || 1);
      xp.push(parseInt(statsArray[i][2], 10) || 0);
    }
    return { rank: overallRank, totalLevel, totalXp, levels, xp };
  }
  async function searchHiscores() {
    const playerName = elements.hiscoresPlayerInput?.value.trim();
    if (!playerName)
      return;
    if (elements.hiscoresSearchBtn) {
      elements.hiscoresSearchBtn.disabled = true;
      elements.hiscoresSearchBtn.textContent = "Searching...";
    }
    if (elements.hiscoresError)
      elements.hiscoresError.style.display = "none";
    if (elements.hiscoresResult)
      elements.hiscoresResult.style.display = "none";
    if (elements.hiscoresEmpty)
      elements.hiscoresEmpty.style.display = "none";
    try {
      const rawData = await window.api.getHiscores(playerName);
      if (!rawData) {
        showHiscoresError("Player not found or service unavailable.");
        return;
      }
      const stats = parsePlayerStats(rawData);
      if (!stats) {
        showHiscoresError("Failed to parse player data.");
        return;
      }
      lastSearchedPlayer = playerName;
      renderHiscoresResult(playerName, stats);
    } catch (e) {
      console.error("[Renderer] Hiscores search failed:", e);
      showHiscoresError("Failed to fetch hiscores. Please try again.");
    } finally {
      if (elements.hiscoresSearchBtn) {
        elements.hiscoresSearchBtn.disabled = false;
        elements.hiscoresSearchBtn.textContent = "Search";
      }
    }
  }
  function renderHiscoresResult(playerName, stats) {
    if (elements.hiscoresResult)
      elements.hiscoresResult.style.display = "block";
    if (elements.hiscoresEmpty)
      elements.hiscoresEmpty.style.display = "none";
    if (elements.hiscoresError)
      elements.hiscoresError.style.display = "none";
    if (elements.hiscoresPlayerHeader) {
      elements.hiscoresPlayerHeader.innerHTML = "";
      const overallIcon = document.createElement("img");
      overallIcon.className = "hiscores-overall-icon";
      overallIcon.src = "assets/skills/overall.png";
      overallIcon.alt = "Overall";
      overallIcon.width = 24;
      overallIcon.height = 24;
      const nameEl = document.createElement("div");
      nameEl.className = "hiscores-player-name";
      nameEl.textContent = playerName;
      const metaEl = document.createElement("div");
      metaEl.className = "hiscores-player-meta";
      metaEl.textContent = `Total: ${stats.totalLevel.toLocaleString()} | XP: ${stats.totalXp.toLocaleString()} | Rank: ${stats.rank > 0 ? stats.rank.toLocaleString() : "Unranked"}`;
      elements.hiscoresPlayerHeader.appendChild(overallIcon);
      elements.hiscoresPlayerHeader.appendChild(nameEl);
      elements.hiscoresPlayerHeader.appendChild(metaEl);
    }
    if (elements.hiscoresGrid) {
      elements.hiscoresGrid.innerHTML = "";
      for (let i = 0; i < SKILL_NAMES.length && i < stats.levels.length; i++) {
        const skillName = SKILL_NAMES[i];
        const level = stats.levels[i];
        const maxLevel = MAX_LEVELS[skillName] || MAX_LEVELS["default"];
        const isMaxed = level >= maxLevel;
        const card = document.createElement("div");
        card.className = `hiscores-skill${isMaxed ? " maxed" : ""}`;
        const iconEl = document.createElement("img");
        iconEl.className = "hiscores-skill-icon";
        iconEl.src = `assets/skills/${skillName.toLowerCase()}.png`;
        iconEl.alt = skillName;
        iconEl.width = 20;
        iconEl.height = 20;
        const nameEl = document.createElement("div");
        nameEl.className = "hiscores-skill-name";
        nameEl.textContent = skillName;
        const levelEl = document.createElement("div");
        levelEl.className = "hiscores-skill-level";
        levelEl.textContent = String(level);
        const xpEl = document.createElement("div");
        xpEl.className = "hiscores-skill-xp";
        xpEl.textContent = (stats.xp[i] || 0).toLocaleString() + " xp";
        card.appendChild(iconEl);
        card.appendChild(nameEl);
        card.appendChild(levelEl);
        card.appendChild(xpEl);
        elements.hiscoresGrid.appendChild(card);
      }
    }
  }
  function showHiscoresError(message) {
    if (elements.hiscoresError) {
      elements.hiscoresError.textContent = message;
      elements.hiscoresError.style.display = "block";
    }
    if (elements.hiscoresResult)
      elements.hiscoresResult.style.display = "none";
    if (elements.hiscoresEmpty)
      elements.hiscoresEmpty.style.display = "none";
  }
  function setupEngineUpdateBanner() {
    let el = null;
    const ensure = () => {
      if (el)
        return el;
      el = document.createElement("div");
      el.id = "engine-update-banner";
      el.innerHTML = '<span class="eub-text">Updating engine\u2026</span><div class="eub-bar"><div class="eub-fill"></div></div>';
      document.body.appendChild(el);
      return el;
    };
    const dismiss = (delayMs) => {
      window.setTimeout(() => {
        if (el) {
          el.remove();
          el = null;
        }
      }, delayMs);
    };
    window.api.onEngineUpdateProgress((p) => {
      if (!p)
        return;
      if (p.phase === "uptodate") {
        if (el) {
          el.remove();
          el = null;
        }
        return;
      }
      const node = ensure();
      const text = node.querySelector(".eub-text");
      const fill = node.querySelector(".eub-fill");
      if (p.phase === "checking")
        text.textContent = "Checking for engine update\u2026";
      if (p.phase === "downloading") {
        const pct = Math.round((p.fraction ?? 0) * 100);
        text.textContent = `Downloading engine\u2026 ${pct}%`;
        fill.style.width = `${pct}%`;
      }
      if (p.phase === "extracting") {
        text.textContent = "Installing engine\u2026";
        fill.style.width = "100%";
      }
      if (p.phase === "done") {
        text.textContent = "Engine updated";
        dismiss(2e3);
      }
      if (p.phase === "error") {
        text.textContent = "Engine update failed (using cached)";
        dismiss(4e3);
      }
    });
  }
  init();
})();
