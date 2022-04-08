import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import * as glob from 'glob';
import {getConfig} from './config.handler';
import {checkAccess, deleteFolderRecursive, isFolder, isJson, isNullOrUndefined, writeToFile} from '../utils';
import {
  CONFIG_DIR,
  COULD_NOT_READ_RUBRIC_LIST,
  INVALID_RUBRIC_JSON_FILE,
  INVALID_STUDENT_FOLDER,
  NOT_PROVIDED_RUBRIC,
  RUBRICS_FILE, STUDENT_DIRECTORY_ID_REGEX,
  STUDENT_DIRECTORY_NO_NAME_REGEX,
  STUDENT_DIRECTORY_REGEX,
} from '../constants';
import * as path from 'path';
import {basename, dirname, sep} from 'path';
import {json2csvAsync} from 'json-2-csv';
import {readFile, stat, writeFile} from 'fs/promises';
import {find, isNil, map, sortBy} from 'lodash';
import {IpcMainInvokeEvent} from 'electron';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {PDFDocument} from 'pdf-lib';
import {IRubric} from '@shared/info-objects/rubric.class';
import {CreateAssignmentInfo, StudentInfo} from '@shared/info-objects/create-assignment.info';
import {annotatePdfFile} from '../pdf/marking-annotations';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {annotatePdfRubric} from '../pdf/rubric-annotations';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import * as os from 'os';
import {copySync, readdir} from 'fs-extra';
import {getAssignmentDirectory} from './workspace.handler';
import {
  FeedbackAttachments,
  StudentSubmission,
  SubmissionAttachments,
  TreeNodeType,
  Workspace,
  WorkspaceAssignment,
  WorkspaceFile
} from '@shared/info-objects/workspace';
import {
  DEFAULT_WORKSPACE,
  FEEDBACK_FOLDER,
  GRADES_FILE,
  MARK_FILE,
  PDFM_FILE_SORT,
  SETTING_FILE,
  SUBMISSION_FOLDER
} from '@shared/constants/constants';
import {
  MarkingSubmissionInfo,
  RubricSubmissionInfo,
  SubmissionInfo,
  SubmissionInfoVersion,
  SubmissionType
} from "@shared/info-objects/submission.info";
import {getComments, updateCommentsFile} from "./comment.handler";
import {promise} from "protractor";
import {findRubric} from "./rubric.handler";
import {SettingInfo} from "@shared/info-objects/setting.info";

const zipDir = require('zip-dir');

const csvtojson = require('csvtojson');



export function getAssignments(): Promise<Workspace[]> {
  return loadWorkspaces();
}

function loadFiles(directory: string): Promise<WorkspaceFile[]> {
  return readdir(directory).then(files => {
    const workspaceFiles: WorkspaceFile[] = [];
    const promises: Promise<any>[] = map(files, (file) => {
      return stat(directory + sep + file).then(fileStat => {
        if (fileStat.isFile()) {
          workspaceFiles.push({
            type: TreeNodeType.FILE,
            dateModified: fileStat.mtime,
            name: file,
            children: []
          });
        }
      });
    });
    return Promise.all(promises).then(() => workspaceFiles);
  });
}

function loadAssignmentContents(directoryFullPath: string): Promise<WorkspaceAssignment> {
  const assignment: WorkspaceAssignment = {
    type: TreeNodeType.ASSIGNMENT,
    dateModified: null,
    name: basename(directoryFullPath),
    children: []
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
            children: []
          });
        } else {
          // It must be a submission
          let studentId: string;
          let studentName: string;
          let studentSurname: string;

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

          const submission: StudentSubmission = {
            dateModified: null,
            type: TreeNodeType.SUBMISSION,
            name: file,
            studentId,
            studentName,
            studentSurname,
            children: [],
          };
          assignment.children.push(submission);

          return Promise.all([
            loadFiles(fullPath).then(sFiles => submission.children.push(...sFiles)),
            loadFiles(fullPath + sep + FEEDBACK_FOLDER).then(fFiles => {
              const feedbackNode: FeedbackAttachments = {
                name: FEEDBACK_FOLDER,
                type: TreeNodeType.FEEDBACK_DIRECTORY,
                children: fFiles,
                dateModified: null
              };
              submission.children.push(feedbackNode);
            }),
            loadFiles(fullPath + sep + SUBMISSION_FOLDER).then(sFiles => {
              const submissionAttachments: SubmissionAttachments = {
                name: SUBMISSION_FOLDER,
                type: TreeNodeType.SUBMISSIONS_DIRECTORY,
                children: sFiles,
                dateModified: null
              };
              submission.children.push(submissionAttachments);
            }),
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

function loadWorkspaceContents(directoryFullPath: string): Promise<Workspace> {
  // This directory is a workspace
  const workspace: Workspace = {
    type: TreeNodeType.WORKSPACE,
    dateModified: null,
    name: basename(directoryFullPath),
    children: []
  };

  return readdir(directoryFullPath).then((assignments) => {
    const promises = map(assignments, assignment => {
      return loadAssignmentContents(directoryFullPath + sep + assignment)
        .then(a => workspace.children.push(a));
    });

    return Promise.all(promises)
      .then(() => {
        workspace.children.sort(PDFM_FILE_SORT);
        return workspace;
      });
  });
}

function loadWorkspaces(): Promise<Workspace[]> {
  return getConfig().then((config) => {
    const defaultWorkspace: Workspace = {
      type: TreeNodeType.WORKSPACE,
      name: DEFAULT_WORKSPACE,
      dateModified: null,
      children: []
    };
    const workspaceFolders = config.folders || [];
    const workspaces: Workspace[] = [defaultWorkspace];

    return readdir(config.defaultPath).then((foundDirectories) => {
      const promises: Promise<any>[] = map(foundDirectories, (directory) => {
        const fullPath = config.defaultPath + sep + directory;
        // Check if the directory is a working directory
        if (workspaceFolders.includes(fullPath)) {
          return loadWorkspaceContents(fullPath)
            .then(workspace => workspaces.push(workspace));
        } else {
          return loadAssignmentContents(fullPath)
            .then(a => defaultWorkspace.children.push(a));
        }
      });
      return Promise.all(promises).then(() => {
        return sortBy(workspaces, 'name');
      }, (error) => {
        console.error(error);
        return Promise.reject(error);
      });
    });
  });
}


export function saveMarks(event: IpcMainInvokeEvent, location: string, submissionInfo: SubmissionInfo): Promise<string> {

  if (submissionInfo.type === SubmissionType.MARK){

    const marksPerPage = submissionInfo.marks as MarkInfo[][];

    return getComments().then((comments) => {
      let updateComments = false;
      let totalMark = 0;
      marksPerPage.forEach((pageMarks) => {
        if (Array.isArray(pageMarks)) {
          for (let i = 0; i < pageMarks.length; i++) {
            totalMark += (pageMarks[i] && pageMarks[i].totalMark) ? pageMarks[i].totalMark : 0;

            comments.forEach(comment => {
              // Try and mark a comment as in use
              if (pageMarks[i].comment && pageMarks[i].comment.includes(comment.title) && !comment.inUse) {
                updateComments = true;
                comment.inUse = true;
              }
            });
          }
        }
      });

      let promise: Promise<any> = Promise.resolve();
      if (updateComments) {
        promise = promise.then(() => updateCommentsFile(comments));
      }

      return promise.then(() => saveToMarks(location, submissionInfo, totalMark));
    });
  } else if (submissionInfo.type === SubmissionType.RUBRIC) {
    const assignmentDirectory = dirname(location);
    return getConfig().then((config) => {
      return getAssignmentSettingsAt(config.defaultPath + sep + assignmentDirectory)
        .then((assignmentSettingsInfo) => {

          if (isNil(assignmentSettingsInfo.rubric)) {
            return Promise.reject('Assignment\'s settings does not contain a rubric!');
          }
          let totalMark = 0;
          const marks = submissionInfo.marks as number[];
          marks.forEach((levelIndex: number, index: number) => {
            if (levelIndex !== null) {
              totalMark += parseFloat('' + assignmentSettingsInfo.rubric.criterias[index].levels[levelIndex].score);
            }
          });
          return saveToMarks(location, submissionInfo, totalMark);
        });
    });
  } else {
    return Promise.reject('Unknown submission info type');
  }
}

function saveSubmissionInfo(studentLocation: string, submissionInfo: SubmissionInfo): Promise<SubmissionInfo>{
  return writeFile(studentLocation + sep + MARK_FILE, JSON.stringify(submissionInfo))
    .then(() => submissionInfo, () => Promise.reject('Failed to save student marks!'));
}

function saveToMarks(studentLocation: string, marks: SubmissionInfo, totalMark: number): Promise<string> {

  return getConfig().then((config) => {
    const studentFolder = config.defaultPath + sep + studentLocation.replace(/\//g, sep);
    return checkAccess(studentFolder).then(() => {

      return saveSubmissionInfo(studentFolder, marks).then(() => {
        const assignmentFolder = dirname(studentFolder);

        return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {

          const studentDirectoryName = basename(studentFolder);
          const matches = STUDENT_DIRECTORY_ID_REGEX.exec(studentDirectoryName);
          const studentNumber = matches[1] + '';

          return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
            .then((gradesJSON) => {
              let changed = false;
              let assignmentHeader;
              if (gradesJSON.length < 3 || Object.keys(gradesJSON[2]).length < 4) {
                return Promise.reject('grades.csv file appears to be corrupt');
              }

              for (let i = 0; i < gradesJSON.length; i++) {
                if (i === 0) {
                  const keys = Object.keys(gradesJSON[i]);
                  if (keys.length > 0) {
                    assignmentHeader = keys[0];
                  }
                } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === studentNumber.toUpperCase()) {
                  gradesJSON[i].field5 = totalMark;
                  changed = true;

                }
              }

              if (changed) {
                // more logic to save new JSON to CSV
                return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then((csv) => {
                  return writeToFile(assignmentFolder + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!');
                }, () => {
                  return Promise.reject('Failed to convert json to csv!');
                });
              } else {
                return Promise.reject(`Could not find student ${studentNumber} in grades.csv`);
              }
            }, reason => {
              return Promise.reject( reason);
            });
        });
      });
    });
  });
}

function convertMarks(marks: any, studentFolderFullPath: string): Promise<SubmissionInfo> {

  let submissionInfo: SubmissionInfo;
  if (marks.version !== SubmissionInfoVersion) {

    return getAssignmentSettingsAt(dirname(studentFolderFullPath)).then((assignmentSettings) => {

      let promise: Promise<any> = Promise.resolve();
      if (!marks.hasOwnProperty('version')) {
        // This is the original .marks.json convert it to version 1
        if (assignmentSettings.rubric) {
          const rubricSubmissionInfo = new RubricSubmissionInfo(1);
          rubricSubmissionInfo.marks = marks;
          submissionInfo = rubricSubmissionInfo;
        } else {
          const markingSubmissionInfo = new MarkingSubmissionInfo(1);
          markingSubmissionInfo.marks = marks;
          submissionInfo = markingSubmissionInfo;
        }
        promise = promise.then(() => saveSubmissionInfo(studentFolderFullPath, submissionInfo));
      }
      /*
       if (marks.version === 1) {
         // Convert to from v 1 to version 2
         submissionInfo = upgradedV2;
          promise = promise.then(() => saveSubmissionInfo(studentFolder, submissionInfo));
       }

       if (marks.version === 2) {
         // Convert to from v 2 to version 3
         submissionInfo = upgradedV3;
          promise = promise.then(() => saveSubmissionInfo(studentFolder, submissionInfo));
       }
       */


      return promise;
    });


  }


  return Promise.resolve(marks);
}


export function loadMarks(studentFolder: string): Promise<SubmissionInfo>{
  return getConfig().then((config) => {
    studentFolder = config.defaultPath + sep + studentFolder.replace(/\//g, sep);
    return loadMarksAt(studentFolder);
  });
}
export function loadMarksAt(studentFolderFull: string): Promise<SubmissionInfo>{
  return readFile(studentFolderFull + sep + MARK_FILE).then((data) => {
    if (!isJson(data)) {
      return [];
    } else {
      const marks = JSON.parse(data.toString());
      if (marks.version !== SubmissionInfoVersion) {
        return convertMarks(marks, studentFolderFull);
      }
      return marks;
    }
  }, (err) => {
    return convertMarks([], studentFolderFull);
  });
}

export function getMarks(event: IpcMainInvokeEvent, studentFolder: string): Promise<SubmissionInfo> {
  return loadMarks(studentFolder);
}



// Only For updating colour for now
export function updateAssignmentSettings(event: IpcMainInvokeEvent, updatedSettings: any = {}, workspaceName: string, assignmentName: string): Promise<any> {

  if (JSON.stringify(updatedSettings) === JSON.stringify({})) {
    return Promise.resolve();
  }

  return getAssignmentSettingsFor(workspaceName, assignmentName)
    .then((originalSettings) => {
      originalSettings.defaultColour = (updatedSettings.defaultColour) ? updatedSettings.defaultColour : originalSettings.defaultColour;
      return writeAssignmentSettingsFor(originalSettings, workspaceName, assignmentName);
    });
}



export function updateAssignment(event: IpcMainInvokeEvent, updateRequest: UpdateAssignment): Promise<any> {
  if (updateRequest.assignmentName.length < 5) {
    return Promise.reject(`Assignment must be > 5 characters`);
  }

  const assignmentName: string = updateRequest.assignmentName.trim();
  try {
    return getConfig().then(async (config) => {
      let assignmentSettingsBuffer;
      if (updateRequest.workspace === DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
        assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE);
        if (!isJson(assignmentSettingsBuffer)) {
          return Promise.reject('Invalid assignment settings file!');
        }

      } else {
        assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + SETTING_FILE);
        if (!isJson(assignmentSettingsBuffer)) {
          return Promise.reject('Invalid assignment settings file!');
        }
      }
      const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());
      if (!assignmentSettingsInfo.isCreated) {
        return Promise.reject('Operation not permitted on this type of assignment!');
      }

      if (updateRequest.studentDetails.length !== updateRequest.files.length) {
        return Promise.reject( `Student details is not equal to number of files sent!`);
      }

      const grades = await csvtojson({
        noheader: true,
        trim: false
      }).fromFile(
        (updateRequest.workspace === DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) ?
          config.defaultPath + sep + assignmentName + sep + GRADES_FILE :
          config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + GRADES_FILE);

      let count = 0;
      const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
      const line = `''\n`;
      const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
      let csvString = headers + line + subheaders;
      for (const studentInfo of updateRequest.studentDetails) {
        const file: any = updateRequest.files[count];
        const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
        const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
        const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
        let csvData = '';

        if (updateRequest.workspace === DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
          if (existsSync(config.defaultPath + sep + assignmentName + sep + studentFolder)) {
            if (studentInfo.remove) {
              deleteFolderRecursive(config.defaultPath + sep + assignmentName + sep + studentFolder);
            } else {
              const studentRecord = grades.find(grade => grade[Object.keys(grades[0])[0]] === studentInfo.studentId.toUpperCase());
              if (studentRecord) {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},${studentRecord.field5},,\n`;
              } else {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
              }
            }
          } else {
            const filename = basename(file);
            mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});

            const content = readFileSync(file);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
            // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
            csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
          }
        } else {
          if (existsSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + studentFolder)) {
            if (studentInfo.remove) {
              deleteFolderRecursive(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + studentFolder);
            } else {
              const studentRecord = grades.find(grade => grade[Object.keys(grades[0])[0]] === studentInfo.studentId.toUpperCase());
              if (studentRecord) {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},${studentRecord.field5},,\n`;
              } else {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
              }
            }
          } else {
            const filename = basename(file);
            mkdirSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});

            const content = readFileSync(file);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
            // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
            csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
          }
        }
        csvString += csvData;
        count++;
      }

      //
      if (updateRequest.workspace === DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
        writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
        return ;
      } else {
        writeFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
        return;
      }

    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}



export function createAssignment(event: IpcMainInvokeEvent, createInfo: CreateAssignmentInfo): Promise<any> {

  if (createInfo.assignmentName.length < 5) {
    return Promise.reject(`Assignment must be > 5 characters`);
  }

  let assignmentName: string = createInfo.assignmentName.trim();

  try {
    return getConfig().then(async (config) => {
      const folders = glob.sync(config.defaultPath + '/*');

      let foundCount = 0;
      for (let i = 0; i < folders.length; i++) {
        if (isFolder(folders[i])) {
          const assignmentDirectoryName = path.basename(folders[i]);
          // Doing a casesensitive check on the directory names - for Window's sake
          if (assignmentName.toLowerCase() === assignmentDirectoryName.toLowerCase()) {
            foundCount++;

            // Doing a casesensitive check on the directory names - for Window's sake
          } else if ((assignmentName.toLowerCase() + ' (' + (foundCount + 1) + ')') === assignmentDirectoryName.toLowerCase()) {
            foundCount++;
          }
        }
      }

      if (foundCount > 0) {
        assignmentName = assignmentName + ' (' + (foundCount + 1) + ')';
      }

      const noRubric: boolean = createInfo.noRubric;
      let rubricName: string;
      let rubric: IRubric = null;
      let rubricIndex: number;
      let rubrics: IRubric[];

      if (!noRubric) {
        if (isNil(createInfo.rubric)) {
          return Promise.reject(NOT_PROVIDED_RUBRIC);
        }

        rubricName = createInfo.rubric.trim();
        if (!isNullOrUndefined(rubricName)) {
          const rubricData = readFileSync(CONFIG_DIR + RUBRICS_FILE);
          try {
            if (!isJson(rubricData)) {
              return Promise.reject(INVALID_RUBRIC_JSON_FILE);
            }

            rubrics = JSON.parse(rubricData.toString());

            if (Array.isArray(rubrics)) {
              let index = -1;
              for (let i = 0; i < rubrics.length; i++) {
                if (rubrics[i].name === rubricName) {
                  index = i;
                  break;
                }
              }

              if (index !== -1) {
                rubric = rubrics[index];
                rubricIndex = index;
              }
            } else {
              return Promise.reject(COULD_NOT_READ_RUBRIC_LIST);
            }

          } catch (e) {
            return Promise.reject(e.message);
          }
        }
      }
      const studentDetails: StudentInfo[] = createInfo.studentRow;

      if (!Array.isArray(studentDetails)) {
        return Promise.reject(`Student details must be a list`);
      }

      if (studentDetails.length !== createInfo.files.length) {
        return Promise.reject(`Student details is not equal to number of files sent!`);
      }

      const settings: AssignmentSettingsInfo = {defaultColour: '#6F327A', rubric, isCreated: true};

      let count = 0;
      const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
      const line = `''\n`;
      const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
      let csvString = headers + line + subheaders;
      for (const studentInfo of studentDetails) {
        const file: any = createInfo.files[count];
        const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
        const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
        const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
        const csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
        csvString += csvData;

        if (createInfo.workspace === DEFAULT_WORKSPACE || isNil(createInfo.workspace)) {
          const filename = basename(file);
          mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
          mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});
          const content = readFileSync(file);
          const pdfDoc = await PDFDocument.load(content);
          const pdfBytes = await pdfDoc.save();
          await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
          count++;
        } else {
          const filename = basename(file);
          mkdirSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
          mkdirSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});
          const content = readFileSync(file);
          const pdfDoc = await PDFDocument.load(content);
          const pdfBytes = await pdfDoc.save();
          await writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
          count++;
        }
      }

      if (createInfo.workspace === DEFAULT_WORKSPACE || isNil(createInfo.workspace)) {
        writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
        writeFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        return;
      } else {
        writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
        writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        return;
      }

    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}



export function getGrades(event: IpcMainInvokeEvent, workspaceName: string, assignmentName: string): Promise<any> {

  return getAssignmentDirectory(workspaceName, assignmentName).then((assignmentFolder) => {
    return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE);
    });
  });
}

function getAssignmentSettingsAt(assignmentFolder: string): Promise<any> {
  assignmentFolder = assignmentFolder.replace(/\//g, sep);
  if (existsSync(assignmentFolder)) {
    return readFile(assignmentFolder + sep + SETTING_FILE).then((data) => {
      if (!isJson(data)) {
        return Promise.reject('Assignment settings is not JSON');
      }
      return JSON.parse(data.toString());
    }, (error) => {
      return Promise.reject(error.message);
    });
  } else {
    return Promise.reject('Could not load assignment settings');
  }
}

function getAssignmentSettingsFor(workspaceName: string, assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectory(workspaceName, assignmentName)
    .then((directory) => getAssignmentSettingsAt(directory));
}


export function getAssignmentSettings(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentSettingsFor(workspaceName, assignmentName);
}


export function getAssignmentGlobalSettings(event: IpcMainInvokeEvent, location: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentSettingsAt(location);
}

function writeAssignmentSettingsAt(assignmentSettings: AssignmentSettingsInfo, location: string): Promise<AssignmentSettingsInfo> {
  const buffer = new Uint8Array(Buffer.from(JSON.stringify(assignmentSettings)));

  return writeToFile(location + sep + SETTING_FILE, buffer, null, 'Failed to save assignment settings!').then(() => {
    return assignmentSettings;
  });
}

function writeAssignmentSettingsFor(
  assignmentSettings: AssignmentSettingsInfo,
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectory(workspaceName, assignmentName)
    .then((assignmentDirectory) => writeAssignmentSettingsAt(assignmentSettings, assignmentDirectory));
}

export function finalizeAssignment(event: IpcMainInvokeEvent, workspaceFolder: string, location: string): Promise<any> {
  try {
    return getConfig().then((config) => {
      const loc = location.replace(/\//g, sep);
      if (workspaceFolder && workspaceFolder !== DEFAULT_WORKSPACE) {
        workspaceFolder = workspaceFolder.replace(/\//g, sep);
      } else {
        workspaceFolder = '';
      }
      const assignmentFolder = (workspaceFolder !== '') ? config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE).then((gradesJSON) => {
        const files = glob.sync(assignmentFolder + sep + '/*');
        const promises: Promise<any>[] = files.map((file) => {
          if (statSync(file).isDirectory()) {
            const regEx = /(.*)\((.+)\)$/;
            if (!regEx.test(file)) {
              return Promise.reject(INVALID_STUDENT_FOLDER + ' ' + basename(file));
            }

            const matches = regEx.exec(file);

            const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');

            const submissionPromisses: Promise<any>[] = submissionFiles.map((submission) => {
              try {
                accessSync(submission, constants.F_OK);
                const studentFolder = dirname(dirname(submission));
                return loadMarksAt(studentFolder).then((submissionInfo: MarkingSubmissionInfo) => {
                  if (submissionInfo.marks.length > 0) {
                    const ext = path.extname(submission);
                    let fileName = path.basename(submission, ext);
                    return annotatePdfFile(submission, submissionInfo).then(async (data) => {
                      fileName += '_MARK';
                      writeFileSync(studentFolder + sep + FEEDBACK_FOLDER + sep + fileName + '.pdf', data.pdfBytes);
                      unlinkSync(submission);
                      accessSync(assignmentFolder + sep + GRADES_FILE, constants.F_OK);
                      let changed = false;
                      let assignmentHeader;
                      for (let i = 0; i < gradesJSON.length; i++) {
                        if (i === 0) {
                          const gradeKeys = Object.keys(gradesJSON[i]);
                          if (gradeKeys.length > 0) {
                            assignmentHeader = gradeKeys[0];
                          }
                        } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === matches[2].toUpperCase()) {
                          gradesJSON[i].field5 = data.totalMark;
                          changed = true;
                        }
                      }
                      if (changed) {
                        return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                          .then(csv => {
                            return writeFile(assignmentFolder + sep + GRADES_FILE, csv);
                          }, () => {
                            return Promise.reject( 'Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                          });
                      } else {
                        return Promise.reject('Failed to save mark');
                      }
                    }, (error) => {
                      return Promise.reject('Error annotating marks to PDF ' + fileName + ' [' + error.message + ']');
                    });
                  }
                });

              } catch (e) {
                return Promise.reject(e.message);
              }
            });

            return Promise.all(submissionPromisses);
          }
        });
        return Promise.all(promises).then(() => {
          return zipDir((workspaceFolder !== '') ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
            {filter: (path: string, stat) => (!(/\.marks\.json|\.settings\.json|\.zip$/.test(path)) && ((path.endsWith(assignmentFolder)) ? true : (path.startsWith((assignmentFolder) + sep))))})
            .then((buffer) => {
              return buffer;
            }, (err) => {
              return Promise.reject('Could not export assignment');
            });
        });
      });
    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}




export function finalizeAssignmentRubric(event: IpcMainInvokeEvent, workspaceFolder: string, location: string, rubricName: string): Promise<any> {
  try {
    return getConfig().then((config) => {
      const loc = location.replace(/\//g, sep);
      if (workspaceFolder && workspaceFolder !== DEFAULT_WORKSPACE) {
        workspaceFolder = workspaceFolder.replace(/\//g, sep);
      } else {
        workspaceFolder = '';
      }
      const assignmentFolder = (workspaceFolder !== '') ? config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE).then((gradesJSON) => {
        const files = glob.sync(assignmentFolder + sep + '/*');
        const assignmentSettingsBuffer = readFileSync(assignmentFolder + sep + SETTING_FILE);
        if (!isJson(assignmentSettingsBuffer)) {
          return Promise.reject('Invalid assignment settings file!');
        }

        const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());

        const promises: Promise<any>[] = files.map((file) => {
          if (statSync(file).isDirectory()) {
            const regEx = /(.*)\((.+)\)$/;
            if (!regEx.test(file)) {
              return Promise.reject(INVALID_STUDENT_FOLDER + ' ' + basename(file));
            }

            const matches = regEx.exec(file);

            const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');
            rubricName = rubricName.trim();

            if (isNullOrUndefined(assignmentSettingsInfo.rubric)) {
              return Promise.reject('Assignment\'s settings does not contain a rubric!');
            } else if (assignmentSettingsInfo.rubric.name !== rubricName) {
              return Promise.reject('Assignment\'s settings rubric does not match provided!');
            }

            const submissionPromisses: Promise<any>[] = submissionFiles.map((submission) => {
              try {
                accessSync(submission, constants.F_OK);
                const studentFolder = dirname(dirname(submission));
                return loadMarksAt(studentFolder).then((submissionInfo: RubricSubmissionInfo) => {
                  return annotatePdfRubric(submission, submissionInfo, assignmentSettingsInfo.rubric).then((data) => {
                    const ext = path.extname(submission);
                    const fileName = path.basename(submission, ext) + '_MARK';
                    writeFileSync(studentFolder + sep + FEEDBACK_FOLDER + sep + fileName + '.pdf', data.pdfBytes);
                    unlinkSync(submission);
                    accessSync(assignmentFolder + sep + GRADES_FILE, constants.F_OK);
                    let changed = false;
                    let assignmentHeader;
                    for (let i = 0; i < gradesJSON.length; i++) {
                      if (i === 0) {
                        const gradesKeys = Object.keys(gradesJSON[i]);
                        if (gradesKeys.length > 0) {
                          assignmentHeader = gradesKeys[0];
                        }
                      } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === matches[2].toUpperCase()) {
                        gradesJSON[i].field5 = data.totalMark;
                        changed = true;
                        break;
                      }
                    }
                    if (changed) {
                      return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                        .then(csv => {
                          return writeFile(assignmentFolder + sep + GRADES_FILE, csv);
                        })
                        .catch(() => {
                          return Promise.reject('Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                        });
                    } else {
                      return Promise.reject('Failed to save mark');
                    }
                  }, (error) => {
                    return Promise.reject('Error annotating marks to PDF [' + error.message + ']');
                  });
                });
              } catch (e) {
                return Promise.reject(e.message);
              }
            });

            return Promise.all(submissionPromisses);
          }
        });
        return Promise.all(promises).then(() => {
          return zipDir((workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
            {filter: (filterPath: string, stat) => (!(/\.marks\.json|.settings.json|\.zip$/.test(filterPath)) && ((filterPath.endsWith(assignmentFolder)) ? true : (filterPath.startsWith(assignmentFolder + sep))))})
            .then((buffer) => {
              return buffer;
            }, (err) => {
              return Promise.reject('Could not export assignment');
            });
        });
      });
    });

  } catch (e) {
    return Promise.reject( e.message);
  }
}


function cleanupTemp(tmpDir: string) {
  try {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true });
    }
  } catch (e) {
    console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
  }
}

export function shareExport(event: IpcMainInvokeEvent, shareRequest: ShareAssignments): Promise<any> {

  try {

    return getAssignmentDirectory(shareRequest.workspaceFolder, shareRequest.assignmentName).then((originalAssignmentDirectory) => {

      return csvtojson({
        noheader: true,
        trim: false
      }).fromFile(originalAssignmentDirectory + sep + GRADES_FILE).then((gradesJSON) => {
        let tmpDir;
        // Create a temp directory to construct files to zip
        tmpDir = mkdtempSync(path.join(os.tmpdir(), 'pdfm-'));

        const tempAssignmentDirectory = tmpDir + sep + shareRequest.assignmentName;
        mkdirSync(tempAssignmentDirectory);

        // Now copy each submission
        shareRequest.submissions.forEach((submission) => {
          const submissionDirectoryName = submission.directoryName;
          copySync(originalAssignmentDirectory + sep + submissionDirectoryName, tempAssignmentDirectory + sep + submissionDirectoryName);
        });

        const shareGradesJson = [
          gradesJSON[0],
          gradesJSON[1],
          gradesJSON[2],
        ];
        for (let i = 3; i < gradesJSON.length; i++) {
          const gradesStudentId = gradesJSON[i].field2;
          const studentPredicate = (student) => student.studentNumber.toUpperCase() === gradesStudentId.toUpperCase();
          const shouldExport = !isNil(find(shareRequest.submissions, studentPredicate));
          if (shouldExport) {
            shareGradesJson.push(gradesJSON[i]);
          }
        }

        return json2csvAsync(shareGradesJson, {emptyFieldValue: '', prependHeader: false})
          .then(csv => {
            return writeFile(tempAssignmentDirectory + sep + GRADES_FILE, csv);
          })
          .then(() => {
            return zipDir(tmpDir);
          })
          .then((buffer) => {
            cleanupTemp(tmpDir);
            return buffer;
          }, (error) => {
            cleanupTemp(tmpDir);
            return Promise.reject(error.message);
          });
      });
    });
  } catch (e) {
    console.error(e);
    return Promise.reject('Error trying to export share');
  }
}




export function updateAssignmentRubric(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string,
  rubricName: string): Promise<IRubric> {


  return Promise.all([
    findRubric(rubricName),
    getAssignmentDirectory(workspaceName, assignmentName)
  ]).then((results) => {

    const rubric: IRubric = results[0];
    const assignmentDirectory: string = results[1];

    // Remove all marks files
    const markFiles = glob.sync(assignmentDirectory + sep + '/**/' + MARK_FILE);
    markFiles.forEach(markFile => {
      unlinkSync(markFile);
    });

    return getAssignmentSettingsFor(workspaceName, assignmentName)
      .then((originalSettings) => {
        originalSettings.rubric = rubric;
        return writeAssignmentSettingsFor(originalSettings, workspaceName, assignmentName);
      }).then(() => {
        return checkAccess(assignmentDirectory + sep + GRADES_FILE).then(() => {
          return csvtojson({noheader: true, trim: false}).fromFile(assignmentDirectory + sep + GRADES_FILE)
            .then((gradesJSON) => {
              let changed = false;
              let assignmentHeader;
              for (let i = 0; i < gradesJSON.length; i++) {
                if (i === 0) {
                  const keys = Object.keys(gradesJSON[i]);
                  if (keys.length > 0) {
                    assignmentHeader = keys[0];
                  }
                } else if (i > 1) {
                  gradesJSON[i].field5 = '';
                  changed = true;
                }
              }

              if (changed) {
                return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then( ( csv) => {
                  return writeToFile(assignmentDirectory + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!').then(() => {
                    return rubric;
                  });
                }, (err) => {
                  return Promise.reject('Failed to convert json to csv!');
                });
              } else {
                return Promise.reject('Failed to save mark');
              }
            }, reason => {
              return Promise.reject( reason);
            });
        });
      });

  });
}


export function getPdfFile(event: IpcMainInvokeEvent, location: string): Promise<Uint8Array> {
  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);
    const actualPath = config.defaultPath + sep + loc;

    return checkAccess(actualPath).then(() => {
      return readFile(actualPath);
    });
  });
}

function countFileFilter(startPath: any, filter: string): number {
  let count = 0;

  if (!existsSync(startPath)) {
    return 0;
  }

  const files = readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const fileStat = lstatSync(filename);
    if (fileStat.isDirectory()) {
      count = count + countFileFilter(filename, filter);
    } else if (filename.indexOf(filter) >= 0) {
      count = count + 1;
    }
  }
  return count;
}

export function getMarkedAssignmentsCount(event: IpcMainInvokeEvent, workingFolder: string, assignmentName: string): Promise<number> {
  return getAssignmentDirectory(workingFolder, assignmentName).then((assignmentDirectory) => {
    return countFileFilter(assignmentDirectory, '.marks.json');
  });
}
