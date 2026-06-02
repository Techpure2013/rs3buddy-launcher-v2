"use strict";
(() => {
  // src/workspace/renderer.ts
  var api = window.workspaceApi;
  var statusDot = document.getElementById("status-dot");
  var statusText = document.getElementById("status-text");
  var appsContainer = document.getElementById("apps-container");
  document.getElementById("btn-minimize")?.addEventListener("click", () => {
    api.minimize();
  });
  document.getElementById("btn-close")?.addEventListener("click", () => {
    api.close();
  });
  document.getElementById("add-app-btn")?.addEventListener("click", () => {
    api.openAppPicker();
  });
  api.onStatus((data) => {
    console.log("[Workspace Renderer] Status:", data);
    statusText.textContent = data.message;
    statusDot.classList.remove("loading", "disconnected");
    switch (data.status) {
      case "launching":
      case "loading":
        statusDot.classList.add("loading");
        break;
      case "connected":
        break;
      case "error":
      case "disconnected":
        statusDot.classList.add("disconnected");
        break;
    }
  });
  api.onEmbedded((data) => {
    console.log("[Workspace Renderer] Game detected, hwnd:", data.hwnd);
  });
  async function loadApps() {
    try {
      const apps = await api.getApps();
      renderApps(apps);
    } catch (e) {
      console.error("[Workspace Renderer] Failed to load apps:", e);
    }
  }
  function renderApps(apps) {
    const addBtn = document.getElementById("add-app-btn");
    appsContainer.innerHTML = "";
    apps.forEach((app) => {
      const btn = document.createElement("button");
      btn.className = "app-btn";
      btn.title = app.name;
      if (app.iconUrl) {
        const icon = document.createElement("img");
        icon.className = "app-btn-icon";
        icon.src = app.iconUrl;
        icon.alt = app.name;
        icon.onerror = () => {
          icon.style.display = "none";
        };
        btn.appendChild(icon);
      }
      const name = document.createElement("span");
      name.textContent = app.name;
      btn.appendChild(name);
      btn.addEventListener("click", () => {
        api.launchApp(app.appUrl);
      });
      appsContainer.appendChild(btn);
    });
    if (addBtn) {
      appsContainer.appendChild(addBtn);
    } else {
      const newAddBtn = document.createElement("button");
      newAddBtn.className = "app-btn";
      newAddBtn.id = "add-app-btn";
      newAddBtn.textContent = "+ Add";
      newAddBtn.addEventListener("click", () => {
        api.openAppPicker();
      });
      appsContainer.appendChild(newAddBtn);
    }
  }
  api.onAppsUpdated((apps) => {
    renderApps(apps);
  });
  loadApps();
  setTimeout(() => {
    api.launch();
  }, 500);
})();
