import {existsSync} from 'fs';
import * as glob from 'glob';
import {basename, sep} from 'path';
import {
  AssignmentSettingsInfo,
  DEFAULT_ASSIGNMENT_SETTINGS
} from '@shared/info-objects/assignment-settings.info';
import {IpcMainInvokeEvent} from 'electron';
import {ImportInfo} from '@shared/info-objects/import.info';
import {cloneDeep, isNil} from 'lodash';
import {readFile} from 'fs/promises';
import {getRubrics, writeRubricFile} from './rubric.handler';
import {EXTRACTED_ZIP, EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, NOT_PROVIDED_RUBRIC} from '../constants';
import {IRubric} from '@shared/info-objects/rubric.class';
import {deleteFolderRecursive, extractAssignmentZipFile, isFolder} from '../utils';

import JSZip from 'jszip';
import {getWorkingDirectoryAbsolutePath} from './workspace.handler';
import {findTreeNode, TreeNode, TreeNodeType} from '@shared/info-objects/workspace';
import {writeAssignmentSettingsFor} from './assignment.handler';
import {getConfig} from './config.handler';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {ASSIGNMENT_ROOT_FILES} from '@shared/constants/constants';

/**
 * Returns a list of existing folders in the workspace
 * @param workspace
 */
function existingFolders(workspace: string): Promise<string[]> {
  return getWorkingDirectoryAbsolutePath(workspace).then((workingDirectory) => {
    const fileListing = glob.sync(workingDirectory + '/*');

    const folders = [];
    fileListing.forEach(folder => {
      if (isFolder(folder)) {
        folders.push(basename(folder));
      }
    });
    return folders;
  });
}

export function importZip(event: IpcMainInvokeEvent,  req: ImportInfo): Promise<any> {

  if (isNil(req.file)) {
    return Promise.reject('No file selected!');
  }
  let rubricName;
  if (!req.noRubric) {
    if (isNil(req.rubricName)) {
      return Promise.reject(NOT_PROVIDED_RUBRIC);
    } else {
      rubricName = req.rubricName.trim();
    }
  }


  return Promise.all([
    getConfig(),
    existingFolders(req.workspace),
    readFile(req.file),
    getRubrics()
  ]).then((results) => {
    const config: SettingInfo = results[0];
    const folders = results[1];
    const zipFile: Buffer = results[2];
    const rubrics: IRubric[] = results[3];
    const rubricIndex = rubrics.findIndex(r => r.name === rubricName);



    return new JSZip().loadAsync(zipFile)
      .then((zipObject) => {

        if (Object.keys(zipObject.files).length === 0) {
          return Promise.reject('Zip Object contains no files!');
        }
        const entryPath = Object.keys(zipObject.files)[0].split('/');
        if (entryPath.length === 0) {
          return Promise.reject('Invalid zip structure!');
        }

        const oldPath = entryPath[0];
        let foundCount = 0;
        for (let i = 0; i < folders.length; i++) {
          if (oldPath.toLowerCase() === folders[i].toLowerCase()) {
            foundCount++;
          } else if ((oldPath.toLowerCase() + ' (' + (foundCount + 1) + ')') === folders[i].toLowerCase()) {
            foundCount++;
          }
        }


        // Default settings for the new assignment
        const settings: AssignmentSettingsInfo = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
        settings.owner = null;
        settings.rubric =  rubrics[rubricIndex];
        settings.isCreated = false;
        settings.assignmentName = req.assignmentName;

        // By default, the zip wil contain the name of the assignment directory
        let assignmentDirectoryName = oldPath;
        let renameOld = assignmentDirectoryName + '/';
        let newFolder = assignmentDirectoryName + '/';
        if (foundCount !== 0) {
          // If existing assignment directory exists, setup renames to extract the file
          assignmentDirectoryName = oldPath + ' (' + (foundCount + 1) + ')';
          newFolder = oldPath + ' (' + (foundCount + 1) + ')' + '/';
          renameOld = oldPath + '/';
        }

        return getWorkingDirectoryAbsolutePath(req.workspace).then((workingDirectory) => {
          return extractAssignmentZipFile(req.file, workingDirectory + sep, newFolder, renameOld, req.assignmentName, req.assignmentType).then((submissions) => {
            settings.submissions = submissions;
            return writeAssignmentSettingsFor(settings, req.workspace, assignmentDirectoryName).then(() => {
              if (!isNil(rubricName)) {
                rubrics[rubricIndex].inUse = true;
                return writeRubricFile(rubrics).then(() => {
                  return EXTRACTED_ZIP;
                }, () => {
                  return Promise.reject(EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC);
                });
              }
              return EXTRACTED_ZIP;
            });
          }).catch((error) => {
            if (existsSync(workingDirectory + sep + newFolder)) {
              deleteFolderRecursive(workingDirectory + sep + newFolder);
            }
            return Promise.reject(error.message);
          });
        });
      })
      .catch(error => {
        return Promise.reject(error.message);
      });

  });
}



export function getZipEntries(event: IpcMainInvokeEvent, file: string): Promise<TreeNode[]> {
  return readFile(file).then((data) => {
    return new JSZip().loadAsync(data)
      .then((zip) => {
        const treeNodes: TreeNode[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {

            let nodes = treeNodes;
            const splits = zipEntry.name.split('/');
            splits.forEach((item, index) => {
              let node = findTreeNode(item, nodes);
              if (isNil(node)) {
                node = {
                  name: item,
                  type: (index + 1) < splits.length ? TreeNodeType.ASSIGNMENT : TreeNodeType.FILE,
                  children: [],
                  dateModified: zipEntry.date,
                  parent: null // Do we need parent nodes for zips?
                };
                nodes.push(node);
              }
              nodes = node.children;
            });
          }
        });
        return treeNodes;
      });
  })
    .catch((e) => Promise.reject(e));
}


export function validateZipFile(event: IpcMainInvokeEvent, file: string, format: string): Promise<any> {
  if (format === 'Assignment') {
    return validateZipAssignmentFile(file);
  } else {
    return validateGenericZip(file);
  }
}

function readZipFile(file: string): Promise<JSZip> {
  return readFile(file)
    .then(data => new JSZip().loadAsync(data))
    .catch(() => Promise.reject('Error trying to decipher zip file format validity!'));
}

function validateZipAssignmentFile(file: string): Promise<any> {
  return readZipFile(file).then((zip) => {
    const filePaths = Object.keys(zip.files);
    for (const filePath of filePaths) {
      const path = filePath.split('/');
      if (path[1] !== undefined && ASSIGNMENT_ROOT_FILES.indexOf(path[1]) !== -1) {
        return true;
      }
    }

    // Could not find at least on sakai file
    return Promise.reject('Invalid zip format. Please select a file exported from Sakai');
  });
}

function validateGenericZip(file: string): Promise<any> {
  return readZipFile(file).then((zip) => {
    const filePaths = Object.keys(zip.files).sort();
    for (const filePath of filePaths) {
      const path = filePath.split('/');

      // Check if it is a sakai file
      if (path[1] !== undefined && ASSIGNMENT_ROOT_FILES.indexOf(path[1]) !== -1) {
        return Promise.reject('Invalid zip format. Please select a file in the generic import format');
      }

      if (path.length > 2) {
        // Too many nested directories
        return Promise.reject('Invalid zip format. Please select a file in the generic import format');
      }

      // Check if the file is a directory
    }
  });
}
