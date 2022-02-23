import {app, BrowserWindow, HandlerDetails, ipcMain, screen, shell} from 'electron';
import {autoUpdater} from 'electron-updater';
import * as path from 'path';
import {
  createAssignment,
  finalizeAssignment,
  finalizeAssignmentRubric,
  getAssignmentGlobalSettings,
  getAssignments,
  getAssignmentSettings,
  getGrades, getMarkedAssignmentsCount,
  getMarks,
  getPdfFile,
  rubricUpdate,
  saveMarks,
  saveRubricMarks,
  shareExport,
  updateAssignment,
  updateAssignmentSettings
} from './src-electron/ipc/assignment.handler';
import {
  deleteRubric,
  deleteRubricCheck,
  getRubric,
  getRubricNames,
  getRubrics,
  rubricUpload,
  selectRubricFile
} from './src-electron/ipc/rubric.handler';
import {toIpcResponse} from './src-electron/utils';
import {getZipEntries, importZip, isValidSakaiZip} from './src-electron/ipc/import.handler';
import {
  createWorkingFolder,
  deleteWorkspace,
  deleteWorkspaceCheck,
  getWorkspaces,
  moveWorkspaceAssignments,
  updateWorkspaceName
} from './src-electron/ipc/workspace.handler';
import {addComment, deleteComment, getComments} from './src-electron/ipc/comment.handler';
import {getConfig, updateConfig} from './src-electron/ipc/config.handler';
import {
  getFile,
  getFolder,
  getVersion,
  openExternalLink,
  saveFile
} from './src-electron/ipc/application.handler';
// tslint:disable-next-line:one-variable-per-declaration
let mainWindow, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

const logger = require('electron-log');

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
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
    mainWindow.loadFile(path.join(__dirname, 'dist/browser/index.html'));
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


    mainWindow.webContents.setWindowOpenHandler((details: HandlerDetails) => {
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
    ipcMain.handle('assignments:getPdfFile', toIpcResponse(getPdfFile));
    ipcMain.handle('assignments:getMarkedAssignmentsCount', toIpcResponse(getMarkedAssignmentsCount));

    // Rubric API
    ipcMain.handle('rubrics:selectRubricFile', toIpcResponse(selectRubricFile));
    ipcMain.handle('rubrics:rubricUpload', toIpcResponse(rubricUpload));
    ipcMain.handle('rubrics:getRubricNames', toIpcResponse(getRubricNames));
    ipcMain.handle('rubrics:deleteRubricCheck', toIpcResponse(deleteRubricCheck));
    ipcMain.handle('rubrics:deleteRubric', toIpcResponse(deleteRubric));
    ipcMain.handle('rubrics:getRubric', toIpcResponse(getRubric));
    ipcMain.handle('rubrics:getRubrics', toIpcResponse(getRubrics));

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

    // Config API
    ipcMain.handle('config:getConfig', toIpcResponse(getConfig));
    ipcMain.handle('config:updateConfig', toIpcResponse(updateConfig));


    // Application API
    ipcMain.handle('app:saveFile', toIpcResponse(saveFile));
    ipcMain.handle('app:version', toIpcResponse(getVersion));
    ipcMain.handle('app:getFolder', toIpcResponse(getFolder));
    ipcMain.handle('app:getFile', toIpcResponse(getFile));
    ipcMain.handle('app:openExternalLink', toIpcResponse(openExternalLink));


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
