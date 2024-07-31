import type { ElectronAPI } from '@electron-toolkit/preload';

declare global {
    interface Window {
        electron: ElectronAPI;
        api: {
            getFromStorage: (key: string) => Promise<unknown>;
            setStorage: (key: string, value: unknown) => Promise<void>;
        };
    }
}
