## How It Works:

### 1. Copy multiple lines at once.

Example line 1
Example line 2
Example line 3

### 2. Load lines in sequence to clipboard using shortcut keys.

**Prev:** `Ctrl + B`   
**Next:** `Ctrl + N`  


### 3. Click `Ctrl + V` to paste.
Paste 1: Example line 1
Paste 2: Example line 2
Paste 3: Example line 3


## How to Run the Project:

1. **Install the Dependencies**
    ```bash
    npm install

2. **Run the following commands for robotjs/electron NODE_MODULE_VERSION mismatch issue**
    
    robotjs with electron often requires rebuilding of the module according to your Nodejs version. It is only required while development and doing it once after npm install is enough.
   ```bash
   npm install --save-dev @electron/rebuild
   ./node_modules/.bin/electron-rebuild

4. **Run the Project**
    ```bash
    npm start

