const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runScript: (scriptName, folderPath) => ipcRenderer.invoke('run-script', scriptName, folderPath),
    listScripts: (folderPath) => ipcRenderer.invoke('list-scripts', folderPath),
    selectScriptFolder: () => ipcRenderer.invoke('select-script-folder'),
    addScriptFiles: (folderPath) => ipcRenderer.invoke('add-script-files', folderPath),
    deleteScript: (scriptName, folderPath) => ipcRenderer.invoke('delete-script', scriptName, folderPath),
    createScript: (folderPath, scriptName, scriptContent) => ipcRenderer.invoke('create-script', folderPath, scriptName, scriptContent)
});
