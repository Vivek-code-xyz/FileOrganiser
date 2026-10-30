import fs from "node:fs/promises";
import path from "node:path";
import { logMessage } from "./logger.js";


async function moveWithUniqueName(sourcePath, destinationPath) {

    const directory = path.dirname(destinationPath);
    const extension = path.extname(destinationPath);

    const filename = path.basename(
        destinationPath,
        extension
    );

    let counter = 0;

    while (true) {

        const candidate = counter === 0
            ? destinationPath
            : path.join(
                directory,
                `${filename} (${counter})${extension}`
            );

        try {

            await fs.copyFile(
                sourcePath,
                candidate,
                fs.constants.COPYFILE_EXCL
            );

            await fs.unlink(sourcePath);

            return candidate;

        } catch (error) {

            if (error.code === "EEXIST") {
                counter++;
                continue;
            }

            throw error;
        }
    }
}


export async function organizeFile(filePath, categorization) {

    try {

        const downloadsPath = path.dirname(filePath);

        const { category, subcategory } = categorization;

        const destinationDirectory = subcategory
            ? path.join(downloadsPath, category, subcategory)
            : path.join(downloadsPath, category);
        const safeDestination = path.resolve(destinationDirectory);
        const safeRoot = path.resolve(downloadsPath);

        if (safeDestination !== safeRoot && !safeDestination.startsWith(`${safeRoot}${path.sep}`)) {
            throw new Error("Destination folder must stay inside the monitored directory");
        }

        await fs.mkdir(safeDestination, {
            recursive: true
        });

        const destinationPath = path.join(
            safeDestination,
            path.basename(filePath)
        );

        const finalPath = await moveWithUniqueName(
            filePath,
            destinationPath
        );

        await logMessage(
            "SUCCESS",
            `${path.basename(filePath)} -> ${path.relative(downloadsPath, finalPath)}`
        );

        return finalPath;

    } catch (error) {

        await logMessage(
            "ERROR",
            `${path.basename(filePath)}: ${error.message}`
        );

        return null;

    }
}