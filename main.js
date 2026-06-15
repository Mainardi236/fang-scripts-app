const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// IPC Handler for running scripts
ipcMain.handle('run-script', async (event, scriptName, folderPath) => {
    const defaultFolder = path.join(__dirname, 'scripts');
    const scriptsPath = folderPath && folderPath.trim() !== '' ? folderPath : defaultFolder;
    const scriptPath = path.join(scriptsPath, scriptName + '.js');

    try {
        if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
            return { success: false, output: `Script not found: ${scriptName}` };
        }

        delete require.cache[require.resolve(scriptPath)];
        const script = require(scriptPath);
        const result = await script.execute();
        return { success: true, output: result };
    } catch (error) {
        return { success: false, output: `Error: ${error.message}` };
    }
});

ipcMain.handle('list-scripts', async (event, folderPath) => {
    const defaultFolder = path.join(__dirname, 'scripts');
    const targetFolder = folderPath && folderPath.trim() !== '' ? folderPath : defaultFolder;

    if (!fs.existsSync(targetFolder) || !fs.statSync(targetFolder).isDirectory()) {
        return [];
    }

    return fs.readdirSync(targetFolder)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
            name: path.basename(file, '.js'),
            fileName: file
        }));
});

ipcMain.handle('select-script-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('create-script', async (event, folderPath, scriptName) => {
    const defaultFolder = path.join(__dirname, 'scripts');
    const targetFolder = folderPath && folderPath.trim() !== '' ? folderPath : defaultFolder;

    if (!fs.existsSync(targetFolder) || !fs.statSync(targetFolder).isDirectory()) {
        return { success: false, error: 'Script folder is not valid.' };
    }

    const safeName = scriptName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'new-script';
    const filePath = path.join(targetFolder, `${safeName}.js`);

    if (fs.existsSync(filePath)) {
        return { success: false, error: 'A script with that name already exists.' };
    }

    const template = `module.exports = {
    execute: async () => {
        return 'This is the ${safeName} script.\nEdit this file in the script folder to add behavior.';
    }
};\n`;

    fs.writeFileSync(filePath, template, { encoding: 'utf8' });
    return { success: true, fileName: `${safeName}.js`, name: safeName };
});