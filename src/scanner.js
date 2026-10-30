import fs from "node:fs/promises";
import path from "node:path";
import { categorizeFile } from "./categoriser.js";
import { organizeFile } from "./fileManager.js";

const ignoredExtensions = [
    ".crdownload",
    ".part",
    ".tmp"
];

export async function organizeExistingFiles(downloadsPath, mappings, onMove) {

    const entries = await fs.readdir(downloadsPath, {
        withFileTypes: true
    });

    let organized = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of entries) {

        // Ignore directories
        if (!entry.isFile()) continue;

        const filePath = path.join(
            downloadsPath,
            entry.name
        );

        const extension = path.extname(entry.name).toLowerCase();

        // Ignore temporary downloads
        if (ignoredExtensions.includes(extension)) {
            skipped++;
            continue;
        }

        try {

            const categorization = categorizeFile(filePath, mappings);

            const result = await organizeFile(
                filePath,
                categorization
            );

            if (result) {
                organized++;
                onMove?.({
                    sourcePath: filePath,
                    destinationPath: result
                });
            } else {
                failed++;
            }

        } catch (error) {

            console.error(error.message);
            failed++;

        }

    }

    return {
        organized,
        skipped,
        failed
    };

}