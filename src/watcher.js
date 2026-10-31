import chokidar from "chokidar";
import path from "node:path";
import os from "node:os";

import { categorizeFile } from "./categoriser.js";
import { organizeFile } from "./fileManager.js";
import { logMessage } from "./logger.js";

const defaultDownloadsPath = path.join(
    os.homedir(),
    "Downloads"
);

let watcher = null;
let watchedPath = defaultDownloadsPath;
let activeMappings = {};

const processingFiles = new Set();

const downloadWriteFinishOptions = {
    stabilityThreshold: 1500,
    pollInterval: 100
};

export function getDownloadsPath() {
    return watchedPath;
}

async function processFile(filePath) {

    if (processingFiles.has(filePath)) return;

    processingFiles.add(filePath);

    try {

        const categorization = categorizeFile(filePath, activeMappings);

        const result = await organizeFile(
            filePath,
            categorization
        );

        return result;

    } catch (error) {

        await logMessage("ERROR", error.message);

    } finally {

        processingFiles.delete(filePath);

    }
}


export async function startWatcher(onEvent, targetPath = watchedPath, mappings = activeMappings) {

    if (watcher) {
        return;
    }

    watchedPath = targetPath;
    activeMappings = mappings;

    watcher = chokidar.watch(watchedPath, {
        persistent: true,
        ignoreInitial: true,
        depth: 0,
        // Browsers can create the final filename before they finish writing it.
        // Wait for the size to remain unchanged before moving the file.
        awaitWriteFinish: downloadWriteFinishOptions,
        ignored: [
            /(^|[\/\\])\./,
            /\.crdownload$/,
            /\.part$/,
            /\.tmp$/
        ]
    });

    watcher.on("add", async (filePath) => {

        if (onEvent) {
            onEvent("info", `New file detected: ${path.basename(filePath)}`);
        }

        const result = await processFile(filePath);

        if (onEvent) {
            if (result) {
                onEvent(
                    "success",
                    `Moved file  [${path.relative(watchedPath, filePath)}]  --->  [${path.relative(watchedPath, result)}]`
                );
            } else {
                onEvent("error", `Could not move ${path.basename(filePath)}`);
            }
        }

    });

    watcher.on("error", (error) => {

        if (onEvent) {
            onEvent("error", error.message);
        }

    });

    await new Promise((resolve, reject) => {

        watcher.once("ready", resolve);
        watcher.once("error", reject);

    });

    if (onEvent) {
        onEvent("success", "Monitoring started");
    }

}


export async function stopWatcher(onEvent) {

    if (!watcher) return;

    await watcher.close();

    watcher = null;

    if (onEvent) {
        onEvent("info", "Monitoring stopped");
    }

}


export function isWatcherRunning() {
    return watcher !== null;
}