import {indexOf, isEmpty, isNil, map, noop, sortBy} from 'lodash';
import {getConfig, updateConfigFile} from './config.handler';
import {basename, sep} from 'path';
import {IpcMainInvokeEvent, shell} from 'electron';
import {move} from 'fs-extra';
import {
  ASSIGNMENT_BACKUP_DIR,
  DEFAULT_WORKSPACE,
  FEEDBACK_FOLDER, PDFM_FILE_SORT,
  SUBMISSION_FOLDER
} from '@shared/constants/constants';
import {mkdir, readdir, rename, stat} from 'fs/promises';
import {
  FeedbackAttachmentsTreeNode,
  StudentSubmissionTreeNode, SubmissionAttachmentsTreeNode, TreeNode,
  TreeNodeType,
  WorkspaceTreeNode,
  AssignmentTreeNode, WorkspaceFileTreeNode
} from '@shared/info-objects/workspaceTreeNode';
import {isNullOrUndefinedOrEmpty} from '../utils';
import {STUDENT_DIRECTORY_NO_NAME_REGEX, STUDENT_DIRECTORY_REGEX} from '../constants';

const logger = require('electron-log');
const LOG = logger.scope('WorkspaceHandler');
export function getAssignments(): Promise<WorkspaceTreeNode[]> {
  return loadWorkspaces();
}

function loadWorkspaces(): Promise<WorkspaceTreeNode[]> {
  return getConfig().then((config) => {
    const defaultWorkspace: WorkspaceTreeNode = {
      type: TreeNodeType.WORKSPACE,
      name: DEFAULT_WORKSPACE,
      dateModified: null,
      children: [],
      parent: null
    };
    const workspaceFolders = config.folders || [];
    const workspaces: WorkspaceTreeNode[] = [defaultWorkspace];

    if (isNullOrUndefinedOrEmpty(config.defaultPath)) {
      return workspaces;
    }

    return readdir(config.defaultPath).then((foundDirectories) => {
      const promises: Promise<any>[] = map(foundDirectories, (directory) => {
        const fullPath = config.defaultPath + sep + directory;
        // Check if the directory is a working directory
        if (workspaceFolders.includes(directory)) {
          return loadWorkspaceContents(fullPath)
            .then(workspace => workspaces.push(workspace));
        } else {
          return loadAssignmentContents(fullPath, defaultWorkspace)
            .then(a => defaultWorkspace.children.push(a));
        }
      });
      return Promise.all(promises).then(() => {
        return sortBy(workspaces, 'name');
      }, (error) => {
        LOG.error(error);
        return Promise.reject(error);
      });
    });
  });
}



function loadAssignmentContents(directoryFullPath: string, parent: WorkspaceTreeNode): Promise<AssignmentTreeNode> {
  const assignment: AssignmentTreeNode = {
    type: TreeNodeType.ASSIGNMENT,
    dateModified: null,
    name: basename(directoryFullPath),
    children: [],
    parent
  };
  return readdir(directoryFullPath).then((files) => {
    const promises: Promise<any>[] = map(files, (file) => {
      const fullPath = directoryFullPath + sep + file;
      return stat(fullPath).then((fileStats) => {
        if (fileStats.isFile()) {
          assignment.children.push({
            type: TreeNodeType.FILE,
            name: file,
            dateModified: fileStats.mtime,
            children: [],
            parent: assignment
          });
        } else {
          // It must be a submission
          let studentId: string;
          let studentName: string;
          let studentSurname: string;

          if (file === ASSIGNMENT_BACKUP_DIR) {
            // Skip the backup dir
            return Promise.resolve(null);
          }

          let matches = STUDENT_DIRECTORY_REGEX.exec(file);
          if (matches !== null) {
            studentId = matches[3];
            studentName =  matches[2];
            studentSurname = matches[1];
          } else {
            matches = STUDENT_DIRECTORY_NO_NAME_REGEX.exec(file);
            if (matches !== null) {
              studentId = matches[2];
              studentSurname =  matches[1];
            }
          }

          if (matches === null) {
            return Promise.reject(`Student directory not in expected format '${file}'`);
          }

          const submission: StudentSubmissionTreeNode = {
            dateModified: null,
            type: TreeNodeType.SUBMISSION,
            name: file,
            studentId,
            studentName,
            studentSurname,
            children: [],
            parent: assignment
          };
          assignment.children.push(submission);
          const feedbackNode: FeedbackAttachmentsTreeNode = {
            name: FEEDBACK_FOLDER,
            type: TreeNodeType.FEEDBACK_DIRECTORY,
            children: [],
            dateModified: null,
            parent: submission
          };
          submission.children.push(feedbackNode);

          const submissionAttachments: SubmissionAttachmentsTreeNode = {
            name: SUBMISSION_FOLDER,
            type: TreeNodeType.SUBMISSIONS_DIRECTORY,
            children: [],
            dateModified: null,
            parent: submission
          };
          submission.children.push(submissionAttachments);


          return Promise.all([
            loadFiles(fullPath, submission).then(nodes => submission.children.push(...nodes)),
            loadFiles(fullPath + sep + FEEDBACK_FOLDER, feedbackNode).then(nodes => feedbackNode.children = nodes),
            loadFiles(fullPath + sep + SUBMISSION_FOLDER, submissionAttachments).then(nodes => submissionAttachments.children = nodes),
          ]).then(() => {
            submission.children.sort(PDFM_FILE_SORT);
            return submission;
          });
        }
      });
    });
    return Promise.all(promises);
  }).then(() => {
    assignment.children.sort(PDFM_FILE_SORT);
    return assignment;
  });
}

function  loadFiles(directory: string, parent: TreeNode): Promise<WorkspaceFileTreeNode[]> {
  return readdir(directory).then(files => {
    const workspaceFiles: WorkspaceFileTreeNode[] = [];
    const promises: Promise<any>[] = map(files, (file) => {
      return stat(directory + sep + file).then(fileStat => {
        if (fileStat.isFile()) {
          workspaceFiles.push({
            type: TreeNodeType.FILE,
            dateModified: fileStat.mtime,
            name: file,
            children: [],
            parent
          });
        }
      });
    });
    return Promise.all(promises).then(() => workspaceFiles);
  });
}

function loadWorkspaceContents(directoryFullPath: string): Promise<WorkspaceTreeNode> {
  // This directory is a workspace
  const workspace: WorkspaceTreeNode = {
    type: TreeNodeType.WORKSPACE,
    dateModified: null,
    name: basename(directoryFullPath),
    children: [],
    parent: null
  };

  return readdir(directoryFullPath).then((assignments) => {
    const promises = map(assignments, assignment => {
      return loadAssignmentContents(directoryFullPath + sep + assignment, workspace)
        .then(a => workspace.children.push(a));
    });

    return Promise.all(promises)
      .then(() => {
        workspace.children.sort(PDFM_FILE_SORT);
        return workspace;
      });
  });
}

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
