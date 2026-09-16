const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cursorUsage', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  enroll: (payload) => ipcRenderer.invoke('enroll', payload),
  sync: () => ipcRenderer.invoke('sync'),
  getMyUsage: () => ipcRenderer.invoke('get-my-usage'),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('set-open-at-login', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  fetchInstallSecret: (serverUrl) =>
    ipcRenderer.invoke('fetch-install-secret', serverUrl),
  onStatus: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('status', handler);
    return () => ipcRenderer.removeListener('status', handler);
  },
});
