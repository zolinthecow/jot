import path from 'node:path';
import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';
import storage from 'electron-json-storage';

const getConfigFile = async (): Promise<string> => {
    const userDataPath =
        await electronAPI.ipcRenderer.invoke('get-user-data-path');
    const CONFIG_DIR = path.join(userDataPath, '.myapp');
    const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
    return CONFIG_FILE;
};

const getFromStorage = async (key: string): Promise<unknown> => {
    const CONFIG_FILE = await getConfigFile();
    storage.setDataPath(CONFIG_FILE);
    return storage.getSync(key);
};
const setStorage = async (key: string, value: unknown): Promise<void> => {
    const CONFIG_FILE = await getConfigFile();
    storage.setDataPath(CONFIG_FILE);
    storage.set(key, value as object, (err) => {
        if (err) {
            throw err;
        }
    });
};
// Custom APIs for renderer

const api = {
    getFromStorage,
    setStorage,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI);
        contextBridge.exposeInMainWorld('api', api);
    } catch (error) {
        console.error(error);
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI;
    // @ts-ignore (define in dts)
    window.api = api;
}
