import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const logDirectory = path.join(
    os.homedir(),
    "Downloads",
    "OrganizerLogs"
);

const logFile = path.join(
    logDirectory,
    "organizer.log"
);
const activityFile = path.join(logDirectory, "activity.jsonl");


// Initialize logging directory
export async function initializeLogger() {

    await fs.mkdir(logDirectory, {
        recursive: true
    });

}


// Write log entry
export async function logMessage(level, message) {

    try {

        const timestamp = new Date().toLocaleString();

        const logEntry =
            `[${timestamp}] [${level}] ${message}\n`;

        await fs.appendFile(logFile, logEntry);

        console.log(logEntry.trim());

    } catch (error) {

        console.error("Logging failed:", error.message);

    }

}

export async function logActivity(type, message, date = new Date()) {
    await fs.appendFile(activityFile, `${JSON.stringify({
        type,
        message,
        time: date.toLocaleTimeString(),
        date: date.toISOString().slice(0, 10),
        timestamp: date.toISOString()
    })}\n`);
}

export async function readRecentActivity(days = 3) {
    try {
        const content = await fs.readFile(activityFile, "utf8");
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - (days - 1));

        return content.split(/\r?\n/).filter(Boolean).map((line) => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter((entry) => entry && new Date(entry.timestamp) >= cutoff)
            .reverse();
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}