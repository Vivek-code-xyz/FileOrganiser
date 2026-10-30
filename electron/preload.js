import {
    contextBridge,
    ipcRenderer
} from "electron";

contextBridge.exposeInMainWorld("organizer", {

    start: () =>
        ipcRenderer.invoke("organizer:start"),

    stop: () =>
        ipcRenderer.invoke("organizer:stop"),

    organize: () =>
        ipcRenderer.invoke("organizer:organize"),

    chooseFolder: () =>
        ipcRenderer.invoke("organizer:choose-folder"),

    listFiles: (directory) =>
        ipcRenderer.invoke("organizer:list-files", directory),

    configure: (config) =>
        ipcRenderer.invoke("organizer:configure", config),

    getStatus: () =>
        ipcRenderer.invoke("organizer:status"),

    getActivity: () =>
        ipcRenderer.invoke("organizer:activity"),

    onEvent: (callback) => {

        ipcRenderer.on("organizer:event", (_, event) => {
            callback(event);
        });

    }

});