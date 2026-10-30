import path from "node:path";

export const recommendedMappings = {

    // Documents
    ".pdf": {
        category: "Documents",
        subcategory: "PDFs"
    },

    ".doc": {
        category: "Documents",
        subcategory: "Docs"
    },

    ".docx": {
        category: "Documents",
        subcategory: "Docs"
    },

    ".txt": {
        category: "Documents",
        subcategory: "TextFiles"
    },

    ".xlsx": {
        category: "Documents",
        subcategory: "Spreadsheets"
    },

    ".xls": {
        category: "Documents",
        subcategory: "Spreadsheets"
    },

    ".ppt": {
        category: "Documents",
        subcategory: "Presentations"
    },

    ".pptx": {
        category: "Documents",
        subcategory: "Presentations"
    },


    // Images
    ".png": {
        category: "Images",
        subcategory: "PNGs"
    },

    ".jpg": {
        category: "Images",
        subcategory: "JPGs"
    },

    ".jpeg": {
        category: "Images",
        subcategory: "JPGs"
    },

    ".svg": {
        category: "Images",
        subcategory: "SVGs"
    },

    ".webp": {
        category: "Images",
        subcategory: "WEBPs"
    },


    // Videos
    ".mp4": {
        category: "Videos",
        subcategory: "MP4s"
    },

    ".mkv": {
        category: "Videos",
        subcategory: "MKVs"
    },

    ".mov": {
        category: "Videos",
        subcategory: "MOVs"
    },


    // Audio
    ".mp3": {
        category: "Audio",
        subcategory: "MP3s"
    },

    ".wav": {
        category: "Audio",
        subcategory: "WAVs"
    },

    ".flac": {
        category: "Audio",
        subcategory: "FLACs"
    },


    // Archives
    ".zip": {
        category: "Archives",
        subcategory: "ZIPs"
    },

    ".rar": {
        category: "Archives",
        subcategory: "RARs"
    },

    ".7z": {
        category: "Archives",
        subcategory: "7Zs"
    },

    // Code
    ".html": {
        category: "Codes",
        subcategory: "HTML"
    },

    ".htm": {
        category: "Codes",
        subcategory: "HTML"
    },

    ".css": {
        category: "Codes",
        subcategory: "CSS"
    },

    ".scss": {
        category: "Codes",
        subcategory: "SCSS"
    },

    ".sass": {
        category: "Codes",
        subcategory: "Sass"
    },

    ".less": {
        category: "Codes",
        subcategory: "Less"
    },

    ".js": {
        category: "Codes",
        subcategory: "JavaScript"
    },

    ".jsx": {
        category: "Codes",
        subcategory: "JavaScript"
    },

    ".ts": {
        category: "Codes",
        subcategory: "TypeScript"
    },

    ".tsx": {
        category: "Codes",
        subcategory: "TypeScript"
    },

    ".py": {
        category: "Codes",
        subcategory: "Python"
    },

    ".java": {
        category: "Codes",
        subcategory: "Java"
    },

    ".c": {
        category: "Codes",
        subcategory: "C"
    },

    ".h": {
        category: "Codes",
        subcategory: "C"
    },

    ".cpp": {
        category: "Codes",
        subcategory: "C++"
    },

    ".cs": {
        category: "Codes",
        subcategory: "CSharp"
    },

    ".go": {
        category: "Codes",
        subcategory: "Go"
    },

    ".rs": {
        category: "Codes",
        subcategory: "Rust"
    },

    ".rb": {
        category: "Codes",
        subcategory: "Ruby"
    },

    ".php": {
        category: "Codes",
        subcategory: "PHP"
    },

    ".swift": {
        category: "Codes",
        subcategory: "Swift"
    },

    ".kt": {
        category: "Codes",
        subcategory: "Kotlin"
    },

    ".sql": {
        category: "Codes",
        subcategory: "SQL"
    },

    ".sh": {
        category: "Codes",
        subcategory: "Shell"
    },

    ".ps1": {
        category: "Codes",
        subcategory: "PowerShell"
    },

    ".json": {
        category: "Codes",
        subcategory: "JSON"
    },

    ".xml": {
        category: "Codes",
        subcategory: "XML"
    },

    ".yml": {
        category: "Codes",
        subcategory: "YAML"
    },

    ".yaml": {
        category: "Codes",
        subcategory: "YAML"
    }
};


// Categorization function
export function categorizeFile(filePath, mappings = recommendedMappings) {

    const extension = path.extname(filePath).toLowerCase();

    const configuredFolder = mappings[extension];

    if (!configuredFolder) {
        return {
            category: "Other",
            subcategory: null
        };
    }

    if (typeof configuredFolder === "object") {
        return configuredFolder;
    }

    return {
        category: configuredFolder,
        subcategory: null
    };
}