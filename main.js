const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
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

function getScriptsFolder(folderPath) {
    const defaultFolder = path.join(__dirname, 'scripts');
    return folderPath && folderPath.trim() !== '' ? folderPath : defaultFolder;
}

function ensureDirectory(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    return fs.statSync(folderPath).isDirectory();
}

function resolveScriptPath(folderPath, fileName) {
    const scriptsPath = getScriptsFolder(folderPath);
    const folderRoot = path.resolve(scriptsPath);
    const scriptPath = path.resolve(folderRoot, fileName);

    if (scriptPath !== folderRoot && !scriptPath.startsWith(folderRoot + path.sep)) {
        throw new Error('Invalid script path.');
    }

    return { scriptsPath, scriptPath };
}

function getRunCandidates(scriptPath) {
    const extension = path.extname(scriptPath).toLowerCase();
    const isWindows = process.platform === 'win32';

    if (extension === '.ps1') {
        return [
            { command: 'powershell.exe', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath] }
        ];
    }

    if (extension === '.bat' || extension === '.cmd') {
        return [
            { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', `"${scriptPath}"`] }
        ];
    }

    if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
        return [
            { command: 'node', args: [scriptPath] }
        ];
    }

    if (extension === '.py' || extension === '.pyw') {
        return isWindows
            ? [
                { command: 'py', args: ['-3', scriptPath] },
                { command: 'python', args: [scriptPath] }
            ]
            : [
                { command: 'python3', args: [scriptPath] },
                { command: 'python', args: [scriptPath] }
            ];
    }

    if (extension === '.exe' || extension === '.com') {
        return [{ command: scriptPath, args: [] }];
    }

    return isWindows
        ? [{ command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', `"${scriptPath}"`] }]
        : [{ command: scriptPath, args: [] }];
}

function runProcess(candidate, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(candidate.command, candidate.args, {
            cwd,
            windowsHide: true
        });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => {
            stdout += data.toString();
        });

        child.stderr.on('data', data => {
            stderr += data.toString();
        });

        child.on('error', reject);
        child.on('close', code => {
            const output = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n');
            resolve({ code, output });
        });
    });
}

async function runWithFallback(candidates, cwd) {
    let lastError = null;

    for (const candidate of candidates) {
        try {
            return await runProcess(candidate, cwd);
        } catch (error) {
            lastError = error;
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    throw lastError || new Error('No runner found for this file.');
}

// IPC Handler for running scripts
ipcMain.handle('run-script', async (event, fileName, folderPath) => {

    try {
        const { scriptsPath, scriptPath } = resolveScriptPath(folderPath, fileName);
        if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
            return { success: false, output: `Script not found: ${fileName}` };
        }

        const result = await runWithFallback(getRunCandidates(scriptPath), scriptsPath);
        const output = result.output || '(no output)';

        return {
            success: result.code === 0,
            output: result.code === 0 ? output : `${output}\nExit code: ${result.code}`.trim()
        };
    } catch (error) {
        return { success: false, output: `Error: ${error.message}` };
    }
});

ipcMain.handle('list-scripts', async (event, folderPath) => {
    const targetFolder = getScriptsFolder(folderPath);

    if (!fs.existsSync(targetFolder) || !fs.statSync(targetFolder).isDirectory()) {
        return [];
    }

    return fs.readdirSync(targetFolder)
        .filter(file => fs.statSync(path.join(targetFolder, file)).isFile())
        .sort((a, b) => a.localeCompare(b))
        .map(file => ({
            name: file,
            fileName: file,
            extension: path.extname(file).toLowerCase()
        }));
});

ipcMain.handle('select-script-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('add-script-files', async (event, folderPath) => {
    try {
        const targetFolder = getScriptsFolder(folderPath);

        if (!ensureDirectory(targetFolder)) {
            return { success: false, error: 'Script folder is not valid.' };
        }

        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections']
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const added = [];
        const skipped = [];

        for (const sourcePath of result.filePaths) {
            const fileName = path.basename(sourcePath);
            const destinationPath = path.join(targetFolder, fileName);

            try {
                if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
                    skipped.push(fileName);
                    continue;
                }

                fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
                added.push(fileName);
            } catch (error) {
                if (error.code === 'EEXIST') {
                    skipped.push(fileName);
                } else {
                    return { success: false, error: error.message };
                }
            }
        }

        return { success: true, added, skipped };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-script', async (event, fileName, folderPath) => {
    try {
        const { scriptPath } = resolveScriptPath(folderPath, fileName);

        if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
            return { success: false, error: `Script not found: ${fileName}` };
        }

        fs.rmSync(scriptPath, { force: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-script', async (event, folderPath, scriptName, scriptContent) => {
    const targetFolder = getScriptsFolder(folderPath);

    if (!fs.existsSync(targetFolder) || !fs.statSync(targetFolder).isDirectory()) {
        return { success: false, error: 'Script folder is not valid.' };
    }

    const safeName = scriptName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'new-script';
    const filePath = path.join(targetFolder, `${safeName}.js`);

    if (fs.existsSync(filePath)) {
        return { success: false, error: 'A script with that name already exists.' };
    }

    const template = scriptContent && scriptContent.trim() !== ''
        ? scriptContent
        : `console.log('This is the ${safeName} script.\\nEdit this file in the script folder to add behavior.');\n`;

    fs.writeFileSync(filePath, template.endsWith('\n') ? template : `${template}\n`, { encoding: 'utf8' });
    return { success: true, fileName: `${safeName}.js`, name: safeName };
});
