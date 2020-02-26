"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
var electron_updater_1 = require("electron-updater");
var path = require("path");
var url = require("url");
// tslint:disable-next-line:one-variable-per-declaration
var mainWindow, serve;
var args = process.argv.slice(1);
serve = args.some(function (val) { return val === '--serve'; });
var server = require('./dist/server');
var logger = require('electron-log');
function createWindow() {
    var electronScreen = electron_1.screen;
    var size = electronScreen.getPrimaryDisplay().workAreaSize;
    var autoUpdater = require('electron-updater').autoUpdater;
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        x: 0,
        y: 0,
        // fullscreen: true,
        // title: PRODUCT_NAME,
        // icon: ctx.locations.icon,
        // show: false,
        // autoHideMenuBar: true,
        width: size.width,
        height: size.height,
        webPreferences: {
            nodeIntegration: true
        }
    });
    if (serve) {
        require('electron-reload')(__dirname, {
            electron: require(__dirname + "/node_modules/electron")
        });
        mainWindow.loadURL('http://localhost:4200');
    }
    else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'dist/browser/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    }
    if (serve) {
        mainWindow.webContents.openDevTools();
    }
    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}
try {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    electron_1.app.on('ready', function () {
        if (process.platform === 'win32') {
            electron_1.app.setAppUserModelId("za.ac.nwu.PDF-Marker"); // set appId from package.json or electron-builder.yml?
        }
        createWindow();
        mainWindow.webContents.on('did-finish-load', function () {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
        });
    });
    // Quit when all windows are closed.
    electron_1.app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) {
            createWindow();
        }
    });
    electron_1.ipcMain.on('app_version', function (event) {
        event.sender.send('app_version', { version: electron_1.app.getVersion() });
        logger.log('app_version: ' + electron_1.app.getVersion());
    });
    electron_updater_1.autoUpdater.on('update-available', function () {
        mainWindow.webContents.send('update_available');
        logger.log('update-available');
    });
    electron_updater_1.autoUpdater.on('update-downloaded', function () {
        mainWindow.webContents.send('update_downloaded');
        logger.log('update-downloaded');
    });
    electron_1.ipcMain.on('restart_app', function () {
        electron_updater_1.autoUpdater.quitAndInstall();
    });
    electron_updater_1.autoUpdater.on('error', function (err) {
        logger.error('AutoUpdater error');
        logger.error(err);
    });
    electron_1.ipcMain.on('get_app_version', function (event) {
        event.sender.send('on_get_app_version', { version: electron_1.app.getVersion() });
    });
}
catch (e) {
    // Catch Error
    // throw e;
}
