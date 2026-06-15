# Fang Scripts Integration Guide

## How It Works

The scripts system allows you to run JavaScript files from your Electron app UI.

### Architecture:
- **HTML** → Buttons trigger script execution
- **renderer.js** → Handles UI clicks and displays output
- **preload.js** → Secure IPC bridge
- **main.js** → Loads and executes scripts
- **scripts/** → Folder containing all runnable scripts

---

## Adding New Scripts

### Step 1: Create a new file in the `scripts/` folder

Example: `scripts/my-script.js`

```javascript
module.exports = {
    execute: async () => {
        // Your script logic here
        return 'Output text to display';
    }
};
```

### Step 2: Add a button to `index.html`

```html
<button class="script-btn" data-script="my-script">📝 My Script</button>
```

The `data-script` attribute should match your filename (without `.js`)

### Step 3: Done! 

Click the button in the app and it will run your script.

---

## Script Examples

### Simple Output
```javascript
module.exports = {
    execute: async () => {
        return 'Hello World!';
    }
};
```

### Async Operations (with delays)
```javascript
module.exports = {
    execute: async () => {
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += `Step ${i + 1}\n`;
            await new Promise(r => setTimeout(r, 500)); // 500ms delay
        }
        return result;
    }
};
```

### Using Node.js APIs
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
    execute: async () => {
        const homeDir = os.homedir();
        return `Home directory: ${homeDir}`;
    }
};
```

### File Operations
```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
    execute: async () => {
        const scriptDir = path.dirname(__filename);
        const files = fs.readdirSync(scriptDir);
        return 'Scripts in folder:\n' + files.join('\n');
    }
};
```

---

## Current Example Scripts

1. **test-hello.js** - Simple greeting
2. **test-info.js** - Shows system information (OS, memory, CPU count)
3. **test-counter.js** - Demonstrates async operations

---

## Tips

- Scripts run in the Node.js context (not browser), so you have access to all Node APIs
- Keep outputs simple - they display as plain text
- Use `\n` for line breaks
- Async scripts work fine - use `await` for delays or async operations
- You can require other Node modules in your scripts
- The output appears in the green box with a timestamp

---

## Testing Your Setup

1. Run: `cd C:\playground\fang_electron_teste\fang_alpha && npm start`
2. Click the script buttons
3. See output in the green box
4. Try editing a script and see changes immediately (might need app reload)
