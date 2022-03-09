import {forEach, isNil} from 'lodash';
import {getConfig, updateConfigFile} from './config.handler';
import {basename, sep} from 'path';
import {writeFile} from 'fs/promises';
import {COMMENTS_FILE, CONFIG_DIR, CONFIG_FILE} from '../constants';
import {existsSync, mkdirSync, readdirSync, renameSync, writeFileSync} from 'fs';
import {IpcMainInvokeEvent, shell} from 'electron';
import {moveSync, readFile} from 'fs-extra';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {DEFAULT_WORKSPACE, SETTING_FILE} from '@shared/constants/constants';
import {Comment} from '@angular/compiler';
import {isJson} from '../utils';

export function getWorkingDirectory(workspaceName: string): Promise<string> {
  return getConfig().then((config) => {
    if (workspaceName === DEFAULT_WORKSPACE || isNil(workspaceName)) {
      return config.defaultPath;
    } else {
      return config.defaultPath + sep + workspaceName;
    }
  });
}

export function getAssignmentDirectory(workspaceName: string, assignmentName: string): Promise<string> {
  return getWorkingDirectory(workspaceName).then((workingDirectory) => {
    return workingDirectory + sep + assignmentName;
  });
}

export function writeAssignmentSettings(workspaceName: string, assignmentName: string, settings: AssignmentSettingsInfo): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectory(workspaceName, assignmentName).then((workingDirectory) => {
    return writeFile(workingDirectory + sep + SETTING_FILE, JSON.stringify(settings));
  }).then(() => settings);
}



export function createWorkingFolder(event: IpcMainInvokeEvent, workFolderName: string): Promise<string> {
  return getConfig().then((config) => {
    const fullPath = config.defaultPath + sep + workFolderName;
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath);
    } else {
      return Promise.reject('Folder with name \'' + workFolderName + '\' already exists.');
    }

    if (isNil(config.folders)) {
      config.folders = [];
    }
    config.folders.push(fullPath);
    console.log(config);
    return updateConfigFile(config).then(() => fullPath);
  });
}



export function updateWorkspaceName(event: IpcMainInvokeEvent, workspaceName: string, newWorkspaceName: string): Promise<string> {
  return getConfig().then((config) => {
    const folders = config.folders;
    const currPath = config.defaultPath + sep + workspaceName;
    const newPath = config.defaultPath + sep + newWorkspaceName;
    if (existsSync(newPath)) {
      return Promise.reject('Folder name already exists.');
    }
    try {
      renameSync(currPath, newPath);
      console.log('Successfully renamed the directory.');
      const foundIndex = folders.findIndex(x => x === currPath);
      folders[foundIndex] = newPath;
      config.folders = folders;
      writeFileSync(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config));
      return newPath;
    } catch (e) {
      console.log(e);
      return Promise.reject(e.message);
    }
  });
}




export function moveWorkspaceAssignments(
  event: IpcMainInvokeEvent,
  currentWorkspaceName: string,
  workspaceName: string,
  assignments: any[] = []): Promise<any> {
  return getConfig().then((config) => {
    const loc = currentWorkspaceName.replace(/\//g, sep);
    const isDefault = workspaceName === DEFAULT_WORKSPACE;
    const loc2 = workspaceName.replace(/\//g, sep);

    const workspacePath = config.defaultPath + sep + loc;
    const newWorkspacePath = isDefault ? config.defaultPath : config.defaultPath + sep + loc2;
    let error = null;
    forEach(assignments, (assignment) => {
      const assignmentPath = workspacePath + sep + assignment.assignmentTitle;
      const newAssignmentPath = newWorkspacePath + sep + assignment.assignmentTitle;
      if (!existsSync(newAssignmentPath)) {
        try {
          const src = assignmentPath;
          const dest = newAssignmentPath;
          moveSync(src, dest);
        } catch (e) {
          console.log(e);
          error = e.message;
          return false; // Stop looping
        }
      } else {
        error = 'Assignment with the same name already exists.';
        return false; // Stop looping
      }
    });
    if (!error) {
      return 'Successfully renamed the directory.';
    } else {
      return Promise.reject(error);
    }
  });
}


export function getWorkspaces(): Promise<any> {
  return getConfig().then((config) => {
    return config.folders || [];
  });
}



export function deleteWorkspace(event: IpcMainInvokeEvent, deleteFolder: string): Promise<string[]> {
  return getConfig().then((config) => {
    const folders = config.folders;
    const workspaceNames = folders.map(item => {
      return basename(item);
    });
    if (Array.isArray(workspaceNames)) {
      let indexFound = -1;
      for (let i = 0; i < workspaceNames.length; i++) {
        if (workspaceNames[i].toUpperCase() === deleteFolder.toUpperCase()) {
          indexFound = i;
          break;
        }
      }

      if (indexFound === -1) {
        return Promise.reject('Could not find folder ' + deleteFolder);
      }

      let promise = Promise.resolve();
      if (existsSync(folders[indexFound])) {
        try {
          promise = shell.trashItem(folders[indexFound]);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return promise.then(() => {
        folders.splice(indexFound, 1);
        config.folders = folders;
      })
        .then(() => updateConfigFile(config))
        .then(() => folders);
    }
    return Promise.resolve([]);
  });
}


export function deleteWorkspaceCheck(event: IpcMainInvokeEvent, deleteFolder: string): Promise<boolean> {
  let found = false;
  let hasAssignments = false;

  return getConfig().then((config) => {
    const workspaces: string[] = config.folders;
    const workspaceNames = workspaces.map(item => {
      return basename(item);
    });
    const currPath = config.defaultPath + sep + deleteFolder;
    try {
      for (let i = 0; i < workspaceNames.length; i++) {
        if (workspaceNames[i].toUpperCase() === deleteFolder.toUpperCase()) {
          found = true;
          break;
        }
      }
      // Check if there are assignments in folder
      if (found) {

        if (existsSync(currPath)) {
          const folders: string[] = readdirSync(currPath);
          if (folders.length > 0) {
            hasAssignments = true;
          }
        }
      }
      return hasAssignments;
    } catch (e) {
      return Promise.reject(e.message);
    }
  });
}
