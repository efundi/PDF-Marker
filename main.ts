import {app, BrowserWindow, dialog, ipcMain, screen, shell} from 'electron';
import {autoUpdater} from 'electron-updater';
import * as path from 'path';
import * as url from 'url';
import {writeFile, writeFileSync} from "fs";
import {buffer} from "rxjs/operators";

// tslint:disable-next-line:one-variable-per-declaration
let mainWindow, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
const server = require('./dist/server');
const logger = require('electron-log');

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  const { autoUpdater } = require('electron-updater');

  // Create the browser window.
  mainWindow = new BrowserWindow({
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
    },
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    mainWindow.loadURL('http://localhost:4200');
  } else {
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
  mainWindow.on('closed', () => {
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
  app.on('ready', () => {

    if (process.platform === 'win32') {
      app.setAppUserModelId("za.ac.nwu.PDF-Marker"); // set appId from package.json or electron-builder.yml?
    }
    createWindow();

    mainWindow.webContents.on('did-finish-load', () => {
      autoUpdater.checkForUpdatesAndNotify();
    })
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createWindow();
    }
  });

  ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
    logger.log('app_version: ' + app.getVersion());
  });

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
    logger.log('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
    logger.log('update-downloaded');
  });

  ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', err => {
    logger.error('AutoUpdater error');
    logger.error(err);
  });

  ipcMain.on('get_app_version', (event) => {
    event.sender.send('on_get_app_version', { version: app.getVersion() });
  });

  ipcMain.on('open_external_link', (event, args) => {
    shell.openExternal(args.resource).then(() => {
      event.sender.send('on_open_external_link', { results: true });
    }).catch((reason) => {
      event.sender.send('on_error', reason);
    })
  });

  ipcMain.on('get_folder', (event) => {
    dialog.showOpenDialog(mainWindow, {
      title: "Select Folder",
      properties: ["openDirectory", "promptToCreate"]
    }).then((data) => {
      if(data.canceled)
        event.sender.send('on_get_folder', { selectedPath: null });
      else
        event.sender.send('on_get_folder', { selectedPath: data.filePaths[0] });
    }).catch((reason => {
      event.sender.send('on_error', reason);
    }));
  });

  ipcMain.on('get_file', (event, args) => {
    dialog.showOpenDialog(mainWindow, {
      title: "Select File",
      filters: [
        { name: args.name, extensions: args.extension }
      ],
      properties: ["openFile"]
    }).then((data) => {
      if(data.canceled)
        event.sender.send('on_get_file', { selectedPath: null });
      else
        event.sender.send('on_get_file', { selectedPath: data.filePaths[0] });
    }).catch((reason => {
      event.sender.send('on_error', reason);
    }));
  });

  ipcMain.on('save_file', async (event, args) => {
    const filePath: string = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: args.filename,
      title: "Save",
      filters: [
        { name: args.name, extensions: args.extension }
      ]
    });

    if(filePath) {
      try {
        writeFileSync(filePath, new Buffer(args.buffer));
        event.sender.send('on_save_file', { selectedPath: filePath });
      } catch (e) {
        event.sender.send('on_error', e.message);
      }
    } else {
      event.sender.send('on_save_file', { selectedPath: null });
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
