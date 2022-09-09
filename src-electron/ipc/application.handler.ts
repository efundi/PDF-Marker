import {writeFile} from 'fs/promises';

import {app, BrowserWindow, dialog, IpcMainInvokeEvent, shell} from 'electron';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {basename, extname} from 'path';
import {statSync} from 'fs';
import {FileFilterInfo} from '@shared/info-objects/file-filter.info';


export function saveFile (event: IpcMainInvokeEvent, filter: FileFilterInfo): Promise<AppSelectedPathInfo> {
  return dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
    defaultPath: filter.filename,
    title: 'Save',
    filters: [
      { name: filter.name, extensions: filter.extension }
    ]
  }).then(({filePath}) => {
    if (filePath) {

      if(filter.buffer) {
      try {
        return writeFile(filePath, new Buffer(filter.buffer as ArrayBuffer))
          .then(() => {
            return { selectedPath: filePath };
          });
      } catch (e) {
        return Promise.reject(e.message);
      }
      } else {
        return {selectedPath: filePath};
      }
    } else {
      return { selectedPath: null };
    }
  });
}

export function getFolder(): Promise<AppSelectedPathInfo> {
  return dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    title: 'Select Folder',
    properties: ['openDirectory', 'promptToCreate']
  }).then((data) => {
    if (data.canceled) {
      return {selectedPath: null};
    } else {
      return {selectedPath: data.filePaths[0]};
    }
  }, (reason) => {
    return Promise.reject(reason);
  });
}

export function getFile(event: IpcMainInvokeEvent, filter: FileFilterInfo): Promise<AppSelectedPathInfo> {
  return dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    title: 'Select File',
    filters: [
      { name: filter.name, extensions: filter.extension }
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
    return Promise.reject(reason);
  }));
}

export function openExternalLink(event: IpcMainInvokeEvent, resource: string): Promise<any> {
  return shell.openExternal(resource).then(() => {
    return { results: true };
  }, (reason) => {
    return Promise.reject(reason);
  });
}

export function getVersion(): Promise<AppVersionInfo> {
  return Promise.resolve({version: app.getVersion() });
}
