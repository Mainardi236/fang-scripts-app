const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runScript: (scriptName, folderPath) => ipcRenderer.invoke('run-script', scriptName, folderPath),
    listScripts: (folderPath) => ipcRenderer.invoke('list-scripts', folderPath),
    selectScriptFolder: () => ipcRenderer.invoke('select-script-folder'),
    createScript: (folderPath, scriptName) => ipcRenderer.invoke('create-script', folderPath, scriptName)
});
