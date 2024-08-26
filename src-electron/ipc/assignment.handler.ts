import {existsSync, mkdtempSync, rmSync, statSync, unlinkSync} from 'fs';
import * as glob from 'glob';
import {getConfig} from './config.handler';
import {checkAccess, isFolder, isJson} from '../utils';
import {INVALID_STUDENT_FOLDER, WORKSPACE_DIR} from '../constants';
import {basename, extname, join, sep} from 'path';
import {json2csv} from 'json-2-csv';
import {mkdir, readFile, rm, stat, writeFile} from 'fs/promises';
import {cloneDeep, filter, find, findIndex, forEach, isNil, map, reduce, remove} from 'lodash';
import {IpcMainInvokeEvent} from 'electron';
import {IRubric} from '@shared/info-objects/rubric.class';
import {AssignmentInfo, AssignmentSubmissionInfo} from '@shared/info-objects/assignment.info';
import {
  AssignmentSettingsInfo,
  AssignmentState,
  DEFAULT_ASSIGNMENT_SETTINGS,
  DistributionFormat,
  SourceFormat,
  Submission,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {ExportAssignmentsRequest, ExportFormat} from '@shared/info-objects/export-assignments-request';
import {tmpdir} from 'os';
import {copy, copyFile, readdir} from 'fs-extra';
import {getAssignmentDirectoryAbsolutePath, getWorkingDirectoryAbsolutePath} from './workspace.handler';
import {
  ASSIGNMENT_BACKUP_DIR,
  DEFAULT_WORKSPACE,
  FEEDBACK_FOLDER,
  GRADES_FILE,
  MARK_FILE,
  SETTING_FILE,
  SUBMISSION_FOLDER,
  uuidv4
} from '@shared/constants/constants';
import {SubmissionInfo, SubmissionMarkType} from '@shared/info-objects/submission.info';
import {getComments, updateCommentsFile} from './comment.handler';
import {findRubric} from './rubric.handler';
import {GradesCSV, GradesSubmissionType, GroupGrade, StudentGrade} from '@shared/info-objects/grades';
import {WorkerPool} from '../worker-pool';
import {zipDir} from '../zip';
import {
  AnnotateSubmissionTaskDetails,
  FinalizeSubmissionTaskDetails,
  MarkerExportTaskDetails
} from '../web-worker/task-detail';
import {JSZipObject} from "jszip";

const pool = WorkerPool.getInstance();

const csvtojson = require('csvtojson');
const CSV_DELIMITERS = [",", ";"];


export function saveMarks(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string,
  studentId: string,
  submissionInfo: SubmissionInfo): Promise<any> {


  let totalMark = 0;
  return Promise.all([
    getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName),
    getAssignmentSettingsFor(workspaceName, assignmentName)
  ])
    .then(([assignmentPath, assignmentSettings]) => {
      const submission = find(assignmentSettings.submissions, {studentId});
      const submissionPath = assignmentPath + sep + submission.directoryName;
      return Promise.all([
        getConfig(),
        saveSubmissionInfo(submissionPath, submissionInfo)
      ]).then(([config]) => {
        let savePromise: Promise<any> = Promise.resolve();

        if (submissionInfo.type === SubmissionMarkType.MARK) {

          const marksPerPage = submissionInfo.marks as MarkInfo[][];
          let hadMarks = false;
          savePromise = getComments().then((comments) => {
            let updateComments = false;

            marksPerPage.forEach((pageMarks) => {
              if (Array.isArray(pageMarks)) {
                for (let i = 0; i < pageMarks.length; i++) {
                  hadMarks = true;
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

            if (!hadMarks) {
              // No pages contained marks
              totalMark = null;
            }

            if (updateComments) {
              return updateCommentsFile(comments);
            }
          });
        } else if (submissionInfo.type === SubmissionMarkType.RUBRIC) {
          if (isNil(assignmentSettings.rubric)) {
            return Promise.reject('Assignment\'s settings does not contain a rubric!');
          }

          let hadMarks = false;
          const marks = submissionInfo.marks as number[];
          marks.forEach((levelIndex: number, index: number) => {
            if (levelIndex !== null) {
              hadMarks = true;
              totalMark += parseFloat('' + assignmentSettings.rubric.criterias[index].levels[levelIndex].score);
            }
          });

          if (!hadMarks) {
            totalMark = null;
          }

        } else {
          return Promise.reject('Unknown submission info type');
        }

        return savePromise.then(() => {
          submission.mark = totalMark;

          if (assignmentSettings.distributionFormat === DistributionFormat.DISTRIBUTED ) {
            const userId = config.user ? config.user.id : null;
            const markerId = submission.allocation ? submission.allocation.id : null;
            const assignmentOwnerId = assignmentSettings.owner ? assignmentSettings.owner.id : null;

            // Flag if the allocation may be moved to the owner of the assignment
            const allowReAllocateToOwner = submission.state === SubmissionState.NOT_MARKED && assignmentOwnerId === userId;

            if (allowReAllocateToOwner && !isNil(userId) && userId !== markerId) {
              // We are allowed to change the owner, and the allocation was not the owner
              submission.allocation = {
                id: userId,
                email: config.user.email
              };
            }
          }

          if (!(submission.state === SubmissionState.MODERATED || submission.state === SubmissionState.SENT_FOR_MODERATION)) {
            // Only update the submission state if it is not being moderated
            if (isNil(totalMark)) {
              submission.state = isNil(submission.allocation) ? SubmissionState.NEW : SubmissionState.ASSIGNED_TO_MARKER;
            } else {
              submission.state = SubmissionState.MARKED;
            }
          }
          if (assignmentSettings.state !== AssignmentState.IN_PROGRESS) {
            assignmentSettings.state = AssignmentState.IN_PROGRESS;
            assignmentSettings.stateDate = new Date().toISOString();
          }
          return writeAssignmentSettingsAt(assignmentSettings, assignmentPath);
        });
      });
    });
}

export function saveSubmissionInfo(studentLocation: string, submissionInfo: SubmissionInfo): Promise<SubmissionInfo> {
  return writeFile(studentLocation + sep + MARK_FILE, JSON.stringify(submissionInfo))
    .then(() => submissionInfo, () => Promise.reject('Failed to save student marks!'));
}


export function loadMarks(workspaceName: string, assignmentName: string, studentId: string): Promise<SubmissionInfo> {
  return Promise.all([
    getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName),
    getAssignmentSettingsFor(workspaceName, assignmentName)
  ]).then(([assignmentAbsolutePath, assignmentSettings]) => {
    const submission = find(assignmentSettings.submissions, {studentId});
    return assignmentAbsolutePath + sep + submission.directoryName;
  }).then((absolutePath) => {
    return loadMarksAt(absolutePath);
  });
}
export function loadMarksAt(studentFolderFull: string): Promise<SubmissionInfo> {
  return readFile(studentFolderFull + sep + MARK_FILE).then((data) => {
    if (!isJson(data)) {
      return new SubmissionInfo();
    } else {
      return JSON.parse(data.toString());
    }
  }, () => {
    return new SubmissionInfo();
  });
}

export function getMarks(event: IpcMainInvokeEvent, workspaceName: string, assignmentName: string, studentId: string): Promise<SubmissionInfo> {
  return loadMarks(workspaceName, assignmentName, studentId);
}



// Only For updating colour for now
export function updateAssignmentSettings(
  event: IpcMainInvokeEvent,
  updatedSettings: any = {},
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return writeAssignmentSettingsFor(updatedSettings, workspaceName, assignmentName);
}



export function updateAssignment(event: IpcMainInvokeEvent, updateRequest: AssignmentInfo): Promise<any> {
  return Promise.all([
    getAssignmentSettingsFor(updateRequest.workspace, updateRequest.assignmentName),
    getAssignmentDirectoryAbsolutePath(updateRequest.workspace, updateRequest.assignmentName)
  ]).then(([assignmentSettings, assignmentAbsolutePath]) => {
    if (assignmentSettings.sourceFormat !== SourceFormat.MANUAL) {
      return Promise.reject('Operation not permitted on this type of assignment!');
    }

    const promises: Promise<any>[] = [];
    // Not find all the submissions we had, and not in the request, remove them
    assignmentSettings.submissions.forEach(submission => {
      const foundIndex = findIndex(updateRequest.submissions, s => s.studentId === submission.studentId);
      if (foundIndex < 0) {
        remove(assignmentSettings.submissions, {studentId: submission.studentId.toUpperCase()});
        const promise = rm(assignmentAbsolutePath + sep + submission.directoryName, {recursive: true});
        promises.push(promise);
      }
    });

    updateRequest.submissions.forEach((studentInfo) => {
      const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() +
        '(' + studentInfo.studentId.toUpperCase() + ')';
      const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
      const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;

      const existingSubmission = find(assignmentSettings.submissions, {studentId: studentInfo.studentId.toUpperCase()});

      if (isNil(existingSubmission)) {
        const filename = basename(studentInfo.submissionFilePath);
        assignmentSettings.submissions.push({
          studentId: studentInfo.studentId.toUpperCase(),
          studentName: studentInfo.studentName.toUpperCase(),
          studentSurname: studentInfo.studentSurname.toUpperCase(),
          allocation: null,
          lmsStatusText: null,
          state: SubmissionState.NEW,
          directoryName: studentFolder,
          mark: null
        });
        const promise =  mkdir(assignmentAbsolutePath + sep + feedbackFolder, {recursive: true})
          .then(() =>  mkdir(assignmentAbsolutePath + sep + submissionFolder, {recursive: true}))
          .then(() => copyFile(studentInfo.submissionFilePath, assignmentAbsolutePath + sep + submissionFolder + sep + filename));
        promises.push(promise);
      }
      // else, we don't update other details of the submission
    });

    return Promise.all(promises)
      .then(() => writeAssignmentSettingsAt(assignmentSettings, assignmentAbsolutePath));

  });
}



export function createAssignment(event: IpcMainInvokeEvent, createInfo: AssignmentInfo): Promise<any> {

  let assignmentName: string = createInfo.assignmentName.trim();

  let rubricPromise: Promise<IRubric> = Promise.resolve(null);
  if (!isNil(createInfo.rubric)) {
    rubricPromise = findRubric(createInfo.rubric.trim());
  }
  return Promise.all([
    getWorkingDirectoryAbsolutePath(createInfo.workspace),
    rubricPromise
  ]).then(([workspaceAbsolutePath ,  rubric]) => {
    const folders = glob.sync(WORKSPACE_DIR.replace(/\\/g, '/') + '/*');

    let foundCount = 0;
    for (let i = 0; i < folders.length; i++) {
      if (isFolder(folders[i])) {
        const assignmentDirectoryName = basename(folders[i]);
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

    const studentDetails: AssignmentSubmissionInfo[] = createInfo.submissions;
    const settings: AssignmentSettingsInfo = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
    settings.sourceId = uuidv4();
    settings.assignmentName = assignmentName;
    settings.rubric = rubric;
    settings.sourceFormat = SourceFormat.MANUAL;

    const submissionPromises: Promise<any>[] = studentDetails.map((studentInfo) => {
      const file = studentInfo.submissionFilePath;
      const filename = basename(file);
      const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() +
        '(' + studentInfo.studentId.toUpperCase() + ')';
      const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
      const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;

      settings.submissions.push({
        studentId: studentInfo.studentId.toUpperCase(),
        studentName: studentInfo.studentName,
        studentSurname: studentInfo.studentSurname,
        allocation: null,
        lmsStatusText: null,
        mark: null,
        state: SubmissionState.NEW,
        directoryName: studentFolder
      });

      return mkdir(workspaceAbsolutePath + sep + assignmentName + sep + feedbackFolder, {recursive: true})
        .then(() =>  mkdir(workspaceAbsolutePath + sep + assignmentName + sep + submissionFolder, {recursive: true}))
        .then(() => copyFile(file, workspaceAbsolutePath + sep + assignmentName + sep + submissionFolder + sep + filename));
    });

    return Promise.all(submissionPromises)
      .then(() => writeFile(workspaceAbsolutePath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings)));

  });
}

function setDateFinalized(assignmentFolder: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentSettingsAt(assignmentFolder).then((assignmentSettings) => {
    assignmentSettings.state = AssignmentState.FINALIZED;
    assignmentSettings.stateDate = new Date().toISOString();
    return writeAssignmentSettingsAt(assignmentSettings, assignmentFolder);
  });
}

export function getAssignmentSettingsAt(assignmentFolder: string): Promise<AssignmentSettingsInfo> {
  assignmentFolder = assignmentFolder.replace(/\//g, sep);
  if (existsSync(assignmentFolder)) {
    return readFile(assignmentFolder + sep + SETTING_FILE).then((data) => {
      if (!isJson(data)) {
        return Promise.reject('Assignment settings is not JSON');
      }
      return JSON.parse(data.toString()) as AssignmentSettingsInfo;
    }, (error) => {
      return Promise.reject(error.message);
    });
  } else {
    return Promise.reject('Could not load assignment settings');
  }
}


export function getAssignmentSettingsFor(workspaceName: string, assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
    .then((directory) => getAssignmentSettingsAt(directory));
}


export function getAssignmentSettings(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentSettingsFor(workspaceName, assignmentName);
}

export function writeAssignmentSettingsAt(
  assignmentSettings: AssignmentSettingsInfo,
  assignmentAbsolutePath: string): Promise<AssignmentSettingsInfo> {

  return writeFile(assignmentAbsolutePath + sep + SETTING_FILE, JSON.stringify(assignmentSettings)).then(() => {
    return assignmentSettings;
  }, () => {
    return Promise.reject('Failed to save assignment settings!');
  });
}

export function writeAssignmentSettingsFor(
  assignmentSettings: AssignmentSettingsInfo,
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
    .then((assignmentAbsolutePath) => writeAssignmentSettingsAt(assignmentSettings, assignmentAbsolutePath));
}

/**
 * Process raw csv data and build a <code>GradesCSV</code> object
 * @param data Raw array of table data.
 */
function processGradesFile(data: any[]): GradesCSV<StudentGrade|GroupGrade>{

  // If row 3 field 1 is "Group" it is a group assignment
  const isGroup = data[2].field1 == "Group";

  const grades: GradesCSV<StudentGrade|GroupGrade> = {
    submissionType: isGroup ? GradesSubmissionType.GROUP : GradesSubmissionType.STUDENT,
    grades: [],
    header: {
      gradeType: data[0].field2,
      assignmentName: data[0].field1
    }
  };

  // Grade data begins on row 4 (index 3)
  for (let index = 3; index < data.length; index++) {

    if (isGroup){
      grades.grades.push({
        submissionType: GradesSubmissionType.GROUP,
        id: data[index].field2,
        name: data[index].field1,
        grade: data[index].field4 === '' ? null : +data[index].field4,
        users: data[index].field3 === '' ? [] : data[index].field3.split(";"),
        submissionDate: data[index].field5,
        lateSubmission: data[index].field6,
      } as GroupGrade);
    } else {
      grades.grades.push({
        submissionType: GradesSubmissionType.STUDENT,
        displayId: data[index].field1,
        id: data[index].field2,
        lastName: data[index].field3,
        firstName: data[index].field4,
        grade: data[index].field5 === '' ? null : +data[index].field5,
        submissionDate: data[index].field6,
        lateSubmission: data[index].field7
      } as StudentGrade);
    }
  }

  return grades;
}

export function readStudentGradesFromFile(sourceFile: string): Promise<GradesCSV<StudentGrade>> {
  return readGradesCsvFromFile(sourceFile)
      .then((data) => processGradesFile(data),
        () => {
    return null;
  });
}

export function readGradesFromFile(sourceFile: string): Promise<GradesCSV<StudentGrade|GroupGrade>> {
  return readGradesCsvFromFile(sourceFile)
      .then((data) => processGradesFile(data),
        () => {
    return null;
  });
}



export function readGradesFromZipFile(zipFile: JSZipObject): Promise<any[]> {
  return zipFile.async('nodebuffer').then((data) => {
    return csvtojson({noheader: true, trim: false, delimiter: CSV_DELIMITERS})
      .fromString(data.toString())
  });
}

function readGradesCsvFromFile(sourceFile: string): Promise<any[]> {
  return stat(sourceFile)
    .then(() =>  {
      return csvtojson({noheader: true, trim: false, delimiter: CSV_DELIMITERS})
    .fromFile(sourceFile)
  }, () => {
    return null;
  });
}

function writeGradesCsv(outputFile: string, grades: GradesCSV<StudentGrade|GroupGrade>): Promise<any> {
  const gradesJSON = [];
  gradesJSON.push({
    field1: grades.header.assignmentName,
    field2: grades.header.gradeType,
  });
  gradesJSON.push({
    field1: ''
  });

  if (grades.submissionType === GradesSubmissionType.STUDENT){
    gradesJSON.push({
      field1: 'Display ID',
      field2: 'ID',
      field3: 'Last Name',
      field4: 'First Name',
      field5: 'grade',
      field6: 'Submission date',
      field7: 'Late submission'
    });

    forEach(grades.grades as StudentGrade[], (studentGrade) => {
      gradesJSON.push({
        field1: studentGrade.displayId,
        field2: studentGrade.id,
        field3: studentGrade.lastName,
        field4: studentGrade.firstName,
        field5: studentGrade.grade,
        field6: studentGrade.submissionDate,
        field7: studentGrade.lateSubmission,
      });
    });
  } else {
    gradesJSON.push({
      field1: 'Group',
      field2: 'ID',
      field3: 'Users',
      field4: 'grade',
      field5: 'Submission date',
      field6: 'Late submission'
    });

    forEach(grades.grades as GroupGrade[], (studentGrade) => {
      gradesJSON.push({
        field1: studentGrade.name,
        field2: studentGrade.id,
        field3: studentGrade.users.join(";"),
        field4: studentGrade.grade,
        field5: studentGrade.submissionDate,
        field6: studentGrade.lateSubmission,
      });
    });
  }

  return Promise.resolve(json2csv(gradesJSON, {
    delimiter:{
      field: ",",
      eol: '\n',
      wrap: "\'"
    },
    emptyFieldValue: '',
    prependHeader: false,

  }))
    .then(csv => {
      return writeFile(outputFile, csv);
    }, (error) => {
      console.error(error);
      return Promise.reject( 'Failed to export marks.csv');
    });
}

function writeGrades(outputDirectory: string, assignmentSettings: AssignmentSettingsInfo, assignmentName: string): Promise<any> {
  return stat(outputDirectory + sep + GRADES_FILE)
    .then(_ => true, _ => false)
    .then((exists) => {
      let promise: Promise<GradesCSV<StudentGrade|GroupGrade>>;
      if (exists) {
        promise = readGradesFromFile(outputDirectory + sep + GRADES_FILE);
      } else {
        promise = Promise.resolve({
          submissionType: assignmentSettings.sourceFormat == SourceFormat.SAKAI_GROUP ? GradesSubmissionType.GROUP : GradesSubmissionType.STUDENT,
          grades: [],
          header: {
            gradeType: 'SCORE_GRADE_TYPE',
            assignmentName: assignmentName
          }
        });
      }
      return promise.then((grades) => {
        forEach(assignmentSettings.submissions, (submission) => {
          // Find existing student grade
          let studentGrade = find(grades.grades, {id: submission.studentId}) as StudentGrade | GroupGrade;
          if (isNil(studentGrade)) {
            studentGrade = {
              submissionType: grades.submissionType,
              displayId : submission.studentId,
              id : submission.studentId,
              firstName : submission.studentName,
              lastName : submission.studentSurname,
              grade: null,
              lateSubmission: null,
              submissionDate: null
            };
            grades.grades.push(studentGrade);
          }
          studentGrade.grade = submission.mark;
        });
        return writeGradesCsv(outputDirectory + sep + GRADES_FILE, grades);
      });
    });
}


function finalizeSubmissions(workspaceFolder: string, assignmentName: string): Promise<string> {
  return Promise.all([
    getAssignmentDirectoryAbsolutePath(workspaceFolder, assignmentName),
    getAssignmentSettingsFor(workspaceFolder, assignmentName)
  ]).then(([assignmentFolder, assignmentSettings]) => {
    const files = glob.sync(assignmentFolder.replace(/\\/g, '/') + '/*');
    const promises: Promise<any>[] = files.map((file) => {
      if (statSync(file).isDirectory()) {
        const regEx = /(.*)\((.+)\)$/;
        if (!regEx.test(file)) {
          return Promise.reject(INVALID_STUDENT_FOLDER + ' ' + basename(file));
        }

        // For a NO_SUBMISSION there won't be any files anyway
        const submissionFiles = glob.sync(file.replace(/\\/g, '/') + '/' + SUBMISSION_FOLDER + '/*');
        const submissionPromisses: Promise<any>[] = submissionFiles.map((submission) => {
          return pool.queueTask({
            type: 'FinalizeSubmission',
            assignmentName,
            workspaceFolder,
            assignmentSettings,
            pdfPath: submission
          } as FinalizeSubmissionTaskDetails);
        });

        return Promise.all(submissionPromisses);
      }
      return Promise.resolve();
    });

    return Promise.all(promises)
      .then(() => setDateFinalized(assignmentFolder))
      .then((updatedAssignmentSettings) => {
        // Set status of all assignments that has not been marked
        forEach(updatedAssignmentSettings.submissions, (submission) => {
          if (isNil(submission.mark) && submission.state !== SubmissionState.NO_SUBMISSION) {
            submission.state = SubmissionState.NOT_MARKED;
          }
        });
        return writeAssignmentSettingsFor(updatedAssignmentSettings, workspaceFolder, assignmentName);
      })
      .then(() => 'Assignment exported');
  });
}

export function finalizeAssignment(
  event: IpcMainInvokeEvent,
  workspaceFolder: string,
  assignmentName: string,
  zipFilePath: string): Promise<any> {
  try {
    return Promise.all([
      getAssignmentDirectoryAbsolutePath(workspaceFolder, assignmentName),
      getAssignmentSettingsFor(workspaceFolder, assignmentName)
    ]).then(([ assignmentFolder, assignmentSettings]) => {
      // Finalize the pdfs in the workspace

      const tempDirectory = mkdtempSync(join(tmpdir(), 'pdfm-'));
      const exportTempDirectory = tempDirectory + sep + assignmentName;
      return finalizeSubmissions(workspaceFolder, assignmentName).then(() => {
        return mkdir(exportTempDirectory);
      }).then(() => {
        return stat(assignmentFolder + sep + ASSIGNMENT_BACKUP_DIR)
          .then(() => {
            return copy(assignmentFolder + sep + ASSIGNMENT_BACKUP_DIR, exportTempDirectory);
          }, () => {
            // It's fine if the directory does not exist
          });
      })
        .then(() => {
          return copy(
            assignmentFolder,
            exportTempDirectory, {
              filter: (src) => {
                return !(
                  src.startsWith(assignmentFolder + sep + ASSIGNMENT_BACKUP_DIR) ||
                  src.endsWith(SETTING_FILE) ||
                  src.endsWith(MARK_FILE)
                );
              }
            }
          );
        })
        .then(() => writeGrades(exportTempDirectory, assignmentSettings, assignmentName))
        .then(() => zipDir(tempDirectory, zipFilePath))
        .then((outputPath) => {
          return rm(tempDirectory, {recursive: true}).then(() => outputPath);
        }, (err) => {
          console.error('Could not export assignment');
          console.error(err);
          return rm(tempDirectory, {recursive: true}).then(() => () => {
            return Promise.reject('Could not export assignment');
          });
        });
    });
  } catch (e) {
    return Promise.reject(e.message);
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

export function handleExportAssignment(event: IpcMainInvokeEvent, exportAssignmentsRequest: ExportAssignmentsRequest): Promise<any> {
  return exportAssignment(exportAssignmentsRequest);
}

export function exportAssignment(exportAssignmentsRequest: ExportAssignmentsRequest): Promise<any> {

  if (exportAssignmentsRequest.format === ExportFormat.MODERATION) {
    return exportForModeration(exportAssignmentsRequest);
  }


  const tempDirectory = mkdtempSync(join(tmpdir(), 'pdfm-'));
  const exportTempDirectory = tempDirectory + sep + exportAssignmentsRequest.assignmentName;

  return Promise.all([
    getAssignmentSettingsFor(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
    getAssignmentDirectoryAbsolutePath(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
    mkdir(exportTempDirectory)
  ])
    .then(([assignmentSettings, originalAssignmentDirectory]) => {
      let exportSubmissions: Submission[] = assignmentSettings.submissions;

      if (!isNil(exportAssignmentsRequest.studentIds)) {
        // If a list of student ids was supplied we'll filter only those
        exportSubmissions = filter(assignmentSettings.submissions, (submission) => {
          return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
        });
      }

      // Copy all the submission files
      const promises: Promise<any>[] = exportSubmissions.map((submission) => {
        return copy(
          originalAssignmentDirectory + sep + submission.directoryName,
          exportTempDirectory + sep + submission.directoryName,
          {
            recursive: true,
          }
        );
      });
      return Promise.all(promises)
        .then(() => {
          // We need to create a settings file
          const exportSettings: AssignmentSettingsInfo = cloneDeep(assignmentSettings);

          if (exportAssignmentsRequest.format === ExportFormat.REALLOCATION) {
            exportSettings.state = AssignmentState.NOT_STARTED;
          }

          if (!isNil(exportAssignmentsRequest.studentIds)) {
            // Filter out submissions if required
            exportSettings.submissions = exportSettings.submissions.filter((submission) => {
              return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
            });
          }
          return writeAssignmentSettingsAt(exportSettings, exportTempDirectory);
        })
        .then(() => {
          return zipDir(tempDirectory, exportAssignmentsRequest.zipFilePath);
        })
        .then((buffer) => {
          cleanupTemp(tempDirectory);
          return buffer;
        }, (error) => {
          cleanupTemp(tempDirectory);
          return Promise.reject(error.message);
        });
    });
}




export function updateAssignmentRubric(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string,
  rubricName: string): Promise<AssignmentSettingsInfo> {


  return Promise.all([
    findRubric(rubricName),
    getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
  ]).then((results) => {

    const rubric: IRubric = results[0];
    const assignmentDirectory: string = results[1];

    // Remove all marks files
    const markFiles = glob.sync(assignmentDirectory.replace(/\\/g, '/') + '/**/' + MARK_FILE);
    markFiles.forEach(markFile => {
      unlinkSync(markFile);
    });

    return getAssignmentSettingsFor(workspaceName, assignmentName)
      .then((originalSettings) => {
        originalSettings.rubric = rubric;
        originalSettings.submissions.forEach((submission) => {
          submission.mark = null;
          if (submission.state !== SubmissionState.NO_SUBMISSION) {
            submission.state = SubmissionState.NEW;
          }
        });
        return writeAssignmentSettingsFor(originalSettings, workspaceName, assignmentName);
      });
  });
}


export function getPdfFile(event: IpcMainInvokeEvent, location: string): Promise<Uint8Array> {
  return workspaceRelativePathToAbsolute(location).then((actualPath) => {
    return checkAccess(actualPath).then(() => {
      return readFile(actualPath);
    });
  });
}

/**
 * Convert a workspace relative tree path, to an absolute filesystem path
 * @param relativePath Workspace relative file path
 */
export function workspaceRelativePathToAbsolute(relativePath: string): Promise<string> {
  if (relativePath.startsWith(DEFAULT_WORKSPACE + '/')) {
    relativePath = relativePath.replace(DEFAULT_WORKSPACE + '/', '');
  }
  relativePath = relativePath.replace(/\//g, sep);
  return Promise.resolve(WORKSPACE_DIR + sep + relativePath);
}

function exportForModeration(exportReviewRequestInfo: ExportAssignmentsRequest): Promise<any> {
  return Promise.all([
    getAssignmentSettingsFor(exportReviewRequestInfo.workspaceFolder, exportReviewRequestInfo.assignmentName),
    getAssignmentDirectoryAbsolutePath(exportReviewRequestInfo.workspaceFolder, exportReviewRequestInfo.assignmentName)
  ])
    .then(([assignmentSettings, assignmentPath]) => {

      const exportSubmissions: Submission[] = filter(assignmentSettings.submissions, (submission) => {
        return exportReviewRequestInfo.studentIds.indexOf(submission.studentId) >= 0;
      });
      const tempDirectory = mkdtempSync(join(tmpdir(), 'pdfm-'));
      const zipAssignmentDirectory = tempDirectory + sep + exportReviewRequestInfo.assignmentName;
      return mkdir(zipAssignmentDirectory).then(() => {
        const promises: Promise<any>[] = exportSubmissions.map((submission) => {
          const submissionPath = assignmentPath + sep + submission.directoryName + sep + SUBMISSION_FOLDER;
          return readdir(submissionPath).then((files) => {
            if (files.length === 0) {
              // No submission files
              return Promise.resolve();
            }
            const sourceFilePath = submissionPath + sep + files[0];
            const ext = extname(sourceFilePath);
            const fileName = basename(sourceFilePath, ext);
            const destFilePath = zipAssignmentDirectory + sep + submission.studentName + '_' + submission.studentSurname
              + '_' + submission.studentId + '_' + fileName + '_MARK.pdf';
            return pool.queueTask({
              type: 'AnnotateSubmission',
              sourcePath: sourceFilePath,
              outputPath: destFilePath,
              assignmentSettings: assignmentSettings
            } as AnnotateSubmissionTaskDetails);
          });
        });

        return Promise.all(promises);
      })
        .then(() => zipDir(tempDirectory, exportReviewRequestInfo.zipFilePath))
        .then((buffer) => {
          cleanupTemp(tempDirectory);
          return buffer;
        }, () => {
          cleanupTemp(tempDirectory);
        });
    });
}

export function generateAllocationZipFiles(event: IpcMainInvokeEvent,
                                           workspaceName: string,
                                           assignmentName: string,
                                           exportPath: string): Promise<void> {


  return getAssignmentSettingsFor(workspaceName, assignmentName)
    .then((assignmentSettings) => {

      // Map of marker email to student Id
      const allocationSubmissionsMap: {[key: string]: string[]} = reduce(assignmentSettings.submissions, (submissionsMap, submission) => {

        if (!isNil(submission.allocation) && assignmentSettings.owner.id !== submission.allocation.id) {
          if (!submissionsMap.hasOwnProperty(submission.allocation.email) ) {
            submissionsMap [ submission.allocation.email ] = [];
          }
          submissionsMap[submission.allocation.email].push(submission.studentId);
        }
        return submissionsMap;
      }, {});



      const promises: Promise<any>[] = map(Object.keys(allocationSubmissionsMap), (markerEmail) => {
        return pool.queueTask({
          type: 'MarkerExport',
          studentIds: allocationSubmissionsMap[markerEmail],
          workspaceFolder: workspaceName,
          assignmentName: assignmentName,
          exportPath,
          markerEmail
        } as MarkerExportTaskDetails);
      });

      return Promise.all(promises);
    }).then(() => Promise.resolve()); // End with noop to make it return no value
}


function markerAllocatedInAssignment(assignmentSettings: AssignmentSettingsInfo, markerId: string): boolean {
  if (assignmentSettings.distributionFormat === DistributionFormat.STANDALONE) {
    return false;
  } else {
    return map(assignmentSettings.submissions, 'allocation.id')
      .filter(m => m === markerId).length > 0;
  }
}

/**
 * Returns true if a marker is allocated to an assignment
 */
export function isMarkerAllocated(event: IpcMainInvokeEvent, markerId: string): Promise<boolean> {
  return getConfig().then((settingsInfo) => {
    const workspaceFolders = settingsInfo.folders || [];
    return readdir(WORKSPACE_DIR).then((foundDirectories) => {
      const allAssignmentDirectories: string[] = [];

      // First we calculate all the assignment directories to scan through to find allocations
      const directoryPromises: Promise<any>[] = map(foundDirectories, (directory) => {
        const fullPath = WORKSPACE_DIR + sep + directory;
        if (workspaceFolders.includes(directory)) {
          // Check if the directory is a working directory
          return readdir(fullPath).then((assignmentDirectories) => {
            forEach(assignmentDirectories, (assignmentDirectory) => {
              allAssignmentDirectories.push(fullPath + sep + assignmentDirectory);
            });
          });
        } else {
          allAssignmentDirectories.push(fullPath);
          return Promise.resolve();
        }
      });

      // Function to recursively chain promises until we found an allocation, or ran out of directories
      function generatePromise(found: boolean, index: number) {
        if (!found && index < allAssignmentDirectories.length) {
          return getAssignmentSettingsAt(allAssignmentDirectories[index])
            .then((assignmentSettings) => markerAllocatedInAssignment(assignmentSettings, markerId))
            .then((allocated) => generatePromise(allocated, index + 1));
        }
        return Promise.resolve(found);
      }
      return Promise.all(directoryPromises).then(() => {
        return generatePromise(false, 0);
      });
    });
  });
}
