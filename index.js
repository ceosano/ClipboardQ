const { app, BrowserWindow, ipcMain, clipboard, Tray, Menu, globalShortcut } = require('electron');
const Store = require('electron-store');
const store = new Store();
const path = require('path');
var AutoLaunch = require('auto-launch');
const { autoUpdater } = require('electron-updater');


let win;
let tray = null;
let clipboardQueue = [];
let clipboardQueueLimit = 50; // limit to 100 items, you can change this to any desired value
let copiedHistory = []; // to store the last 10 copied items
const copiedHistoryLimit = 50; // limit to 10 items, you can change this to any desired value
let previousClip = '';  // to store the previous clipboard content
let overlay;
let overlayTimeout; // Declare this outside the showOverlay function


// When the app starts, retrieve stored shortcuts (if any):
backwardShortcutValue = store.get('backwardShortcut', 'CmdOrCtrl+B');
forwardShortcutValue = store.get('forwardShortcut', 'CmdOrCtrl+N');

autoUpdater.on('update-available', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Found Updates',
        message: 'Found updates, do you want download updates in background now?',
        buttons: ['Sure', 'No'],
      })
      .then((result) => {
        const buttonIndex = result.response;
        if (buttonIndex === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });
  
  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Install Updates',
        message: 'Updates downloaded, application will be quit for update...',
        buttons: ['Sure', 'No, Later'],
      })
      .then((result) => {
        const buttonIndex = result.response;
        if (buttonIndex === 0) {
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
  });
  
  autoUpdater.on('error', (err) => {
    dialog.showErrorBox('Error: ', err.message || err.toString());
  });

// set up auto launch on mac

if (process.platform === 'darwin') {
    var macAutoLauncher = new AutoLaunch({
        name: 'Clipboard Q',
        path: '/Applications/Clipboard Q.app',

    });

    macAutoLauncher.isEnabled().then(function (isEnabled) {
        if (isEnabled) return;
        macAutoLauncher.enable();
    }).catch(function (err) {
        // handle error
    });
}

if (process.platform === 'win32') {
    // set up auto launch on windows
    var winAutoLauncher = new AutoLaunch({
        name: 'Clipboard Q',
        path: 'C:\\Program Files\\Clipboard Q\\Clipboard Q.exe',

    });

    winAutoLauncher.isEnabled().then(function (isEnabled) {
        if (isEnabled) return;
        winAutoLauncher.enable();
    }).catch(function (err) {
        // handle error
    });
}

ipcMain.on('update-shortcuts', (event, data) => {

    // Unregister the old shortcuts
    globalShortcut.unregister(backwardShortcutValue);
    globalShortcut.unregister(forwardShortcutValue);

    // Update to new shortcuts
    backwardShortcutValue = data.backward || backwardShortcutValue;
    forwardShortcutValue = data.forward || forwardShortcutValue;
    win.webContents.send('shortcuts', {
        backward: backwardShortcutValue,
        forward: forwardShortcutValue
    });



    const ret = globalShortcut.register(backwardShortcutValue, () => {
        backwardShortcut();
    });

    const ret2 = globalShortcut.register(forwardShortcutValue, () => {
        forwardShortcut();
    });


    if (!ret || !ret2) {
        console.log('Registration of global shortcut failed.');
    }

    store.set('backwardShortcut', backwardShortcutValue);
    store.set('forwardShortcut', forwardShortcutValue);
});

function createOverlay() {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    overlay = new BrowserWindow({
        width: 300,
        height: 100,
        x: width - 310,
        y: 10,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        focusable: false,
        skipTaskbar: true,
        opacity: 0,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        },
        backgroundColor: '#000000',

    });

    overlay.setIgnoreMouseEvents(true);

    overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <script>
            const { ipcRenderer } = require('electron');
            
            ipcRenderer.on('update-content', (event, data) => {
                
                document.getElementById('content').textContent = data.content;
            });
        </script>
        <div id="title" style="font-family: Arial; color: white; text-align: center;padding-bottom:5px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="100px"  viewBox="0 0 1986 346" version="1.1"><path d="M 392.500 38.662 C 384.566 42.844, 380.569 49.581, 380.614 58.695 C 380.656 67.234, 384.355 73.268, 392.015 77.293 C 396.737 79.774, 398.366 80.122, 403.729 79.791 C 411.961 79.285, 417.410 75.638, 421.250 68.064 C 426.899 56.923, 422.929 44.575, 411.885 38.941 C 407.126 36.514, 396.855 36.365, 392.500 38.662 M 657.017 117.250 C 657.036 202.832, 657.013 202.371, 662.046 217 C 665.410 226.776, 672.580 240.529, 676.677 245.064 C 689.530 259.291, 710.316 270.602, 729.895 274.023 C 738.175 275.470, 755.799 275.487, 763.689 274.056 C 781.281 270.866, 796.537 262.414, 810.068 248.360 C 822.676 235.266, 829.190 223.669, 833.133 207.301 C 835.757 196.410, 836.040 177.095, 833.731 166.483 C 827.852 139.459, 809.983 116.384, 785.409 104.085 C 772.500 97.623, 762.489 95.700, 744.500 96.226 C 730.868 96.625, 728.634 96.959, 720 99.892 C 709.810 103.353, 699.289 109.353, 691.706 116.028 L 687 120.170 687 78.585 L 687 37 672 37 L 657 37 657.017 117.250 M 1508.761 78.057 L 1508.500 119.115 1501.500 113.496 C 1492.551 106.312, 1480.911 100.651, 1469.500 97.932 C 1457.224 95.007, 1434.251 95.532, 1423.500 98.983 C 1409.742 103.399, 1399.492 109.560, 1388.638 119.939 C 1375.364 132.633, 1366.365 148.630, 1362.800 165.870 C 1360.167 178.603, 1360.693 199.725, 1363.918 210.821 C 1367.963 224.734, 1374.980 236.701, 1385.855 248.229 C 1402.989 266.392, 1423.838 275.223, 1449.500 275.188 C 1470.057 275.160, 1486.178 270.418, 1502.230 259.678 C 1518.912 248.516, 1527.169 237.281, 1534.698 215.500 L 1538.500 204.500 1538.777 120.750 L 1539.055 37 1524.039 37 L 1509.022 37 1508.761 78.057 M 188 41.616 C 155.294 44.353, 131.544 54.415, 110.040 74.644 C 94.452 89.309, 82.986 108.052, 77.402 128 C 75.087 136.271, 74.683 139.893, 74.284 156 C 73.892 171.766, 74.117 175.922, 75.806 184.122 C 82.172 215.031, 102.455 243.498, 129.965 260.132 C 159.641 278.075, 204.681 281.993, 242 269.877 C 255.030 265.646, 270.195 256.983, 281.911 247.075 C 287.426 242.412, 299 229.596, 299 228.153 C 299 227.448, 279.540 212.424, 276.195 210.547 C 275.337 210.065, 271.964 212.753, 266.348 218.395 C 252.968 231.835, 239.959 239.529, 222.565 244.289 C 215.609 246.193, 212.093 246.486, 197 246.423 C 181.393 246.357, 178.440 246.064, 169.696 243.719 C 144.446 236.943, 124.220 221.256, 114.081 200.583 C 100.578 173.053, 103.382 136.882, 121.026 111 C 125.311 104.715, 137.351 92.828, 144 88.318 C 161.781 76.258, 185.611 70.444, 207.274 72.882 C 233.876 75.875, 253.345 86.204, 270.054 106.188 L 274.810 111.876 286.905 102.827 C 293.557 97.850, 299 93.480, 299 93.116 C 299 92.752, 296.087 88.864, 292.527 84.477 C 271.099 58.072, 240.057 43.313, 202.500 41.675 C 197 41.436, 190.475 41.409, 188 41.616 M 326 157.948 L 326 274.895 331.250 275.198 C 334.137 275.364, 340.887 275.358, 346.250 275.184 L 356 274.867 356 157.934 L 356 41 341 41 L 326 41 326 157.948 M 1749.500 43.584 C 1710.465 49.613, 1674.653 76.332, 1658.371 111.573 C 1652.739 123.762, 1649.906 136.365, 1649.281 152 C 1647.830 188.336, 1658.872 216.969, 1683.989 242 C 1698.251 256.214, 1712.692 265.189, 1730.576 270.955 C 1744.613 275.480, 1751.929 276.502, 1770 276.459 C 1792.170 276.407, 1806.525 273.266, 1823.434 264.768 L 1829.368 261.785 1831.127 264.143 C 1832.095 265.439, 1836.849 271.450, 1841.693 277.500 L 1850.500 288.500 1869.750 288.772 C 1887.449 289.021, 1891.313 288.548, 1888.046 286.528 C 1886.772 285.741, 1854 244.238, 1854 243.413 C 1854 243.058, 1856.557 240.007, 1859.682 236.634 C 1876.660 218.308, 1887.200 193.458, 1888.968 167.589 C 1891.610 128.929, 1878.166 97.062, 1848.114 70.744 C 1822.113 47.973, 1785.811 37.975, 1749.500 43.584 M 1752 74.424 C 1742.303 76.450, 1730.463 81.355, 1721.730 86.965 C 1703.718 98.537, 1692.301 113.396, 1684.824 135 C 1681.657 144.151, 1681.539 145.052, 1681.602 159.500 C 1681.659 172.797, 1681.971 175.500, 1684.346 183.307 C 1693.774 214.306, 1718.154 237.169, 1749.719 244.614 C 1757.871 246.536, 1776.757 246.769, 1785.889 245.058 C 1795.122 243.329, 1809.230 238.043, 1808.650 236.530 C 1808.106 235.112, 1764.947 179.814, 1761.365 175.945 C 1760.064 174.540, 1759 173.078, 1759 172.695 C 1759 172.313, 1767.498 172, 1777.884 172 L 1796.768 172 1814.978 195 C 1824.994 207.650, 1833.590 218, 1834.080 218 C 1835.934 218, 1844.283 206.149, 1848.523 197.500 C 1855.228 183.824, 1857.452 173.489, 1857.347 156.500 C 1857.214 134.852, 1853.186 122.770, 1841.132 107.861 C 1829.532 93.515, 1813.343 82.739, 1794 76.488 C 1786.822 74.169, 1783.400 73.689, 1772 73.404 C 1763.214 73.184, 1756.230 73.540, 1752 74.424 M 523 97.174 C 514.386 98.402, 499.999 103.283, 492.263 107.601 C 484.404 111.989, 472.579 121.346, 467.629 127.094 C 463.154 132.290, 456.094 146.416, 452.651 157.062 C 448.029 171.358, 447.879 174.706, 448.199 257 L 448.500 334.500 463.250 334.777 L 478 335.053 478 293.527 C 478 270.687, 478.380 252, 478.845 252 C 479.310 252, 480.547 252.953, 481.595 254.119 C 487.746 260.960, 504.754 270.251, 517 273.461 C 527.687 276.262, 545.675 276.576, 557.319 274.165 C 588.551 267.697, 615.546 241.586, 624.170 209.500 C 627.120 198.528, 627.359 173.939, 624.618 163.500 C 615.575 129.065, 585.490 101.662, 551.678 97.064 C 542.569 95.825, 532.179 95.865, 523 97.174 M 929.897 97.504 C 897.535 103.953, 869.678 132.801, 862.588 167.208 C 859.307 183.133, 861.031 204.621, 866.744 219 C 879.436 250.942, 907.163 272.019, 940.261 274.887 C 968.767 277.357, 993.181 269.317, 1011.118 251.552 C 1029.977 232.874, 1038.955 211.660, 1038.987 185.708 C 1039.017 161.320, 1031.055 140.903, 1014.697 123.420 C 1001.934 109.778, 986.824 101.084, 969.792 97.584 C 960.426 95.659, 939.366 95.617, 929.897 97.504 M 1129.500 97.587 C 1110.112 101.841, 1091.489 114.153, 1079.039 130.947 C 1057.189 160.422, 1055.135 201.362, 1073.920 232.982 C 1082.450 247.340, 1099.374 262.386, 1113.783 268.422 C 1143.305 280.787, 1180.879 275.280, 1202.889 255.363 L 1209 249.832 1209 262.807 L 1209 275.781 1212.250 276.141 C 1214.037 276.338, 1220.900 276.275, 1227.500 276 L 1239.500 275.500 1239.500 223.500 C 1239.500 172.873, 1239.441 171.276, 1237.264 163 C 1232.700 145.646, 1222.002 128.569, 1208.242 116.670 C 1199.263 108.905, 1190.187 103.707, 1178.851 99.837 C 1170.048 96.832, 1168.532 96.627, 1153 96.348 C 1140.925 96.131, 1134.623 96.463, 1129.500 97.587 M 1325.041 99.675 C 1316.128 101.556, 1301.541 109.753, 1292.948 117.709 C 1284.900 125.159, 1279.070 133.493, 1273.057 146.138 C 1264.016 165.153, 1264 165.292, 1264 223.917 L 1264 275 1278.891 275 L 1293.782 275 1294.298 227.250 C 1294.940 167.709, 1295.540 163.807, 1306.377 148.620 C 1315.332 136.071, 1325.403 129.252, 1333.400 130.323 C 1335.655 130.625, 1338.427 131.156, 1339.560 131.503 C 1341.331 132.045, 1342.627 130.499, 1348.810 120.464 C 1352.764 114.045, 1356 108.368, 1356 107.848 C 1356 107.327, 1352.600 105.287, 1348.444 103.313 C 1340.870 99.716, 1331.642 98.282, 1325.041 99.675 M 387.667 103.667 C 387.300 104.033, 387 142.733, 387 189.667 L 387 275 402 275 L 417 275 417 189 L 417 103 402.667 103 C 394.783 103, 388.033 103.300, 387.667 103.667 M 730.109 125.581 C 708.733 131.330, 693.040 146.960, 687.441 168.080 C 685.203 176.523, 685.169 192.385, 687.372 201 C 690.251 212.260, 694.562 219.653, 703.417 228.509 C 716.183 241.276, 727.463 246, 745.184 246 C 756.311 246, 763.898 244.214, 772.929 239.468 C 785.887 232.659, 796.046 220.943, 801.636 206.361 C 804.844 197.993, 805.950 182.505, 804.034 172.769 C 799.637 150.418, 781.767 131.140, 760.284 125.574 C 752.730 123.616, 737.402 123.620, 730.109 125.581 M 1435.899 125.448 C 1414.419 131.372, 1397.694 149.094, 1392.439 171.500 C 1390.326 180.508, 1390.959 194.918, 1393.866 204 C 1399.662 222.105, 1414.196 237.160, 1431.873 243.370 C 1438.887 245.834, 1456.230 246.717, 1464.380 245.025 C 1484.321 240.885, 1502.258 223.646, 1508.628 202.500 C 1510.810 195.254, 1511.099 174.967, 1509.119 168 C 1503.335 147.651, 1488.240 132.400, 1467.645 126.098 C 1459.690 123.663, 1443.566 123.333, 1435.899 125.448 M 525.490 126.016 C 503.985 130.292, 486.177 146.408, 479.401 167.726 C 476.920 175.532, 476.436 192.368, 478.435 201.351 C 483.162 222.598, 497.715 238.094, 520 245.608 C 528.501 248.475, 545.271 248.230, 554.828 245.100 C 588.201 234.167, 605.680 195.332, 591.958 162.604 C 586.051 148.516, 574.231 136.165, 561.008 130.262 C 550.952 125.774, 535.812 123.964, 525.490 126.016 M 937 126.516 C 916.792 131.473, 900.305 147.322, 893.844 168 C 890.727 177.974, 890.674 195.283, 893.733 204.674 C 898.906 220.560, 909.784 233.741, 923.022 240.165 C 933.019 245.016, 939.628 246.479, 951.028 246.366 C 967.463 246.202, 979.868 241.124, 991.010 230 C 1011.572 209.471, 1014.751 176.445, 998.516 152.025 C 984.692 131.230, 959.822 120.917, 937 126.516 M 1137.276 126.445 C 1117.691 130.911, 1099.454 148.725, 1093.792 168.921 C 1091.451 177.271, 1091.306 194.034, 1093.502 202.396 C 1100.213 227.948, 1122.628 246.043, 1147.810 246.236 C 1169.439 246.402, 1189.825 234.536, 1199.343 216.239 C 1203.905 207.470, 1208.005 191.994, 1207.985 183.622 C 1207.928 160.117, 1191.642 136.825, 1169.377 128.406 C 1160.800 125.162, 1146.682 124.299, 1137.276 126.445" stroke="none" fill="#FFFFFF" fill-rule="evenodd"/></svg>
        </div>
        <div id="content" style="font-family: Arial; 
     overflow: hidden; text-overflow: ellipsis;
        color: black; text-align: center; padding: 15px;
            background-color: rgba(255, 255, 255, 0.6);
            height: 30px;
            font-family: monospace;"></div>
    `)}`);
}


function showOverlay(content) {
    const displayContent = content.split('\n').join(' ').substring(0, 50) + (content.length > 50 ? '...' : '');

    if (overlayTimeout) {
        clearTimeout(overlayTimeout);
    }

    if (!overlay) {
        createOverlay();
    }

    overlay.webContents.send('update-content', {
        title: 'Clipboard Q',
        content: displayContent
    });

    overlay.setOpacity(1); // Make the overlay visible

    overlayTimeout = setTimeout(() => {
        if (overlay) overlay.setOpacity(0);  // Make the overlay transparent
    }, 3000);
}

function forwardShortcut() {
    if (clipboardQueue.length > 0) {
        const textToPaste = clipboardQueue.shift();
        clipboard.writeText(textToPaste);
        copiedHistory.unshift(previousClip);
        previousClip = textToPaste;
        clipboard.writeText(textToPaste);
        showOverlay(textToPaste);

        // if there is an item in the queue, 
        while (clipboardQueue.length > clipboardQueueLimit) {
            clipboardQueue.pop();
        }



    } else {
        showOverlay(clipboard.readText());

    }
}
function backwardShortcut() {
    if (copiedHistory.length > 0) {
        // go back in clipboard history
        const textToPaste = copiedHistory.shift();
        clipboardQueue.unshift(previousClip);
        previousClip = textToPaste;
        clipboard.writeText(textToPaste);
        showOverlay(textToPaste);
        // if there is an item in the queue, 
        while (clipboardQueue.length > clipboardQueueLimit) {
            clipboardQueue.pop();
        }

    } else {
        showOverlay(clipboard.readText());

    }
}


function createWindow() {
    // on mac make title bar hidden and on windows make it visible
    let titleBarStyle = 'hidden';
    if (process.platform === 'win32') {
        // just show close button

    }

    win = new BrowserWindow({
        width: 600,
        height: 500,
        // dont allow resizing or zooming
        resizable: false,
        zoomable: false,
        // make the tite bar draggable
        titleBarStyle: titleBarStyle,
        titleBarOverlay: true,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        },
    });



    win.loadFile('index.html');

    win.on('close', (e) => {
        e.preventDefault();
        win.hide();
    });

    win.on('ready-to-show', () => {
          autoUpdater.checkForUpdatesAndNotify();
      });
}

function setupTray() {
    // if platform is darwin, then create a tray icon
    if (process.platform == 'darwin') {
        const iconPath = path.join(__dirname, 'assets', 'iconTemplate@2x.png');
        tray = new Tray(iconPath);
    } else {
        // load in .ico file
        const iconPath = path.join(__dirname, 'assets', 'favicon.ico');
        tray = new Tray(iconPath);
    }

    // when the tray icon is clicked, show the window
    tray.on('click', () => {
        win.show();
    });

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click: () => {
                win.show();
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.exit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Clipboard Queue');

}
app.whenReady().then(() => {
    if (process.platform === 'darwin') {  // Ensure the app is running on macOS
        app.dock.hide();
        // when the dock icon is clicked, show the window
        app.on('activate', () => {
            win.show();
        }
        );
    }
    if (!overlay) {
        createOverlay();
    }

    // after the window is created, setup the tray
    createWindow();
    setupTray();

    // Global shortcut registration

    const ret = globalShortcut.register(backwardShortcutValue, () => {
        backwardShortcut();

    });

    const ret2 = globalShortcut.register(forwardShortcutValue, () => {
        forwardShortcut();

    });

    win.webContents.send('shortcuts', {
        backward: backwardShortcutValue,
        forward: forwardShortcutValue
    });

    // Clipboard polling mechanism
    setInterval(() => {
        const currentClip = clipboard.readText();
        if (currentClip !== previousClip) {
            copiedHistory.unshift(previousClip);
            previousClip = currentClip;

            // if there is an item in the queue, 
            if (copiedHistory.length > copiedHistoryLimit) {
                copiedHistory.pop();
            }
        }
    }, 100);  // Check every second

    if (!ret) {
        console.log('Registration of global shortcut failed.');
    }
    if (!ret2) {
        console.log('Registration of global shortcut failed.');
    }

});

app.on('will-quit', () => {
    // Cleanup: Unregister global shortcuts
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
    e.preventDefault(); // Prevent the app from quitting completely
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('set-queue', (event, data) => {
    clipboardQueue = data.split('\n');
});


// ... other main process code ...

ipcMain.on('get-shortcuts', (event) => {
    // assuming you have a function or way to get the current shortcuts
    // const shortcuts = getCurrentShortcuts();
    win.webContents.send('shortcuts', {
        backward: backwardShortcutValue,
        forward: forwardShortcutValue
    });
});