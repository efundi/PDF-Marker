import {createWriteStream, existsSync, mkdirSync} from 'fs';
import * as glob from 'glob';
import {basename, dirname, sep} from 'path';
import {
  AssignmentSettingsInfo,
  AssignmentState,
  DEFAULT_ASSIGNMENT_SETTINGS,
  DistributionFormat,
  SourceFormat,
  Submission,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {IpcMainInvokeEvent} from 'electron';
import {ImportInfo} from '@shared/info-objects/import.info';
import {cloneDeep, every, find, forEach, isNil} from 'lodash';
import {mkdir, readFile, stat, writeFile} from 'fs/promises';
import {getRubrics, markRubricInUse} from './rubric.handler';
import {
  EXTRACTED_ZIP,
  EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC,
  NOT_PROVIDED_RUBRIC,
  STUDENT_DIRECTORY_NO_NAME_REGEX,
  STUDENT_DIRECTORY_REGEX
} from '../constants';
import {IRubric} from '@shared/info-objects/rubric.class';
import {deleteFolderRecursive, isFolder, isNullOrUndefinedOrEmpty, stream2buffer} from '../utils';

import JSZip, {JSZipObject} from 'jszip';
import {getWorkingDirectoryAbsolutePath} from './workspace.handler';
import {findTreeNode, TreeNode, TreeNodeType} from '@shared/info-objects/workspace';
import {readGradesCsv, writeAssignmentSettingsFor} from './assignment.handler';
import {getConfig} from './config.handler';
import {
  ASSIGNMENT_BACKUP_DIR,
  ASSIGNMENT_ROOT_FILES,
  FEEDBACK_FOLDER,
  FEEDBACK_ZIP_ENTRY_REGEX,
  GRADES_FILE,
  SETTING_FILE,
  SUBMISSION_FOLDER,
  SUBMISSION_ZIP_ENTRY_REGEX
} from '@shared/constants/constants';
import {AssignmentValidateResultInfo, ZipFileType} from '@shared/info-objects/assignment-validate-result.info';
import {PDFDocument} from 'pdf-lib';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';

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
    existingFolders(req.workspace),
    readFile(req.file),
    getRubrics()
  ]).then((results) => {
    const folders = results[0];
    const zipFile: Buffer = results[1];
    const rubrics: IRubric[] = results[2];



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


        let rubricIndex;
        let settings: AssignmentSettingsInfo;
        // Default settings for the new assignment
        if (req.zipFileType !== ZipFileType.MARKER_IMPORT) {
          settings = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
          rubricIndex = rubrics.findIndex(r => r.name === rubricName);
          settings.rubric =  rubrics[rubricIndex] || null;
          settings.assignmentName = req.assignmentName;
        }
        return getWorkingDirectoryAbsolutePath(req.workspace).then((workingDirectory) => {

          let promise: Promise<any>;
          if (req.zipFileType === ZipFileType.GENERIC_IMPORT) {
            settings.sourceFormat = SourceFormat.GENERIC;
            promise = extractGenericImport(zipObject, workingDirectory + sep, newFolder, renameOld)
              .then((submissions) => {
                settings.submissions = submissions;
                return writeAssignmentSettingsFor(settings, req.workspace, assignmentDirectoryName);
              });

          } else if (req.zipFileType === ZipFileType.ASSIGNMENT_IMPORT) {
            settings.sourceFormat = SourceFormat.SAKAI;
            promise = extractAssignmentZipFile(zipObject, workingDirectory + sep, newFolder, renameOld).then((submissions) => {
              settings.submissions = submissions;
              return writeAssignmentSettingsFor(settings, req.workspace, assignmentDirectoryName);
            });
          } else {
            promise = extractMarkerZip(zipObject, workingDirectory + sep, newFolder, renameOld);
          }


          return promise.then(() => {
            if (!isNil(rubricIndex) && rubricIndex >= 0) {
              return markRubricInUse(rubricName).then(() => {
                return EXTRACTED_ZIP;
              }, () => {
                return Promise.reject(EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC);
              });
            }
            return EXTRACTED_ZIP;
          }).catch((error) => {
            if (existsSync(workingDirectory + sep + newFolder)) {
              deleteFolderRecursive(workingDirectory + sep + newFolder);
            }
            return Promise.reject(error.message);
          });
        });
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


export function validateZipFile(event: IpcMainInvokeEvent, file: string, format: string): Promise<AssignmentValidateResultInfo> {
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

function validateZipAssignmentFile(file: string): Promise<AssignmentValidateResultInfo> {
  return readZipFile(file).then((zip) => {
    const filePaths = Object.keys(zip.files);
    const assignmentName = filePaths[0].split('/')[0];
    if (zip.files[assignmentName + '/' + SETTING_FILE]) {
      const settingsFileZip: JSZipObject = zip.files[assignmentName + '/' + SETTING_FILE];
      // If the zip contains a settings file, we must check if it is for this marker
      return settingsFileZip.async('nodebuffer').then((data) => {
        const assignmentSettings: AssignmentSettingsInfo = JSON.parse(data.toString());
        if (assignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
          return Promise.reject('Assignment is not in the expected distribution type.');
        }
        if (assignmentSettings.state === AssignmentState.FINALIZED || assignmentSettings.state === AssignmentState.SENT_FOR_REVIEW) {
          return Promise.reject('Assignment is not in the expected state.');
        }
        return getConfig().then((config) => {
          const user = config.user;
          if (isNullOrUndefinedOrEmpty(user.email)) {
            return Promise.reject('Please configure your email before attempting to import for marking.');
          }

          // Check that all the submissions are for this marker
          const allSubmissionMatch = every(assignmentSettings.submissions, (submission) => {
            return submission.allocation && submission.allocation.email === user.email;
          });

          if (!allSubmissionMatch) {
            return Promise.reject('This assignment has not been assigned to you for marking. Please contact ' + assignmentSettings.owner.email);
          }

          return {
            zipFileType: ZipFileType.MARKER_IMPORT,
            hasRubric: !isNil(assignmentSettings.rubric)
          };
        });
      });
    } else {

      for (const filePath of filePaths) {
        const path = filePath.split('/');
        if (path[1] !== undefined && ASSIGNMENT_ROOT_FILES.indexOf(path[1]) !== -1) {
          return {
            zipFileType: ZipFileType.ASSIGNMENT_IMPORT,
            hasRubric: false
          };
        }
      }

      // Could not find at least on sakai file
      return Promise.reject('Invalid zip format. Please select a file exported from Sakai');
    }
  });
}

function validateGenericZip(file: string): Promise<AssignmentValidateResultInfo> {
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
      return {
        zipFileType: ZipFileType.GENERIC_IMPORT,
        hasRubric: false
      };
    }
  });
}


function extractGenericImport(
  zipObject: JSZip,
  destination: string,
  newFolder: string,
  oldFolder: string): Promise<Submission[]> {
  const submissions: Submission[] = [];
  let promise: Promise<any> = Promise.resolve();
  zipObject.forEach((zipRelativePath, file) => {
    const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replace('/', sep);
    const fileFullPath = destination + zipFilePath;
    const directory = dirname(fileFullPath);
    if (!file.dir) {

      if (!existsSync(directory)) {
        mkdirSync(directory, {recursive: true});
      }
      const tempDetails = zipRelativePath.substring((zipRelativePath.indexOf('/') + 1));
      const splitArray = tempDetails.split('_');

      const studentName = splitArray[1];
      const studentSurname = splitArray[0];
      const studentId = splitArray[2];
      const studentDirectory = studentSurname + ', ' + studentName + ' (' + studentId + ')';
      submissions.push({
        mark: null,
        allocation: null,
        directoryName: studentDirectory,
        state: SubmissionState.NEW,
        studentId,
        studentName,
        studentSurname
      });

      promise = promise.then(() => Promise.all([
        mkdir(directory + sep + studentDirectory, {recursive: true}),
        mkdir(directory + sep + studentDirectory + sep + FEEDBACK_FOLDER, {recursive: true}),
        mkdir(directory + sep + studentDirectory + sep + SUBMISSION_FOLDER, {recursive: true})
      ]).then(() => {
        return stream2buffer(file.nodeStream())
          .then((content) => PDFDocument.load(content))
          .then((pdfDoc) => pdfDoc.save())
          .then((pdfBytes) => {
            return writeFile(directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER + '/' + tempDetails, pdfBytes);
          });
      }));
    } else {
      promise = promise.then(() => {
        return stat(fileFullPath).then(() => {

        }, () => {
          return mkdir(fileFullPath, {recursive: true});
        });
      });
    }
  });
  return promise
    .then(() => submissions);
}

function extractAssignmentZipFile(
  zipObject: JSZip,
  destination: string,
  newFolder: string,
  oldFolder: string): Promise<Submission[]> {

  const submissions: Submission[] = [];

  const backupDirPath = destination + newFolder + ASSIGNMENT_BACKUP_DIR;
  return mkdir(backupDirPath, {recursive: true}).then(() => {

    let promise: Promise<any> = Promise.resolve();
    zipObject.forEach((zipRelativePath, file) => {
      const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replace('/', sep);
      const fileFullPath = destination + zipFilePath;
      const directory = dirname(fileFullPath);

      if (!file.dir) {
        // Check if its a submission file
        const match = zipRelativePath.match(FEEDBACK_ZIP_ENTRY_REGEX) || zipRelativePath.match(SUBMISSION_ZIP_ENTRY_REGEX);
        if (match) {

          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }

          const studentDirectory = match[1];
          let studentId;
          let studentName;
          let studentSurname;

          let matches = STUDENT_DIRECTORY_REGEX.exec(studentDirectory);
          if (matches !== null) {
            studentId = matches[3];
            studentName =  matches[2];
            studentSurname = matches[1];
          } else {
            matches = STUDENT_DIRECTORY_NO_NAME_REGEX.exec(studentDirectory);
            if (matches !== null) {
              studentId = matches[2];
              studentSurname =  matches[1];
            }
          }

          submissions.push({
            mark: null,
            allocation: null,
            directoryName: studentDirectory,
            state: SubmissionState.NEW,
            studentId,
            studentName,
            studentSurname
          });

          return promise.then(() => {
            return stream2buffer(file.nodeStream())
              .then((content) => PDFDocument.load(content))
              .then((pdfDoc) => pdfDoc.save())
              .then((pdfBytes) => writeFile(fileFullPath, pdfBytes));
          });

        } else {
          console.log('Unknown file, saving to backup... ' + zipFilePath);
          promise = promise.then(() => {
            return stream2buffer(file.nodeStream())
              .then(content => {
                const p = backupDirPath + zipRelativePath.replace(oldFolder, sep);
                const d = dirname(p);
                if (!existsSync(d)) {
                  mkdirSync(d, {recursive: true});
                }
                return writeFile(p, content);
              });
          });
        }
      } else {
        promise = promise.then(() => {
          return stat(fileFullPath).then(() => {

          }, () => {
            return mkdir(fileFullPath, {recursive: true});
          });
        });
      }
    });
    return promise;
  })
    .then(() => {
      // Now that the workspace is extracted, read the grades file to sync to the submissions
      return readGradesCsv(backupDirPath + sep + GRADES_FILE)
        .then((grades) => {
          forEach(grades.studentGrades, (studentGrade) => {
            const submission = find(submissions, {studentId: studentGrade.id});
            submission.mark = studentGrade.grade;
            submission.lmsStatusText = studentGrade.lateSubmission;
          });
        });
    }).then(() => submissions);
}

function extractMarkerZip(
  zipObject: JSZip,
  destination: string,
  newFolder: string,
  oldFolder: string): Promise<any> {


  let markerImportPromise: Promise<any> = Promise.resolve();
  zipObject.forEach((zipRelativePath, file) => {
    const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replace('/', sep);
    const fileFullPath = destination + zipFilePath;

    if (file.dir) {
      markerImportPromise = markerImportPromise.then(() => {
        return stat(fileFullPath).then(() => {
          // Directory already exist
        }, () => {
          return mkdir(fileFullPath, {recursive: true});
        });
      });
    } else {
      markerImportPromise = markerImportPromise.then(() => {
        return new Promise<any>((resolve, reject) => {
          return file.nodeStream()
            .pipe(createWriteStream(fileFullPath))
            .on('error', () => {
              reject();
            })
            .on('finish', () => {
              resolve({}); // Return value doesn't matter
            });
        });
      });
    }
  });
  return markerImportPromise;
}


export function lectureImport(event: IpcMainInvokeEvent, importInfo: LectureImportInfo): Promise<any> {
  return Promise.resolve(true);
}


export function validateLectureImport(event: IpcMainInvokeEvent, importInfo: LectureImportInfo): Promise<any> {

  return readFile(importInfo.filename)
    .then((zipData) => new JSZip().loadAsync(zipData))
    .then((zipObject) => {
      const settingsFilePath = importInfo.assignmentName + '/' + SETTING_FILE;
      const settingsFileZip = zipObject.file(settingsFilePath);
      if (isNil(settingsFileZip)) {
        return Promise.reject('Zip file does not contain expected assignment settings file');
      }
      return settingsFileZip.async('nodebuffer').then((data) => {
        const assignmentSettings: AssignmentSettingsInfo = JSON.parse(data.toString());

        if (assignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
          return Promise.reject('Assignment is not in the expected distribution type.');
        }
        if (assignmentSettings.state !== AssignmentState.SENT_FOR_REVIEW) {
          return Promise.reject('Assignment is not in the expected state.');
        }
      });
    })
    .then(() => null /* Returning null means no errors */);
  //
  // return getAssignmentSettingsFor(importInfo.workspaceName, importInfo.assignmentName).then((assignmentSettings) => {
  //   const errors = {};
  //
  //
  //   return errors;
  // });
}
