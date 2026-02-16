const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is loading...');

// 렌더러 프로세스에서 사용할 수 있는 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  handleFileDrop: (filePath, type) => ipcRenderer.invoke('handle-file-drop', filePath, type),
  saveTempFile: (data, filename) => ipcRenderer.invoke('save-temp-file', data, filename)
});

console.log('electronAPI has been exposed to main world');