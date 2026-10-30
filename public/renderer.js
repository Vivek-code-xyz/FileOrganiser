const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const organizeBtn = document.getElementById("organizeBtn");
const chooseBtn = document.getElementById("chooseBtn");
const editBtn = document.getElementById("editBtn");
const status = document.getElementById("status");
const statusText = document.getElementById("statusText");
const directory = document.getElementById("directory");
const fileSummary = document.getElementById("fileSummary");
const fileCount = document.getElementById("fileCount");
const mappingList = document.getElementById("mappingList");
const fileList = document.getElementById("fileList");
const activityLog = document.getElementById("activityLog");
const activityCount = document.getElementById("activityCount");

let eventCount = 0;
let currentDirectory = "";
let mappings = {};
let files = [];
let editing = false;
let activeMappingGroup = "";

function now() {
    return new Date().toLocaleTimeString();
}

function setButtonBusy(button, label, busy) {
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    button.textContent = busy ? label : button.dataset.idleLabel;
}

function getOrganizerApi() {
    if (!window.organizer) {
        throw new Error("The Electron bridge is unavailable. Close this window and launch the installed app again.");
    }

    return window.organizer;
}

function updateStatus(running) {
    status.classList.toggle("running", running);
    statusText.textContent = running ? "Watching" : "Stopped";
    startBtn.disabled = running;
    stopBtn.disabled = !running;
}

function addActivity(event) {
    const empty = activityLog.querySelector(".empty");
    empty?.remove();
    const date = event.date || new Date().toISOString().slice(0, 10);
    let group = activityLog.querySelector(`[data-log-date="${date}"]`);
    if (!group) {
        group = document.createElement("section");
        group.className = "log-day";
        group.dataset.logDate = date;
        const heading = document.createElement("h3");
        heading.className = "log-day-title";
        heading.textContent = formatLogDate(date);
        group.append(heading);
        activityLog.prepend(group);
    }
    const item = document.createElement("div");
    item.className = "log-item";
    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = event.time;
    const message = document.createElement("span");
    message.className = `log-${event.type}`;
    message.textContent = event.message;
    item.append(time, message);
    group.append(item);
    eventCount++;
    activityCount.textContent = `${eventCount} event${eventCount === 1 ? "" : "s"}`;
}

function formatLogDate(date) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFiles() {
    fileCount.textContent = files.length;
    fileSummary.textContent = `${files.length} file${files.length === 1 ? "" : "s"} ready to sort`;
    if (!files.length) {
        fileList.innerHTML = '<div class="empty">This folder is ready for its first file.</div>';
        return;
    }
    fileList.replaceChildren(...files.map((file) => {
        const row = document.createElement("div");
        row.className = "file-row";
        const name = document.createElement("span");
        name.className = "file-name";
        name.title = file.name;
        name.textContent = file.name;
        const meta = document.createElement("span");
        meta.className = "file-meta";
        meta.textContent = `${file.extension} / ${formatBytes(file.size)}`;
        row.append(name, meta);
        return row;
    }));
}

function renderMappings() {
    const groups = new Map();
    const extensionCounts = new Map();
    files.forEach((file) => {
        if (file.extension !== "(no extension)") {
            extensionCounts.set(file.extension, (extensionCounts.get(file.extension) || 0) + 1);
        }
    });

    Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b)).forEach(([extension, folder]) => {
        const groupName = String(folder || "Other").split(/[\\/]/)[0] || "Other";
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName).push([extension, folder]);
    });

    const categoryNames = [...groups.keys()];
    if (!activeMappingGroup || !groups.has(activeMappingGroup)) activeMappingGroup = categoryNames[0] || "";

    const categories = document.createElement("div");
    categories.className = "mapping-categories";
    categoryNames.forEach((groupName) => {
        const button = document.createElement("button");
        button.className = "mapping-category";
        button.type = "button";
        button.classList.toggle("active", groupName === activeMappingGroup);
        button.setAttribute("aria-expanded", String(groupName === activeMappingGroup));
        const name = document.createElement("span");
        name.textContent = groupName;
        const count = document.createElement("span");
        count.className = "mapping-category-count";
        const presentCount = groups.get(groupName).filter(([extension]) => extensionCounts.has(extension)).length;
        count.textContent = presentCount
            ? `${presentCount}/${groups.get(groupName).length}`
            : groups.get(groupName).length;
        count.title = presentCount ? `${presentCount} currently in this folder` : "No matching files in this folder";
        button.append(name, count);
        button.addEventListener("click", () => {
            activeMappingGroup = groupName;
            renderMappings();
        });
        categories.append(button);
    });

    const details = document.createElement("section");
    details.className = "mapping-details";
    const detailHeading = document.createElement("div");
    detailHeading.className = "mapping-details-head";
    const title = document.createElement("h3");
    title.textContent = activeMappingGroup || "No categories";
    const subtitle = document.createElement("span");
    const activeEntries = groups.get(activeMappingGroup) || [];
    const activePresentCount = activeEntries.filter(([extension]) => extensionCounts.has(extension)).length;
    subtitle.textContent = `${activeEntries.length} extension${activeEntries.length === 1 ? "" : "s"} · ${activePresentCount} here`;
    detailHeading.append(title, subtitle);
    const rows = document.createElement("div");
    rows.className = "mapping-group-rows";
    activeEntries.sort(([extensionA], [extensionB]) => {
        const presentDifference = Number(extensionCounts.has(extensionB)) - Number(extensionCounts.has(extensionA));
        return presentDifference || extensionA.localeCompare(extensionB);
    }).forEach(([extension, folder]) => {
        const row = document.createElement("label");
        row.className = "mapping-row";
        const presentCount = extensionCounts.get(extension) || 0;
        row.classList.toggle("present", presentCount > 0);
        const extensionText = document.createElement("span");
        extensionText.className = "extension";
        extensionText.textContent = extension;
        extensionText.title = extension;
        const input = document.createElement("input");
        input.className = "mapping-input";
        input.value = folder || "Other";
        input.title = folder || "Other";
        input.disabled = !editing;
        input.dataset.extension = extension;
        input.addEventListener("input", (event) => {
            mappings[event.target.dataset.extension] = event.target.value.trim() || "Other";
        });
        const destination = document.createElement("div");
        destination.className = "mapping-destination";
        destination.append(input);
        if (presentCount) {
            const presentLabel = document.createElement("span");
            presentLabel.className = "present-label";
            presentLabel.textContent = `${presentCount} here`;
            destination.append(presentLabel);
        }
        row.append(extensionText, destination);
        rows.append(row);
    });
    details.append(detailHeading, rows);
    mappingList.replaceChildren(categories, details);
}

async function loadFiles() {
    fileList.classList.add("is-loading");
    fileList.innerHTML = '<div class="loading-state"><span class="spinner"></span><span>Reading this folder…</span></div>';
    try {
        files = await getOrganizerApi().listFiles(currentDirectory);
        for (const file of files) {
            if (!mappings[file.extension] && file.extension !== "(no extension)") mappings[file.extension] = "Other";
        }
        renderMappings();
        renderFiles();
    } catch (error) {
        fileList.innerHTML = '<div class="empty">The folder could not be read.</div>';
        addActivity({ type: "error", message: error.message, time: now() });
    } finally {
        fileList.classList.remove("is-loading");
    }
}

async function saveConfiguration() {
    await getOrganizerApi().configure({ directory: currentDirectory, mappings });
}

chooseBtn.addEventListener("click", async () => {
    setButtonBusy(chooseBtn, "Opening…", true);

    try {
        const chosen = await getOrganizerApi().chooseFolder();
        if (!chosen) return;
        if (status.classList.contains("running")) await getOrganizerApi().stop();
        currentDirectory = chosen;
        directory.textContent = chosen;
        await saveConfiguration();
        await loadFiles();
        updateStatus(false);
        addActivity({ type: "info", message: "Folder selected", time: now() });
    } catch (error) {
        addActivity({ type: "error", message: `Could not open folder picker: ${error.message}`, time: now() });
    } finally {
        setButtonBusy(chooseBtn, "Opening…", false);
    }
});

editBtn.addEventListener("click", async () => {
    editing = !editing;
    editBtn.textContent = editing ? "Save rules" : "Edit rules";
    if (!editing) {
        setButtonBusy(editBtn, "Saving…", true);
        try {
            await saveConfiguration();
            addActivity({ type: "success", message: "Rules saved", time: now() });
        } catch (error) {
            addActivity({ type: "error", message: error.message, time: now() });
        } finally {
            editBtn.disabled = false;
            editBtn.classList.remove("is-loading");
            editBtn.textContent = "Edit rules";
        }
    }
    renderMappings();
});

startBtn.addEventListener("click", async () => {
    setButtonBusy(startBtn, "Starting…", true);
    try {
        await saveConfiguration();
        const response = await getOrganizerApi().start();
        updateStatus(response.success);
        if (!response.success) addActivity({ type: "error", message: response.message, time: now() });
    } catch (error) {
        updateStatus(false);
        addActivity({ type: "error", message: error.message, time: now() });
    } finally {
        setButtonBusy(startBtn, "Starting…", false);
        updateStatus(status.classList.contains("running"));
    }
});

stopBtn.addEventListener("click", async () => {
    setButtonBusy(stopBtn, "Stopping…", true);
    try {
        await getOrganizerApi().stop();
        updateStatus(false);
    } catch (error) {
        addActivity({ type: "error", message: error.message, time: now() });
    } finally {
        setButtonBusy(stopBtn, "Stopping…", false);
        updateStatus(false);
    }
});

organizeBtn.addEventListener("click", async () => {
    setButtonBusy(organizeBtn, "Organizing…", true);
    try {
        await saveConfiguration();
        const response = await getOrganizerApi().organize();
        addActivity(response.success
            ? { type: "success", message: `Organized ${response.result.organized}, skipped ${response.result.skipped}, failed ${response.result.failed}`, time: now() }
            : { type: "error", message: response.message, time: now() });
        await loadFiles();
    } catch (error) {
        addActivity({ type: "error", message: error.message, time: now() });
    } finally {
        setButtonBusy(organizeBtn, "Organizing…", false);
    }
});

if (window.organizer) {
    window.organizer.onEvent(addActivity);
}

async function initialize() {
    const response = await getOrganizerApi().getStatus();
    currentDirectory = response.directory;
    mappings = response.mappings || {};
    directory.textContent = currentDirectory;
    renderMappings();
    updateStatus(response.running);
    await loadFiles();
    try {
        const history = await getOrganizerApi().getActivity();
        history.reverse().forEach(addActivity);
    } catch (error) {
        addActivity({ type: "error", message: `Could not load activity history: ${error.message}`, time: now() });
    }
}

initialize();