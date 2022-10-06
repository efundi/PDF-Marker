import {existsSync} from 'fs';
import * as glob from 'glob';
import {basename, sep} from 'path';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {IpcMainInvokeEvent} from 'electron';
import {ImportInfo} from '@shared/info-objects/import.info';
import {isNil} from 'lodash';
import {readFile} from 'fs/promises';
import {getRubrics, writeRubricFile} from './rubric.handler';
import {
  EXTRACTED_ZIP,
  EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC,
  NOT_PROVIDED_RUBRIC,
  STUDENT_DIRECTORY_NO_NAME_REGEX,
  STUDENT_DIRECTORY_REGEX
} from '../constants';
import {IRubric} from '@shared/info-objects/rubric.class';
import {deleteFolderRecursive, extractAssignmentZipFile, isFolder} from '../utils';

import JSZip, {JSZipObject} from 'jszip';
import {getWorkingDirectory, writeAssignmentSettings} from './workspace.handler';
import {SakaiConstants} from '@shared/constants/sakai.constants';
import {findTreeNode, TreeNode, TreeNodeType} from '@shared/info-objects/workspace';
import {FEEDBACK_FOLDER, GRADES_FILE, MARK_FILE, SUBMISSION_FOLDER} from '@shared/constants/constants';


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
  return readZipFile(file).then((zipObject) => {

    const zipSubmissionDirectoryNames: string[] = [];
    const filePaths = Object.keys(zipObject.files);
    const zipAssignmentName = filePaths[0].split('/')[0];
    const fileNames = SakaiConstants.assignmentRootFiles;

    for (const zipFilePath in zipObject.files) {

      if (!zipObject.files[zipFilePath]) {
        continue;
      }
      const zipFile: JSZipObject = zipObject.files[zipFilePath];
      const zipFilePathParts = zipFilePath.split('/');

      if (zipFilePathParts[0] !== zipAssignmentName) {
        // Check that the file path starts with the assignment name
        return Promise.reject(`Zip contains more than one root directory. ${zipFilePath}`);
      }

      if (zipFile.dir && zipFilePath === zipAssignmentName + '/') {
        continue; // We found the root directory
      }

      if (zipFilePathParts[1] === GRADES_FILE) {
        continue; // We found a grades file, nothing further to validate
      }

      if (!(zipFilePathParts[1].match(STUDENT_DIRECTORY_REGEX) || zipFilePath[1].match(STUDENT_DIRECTORY_NO_NAME_REGEX))) {
        // Check that the second path is a student submission path
        return Promise.reject(`Zip contains directories that are not submissions. ${zipFilePath}`);
      }

      if (zipFilePathParts[2] === SakaiConstants.commentsFileName || zipFilePathParts[2] === SakaiConstants.timestampFileName) {
        continue; // We found a commentsFileName or timestampFileName file, nothing further to validate
      }

      if (zipFile.dir && zipFilePathParts.length === 3) {
        continue; // We found the submission root directory
      }

      if (zipFile.dir && zipFilePathParts[2] !== FEEDBACK_FOLDER && zipFilePathParts[2] !== SUBMISSION_FOLDER) {
        // Check that the second path is a student submission path
        return Promise.reject(`Zip contains directories that are not feedback or submission folders. ${zipFilePath}`);
      }

      if (zipFile.dir && zipFilePathParts.length === 4) {
        continue; // We found the feedback or submission root directory
      }

      if (zipFile.dir && zipFilePathParts.length > 4) {
        // The path is too long to be valid
        return Promise.reject(`Zip contains directories invalid directory path. ${zipFilePath}`);
      }

      if (!zipFile.dir && zipFilePathParts.length > 5) {
        // The path is too long to be valid
        return Promise.reject(`Zip contains directories invalid file path. ${zipFilePath}`);
      }
    }

    // Could not find at least on sakai file
    // return Promise.reject(SakaiConstants.formatErrorMessage);
    return Promise.resolve();
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
