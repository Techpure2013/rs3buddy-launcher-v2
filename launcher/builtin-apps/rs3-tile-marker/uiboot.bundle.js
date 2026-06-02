/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron"
/*!***********************************************************************************!*\
  !*** external "(typeof require != \"undefined\" ? require(\"electron\") : null)" ***!
  \***********************************************************************************/
(module) {

module.exports = (typeof require != "undefined" ? require("electron") : null);

/***/ },

/***/ "path"
/*!*******************************************************************************!*\
  !*** external "(typeof require != \"undefined\" ? require(\"path\") : null)" ***!
  \*******************************************************************************/
(module) {

module.exports = (typeof require != "undefined" ? require("path") : null);

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*******************!*\
  !*** ./uiboot.ts ***!
  \*******************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/**
 * RS3 Tile Marker - Electron Main Process
 * Handles window creation and native addon integration
 */


let mainWindow = null;
// Check if a URL was passed as argument (for dev mode)
const devUrl = process.argv[2];
function createWindow() {
    mainWindow = new electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow({
        width: 1000,
        height: 700,
        title: "RS3 Tile Marker",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true,
        resizable: true,
        backgroundColor: "#1a1a2e",
    });
    if (devUrl && devUrl.startsWith("http")) {
        // Dev mode: load from webpack dev server
        mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production: load the built HTML file
        const indexPath = path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, "index.html");
        mainWindow.loadFile(indexPath);
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// IPC handlers for player position updates from GL hooks
electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle("get-player-position", async () => {
    // This will be connected to the native addon for live position
    // For now, return null to indicate no position available
    try {
        // TODO: Integrate with patchrs_napi.ts for live position
        return null;
    }
    catch {
        return null;
    }
});
// App lifecycle
electron__WEBPACK_IMPORTED_MODULE_0__.app.whenReady().then(() => {
    createWindow();
    electron__WEBPACK_IMPORTED_MODULE_0__.app.on("activate", () => {
        if (electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron__WEBPACK_IMPORTED_MODULE_0__.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();
    }
});

})();

/******/ })()
;