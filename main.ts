import {app, BrowserWindow, dialog, ipcMain, screen, shell, HandlerDetails} from 'electron';
import {autoUpdater} from 'electron-updater';
import * as path from 'path';
import * as url from 'url';
import {
  createAssignment, finalizeAssignment, finalizeAssignmentRubric, getAssignmentGlobalSettings,
  getAssignments,
  getAssignmentSettings, getGrades,
  getMarks, rubricUpdate,
  saveMarks,
  saveRubricMarks, shareExport, updateAssignment, updateAssignmentSettings
} from './src-electron/ipc/assignments/assignment.handler';
import {writeFile} from 'fs/promises';
import {stat, statSync} from 'fs';
import {
  deleteRubric,
  deleteRubricCheck, getRubric,
  getRubricNames,
  rubricUpload,
  selectRubricFile
} from './src-electron/ipc/rubrics/rubric.handler';
import {joinError, toIpcResponse} from './src-electron/utils';
import {getZipEntries, importZip, isValidSakaiZip} from './src-electron/ipc/import/import.handler';
import {AppSelectedPathInfo} from './src/shared/info-objects/app-selected-path.info';
import {basename, extname} from 'path';
import {
  createWorkingFolder, deleteWorkspace, deleteWorkspaceCheck, getWorkspaces,
  moveWorkspaceAssignments,
  updateWorkspaceName
} from "./src-electron/ipc/workspace/workspace.handler";
import {addComment, deleteComment, getComments} from "./src-electron/ipc/comment/comment.handler";
// tslint:disable-next-line:one-variable-per-declaration
let mainWindow, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

// Import the express server which will start up automatically
const server = require('./dist/server');
const logger = require('electron-log');
const excelParser = new (require('simple-excel-to-json').XlsParser)();

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (serve) {
    // require('electron-reload')(__dirname, {
    //   electron: require(`${__dirname}/node_modules/electron`)
    // });
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
  app.whenReady().then(() => {

    if (process.platform === 'win32') {
      app.setAppUserModelId('za.ac.nwu.PDF-Marker'); // set appId from package.json or electron-builder.yml?
    }
    createWindow();

    mainWindow.webContents.on('did-finish-load', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });


    mainWindow.webContents.setWindowOpenHandler(( details: HandlerDetails) => {
      // For now we assume all links are external
      shell.openExternal(details.url);
      return {
        action: 'deny'
      };
    });

    // Assignment API
    ipcMain.handle('assignments:get', toIpcResponse(getAssignments));
    ipcMain.handle('assignments:update', toIpcResponse(updateAssignment));
    ipcMain.handle('assignments:create', toIpcResponse(createAssignment));
    ipcMain.handle('assignments:saveMarks', toIpcResponse(saveMarks));
    ipcMain.handle('assignments:saveRubricMarks', toIpcResponse(saveRubricMarks));
    ipcMain.handle('assignments:finalizeAssignment', toIpcResponse(finalizeAssignment));
    ipcMain.handle('assignments:finalizeAssignmentRubric', toIpcResponse(finalizeAssignmentRubric));
    ipcMain.handle('assignments:getAssignmentSettings', toIpcResponse(getAssignmentSettings));
    ipcMain.handle('assignments:getAssignmentGlobalSettings', toIpcResponse(getAssignmentGlobalSettings));
    ipcMain.handle('assignments:updateAssignmentSettings', toIpcResponse(updateAssignmentSettings));
    ipcMain.handle('assignments:shareExport', toIpcResponse(shareExport));
    ipcMain.handle('assignments:getMarks', toIpcResponse(getMarks));
    ipcMain.handle('assignments:getGrades', toIpcResponse(getGrades));
    ipcMain.handle('assignments:rubricUpdate', toIpcResponse(rubricUpdate));

    // Rubric API
    ipcMain.handle('rubrics:selectRubricFile', toIpcResponse(selectRubricFile));
    ipcMain.handle('rubrics:rubricUpload', toIpcResponse(rubricUpload));
    ipcMain.handle('rubrics:getRubricNames', toIpcResponse(getRubricNames));
    ipcMain.handle('rubrics:deleteRubricCheck', toIpcResponse(deleteRubricCheck));
    ipcMain.handle('rubrics:deleteRubric', toIpcResponse(deleteRubric));
    ipcMain.handle('rubrics:getRubric', toIpcResponse(getRubric));

    // Import API
    ipcMain.handle('import:importZip', toIpcResponse(importZip));
    ipcMain.handle('import:isValidSakaiZip', toIpcResponse(isValidSakaiZip));
    ipcMain.handle('import:getZipEntries', toIpcResponse(getZipEntries));

    // Workspace API
    ipcMain.handle('workspace:moveWorkspaceAssignments', toIpcResponse(moveWorkspaceAssignments));
    ipcMain.handle('workspace:updateWorkspaceName', toIpcResponse(updateWorkspaceName));
    ipcMain.handle('workspace:createWorkingFolder', toIpcResponse(createWorkingFolder));
    ipcMain.handle('workspace:getWorkspaces', toIpcResponse(getWorkspaces));
    ipcMain.handle('workspace:deleteWorkspace', toIpcResponse(deleteWorkspace));
    ipcMain.handle('workspace:deleteWorkspaceCheck', toIpcResponse(deleteWorkspaceCheck));

    // Comments API
    ipcMain.handle('comments:getComments', toIpcResponse(getComments));
    ipcMain.handle('comments:deleteComment', toIpcResponse(deleteComment));
    ipcMain.handle('comments:addComment', toIpcResponse(addComment));

    ipcMain.handle('app:version', () => {
      return { version: app.getVersion() };
    });
    ipcMain.handle('app:get_folder', (event) => {
      return dialog.showOpenDialog(mainWindow, {
        title: 'Select Folder',
        properties: ['openDirectory', 'promptToCreate']
      }).then((data) => {
        if (data.canceled) {
          return {selectedPath: null};
        } else {
          return {selectedPath: data.filePaths[0]};
        }
      }, (reason) => {
        return {selectedPath: null, error: reason};
      });
    });


      ipcMain.handle('app:get_file', (event, fileArgs) => {
        return dialog.showOpenDialog(mainWindow, {
          title: 'Select File',
          filters: [
            { name: fileArgs.name, extensions: fileArgs.extension }
          ],
          properties: ['openFile']
        }).then((data) => {
          if (data.canceled) {
           return {selectedPath: null};
          } else {
            return {
              selectedPath: data.filePaths[0],
              fileName: basename(data.filePaths[0], extname(data.filePaths[0])),
              ext: extname(data.filePaths[0]),
              basename: basename(data.filePaths[0]),
              info: statSync(data.filePaths[0])
            } as AppSelectedPathInfo;
          }
        }, (reason => {
          // TODO instead return a rejected promise
          return {selectedPath: null, error: reason };
        }));
      });


    // tslint:disable-next-line:no-shadowed-variable
    ipcMain.handle('app:get_excel_to_json', (event, args) => {
      return dialog.showOpenDialog(mainWindow, {
        title: 'Select File',
        filters: [
          { name: args.name, extensions: args.extension }
        ],
        properties: ['openFile']
      }).then(async (data) => {
        if (data.canceled) {
          return{selectedPath: null, blob: null};
        } else {
          try {
            const doc = excelParser.parseXls2Json(data.filePaths[0], { isNested: true });
            const docInJSON = doc[0] || [];

            if (docInJSON.length === 0) {
             return { selectedPath: null, error: { message: `No criteria(s) provided` } };
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
                    return { selectedPath: null, error: { message: errorMessage } };
                  } else if (errorFound) {
                    return { selectedPath: data.filePaths[0], contents: JSON.stringify(rubric) };
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
                      return{ selectedPath: null, error: { message: errorMessage } };
                    } else if (errorFound && i > 1) {
                      if (index === 2) {
                        validLevelLength = i - 1;
                      }
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
                    return { selectedPath: null, error: { message: errorMessage } };
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
                return{ selectedPath: null, error: { message: `No criteria(s) provided` } };
              } else {
                return { selectedPath: data.filePaths[0], contents: JSON.stringify(rubric) };
              }
            }
          } catch (reason) {
            return { selectedPath: null, error: reason };
          }
        }
      }, reason => {
        return { selectedPath: null, error: reason };
      });
    });

    ipcMain.handle('app:save_file', (event, args) => {
      return dialog.showSaveDialog(mainWindow, {
        defaultPath: args.filename,
        title: 'Save',
        filters: [
          { name: args.name, extensions: args.extension }
        ]
      }).then(({filePath}) => {
        if (filePath) {
          try {
            return writeFile(filePath, new Buffer(args.buffer))
              .then(() => {
                return { selectedPath: filePath };
              });
          } catch (e) {
            return{ selectedPath: null, error: e.message };
          }
        } else {
          return{ selectedPath: null };
        }
      });
    });


    ipcMain.handle('app:open_external_link', (event, args) => {
      return shell.openExternal(args.resource).then(() => {
       return{ results: true };
      }, (reason) => {
        return { selectedPath: null, error: reason };
      });
    });

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
