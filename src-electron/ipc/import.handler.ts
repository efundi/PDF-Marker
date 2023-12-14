import {createWriteStream, existsSync, mkdirSync} from 'fs';
import * as glob from 'glob';
import {basename, dirname, extname, sep} from 'path';
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
import {cloneDeep, every, find, forEach, indexOf, isEmpty, isNil, map} from 'lodash';
import {mkdir, readFile, stat, writeFile} from 'fs/promises';
import {getRubrics, markRubricInUse} from './rubric.handler';
import {
  EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC,
  GROUP_DIRECTORY_REGEX,
  NOT_PROVIDED_RUBRIC,
  SPECIAL_CHARS,
  STUDENT_DIRECTORY_NO_NAME_REGEX,
  STUDENT_DIRECTORY_REGEX,
  WHITESPACE_CHARS
} from '../constants';
import {IRubric} from '@shared/info-objects/rubric.class';
import {deleteFolderRecursive, isFolder, isNullOrUndefinedOrEmpty, stream2buffer} from '../utils';

import JSZip, {JSZipObject} from 'jszip';
import {getAssignmentDirectoryAbsolutePath, getWorkingDirectoryAbsolutePath} from './workspace.handler';
import {findTreeNode, TreeNode, TreeNodeType} from '@shared/info-objects/workspaceTreeNode';
import {
  getAssignmentSettingsFor, readGradesFromFile,
  readGradesFromZipFile,
  writeAssignmentSettingsAt,
  writeAssignmentSettingsFor
} from './assignment.handler';
import {getConfig} from './config.handler';
import {
  ASSIGNMENT_BACKUP_DIR,
  ASSIGNMENT_ROOT_FILES,
  FEEDBACK_FOLDER,
  FEEDBACK_ZIP_DIR_REGEX,
  FEEDBACK_ZIP_ENTRY_REGEX,
  GRADES_FILE,
  MARK_FILE,
  SETTING_FILE,
  SUBMISSION_FOLDER,
  SUBMISSION_ZIP_DIR_REGEX,
  SUBMISSION_ZIP_ENTRY_REGEX,
  SUPPORTED_SUBMISSION_EXTENSIONS,
  uuidv4
} from '@shared/constants/constants';
import {AssignmentImportValidateResultInfo,} from '@shared/info-objects/assignment-import-validate-result.info';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';
import {emptyDir} from 'fs-extra';

const logger = require('electron-log');
const LOG = logger.scope('ImportHandler');
/**
 * Returns a list of existing folders in the workspace
 * @param workspace
 */
function existingFolders(workspace: string): Promise<string[]> {
  return getWorkingDirectoryAbsolutePath(workspace).then((workingDirectory) => {
    const fileListing = glob.sync(workingDirectory.replace(/\\/g, '/') + '/*');

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
  if (!isNil(req.rubricName) && req.distributionFormat !== DistributionFormat.DISTRIBUTED) {
    // If it is not a marker import, and a rubric is required, the rubric name must be provide
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


        const assignmentDirectory = basename(newFolder);
        let rubricIndex;
        let settings: AssignmentSettingsInfo;
        // Default settings for the new assignment
        if (req.distributionFormat !== DistributionFormat.DISTRIBUTED) {
          settings = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
          rubricIndex = rubrics.findIndex(r => r.name === rubricName);
          settings.rubric =  rubrics[rubricIndex] || null;
          settings.assignmentName = req.assignmentName;
          settings.sourceId = uuidv4();
          settings.sourceFormat = req.sourceFormat;
        }
        return getWorkingDirectoryAbsolutePath(req.workspace).then((workingDirectory) => {

          let promise: Promise<any>;
          if (req.sourceFormat === SourceFormat.GENERIC) {
            promise = extractGenericImport(zipObject, workingDirectory + sep, newFolder, renameOld)
              .then((submissions) => {
                settings.submissions = submissions;
                return writeAssignmentSettingsFor(settings, req.workspace, assignmentDirectoryName);
              });
          } else if (req.sourceFormat === SourceFormat.SAKAI || req.sourceFormat === SourceFormat.SAKAI_GROUP) {
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
                return assignmentDirectory;
              }, () => {
                return Promise.reject(EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC);
              });
            }
            return assignmentDirectory;
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


/**
 * Validate the zip file and detect the format.
 * @param event
 * @param file
 */
export function validateZipFile(event: IpcMainInvokeEvent, file: string): Promise<AssignmentImportValidateResultInfo> {
  // Validate in the order of most likelyness
  // 1) Sakai Student / Group
  // 2) Lecture Import
  // 3) Generic import
  return readZipFile(file).then((zip) => {
    const format = detectZipFormat(zip);
    if(format === "assignment"){
      return validateZipAssignmentFile(zip);
    } else {
      return validateGenericZip(zip);
    }
  });
}

function detectZipFormat(zip: JSZip): "assignment" | "generic"{
    const filePaths = Object.keys(zip.files);
    const assignmentName = filePaths[0].split('/')[0];

    // If there is a grades.csv file, it is a sakai or sakai group file
    if (zip.files[assignmentName + '/' + GRADES_FILE]){
      return "assignment"
    }

    // If there is a settings.json file, it is a marker import
    if (zip.files[assignmentName + '/' + SETTING_FILE]){
      return "assignment"
    }

    // Else it could be generic

    return "generic";
}

function readZipFile(file: string): Promise<JSZip> {
  return readFile(file)
    .then(data => new JSZip().loadAsync(data))
    .catch(() => Promise.reject('Error trying to decipher zip file format validity!'));
}

function validateZipAssignmentFile(zip: JSZip): Promise<AssignmentImportValidateResultInfo> {
    const filePaths = Object.keys(zip.files);
    const assignmentName = filePaths[0].split('/')[0];

    if (assignmentName.match(SPECIAL_CHARS) || hasWhiteSpace(assignmentName)) {
      // Check that the Assignment Name does not have special chars or whitespaces
      return Promise.reject(`File is corrupt, contains special chars or whitespaces that are not allowed.`);
    }

    for (const filePath of filePaths) {
      const path = filePath.split('/');

      // Check if the path has any special chars or whitespaces that are not allowed
      if (path[0] !== undefined && (path[0].match(SPECIAL_CHARS) || hasWhiteSpace(path[0]))) {
        // Check that the second path does not have special chars or whitespaces
        return Promise.reject(`Path contains special chars or whitespaces that are not allowed. ${filePath}`);
      }
    }

    if (zip.files[assignmentName + '/' + SETTING_FILE]) {
      const settingsFileZip: JSZipObject = zip.files[assignmentName + '/' + SETTING_FILE];
      // If the zip contains a settings file, we must check if it is for this marker
      return extractAssignmentSettings(settingsFileZip).then((zipAssignmentSettings) => {
        if (zipAssignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
          return Promise.reject('Assignment is not in the expected distribution type.');
        }
        if (zipAssignmentSettings.state !== AssignmentState.NOT_STARTED) {
          return Promise.reject('Assignment is not in the expected state.');
        }
        return getConfig().then((config) => {
          const user = config.user;
          if (isNullOrUndefinedOrEmpty(user.email)) {
            return Promise.reject('Please configure your email before attempting to import for marking.');
          }

          // Check that all the submissions are for this marker
          const allSubmissionMatch = every(zipAssignmentSettings.submissions, (submission) => {
            return submission.allocation && submission.allocation.email === user.email;
          });

          if (!allSubmissionMatch) {
            return Promise.reject('This assignment has not been assigned to you for marking. Please contact ' +
              zipAssignmentSettings.owner.email);
          }

          return validatePdfmWorkspaceZip(zip, zipAssignmentSettings).then(() => {
            return {
              sourceFormat: zipAssignmentSettings.sourceFormat ,
              hasRubric: !isNil(zipAssignmentSettings.rubric),
              valid: true,
              distributionFormat: DistributionFormat.DISTRIBUTED
            } as AssignmentImportValidateResultInfo;
          });
        });
      });
    } else {

      var isSakai = false;
      for (const filePath of filePaths) {
        const path = filePath.split('/');
        if (path[1] !== undefined && ASSIGNMENT_ROOT_FILES.indexOf(path[1]) !== -1) {
          isSakai = true;
          break;
        }
      }


      if (isSakai){
        // Now that we know it is Sakai, check if it is a group or student assignment by reading the grades.csv
        const gradesZipFile: JSZipObject = zip.files[assignmentName + '/' + GRADES_FILE]
        if (gradesZipFile) {
``
          return readGradesFromZipFile(gradesZipFile).then(data => {
            // If row 3 field 1 is "Group" it is a group assignment
            const isGroup = data[2].field1 == "Group";
            return {
              sourceFormat: isGroup ? SourceFormat.SAKAI_GROUP : SourceFormat.SAKAI,
              hasRubric: false,
              valid: true,
              distributionFormat: DistributionFormat.STANDALONE
            } as AssignmentImportValidateResultInfo;
          })
        } else {
          return Promise.reject('Invalid zip format, grades.csv file missing. Please select a file exported from Sakai');
        }
      }

      // Could not find at least on sakai file
      return Promise.reject('Invalid zip format. Please select a file exported from Sakai');
    }
}

function validateGenericZip(zip: JSZip): Promise<AssignmentImportValidateResultInfo> {
    const filePaths = Object.keys(zip.files).sort();
    for (const filePath of filePaths) {
      const path = filePath.split('/');

      // Check if the path has any special chars or whitespaces that are not allowed
      if (path[0] !== undefined && (path[0] .match(SPECIAL_CHARS) || hasWhiteSpace(path[0]))) {
        // Check that the second path does not have special chars or whitespaces
        return Promise.reject(`Path contains special chars or whitespaces that are not allowed. ${filePath}`);
      }

      // Check if it is a sakai file
      if (path[1] !== undefined && ASSIGNMENT_ROOT_FILES.indexOf(path[1]) !== -1) {
        return Promise.reject('Invalid zip format. Please select a file in the generic import format');
      }

      if (path.length > 2) {
        // Too many nested directories
        return Promise.reject('Invalid zip format. Please select a file in the generic import format');
      }
    }

    // Check if the file is a directory
    return Promise.resolve({
      sourceFormat: SourceFormat.GENERIC,
      hasRubric: false,
      distributionFormat: DistributionFormat.STANDALONE,
      valid: true
    } as AssignmentImportValidateResultInfo
    );
}


function extractGenericImport(
  zipObject: JSZip,
  destination: string,
  newFolder: string,
  oldFolder: string): Promise<Submission[]> {
  const submissions: Submission[] = [];
  const promises: Promise<any>[] = [];
  zipObject.forEach((zipRelativePath, file) => {
    const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replaceAll('/', sep);
    const fileFullPath = destination + zipFilePath;
    const directory = dirname(fileFullPath);
    if (!file.dir) {

      const tempDetails = zipRelativePath.substring((zipRelativePath.indexOf('/') + 1));
      const splitArray = tempDetails.split('_');

      // If the file is not one of the supported extensions, ignore it
      const ext = extname(fileFullPath);
      if (!ext.startsWith('.') || !SUPPORTED_SUBMISSION_EXTENSIONS.includes(ext.substring(1))) {
        LOG.warn('Unknown file, ignoring... ' + zipFilePath);
        return;
      }

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

      const promise = Promise.all([
        mkdir(directory + sep + studentDirectory, {recursive: true}),
        mkdir(directory + sep + studentDirectory + sep + FEEDBACK_FOLDER, {recursive: true}),
        mkdir(directory + sep + studentDirectory + sep + SUBMISSION_FOLDER, {recursive: true})
      ]).then(() => {
        return extractFile(file, directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER + '/' + tempDetails);
      });

      promises.push(promise);
    }
  });
  return Promise.all(promises)
    .then(() => submissions);
}

interface StudentDetail{
  studentId?: string
  studentName?:  string
  studentSurname?: string
}
function matchStudentDetail(studentDirectory: string): StudentDetail {
  let matches = STUDENT_DIRECTORY_REGEX.exec(studentDirectory);
  if (matches !== null) {
    return {
      studentId : matches[3],
      studentName :  matches[2],
      studentSurname : matches[1]
    }
  }

  matches = STUDENT_DIRECTORY_NO_NAME_REGEX.exec(studentDirectory);
  if (matches !== null) {
    return {
      studentId : matches[2],
      studentSurname : matches[1]
    }
  }

  matches = GROUP_DIRECTORY_REGEX.exec(studentDirectory);
  if (matches !== null) {
    return {
      studentId : matches[2],
      studentName :  matches[1]
    }
  }
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
      const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replaceAll('/', sep);
      const fileFullPath = destination + zipFilePath;

      if (file.dir) {

        // Check if its a submission directory
        const match = zipRelativePath.match(FEEDBACK_ZIP_DIR_REGEX) || zipRelativePath.match(SUBMISSION_ZIP_DIR_REGEX);

        if (match) {

          if (!existsSync(fileFullPath)) {
            mkdirSync(fileFullPath, {recursive: true});
          }

          const studentDirectory = match[1];
          const detail = matchStudentDetail(studentDirectory);
          const submission = find(submissions, {studentId: detail.studentId});
          if (isNil(submission)) {
            submissions.push({
              mark: null,
              allocation: null,
              directoryName: studentDirectory,
              state: SubmissionState.NO_SUBMISSION,
              studentId: detail.studentId,
              studentName: detail.studentName,
              studentSurname: detail.studentSurname
            });
          }
        }

      } else {

        // Check if its a submission file
        const match = zipRelativePath.match(FEEDBACK_ZIP_ENTRY_REGEX) || zipRelativePath.match(SUBMISSION_ZIP_ENTRY_REGEX);

        if (match) {

          const studentDirectory = match[1];
          const detail = matchStudentDetail(studentDirectory);
          const submission = find(submissions, {studentId: detail.studentId});
          if (isNil(submission)) {
            submissions.push({
              mark: null,
              allocation: null,
              directoryName: studentDirectory,
              state: SubmissionState.NEW,
              studentId: detail.studentId,
              studentName: detail.studentName,
              studentSurname: detail.studentSurname
            });
          } else {
            submission.state = SubmissionState.NEW;
          }

          return promise = promise.then(() => {
            return stream2buffer(file.nodeStream())
              .then((fileBytes) => writeFile(fileFullPath, fileBytes));
          });

        } else {
          LOG.warn('Unknown file, saving to backup... ' + zipFilePath);
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
      }
    });
    return promise;
  })
    .then(() => {
      // Now that the workspace is extracted, read the grades file to sync to the submissions
      return readGradesFromFile(backupDirPath + sep + GRADES_FILE)
        .then((grades) => {
          forEach(grades.grades, (gradeItem) => {
            const submission = find(submissions, {studentId: gradeItem.id});
            if (isNil(submission)) {
              LOG.warn(`Found student/group ID in grades.csv which is not in the assignment submissions list "${gradeItem.id}"`);
            } else {
              submission.mark = gradeItem.grade;
              submission.lmsStatusText = gradeItem.lateSubmission;
            }
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
    const zipFilePath = zipRelativePath.replace(oldFolder, newFolder).replaceAll('/', sep);
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
      markerImportPromise = markerImportPromise.then(() => extractFile(file, fileFullPath));
    }
  });
  return markerImportPromise;
}

function extractFile(zipFile: JSZipObject, filepath: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    return zipFile.nodeStream()
      .pipe(createWriteStream(filepath))
      .on('error', () => {
        reject();
      })
      .on('finish', () => {
        resolve({}); // Return value doesn't matter
      });
  });
}

function extractAssignmentSettings(zipFile: JSZipObject): Promise<AssignmentSettingsInfo> {
  return zipFile.async('nodebuffer').then((data) => {
    return JSON.parse(data.toString());
  });
}



// function extractAssignmentGrades(zipFile: JSZipObject): Promise<AssignmentSettingsInfo> {
//   return zipFile.async('nodebuffer').then((data) => {
//     readStudentGradesFromFile()
//     return JSON.parse(data.toString());
//   });
// }

export function lectureImport(event: IpcMainInvokeEvent, importInfo: LectureImportInfo): Promise<AssignmentSettingsInfo> {
  return readFile(importInfo.filename)
    .then((zipData) => new JSZip().loadAsync(zipData))
    .then((zipObject) => {
      if (Object.keys(zipObject.files).length === 0) {
        return Promise.reject('Zip Object contains no files!');
      }
      const firstEntryPath = Object.keys(zipObject.files)[0].split('/');
      if (firstEntryPath.length === 0) {
        return Promise.reject('Invalid zip structure!');
      }

      // Name of the root directory in the zip
      const zipAssignmentName = firstEntryPath[0];

      const settingsFilePath = zipAssignmentName + '/' + SETTING_FILE;
      const settingsFileZip = zipObject.file(settingsFilePath);

      if (isNil(settingsFileZip)) {
        return Promise.reject('Zip file does not contain expected assignment settings file');
      }

      return Promise.all([
        getAssignmentSettingsFor(importInfo.workspaceName, importInfo.assignmentName),
        extractAssignmentSettings(settingsFileZip),
        getAssignmentDirectoryAbsolutePath(importInfo.workspaceName, importInfo.assignmentName),
      ]).then(([assignmentSettings, zipAssignmentSettings, assignmentDirectory]) => {

        const files = Object.keys(zipObject.files);
        const promises: Promise<any>[] = files.map((zipFileKey) => {
          const zipFile: JSZipObject = zipObject.files[zipFileKey];
          if (zipFile.dir) {
            // Ignore directories
            return Promise.resolve();
          }

          if (zipFile.name === settingsFilePath) {
            // Ignore settings file from zip
            return Promise.resolve();
          }

          const fullPath = dirname(assignmentDirectory) + sep + zipFile.name
            .replace(zipAssignmentName + '/', importInfo.assignmentName + '/')
            .replaceAll('/', sep);

          let promise = Promise.resolve();
          if (basename(dirname(fullPath)) === SUBMISSION_FOLDER) {
            // The marker could have converted files. Delete the current files, and replace with contents from marker
            promise = promise.then(() => emptyDir(dirname(fullPath)));
          }
          return promise.then(() => extractFile(zipFile, fullPath));
        });
        return Promise.all(promises)
          .then(() => {
            // Merge over submissions
            zipAssignmentSettings.submissions.forEach((zipSubmission) => {
              const submission = find(assignmentSettings.submissions, {studentId: zipSubmission.studentId});
              submission.mark = zipSubmission.mark;
              submission.state = zipSubmission.state;
            });
            return writeAssignmentSettingsAt(assignmentSettings, assignmentDirectory);
          });
      });
    });
}


export function validateLectureImport(event: IpcMainInvokeEvent, importInfo: LectureImportInfo): Promise<any> {

  return readFile(importInfo.filename)
    .then((zipData) => new JSZip().loadAsync(zipData))
    .then((zipObject) => {

      if (Object.keys(zipObject.files).length === 0) {
        return Promise.reject('Zip Object contains no files!');
      }
      const firstEntryPath = Object.keys(zipObject.files)[0].split('/');
      if (firstEntryPath.length === 0) {
        return Promise.reject('Invalid zip structure!');
      }

      // Name of the root directory in the zip
      const zipAssignmentName = firstEntryPath[0];

      const settingsFilePath = zipAssignmentName + '/' + SETTING_FILE;
      const settingsFileZip = zipObject.file(settingsFilePath);
      if (isNil(settingsFileZip)) {
        return Promise.reject('Zip file does not contain expected assignment settings file.');
      }
      return extractAssignmentSettings(settingsFileZip).then((zipAssignmentSettings) => {

        if (zipAssignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
          return Promise.reject('Assignment is not in the expected distribution type.');
        }
        if (zipAssignmentSettings.state !== AssignmentState.SENT_FOR_REVIEW) {
          return Promise.reject('Assignment is not in the expected state.');
        }
        if (isNil(zipAssignmentSettings.owner)) {
          return Promise.reject('Assignment has no owner set.');
        }
        if (isEmpty(zipAssignmentSettings.submissions)) {
          return Promise.reject('Assignment contains no submissions.');
        }



        // Check that each submission belongs to the user we selected
        const allSubmissionMatch = every(zipAssignmentSettings.submissions, (submission) => {
          return submission.allocation && submission.allocation.id === importInfo.markerId;
        });
        if (!allSubmissionMatch) {
          return Promise.reject('Assignment submissions does not match the selected marker.');
        }

        return Promise.all([
          getConfig(),
          getAssignmentSettingsFor(importInfo.workspaceName, importInfo.assignmentName)
        ]).then(([config, assignmentSettings]) => {

          if (zipAssignmentSettings.sourceId !== assignmentSettings.sourceId) {
            return Promise.reject('The assignment is not from the same source.');
          }

          if (zipAssignmentSettings.owner.id !== config.user.id) {
            return Promise.reject('You are not the owner of the assignment.');
          }

          if (zipAssignmentSettings.assignmentName !== assignmentSettings.assignmentName) {
            return Promise.reject(`The file you selected to import is for the assignment titled "${zipAssignmentSettings.assignmentName}"`);
          }

          // Check that the submission fields match the original assignment
          const allSubmissionsMatch = every(zipAssignmentSettings.submissions, (submission) => {
            const mainSubmission = find(assignmentSettings.submissions, {
              studentId: submission.studentId,
              directoryName: submission.directoryName,
              studentName: submission.studentName,
              studentSurname: submission.studentSurname
            });
            // If it's null then the fields do not match the original submission
            return !isNil(mainSubmission);
          });
          if (!allSubmissionsMatch) {
            return Promise.reject('Some of the submissions details does not match the assignment\s submissions\' details.');
          }

          // Check that the assignment is still allocated to the user
          const allMatch = every(zipAssignmentSettings.submissions, (submission) => {
            const mainSubmission = find(assignmentSettings.submissions, {studentId: submission.studentId});
            return mainSubmission.allocation && mainSubmission.allocation.id === importInfo.markerId;
          });
          if (!allMatch) {
            return Promise.reject('Some of the submissions are not allocated to the selected marker.');
          }

          return validatePdfmWorkspaceZip(zipObject, zipAssignmentSettings);
        });
      });
    })
    .then(() => null /* Returning null means no errors */);
}


function validatePdfmWorkspaceZip(
  zipObject: JSZip,
  zipAssignmentSettings: AssignmentSettingsInfo): Promise<any> {
  const zipSubmissionDirectoryNames: string[] = [];

  const filePaths = Object.keys(zipObject.files);
  const zipAssignmentName = filePaths[0].split('/')[0];

  const settingsFilePath = zipAssignmentName + '/' + SETTING_FILE;
  // Check the files in the zip
  for (const zipFilePath in zipObject.files) {

    if (zipAssignmentName.match(SPECIAL_CHARS) || hasWhiteSpace(zipAssignmentName)) {
      // Check that the Assignment Name does not have special chars or whitespaces
      return Promise.reject(`Assignment Name contains special chars or whitespaces that are not allowed. ${zipFilePath}`);
    }

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

    if (zipFilePath === settingsFilePath) {
      continue; // We found assignment settings file
    }

    if (zipFilePathParts[1].match(SPECIAL_CHARS) || hasWhiteSpace(zipFilePathParts[1])) {
      // Check that the second path does not have special chars or whitespaces
      return Promise.reject(`Student directory contains special chars or whitespaces that are not allowed. ${zipFilePath}`);
    }

    if (!(zipFilePathParts[1].match(STUDENT_DIRECTORY_REGEX) || zipFilePath[1].match(STUDENT_DIRECTORY_NO_NAME_REGEX))) {
      // Check that the second path is a student submission path
      return Promise.reject(`Zip contains directories that are not submissions. ${zipFilePath}`);
    }

    if (indexOf(zipSubmissionDirectoryNames, zipFilePathParts[1]) < 0) {
      zipSubmissionDirectoryNames.push(zipFilePathParts[1]);
    }

    if (zipFile.dir && zipFilePathParts.length === 3) {
      continue; // We found the submission root directory
    }

    if (zipFilePathParts[2] === MARK_FILE) {
      continue; // We found a marks file, nothing further to validate
    }

    if (zipFilePathParts[2] !== FEEDBACK_FOLDER && zipFilePathParts[2] !== SUBMISSION_FOLDER) {
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

  // Check that the zip only contains directories for which there are a matching submission
  const allHaveSubmissions = every(zipSubmissionDirectoryNames, (directoryName) => {
    const submission = find(zipAssignmentSettings.submissions, {directoryName});
    return !isNil(submission);
  });
  if (!allHaveSubmissions) {
    return Promise.reject(`Zip contains submission directories that are not in the assignment settings.`);
  }


  // Check that all submission have a directory in the zip
  const submissionDirectoryNames = map(zipAssignmentSettings.submissions, 'directoryName');
  const allHaveDirectory = every(submissionDirectoryNames, (directoryName) => {
    return indexOf(zipSubmissionDirectoryNames, directoryName) >= 0;
  });
  if (!allHaveDirectory) {
    return Promise.reject(`Zip assignment settings contains submission directories that are not included in the zip.`);
  }

  return Promise.resolve();
}

function hasWhiteSpace(s) {
  return WHITESPACE_CHARS.some(char => s.includes(char));
}
