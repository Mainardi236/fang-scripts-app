// Get DOM elements
const outputBox = document.getElementById('output');
const clearBtn = document.getElementById('clearBtn');
const scriptsContainer = document.getElementById('scriptsContainer');
const scriptsEmpty = document.getElementById('scriptsEmpty');
const addScriptBtn = document.getElementById('addScriptBtn');

const statusText = document.getElementById('statusText');
const scriptText = document.getElementById('scriptText');
const clockText = document.getElementById('clockText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const scriptFolderInput = document.getElementById('scriptFolderInput');
const browseFolderBtn = document.getElementById('browseFolderBtn');
const settingsNavItems = document.querySelectorAll('.settings-nav-item');
const sectionPanels = document.querySelectorAll('.section-panel');

const addScriptModal = document.getElementById('addScriptModal');
const addScriptBackdrop = document.getElementById('addScriptBackdrop');
const closeAddScriptBtn = document.getElementById('closeAddScriptBtn');
const cancelAddScriptBtn = document.getElementById('cancelAddScriptBtn');
const createScriptBtn = document.getElementById('createScriptBtn');
const newScriptNameInput = document.getElementById('newScriptNameInput');

let currentSettingsSection = 'appearance';

function updateSelectedSection(sectionName) {
    currentSettingsSection = sectionName;
    settingsNavItems.forEach(item => {
        const active = item.dataset.section === sectionName;
        item.classList.toggle('active', active);
    });
    sectionPanels.forEach(panel => {
        panel.style.display = panel.dataset.section === sectionName ? 'block' : 'none';
    });
}

function updateClock() {
    clockText.textContent = new Date().toLocaleTimeString();
}

function openSettings() {
    loadSettings();
    updateSelectedSection('script');
    document.body.classList.add('modal-open');
    settingsModal.classList.remove('modal-hidden');
    settingsModal.classList.add('modal-visible');
}

function closeSettings() {
    document.body.classList.remove('modal-open');
    settingsModal.classList.remove('modal-visible');
    settingsModal.classList.add('modal-hidden');
}

function openAddScript() {
    newScriptNameInput.value = '';
    document.body.classList.add('modal-open');
    addScriptModal.classList.remove('modal-hidden');
    addScriptModal.classList.add('modal-visible');
}

function closeAddScript() {
    document.body.classList.remove('modal-open');
    addScriptModal.classList.remove('modal-visible');
    addScriptModal.classList.add('modal-hidden');
}

function getConfiguredFolder() {
    const saved = localStorage.getItem('fangSettings');
    if (!saved) {
        return '';
    }
    try {
        const settings = JSON.parse(saved);
        return settings.scriptFolderPath || '';
    } catch {
        return '';
    }
}

function loadSettings() {
    const savedFolder = getConfiguredFolder();
    scriptFolderInput.value = savedFolder;
    updateSelectedSection(currentSettingsSection);
}

function saveSettings() {
    const settings = {
        scriptFolderPath: scriptFolderInput.value.trim()
    };
    localStorage.setItem('fangSettings', JSON.stringify(settings));
    statusText.textContent = 'Status: Settings saved';
    closeSettings();
    loadScriptList();
    setTimeout(() => {
        statusText.textContent = 'Status: Idle';
    }, 2000);
}

updateClock();
setInterval(updateClock, 1000);
loadScriptList();

settingsNavItems.forEach(item => {
    item.addEventListener('click', () => {
        updateSelectedSection(item.dataset.section);
    });
});

addScriptBtn.addEventListener('click', openAddScript);
closeAddScriptBtn.addEventListener('click', closeAddScript);
cancelAddScriptBtn.addEventListener('click', closeAddScript);
addScriptBackdrop.addEventListener('click', closeAddScript);
createScriptBtn.addEventListener('click', createScript);

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);
modalBackdrop.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveSettings);

browseFolderBtn.addEventListener('click', async () => {
    const folder = await window.electronAPI.selectScriptFolder();
    if (folder) {
        scriptFolderInput.value = folder;
    }
});

function renderScriptButtons(scripts) {
    scriptsContainer.innerHTML = '';
    if (!scripts.length) {
        scriptsEmpty.style.display = 'block';
        return;
    }
    scriptsEmpty.style.display = 'none';

    scripts.forEach(script => {
        const btn = document.createElement('button');
        btn.className = 'script-btn';
        btn.dataset.script = script.name;
        btn.textContent = `▶ ${script.name}`;
        btn.addEventListener('click', async () => {
            await runScript(script.name);
        });
        scriptsContainer.appendChild(btn);
    });
}

async function runScript(scriptName) {
    const originalText = null;
    const folderPath = getConfiguredFolder();
    statusText.textContent = 'Status: Running';
    scriptText.textContent = `Current script: ${scriptName}`;

    try {
        const result = await window.electronAPI.runScript(scriptName, folderPath);
        const timestamp = new Date().toLocaleTimeString();
        const output = `[${timestamp}] ${scriptName}\n${result.output}\n`;
        outputBox.textContent = output + outputBox.textContent;

        statusText.textContent = result.success ? 'Status: Completed' : 'Status: Error';
    } catch (error) {
        outputBox.textContent = `Error: ${error.message}\n` + outputBox.textContent;
        statusText.textContent = 'Status: Error';
    } finally {
        setTimeout(() => {
            if (statusText.textContent !== 'Status: Running') {
                statusText.textContent = 'Status: Idle';
                scriptText.textContent = 'Current script: none';
            }
        }, 3000);
    }
}

async function loadScriptList() {
    const folderPath = getConfiguredFolder();
    const scripts = await window.electronAPI.listScripts(folderPath);
    renderScriptButtons(scripts);
}

async function createScript() {
    const name = newScriptNameInput.value.trim();
    if (!name) {
        statusText.textContent = 'Status: Enter a script name.';
        return;
    }

    const folderPath = getConfiguredFolder();
    const result = await window.electronAPI.createScript(folderPath, name);
    if (result.success) {
        statusText.textContent = 'Status: Script created';
        closeAddScript();
        await loadScriptList();
    } else {
        statusText.textContent = `Status: ${result.error}`;
    }
    setTimeout(() => {
        statusText.textContent = 'Status: Idle';
    }, 3000);
}

// Handle clear button
clearBtn.addEventListener('click', () => {
    outputBox.textContent = 'Scripts output will appear here...';
});
