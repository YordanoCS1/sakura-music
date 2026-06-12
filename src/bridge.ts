declare global {
  interface Window {
    electronAPI: {
      invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      on: (event: string, cb: (data: unknown) => void) => () => void;
      send: (channel: string, data?: unknown) => void;
      off: (event: string) => void;
      platform: string;
      homeDir: string;
      musicDir: string;
    };
  }
}

const api = window.electronAPI;

const noop = () => Promise.reject(new Error('electronAPI not available'));

export const invoke = <T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  api ? api.invoke<T>(cmd, args) : (noop() as Promise<T>);

export const listen = (event: string, cb: (data: unknown) => void): (() => void) =>
  api.on(event, cb);

export const openFolder = (): Promise<string | null> =>
  invoke('dialog:openFolder');

export const confirm = (message: string, title?: string): Promise<boolean> =>
  invoke('dialog:confirm', { message, title });

export const openPath = (path: string): Promise<void> =>
  invoke('shell:openPath', { path });

export const showInFolder = (path: string): Promise<void> =>
  invoke('shell:showItemInFolder', { path });

export const trashItem = (path: string): Promise<void> =>
  invoke('shell:trashItem', { path });

export const windowControls = {
  minimize: () => invoke('window:minimize'),
  maximize: () => invoke('window:maximize'),
  close: () => invoke('window:close'),
  isMaximized: () => invoke('window:isMaximized'),
};

export const platform = api?.platform || 'win32';
export const homeDir = api?.homeDir || 'C:\\Users\\default';
export const musicDir = api?.musicDir || 'C:\\Users\\default\\Music';