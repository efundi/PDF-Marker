import {existsSync} from 'fs';
import * as glob from 'glob';
import {basename, sep} from 'path';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {IpcMainInvokeEvent} from 'electron';
import {ImportInfo} from '@shared/info-objects/import.info';
import {isNil} from 'lodash';
import {readFile} from 'fs/promises';
import {getRubrics, writeRubricFile} from './rubric.handler';
import {EXTRACTED_ZIP, EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, NOT_PROVIDED_RUBRIC} from '../constants';
import {IRubric} from '@shared/info-objects/rubric.class';
import {deleteFolderRecursive, extractAssignmentZipFile, isFolder} from '../utils';

import JSZip from 'jszip';
import {getWorkingDirectory, writeAssignmentSettings} from './workspace.handler';
import {SakaiConstants} from '@shared/constants/sakai.constants';
import {findTreeNode, TreeNode, TreeNodeType} from '@shared/info-objects/workspace';


function existingFolders(workspace: string): Promise<string[]> {
  return getWorkingDirectory(workspace).then((workingDirectory) => {
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
    existingFolders(req.workspace),
    readFile(req.file),
    getRubrics()
  ]).then((results) => {
    const folders = results[0];
    const zipFile: Buffer = results[1];
    const rubrics: IRubric[] = results[2];
    const rubricIndex = rubrics.findIndex(r => r.name === rubricName);



    return new JSZip().loadAsync(zipFile)
      .then(async (zipObject) => {
        let entry = '';
        zipObject.forEach((relativePath, zipEntry) => {
          if (entry === '') {
            entry = zipEntry.name;
          }
        });
        const entryPath = entry.split('/');
        if (entryPath.length > 0) {
          const oldPath = entryPath[0];
          let foundCount = 0;
          for (let i = 0; i < folders.length; i++) {
            if (oldPath.toLowerCase() === folders[i].toLowerCase()) {
              foundCount++;
            } else if ((oldPath.toLowerCase() + ' (' + (foundCount + 1) + ')') === folders[i].toLowerCase()) {
              foundCount++;
            }
          }
          let newFolder = '';

          // Default settings for the new assignment
          const settings: AssignmentSettingsInfo = {defaultColour: '#6f327a', rubric: rubrics[rubricIndex], isCreated: false};

          // By default the zip wil contain the name of the assignment directory
          let assignmentDirectoryName = oldPath;
          let renameOld = '';
          if (foundCount !== 0) {
            // If existing assignment directory exists, setup renames to extract the file
            assignmentDirectoryName = oldPath + ' (' + (foundCount + 1) + ')';
            newFolder = oldPath + ' (' + (foundCount + 1) + ')' + '/';
            renameOld = oldPath + '/';
          }

          return getWorkingDirectory(req.workspace).then((workingDirectory) => {
            return extractAssignmentZipFile(req.file, workingDirectory + sep, newFolder, renameOld, req.assignmentName, req.assignmentType).then(() => {
              return writeAssignmentSettings(req.workspace, assignmentDirectoryName, settings).then(() => {
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
        } else {
          return Promise.reject('Zip Object contains no entries!');
        }
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
    const fileNames = SakaiConstants.assignmentRootFiles;
    for (const filePath of filePaths) {
      const path = filePath.split('/');
      if (path[1] !== undefined && fileNames.indexOf(path[1]) !== -1) {
        return true;
      }
    }

    // Could not find at least on sakai file
   return Promise.reject(SakaiConstants.formatErrorMessage);
  });
}

function validateGenericZip(file: string): Promise<any> {
  return readZipFile(file).then((zip) => {
    const filePaths = Object.keys(zip.files).sort();
    const sakaiFileNames = SakaiConstants.assignmentRootFiles;
    for (const filePath of filePaths) {
      const path = filePath.split('/');

      // Check if it is a sakai file
      if (path[1] !== undefined && sakaiFileNames.indexOf(path[1]) !== -1) {
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
