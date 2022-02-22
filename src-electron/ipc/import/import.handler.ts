import {existsSync} from 'fs';
import * as glob from 'glob';
import {basename, sep} from 'path';
import {AssignmentSettingsInfo} from '../../../src/shared/info-objects/assignment-settings.info';
import {IpcMainInvokeEvent} from 'electron';
import {ImportInfo} from '../../../src/shared/info-objects/import.info';
import {isNil} from 'lodash';
import {readFile} from 'fs/promises';
import {getConfig} from '../config/config.handler';
import {getRubrics, writeRubricFile} from '../rubrics/rubric.handler';
import {EXTRACTED_ZIP, EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, NOT_PROVIDED_RUBRIC} from '../../constants';
import {IRubric} from '../../../src/shared/info-objects/rubric.class';
import {deleteFolderRecursive, extractZipFile, isFolder} from '../../utils';

import JSZip from 'jszip';
import {getWorkingDirectory, writeAssignmentSettings} from '../workspace/workspace.handler';
import {SakaiConstants} from '../../../src/shared/constants/sakai.constants';
import {ZipInfo} from '../../../src/shared/info-objects/zip.info';

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
    readFile(req.file),
    getRubrics()
  ]).then((results) => {
    const config = results[0];
    const zipFile: Buffer = results[1];
    const rubrics: IRubric[] = results[2];
    const rubricIndex = rubrics.findIndex(r => r.name === rubricName);

    const folders = glob.sync(config.defaultPath + '/*');

    let folderCount = 0;
    folders.forEach(folder => {
      if (isFolder(folder)) {
        folders[folderCount] = basename(folder);
        folderCount++;
      }
    });

    return new JSZip().loadAsync(zipFile)
      .then(async (zipObject) => {
        let entry = '';
        zipObject.forEach((relativePath, zipEntry) => {
          if (entry === '') {
            entry = zipEntry.name;
          }
        });
        console.log('entry: ' + entry);
        const entryPath = entry.split('/');
        console.log('entryPath: ' + entryPath);
        if (entryPath.length > 0) {
          const oldPath = entryPath[0];
          let foundCount = 0;
          for (let i = 0; i < folders.length; i++) {
            if (oldPath.toLowerCase() + '/' === folders[i].toLowerCase() + '/') {
              foundCount++;
            } else if ((oldPath.toLowerCase() + ' (' + (foundCount + 1) + ')' + '/') === folders[i].toLowerCase() + '/') {
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
            newFolder = oldPath + ' (' + (foundCount + 1) + ')' + sep;
            renameOld = oldPath + '/';
          }

          return getWorkingDirectory(req.workspace).then((workingDirectory) => {
            return extractZipFile(req.file, workingDirectory + sep, newFolder, renameOld, req.assignmentName, req.assignmentType).then(() => {
              return writeAssignmentSettings(req.workspace, assignmentDirectoryName, JSON.stringify(settings)).then(() => {
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



export function getZipEntries(event: IpcMainInvokeEvent, file: string): Promise<ZipInfo[]> {
  return readFile(file).then((data) => {
    return new JSZip().loadAsync(data)
      .then((zip) => {
        const zipEntries: ZipInfo[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            zipEntries.push({
              dir: zipEntry.dir,
              comment: zipEntry.comment,
              date: zipEntry.date,
              name: zipEntry.name,
              dosPermissions: zipEntry.dosPermissions,
              unixPermissions: zipEntry.unixPermissions
            });
          }
        });

        zipEntries.sort((a, b) => (a.name > b.name) ? 1 : -1);
        return zipEntries;
      });
  })
    .catch((e) => Promise.reject(e));
}


export function isValidSakaiZip(event: IpcMainInvokeEvent, file: string): Promise<boolean> {
  let found = false;
  return readFile(file).then((data) => {
    return new JSZip().loadAsync(data)
      .then((zip) => {
        const filePaths = Object.keys(zip.files);
        const fileNames = SakaiConstants.assignmentRootFiles;
        let count = 0;
        for (const filePath of filePaths) {
          const path = filePath.split('/');
          if (path[1] !== undefined && fileNames.indexOf(path[1]) !== -1) {
            found = true;
            break;
          }
          count++;
        }

        return found;
      });
  }).catch(error => {
    console.error(error);
    return Promise.reject('Error trying to decipher zip file format validity!');
  });
}
