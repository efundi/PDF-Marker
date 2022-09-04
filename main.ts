import {app, BrowserWindow, HandlerDetails, ipcMain, Menu, MenuItemConstructorOptions, screen, shell} from 'electron';
import {autoUpdater} from 'electron-updater';
import {
  createAssignment,
  finalizeAssignment,
  getAssignments,
  getAssignmentSettings,
  getMarks,
  getPdfFile,
  updateAssignmentRubric,
  saveMarks,
  updateAssignment,
  updateAssignmentSettings,
  generateAllocationZipFiles,
  isMarkerAllocated,
  handleExportAssignment
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
import {
  getZipEntries,
  importZip,
  lectureImport,
  validateLectureImport,
  validateZipFile
} from './src-electron/ipc/import.handler';
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
import {checkForUpdates, downloadUpdate} from './src-electron/ipc/update.handler';
import {runSettingsMigration} from './src-electron/migration/settings.migration';
import {migrateAssignmentSettings} from './src-electron/migration/assignment.migration';
import {migrateMarks} from './src-electron/migration/marks.migration';
import { join } from 'path';
import {generateGenericZip, generateAssignment, markAll, markSome} from './src-electron/ipc/generate.handler';
// tslint:disable-next-line:one-variable-per-declaration
let mainWindow, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

const logger = require('electron-log');

// Only auto download for full (non pre-releases)
autoUpdater.autoDownload = !autoUpdater.allowPrerelease;

runSettingsMigration()
  .then(migrateAssignmentSettings)
  .then(migrateMarks)
  .then(() => {
    logger.info('All migration done');
  });

function createWindow() {

  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });


  const menu = Menu.buildFromTemplate(MENU_TEMPLATE);
  Menu.setApplicationMenu(menu);

  if (serve) {
    // require('electron-reload')(__dirname, {
    //   electron: require(`${__dirname}/node_modules/electron`)
    // });
    mainWindow.loadURL('http://localhost:4200').then(() => {
      mainWindow.webContents.openDevTools();
    });

  } else {
    mainWindow.loadFile(join(__dirname, 'dist/browser/index.html'));
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details: HandlerDetails) => {
    // For now we assume all links are external
    shell.openExternal(details.url);
    return {
      action: 'deny'
    };
  });
}

const MENU_TEMPLATE: MenuItemConstructorOptions[] = [{
  label: 'File',
  submenu: [{
    role: 'quit'
  }]
}, {
  label: 'View',
  submenu: [
    {
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click (item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.reload();
        }
      }
    },
    {
      label: 'Toggle Developer Tools',
      accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      click (item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.webContents.toggleDevTools();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      role: 'togglefullscreen'
    }
  ]
}, {
  label: 'Window',
  submenu: [
    {
      role: 'minimize'
    },
    {
      role: 'close'
    }
  ]
}];

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {


    if (process.platform === 'win32') {
      app.setAppUserModelId('za.ac.nwu.PDF-Marker'); // set appId from package.json or electron-builder.yml?
    }
    createWindow();



    // Assignment API
    ipcMain.handle('assignments:get', toIpcResponse(getAssignments));
    ipcMain.handle('assignments:update', toIpcResponse(updateAssignment));
    ipcMain.handle('assignments:create', toIpcResponse(createAssignment));
    ipcMain.handle('assignments:saveMarks', toIpcResponse(saveMarks));
    ipcMain.handle('assignments:finalizeAssignment', toIpcResponse(finalizeAssignment));
    ipcMain.handle('assignments:getAssignmentSettings', toIpcResponse(getAssignmentSettings));
    ipcMain.handle('assignments:updateAssignmentSettings', toIpcResponse(updateAssignmentSettings));
    ipcMain.handle('assignments:exportAssignment', toIpcResponse(handleExportAssignment));
    ipcMain.handle('assignments:getMarks', toIpcResponse(getMarks));
    ipcMain.handle('assignments:updateAssignmentRubric', toIpcResponse(updateAssignmentRubric));
    ipcMain.handle('assignments:getPdfFile', toIpcResponse(getPdfFile));
    ipcMain.handle('assignments:isMarkerAllocated', toIpcResponse(isMarkerAllocated));
    ipcMain.handle('assignments:generateAllocationZipFiles', toIpcResponse(generateAllocationZipFiles));

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
    ipcMain.handle('import:validateZipFile', toIpcResponse(validateZipFile));
    ipcMain.handle('import:getZipEntries', toIpcResponse(getZipEntries));
    ipcMain.handle('import:lectureImport', toIpcResponse(lectureImport));
    ipcMain.handle('import:validateLectureImport', toIpcResponse(validateLectureImport));

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


    // Update API
    ipcMain.handle('update:check', toIpcResponse(checkForUpdates));
    ipcMain.handle('update:download', toIpcResponse(downloadUpdate));
    ipcMain.on('update:restart', () => {
      autoUpdater.quitAndInstall();
    });

    // Application API
    ipcMain.handle('generate:generateGenericZip', generateGenericZip);
    ipcMain.handle('generate:generateAssignment', generateAssignment);
    ipcMain.handle('generate:markSome', markSome);
    ipcMain.handle('generate:markAll', markAll);
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

  autoUpdater.on('error', err => {
    logger.error('AutoUpdater error');
    logger.error(err);
  });


} catch (e) {
  console.error(e);
  // Catch Error
  // throw e;
}
