import {indexOf, isEmpty, isNil, noop} from 'lodash';
import {getConfig, updateConfigFile} from './config.handler';
import {basename, sep} from 'path';
import {IpcMainInvokeEvent, shell} from 'electron';
import {move} from 'fs-extra';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {mkdir, readdir, rename, stat} from 'fs/promises';

/**
 * Get the absolute path of the workspace
 * @param workspaceName
 */
export function getWorkingDirectoryAbsolutePath(workspaceName: string): Promise<string> {
  return getConfig().then((config) => {
    if (workspaceName === DEFAULT_WORKSPACE || isNil(workspaceName)) {
      return config.defaultPath;
    } else {
      return config.defaultPath + sep + workspaceName;
    }
  });
}

/**
 * Get the absolute path of an assignment
 * @param workspaceName
 * @param assignmentName
 */
export function getAssignmentDirectoryAbsolutePath(workspaceName: string, assignmentName: string): Promise<string> {
  return getWorkingDirectoryAbsolutePath(workspaceName).then((workingDirectory) => {
    return workingDirectory + sep + assignmentName;
  });
}


/**
 * Create a new working folder
 * @param event
 * @param workFolderName
 */
export function createWorkingFolder(event: IpcMainInvokeEvent, workFolderName: string): Promise<string> {
  return getConfig().then((config) => {
    const fullPath = config.defaultPath + sep + workFolderName;

    return stat(fullPath).then(() => {
      return Promise.reject('Folder with name \'' + workFolderName + '\' already exists.');
    }, () => {
      return mkdir(fullPath);
    }).then(() => {
      if (isNil(config.folders)) {
        config.folders = [];
      }
      config.folders.push(basename(fullPath));
      return updateConfigFile(config).then(() => fullPath);
    });
  });
}



export function updateWorkspaceName(event: IpcMainInvokeEvent, workspaceName: string, newWorkspaceName: string): Promise<string> {
  return getConfig().then((config) => {
    const currPath = config.defaultPath + sep + workspaceName;
    const newPath = config.defaultPath + sep + newWorkspaceName;
    return stat(newPath).then(() => {
      return Promise.reject('Folder name already exists.');
    }, noop)
      .then(() => {
        return rename(currPath, newPath);
      })
      .then(() => {
        const folderIndex = indexOf(config.folders, workspaceName);
        config.folders[folderIndex] = newWorkspaceName;
        return updateConfigFile(config);
      })
      .then(() => newPath);
  });
}


/**
 * Move an assignment to a new workspace
 * @param event
 * @param currentWorkspaceName
 * @param workspaceName
 * @param assignments
 */
export function moveWorkspaceAssignments(
  event: IpcMainInvokeEvent,
  currentWorkspaceName: string,
  workspaceName: string,
  assignments: any[] = []): Promise<string> {
  return getConfig().then((config) => {
    const currentIsDefault = currentWorkspaceName === DEFAULT_WORKSPACE;
    const newIsDefault = workspaceName === DEFAULT_WORKSPACE;

    const workspacePath = currentIsDefault ? config.defaultPath : config.defaultPath + sep + currentWorkspaceName;
    const newWorkspacePath = newIsDefault ? config.defaultPath : config.defaultPath + sep + workspaceName;
    const promises: Promise<any>[] = assignments.map((assignment) => {
      const assignmentPath = workspacePath + sep + assignment.assignmentTitle;
      const newAssignmentPath = newWorkspacePath + sep + assignment.assignmentTitle;

      return stat(newAssignmentPath)
        .then(
          () => Promise.reject('Assignment with the same name already exists.'),
          () => move(assignmentPath, newAssignmentPath)
        )
        .then(noop, (error) => Promise.reject(error.message));
    });

    return Promise.all(promises);
  })
    .then(() => 'Successfully renamed the directory.');
}

/**
 * Get a list of all working folders
 */
export function getWorkspaces(): Promise<any> {
  return getConfig().then((config) => {
    return [DEFAULT_WORKSPACE].concat(config.folders || []);
  });
}



export function deleteWorkspace(event: IpcMainInvokeEvent, deleteFolder: string): Promise<string[]> {
  return getConfig().then((config) => {
    const folders = config.folders;
    if (!Array.isArray(folders)) {
      return Promise.resolve([]);
    }
    const indexFound = indexOf(folders, deleteFolder);

    if (indexFound === -1) {
      return Promise.reject('Could not find folder ' + deleteFolder);
    }

    return stat(config.defaultPath + sep + deleteFolder)
      .then(() => {
        return shell.trashItem(config.defaultPath + sep + deleteFolder);
      }, () => {
        // Ignore if the actual directory does not exist
      })
      .then(() => {
        folders.splice(indexFound, 1);
        config.folders = folders;
      })
      .then(() => updateConfigFile(config))
      .then(() => folders);
  });
}


export function deleteWorkspaceCheck(event: IpcMainInvokeEvent, deleteFolder: string): Promise<boolean> {
  return getConfig().then((config) => {
    const currPath = config.defaultPath + sep + deleteFolder;

    const index = indexOf(config.folders, deleteFolder);
    if (index < 0) {
      // If this directory is not a working directory
      return Promise.resolve(false);
    }

    return stat(currPath)
      .then(() => {
        return readdir(currPath);
      }, () => {
        // Ignore if the actual directory does not exist
        return [];
      })
      .then((directoryContents) => {
        return !isEmpty(directoryContents);
      });
  });
}
