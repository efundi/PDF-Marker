import {app, BrowserWindow, dialog, ipcMain, screen, shell} from 'electron';
import {autoUpdater} from 'electron-updater';
import * as path from 'path';
import * as url from 'url';
import {writeFile, writeFileSync} from 'fs';
import {buffer} from 'rxjs/operators';

// tslint:disable-next-line:one-variable-per-declaration
let mainWindow, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
const server = require('./dist/server');
const logger = require('electron-log');
const excelParser = new (require('simple-excel-to-json').XlsParser)();

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
      app.setAppUserModelId('za.ac.nwu.PDF-Marker'); // set appId from package.json or electron-builder.yml?
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
      event.sender.send('on_open_external_link', { selectedPath: null, error: reason });
    });
  });

  ipcMain.on('get_folder', (event) => {
    dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder',
      properties: ['openDirectory', 'promptToCreate']
    }).then((data) => {
      if (data.canceled) {
        event.sender.send('on_get_folder', {selectedPath: null});
      } else {
        event.sender.send('on_get_folder', {selectedPath: data.filePaths[0]});
      }
    }).catch((reason => {
      event.sender.send('on_get_folder', { selectedPath: null, error: reason });
    }));
  });

  ipcMain.on('get_file', (event, args) => {
    dialog.showOpenDialog(mainWindow, {
      title: 'Select File',
      filters: [
        { name: args.name, extensions: args.extension }
      ],
      properties: ['openFile']
    }).then((data) => {
      if (data.canceled) {
        event.sender.send('on_get_file', {selectedPath: null});
      } else {
        event.sender.send('on_get_file', {selectedPath: data.filePaths[0]});
      }
    }).catch((reason => {
      event.sender.send('on_get_file', {selectedPath: null, error: reason });
    }));
  });

  // tslint:disable-next-line:no-shadowed-variable
  ipcMain.on('get_excel_to_json', (event, args) => {
    dialog.showOpenDialog(mainWindow, {
      title: 'Select File',
      filters: [
        { name: args.name, extensions: args.extension }
      ],
      properties: ['openFile']
    }).then(async (data) => {
      if (data.canceled) {
        event.sender.send('on_excel_to_json', {selectedPath: null, blob: null});
      } else {
        try {
          const doc = excelParser.parseXls2Json(data.filePaths[0], { isNested: true });
          const docInJSON = doc[0] || [];

          if (docInJSON.length === 0) {
            event.sender.send('on_excel_to_json', { selectedPath: null, error: { message: `No criteria(s) provided` } });
          } else {
            let rowCount = 4;
            const levelCount = 6;
            let errorMessage: string;
            let errorFound: boolean;
            let validLevelLength = 0;
            const startMessagePrefix = `Error[row = `;
            const startMessageSuffix = `]: `;
            const notProvided = `is not provided`;

            const rubric = {
              criterias: []
            };

            for (let index = 0; index < docInJSON.length; index++) {
              if (index > 1) {
                const criteriaData = docInJSON[index];

                errorMessage = '';
                errorFound = false;

                if (isBlank(criteriaData.Criterion_name)) {
                  errorMessage = joinError(errorMessage, `Criteria name ${notProvided}`);
                  errorFound = true;
                }

                if (isBlank(criteriaData.Criterion_description)) {
                  errorMessage = joinError(errorMessage, `Criteria description ${notProvided}`);
                  errorFound = true;
                }

                if (errorFound && index === 2) {
                  return event.sender.send('on_excel_to_json', { selectedPath: null, error: { message: errorMessage } });
                } else if (errorFound) {
                  return event.sender.send('on_excel_to_json', { selectedPath: data.filePaths[0], contents: JSON.stringify(rubric) });
                }

                const levels = [];

                for (let i = 1; ((validLevelLength === 0) ? levelCount : validLevelLength); i++) {
                  const achievementMark = 'Achievement_level_'  + i + '_mark';
                  const achievementFeedback = 'Achievement_level_'  + i + '_feedback';
                  const achievementTitle = 'Achievement_level_'  + i + '_title';

                  if (isBlank(criteriaData[achievementMark])) {
                    errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementMark} ${notProvided}`);
                    errorFound = true;
                  }

                  if (isNaN(criteriaData[achievementMark])) {
                    errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementMark} is not a valid number`);
                    errorFound = true;
                  }

                  criteriaData[achievementMark] = parseInt('' + criteriaData[achievementMark], 10);

                  if (isBlank(criteriaData[achievementTitle])) {
                    errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementTitle} ${notProvided}`);
                    errorFound = true;
                  }

                  if (isBlank(criteriaData[achievementFeedback])) {
                    errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementFeedback} ${notProvided}`);
                    errorFound = true;
                  }

                  if (errorFound && i === 1) {
                    return event.sender.send('on_excel_to_json', { selectedPath: null, error: { message: errorMessage } });
                  } else if (errorFound && i > 1) {
                    if (index === 2)
                      validLevelLength = i - 1;
                    break;
                  } else if ((index === 2) && (i === levelCount)) {
                    validLevelLength = levelCount;
                  }

                  levels[i - 1] = {
                    score: criteriaData[achievementMark],
                    description: criteriaData[achievementFeedback].trim(),
                    label: criteriaData[achievementTitle].trim()
                  };
                }

                if (index !== 2 && levels.length !== validLevelLength) {
                  errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix} The provided number of achievement levels do not match first row achievement levels`);
                  return event.sender.send('on_excel_to_json', { selectedPath: null, error: { message: errorMessage } });
                }

                rubric.criterias.push({
                  description: criteriaData.Criterion_description,
                  name: criteriaData.Criterion_name,
                  levels
                });

                rowCount++;
              }
            }

            if (rubric.criterias.length === 0) {
              event.sender.send('on_excel_to_json', { selectedPath: null, error: { message: `No criteria(s) provided` } });
            } else {
              event.sender.send('on_excel_to_json', { selectedPath: data.filePaths[0], contents: JSON.stringify(rubric) });
            }
          }
        } catch (reason) {
          event.sender.send('on_excel_to_json', { selectedPath: null, error: reason });
        }
      }
    }).catch((reason => {
      event.sender.send('on_excel_to_json', { selectedPath: null, error: reason });
    }));
  });

  ipcMain.on('save_file', (event, args) => {
    const filePath: string = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: args.filename,
      title: 'Save',
      filters: [
        { name: args.name, extensions: args.extension }
      ]
    });

    if (filePath) {
      try {
        writeFileSync(filePath, new Buffer(args.buffer));
        event.sender.send('on_save_file', { selectedPath: filePath });
      } catch (e) {
        event.sender.send('on_save_file', { selectedPath: null, error: e.message });
      }
    } else {
      event.sender.send('on_save_file', { selectedPath: null });
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}

function isBlank(data: string = '') {

  if (data === null || data === undefined) {
    return true;
  }

  data += '';
  return data === '' || data.trim() === '';
}

function joinError(currentMessage: string = '', newMessage: string = ''): string {
  currentMessage += (!isBlank(currentMessage)) ? `, ${newMessage}` : newMessage;
  return currentMessage;
}
