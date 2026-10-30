# Smart File Organizer

Smart File Organizer is a local Electron desktop app for keeping a folder tidy. Choose a target folder, review the detected files, configure extension rules, organize existing files, or keep the folder organized in real time.

Files never leave the selected folder. The app creates destination folders inside it and uses unique names when a file with the same name already exists.

## Features

- Uses the Windows `Downloads` folder by default.
- Lets you select any folder on your computer.
- Lists the selected folder's files, extensions, and sizes.
- Prefills recommended rules for documents, media, archives, and source code.
- Lets you edit the destination for each extension.
- Organizes existing files with **Organize now**.
- Watches for new files with **Start watching**.
- Remembers the selected folder and custom rules between launches.
- Ignores temporary download files such as `.crdownload`, `.part`, and `.tmp`.
- Runs locally without an account or cloud service.

## Requirements

### Running the packaged Windows app

- Windows 10 or later, 64-bit
- No Node.js installation is required
- Access to the folder you want to organize

### Running from source

- Windows 10 or later, 64-bit
- Node.js 20 LTS or later
- npm 10 or later
- Git, optional, if cloning the repository

Check your development tools:

```powershell
node --version
npm --version
```

## Install the `.exe` directly

The Windows installer is already available in the project's `release` folder:

```text
release\Smart File Organizer Setup 1.0.0.exe
```

To install it directly:

1. Open the project's `release` folder.
2. Double-click `Smart File Organizer Setup 1.0.0.exe`.
3. If Windows SmartScreen appears, select **More info**, verify that the publisher is expected, and choose **Run anyway** if you trust the build.
4. Choose the installation directory, or keep the default.
5. Select **Install**.
6. Launch **Smart File Organizer** from the Start menu or desktop shortcut.

The installer is not code-signed, so Windows may show a SmartScreen warning. This is expected for locally generated builds.

### Portable/unpacked build

For testing without running the installer, open:

```text
release\win-unpacked\Smart File Organizer.exe
```

Keep the complete `win-unpacked` folder together. Do not copy only the executable because it depends on the files beside it.

For users downloading the project from GitHub, open the repository's **Releases** page and download the installer attached to the latest release instead of downloading individual files from the source tree.

## Run from source

```powershell
git clone <repository-url>
cd smart-file-organiser
npm install
npm start
```

The first launch starts with the user's `Downloads` folder selected. Use **Choose folder** to select another directory.

## Build the Windows installer

Install dependencies and create a distributable installer:

```powershell
npm install
npm run dist
```

The generated installer is written to the `release/` directory. Run the `.exe` in that directory to install the application. The installer uses the custom Smart File Organizer icon.

To create an unpacked build for local testing:

```powershell
npm run pack
```

## How to use

1. Select **Choose folder** and pick the folder to organize.
2. Review the file list and detected extensions.
3. Select **Edit rules** if an extension should use a different destination.
4. Enter a folder path relative to the selected folder, such as `Codes/Python` or `Work/Invoices`.
5. Select **Save rules**.
6. Select **Organize now** to move files already in the folder.
7. Select **Start watching** to automatically process new files.
8. Select **Stop watching** before changing the target folder or when monitoring is no longer needed.

Destination paths are restricted to the selected folder. A rule cannot move files to an unrelated location.

## Default mappings

The recommended mappings include:

| Group | Examples | Destination |
|---|---|---|
| Documents | `.pdf`, `.docx`, `.txt`, `.xlsx` | `Documents/<type>` |
| Images | `.png`, `.jpg`, `.svg`, `.webp` | `Images/<type>` |
| Videos | `.mp4`, `.mkv`, `.mov` | `Videos/<type>` |
| Audio | `.mp3`, `.wav`, `.flac` | `Audio/<type>` |
| Archives | `.zip`, `.rar`, `.7z` | `Archives/<type>` |
| Code | `.html`, `.css`, `.js`, `.ts`, `.py`, `.java`, `.go`, `.rs` | `Codes/<language>` |
| Data/config | `.json`, `.xml`, `.yml`, `.yaml`, `.sql` | `Codes/<type>` |

Unknown extensions go to `Other` unless you add a custom rule for them.

## Data and privacy

The app does not upload files. It stores the selected folder and extension rules in Electron's per-user application data directory as `organizer-config.json`. Activity logs are written locally by the app.

## Project structure

```text
electron/
  main.js       Electron main process and IPC handlers
  preload.js    Secure renderer API
public/
  index.html    Application interface
  renderer.js   UI behavior
  style.css     UI styles
src/
  categoriser.js  Default and custom extension rules
  scanner.js      Existing-file scan
  watcher.js      Real-time folder watcher
  fileManager.js  Safe file moves
  logger.js       Local activity logging
assets/
  icon.png      Application icon source
  icon.ico      Windows installer icon
```

## Architecture

The app uses Electron's main/preload/renderer process split. File-system access stays in the main process; the renderer communicates through the small, context-isolated API exposed by `preload.js`.

```mermaid
flowchart LR
    User([User])
    Renderer["Renderer UI<br/>public/index.html<br/>public/renderer.js<br/>public/style.css"]
    Preload["Secure bridge<br/>electron/preload.js"]
    Main["Electron main process<br/>electron/main.js"]
    Config["Local config<br/>organizer-config.json"]
    Dialog["Electron folder dialog"]
    Scanner["Existing-file scanner<br/>src/scanner.js"]
    Watcher["Real-time watcher<br/>src/watcher.js"]
    Categoriser["Categoriser<br/>src/categoriser.js"]
    FileManager["File manager<br/>src/fileManager.js"]
    Logger["Local logger<br/>src/logger.js"]
    Folder[("Selected folder")]

    User --> Renderer
    Renderer <-->|IPC calls and events| Preload
    Preload <-->|context-isolated IPC| Main
    Main <--> Config
    Main --> Dialog
    Main --> Scanner
    Main --> Watcher
    Scanner --> Categoriser
    Watcher --> Categoriser
    Scanner --> FileManager
    Watcher --> FileManager
    Scanner --> Logger
    Watcher --> Logger
    Categoriser --> FileManager
    FileManager --> Folder
    Watcher <--> Folder
    Scanner <--> Folder
    Main --> Renderer
```

### Organize existing files

```mermaid
sequenceDiagram
    actor User
    participant UI as Renderer UI
    participant Bridge as Preload bridge
    participant Main as Electron main
    participant Scan as Scanner
    participant Rules as Categoriser
    participant Move as File manager
    participant Folder as Selected folder

    User->>UI: Select "Organize now"
    UI->>Bridge: invoke("organizer:organize")
    Bridge->>Main: IPC request
    Main->>Scan: organizeExistingFiles(folder, mappings)
    Scan->>Folder: Read top-level files
    loop Each regular file
        Scan->>Rules: categorizeFile(file, mappings)
        Rules-->>Scan: category and subcategory
        Scan->>Move: organizeFile(file, destination)
        Move->>Folder: Create destination and move safely
    end
    Main-->>Bridge: Result counts
    Bridge-->>UI: Update activity and file list
```

### Real-time watching

```mermaid
sequenceDiagram
    actor User
    participant UI as Renderer UI
    participant Main as Electron main
    participant Watch as Chokidar watcher
    participant Rules as Categoriser
    participant Move as File manager
    participant Folder as Selected folder

    User->>UI: Select "Start watching"
    UI->>Main: Start with folder and mappings
    Main->>Watch: Watch selected folder
    Watch-->>Main: Watcher ready
    Main-->>UI: Monitoring started

    loop While watching
        Folder-->>Watch: New file appears
        Watch->>Rules: Categorize extension
        Watch->>Move: Move file to mapped folder
        Move-->>Main: Success or error event
        Main-->>UI: organizer:event
    end

    User->>UI: Select "Stop watching"
    UI->>Main: Stop watcher
    Main->>Watch: Close watcher
```

### Configuration flow

```mermaid
flowchart TD
    Launch["App launch"] --> Defaults["Load Downloads path<br/>and recommended mappings"]
    Defaults --> Read["Read saved config if present"]
    Read --> Merge["Merge saved mappings over defaults"]
    Merge --> Ready["UI ready"]
    Ready --> Choose["User chooses folder"]
    Ready --> Edit["User edits extension rules"]
    Choose --> Save["Save configuration"]
    Edit --> Save
    Save --> Run["Scanner and watcher use current config"]
```

## Development checks

```powershell
node --check electron\main.js
node --check public\renderer.js
node --check src\categoriser.js
npm start
```

## License

The repository does not currently declare a software license. Add a license before redistributing the project.
