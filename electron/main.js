import { app, BrowserWindow, ipcMain, dialog } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    startWatcher,
    stopWatcher,
    getDownloadsPath,
    isWatcherRunning
} from "../src/watcher.js";

import {
    organizeExistingFiles
} from "../src/scanner.js";
import { recommendedMappings } from "../src/categoriser.js";

import {
    initializeLogger,
    logActivity,
    readRecentActivity
} from "../src/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let targetPath;
let configPath;
let mappings = Object.fromEntries(
    Object.entries(recommendedMappings).map(([extension, value]) => [
        extension,
        value.subcategory ? path.join(value.category, value.subcategory) : value.category
    ])
);

async function loadConfiguration() {
    configPath = path.join(app.getPath("userData"), "organizer-config.json");

    try {
        const saved = JSON.parse(await fs.readFile(configPath, "utf8"));
        if (saved.directory) targetPath = saved.directory;
        if (saved.mappings && typeof saved.mappings === "object") {
            mappings = { ...mappings, ...saved.mappings };
        }
    } catch (error) {
        if (error.code !== "ENOENT") console.error(`Could not load configuration: ${error.message}`);
    }
}

async function saveConfiguration() {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({
        directory: targetPath,
        mappings
    }, null, 2));
}


function sendEvent(type, message) {
    logActivity(type, message).catch((error) => {
        console.error(`Activity logging failed: ${error.message}`);
    });

    if (mainWindow && !mainWindow.isDestroyed()) {

        mainWindow.webContents.send("organizer:event", {
            type,
            message,
            time: new Date().toLocaleTimeString()
        });

    }

}

ipcMain.handle("organizer:activity", async () => readRecentActivity(3));


function createWindow() {

    mainWindow = new BrowserWindow({

        width: 1000,
        height: 700,
        minWidth: 750,
        minHeight: 550,

        title: "Smart File Organizer",
        icon: path.join(__dirname, "../assets/icon.png"),

        webPreferences: {

            preload: path.join(__dirname, "preload.js"),

            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false

        }

    });

    mainWindow.loadFile(
        path.join(__dirname, "../public/index.html")
    );

    mainWindow.webContents.on("preload-error", (_, preloadPath, error) => {
        console.error(`Preload failed (${preloadPath}): ${error.message}`);
    });

}


app.whenReady().then(async () => {

    await initializeLogger();

    targetPath = getDownloadsPath();
    await loadConfiguration();
    createWindow();

});

ipcMain.handle("organizer:choose-folder", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error("The organizer window is not ready");
    }

    mainWindow.focus();

    let defaultPath = targetPath;
    try {
        await fs.access(defaultPath);
    } catch {
        defaultPath = app.getPath("downloads");
    }

    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Choose folder to organize",
        buttonLabel: "Use this folder",
        properties: ["openDirectory", "createDirectory"],
        defaultPath
    });

    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("organizer:list-files", async (_, directoryPath = targetPath) => {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const extension = path.extname(entry.name).toLowerCase() || "(no extension)";
        const stats = await fs.stat(path.join(directoryPath, entry.name));
        files.push({
            name: entry.name,
            extension,
            size: stats.size
        });
    }

    return files.sort((left, right) => left.name.localeCompare(right.name));
});

ipcMain.handle("organizer:configure", async (_, config) => {
    if (config?.directory) targetPath = config.directory;
    if (config?.mappings) mappings = config.mappings;
    await saveConfiguration();
    return { directory: targetPath, mappings };
});


// Start monitoring
ipcMain.handle("organizer:start", async () => {

    try {

        await startWatcher(sendEvent, targetPath, mappings);

        return {
            success: true,
            message: "Monitoring started"
        };

    } catch (error) {

        sendEvent("error", error.message);

        return {
            success: false,
            message: error.message
        };

    }

});


// Stop monitoring
ipcMain.handle("organizer:stop", async () => {

    await stopWatcher(sendEvent);

    return {
        success: true,
        message: "Monitoring stopped"
    };

});


// Organize existing files
ipcMain.handle("organizer:organize", async () => {

    try {

        const result = await organizeExistingFiles(
            targetPath,
            mappings,
            ({ sourcePath, destinationPath }) => {
                sendEvent(
                    "success",
                    `Moved file  [${path.relative(targetPath, sourcePath)}]  --->  [${path.relative(targetPath, destinationPath)}]`
                );
            }
        );

        sendEvent(
            "success",
            `Organized: ${result.organized}, Skipped: ${result.skipped}, Failed: ${result.failed}`
        );

        return {
            success: true,
            result
        };

    } catch (error) {

        sendEvent("error", error.message);

        return {
            success: false,
            message: error.message
        };

    }

});


// Get application status
ipcMain.handle("organizer:status", () => {

    return {
        running: isWatcherRunning(),
        directory: targetPath,
        mappings
    };

});


app.on("before-quit", async () => {

    await stopWatcher();

});