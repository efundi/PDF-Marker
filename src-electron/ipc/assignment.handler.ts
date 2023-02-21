import {existsSync, mkdtempSync, rmSync, statSync, unlinkSync} from 'fs';
import * as glob from 'glob';
import {getConfig} from './config.handler';
import {checkAccess, isFolder, isJson} from '../utils';
import {INVALID_STUDENT_FOLDER, NOT_PROVIDED_RUBRIC,} from '../constants';
import {basename, dirname, extname, join, sep} from 'path';
import {json2csvAsync} from 'json-2-csv';
import {mkdir, readFile, rm, stat, writeFile} from 'fs/promises';
import {cloneDeep, filter, find, forEach, isNil, map, reduce, remove} from 'lodash';
import {IpcMainInvokeEvent} from 'electron';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {PDFDocument} from 'pdf-lib';
import {IRubric} from '@shared/info-objects/rubric.class';
import {CreateAssignmentInfo, StudentInfo} from '@shared/info-objects/create-assignment.info';
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
import {copy, readdir} from 'fs-extra';
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
import {SubmissionInfo, SubmissionType} from '@shared/info-objects/submission.info';
import {getComments, updateCommentsFile} from './comment.handler';
import {findRubric} from './rubric.handler';
import {GradesCSV, StudentGrade} from '@shared/info-objects/grades';
import {WorkerPool} from '../worker-pool';
import {zipDir} from '../zip';
import {
  AnnotateSubmissionTaskDetails,
  FinalizeSubmissionTaskDetails,
  MarkerExportTaskDetails
} from '../web-worker/task-detail';

const pool = WorkerPool.getInstance();

const csvtojson = require('csvtojson');



export function saveMarks(event: IpcMainInvokeEvent, location: string, submissionInfo: SubmissionInfo): Promise<any> {


  let totalMark = 0;
  return workspaceRelativePathToAbsolute(location)
    .then((submissionPath) => {
      const assignmentPath = dirname(submissionPath);
      const submissionDirectoryName = basename(submissionPath);
      return Promise.all([
        getAssignmentSettingsAt(assignmentPath),
        saveSubmissionInfo(submissionPath, submissionInfo)
      ]).then(([assignmentSettings]) => {
        let savePromise: Promise<any> = Promise.resolve();

        if (submissionInfo.type === SubmissionType.MARK) {

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
        } else if (submissionInfo.type === SubmissionType.RUBRIC) {
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
          const submission = find(assignmentSettings.submissions, {directoryName: submissionDirectoryName});
          submission.mark = totalMark;
          if (!(submission.state === SubmissionState.MODERATED || submission.state === SubmissionState.SENT_FOR_MODERATION)) {
            // Only update the submission state if it s not being moderated
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


export function loadMarks(studentFolder: string): Promise<SubmissionInfo> {
  return workspaceRelativePathToAbsolute(studentFolder).then((absolutePath) => {
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

export function getMarks(event: IpcMainInvokeEvent, studentFolder: string): Promise<SubmissionInfo> {
  return loadMarks(studentFolder);
}



// Only For updating colour for now
export function updateAssignmentSettings(
  event: IpcMainInvokeEvent,
  updatedSettings: any = {},
  workspaceName: string,
  assignmentName: string): Promise<AssignmentSettingsInfo> {
  return writeAssignmentSettingsFor(updatedSettings, workspaceName, assignmentName);
}



export function updateAssignment(event: IpcMainInvokeEvent, updateRequest: UpdateAssignment): Promise<any> {
  return Promise.all([
    getAssignmentSettingsFor(updateRequest.workspace, updateRequest.assignmentName),
    getAssignmentDirectoryAbsolutePath(updateRequest.workspace, updateRequest.assignmentName)
  ]).then(([assignmentSettings, assignmentAbsolutePath]) => {
    if (assignmentSettings.sourceFormat !== SourceFormat.MANUAL) {
      return Promise.reject('Operation not permitted on this type of assignment!');
    }

    if (updateRequest.studentDetails.length !== updateRequest.files.length) {
      return Promise.reject( `Student details is not equal to number of files sent!`);
    }

    const promises: Promise<any>[] = updateRequest.studentDetails.map((studentInfo, index) => {
      const file: any = updateRequest.files[index];
      const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() +
        '(' + studentInfo.studentId.toUpperCase() + ')';
      const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
      const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;

      const existingSubmission = find(assignmentSettings.submissions, {studentId: studentInfo.studentId.toUpperCase()});

      if (isNil(existingSubmission)) {
        const filename = basename(file);
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
        return mkdir(assignmentAbsolutePath + sep + feedbackFolder, {recursive: true})
          .then(() =>  mkdir(assignmentAbsolutePath + sep + submissionFolder, {recursive: true}))
          .then(() => readFile(file))
          .then((content) => PDFDocument.load(content))
          .then((pdfDocument) => pdfDocument.save())
          .then((pdfBytes) => writeFile(assignmentAbsolutePath + sep + submissionFolder + sep + filename, pdfBytes));
      } else {
        if (studentInfo.remove) {
          remove(assignmentSettings.submissions, {studentId: studentInfo.studentId.toUpperCase()});
          return rm(assignmentAbsolutePath + sep + studentFolder, {recursive: true});
        } else {
          return Promise.resolve();
        }

      }
    });

    return Promise.all(promises)
      .then(() => writeAssignmentSettingsAt(assignmentSettings, assignmentAbsolutePath));

  });
}



export function createAssignment(event: IpcMainInvokeEvent, createInfo: CreateAssignmentInfo): Promise<any> {

  let assignmentName: string = createInfo.assignmentName.trim();

  if (createInfo.studentRow.length !== createInfo.files.length) {
    return Promise.reject(`Student details is not equal to number of files sent!`);
  }

  if (!createInfo.noRubric) {
    if (isNil(createInfo.rubric)) {
      return Promise.reject(NOT_PROVIDED_RUBRIC);
    }
  }
  let rubricPromise: Promise<IRubric> = Promise.resolve(null);
  if (!createInfo.noRubric) {
    rubricPromise = findRubric(createInfo.rubric.trim());
  }
  return Promise.all([
    getWorkingDirectoryAbsolutePath(createInfo.workspace),
    getConfig(),
    rubricPromise
  ]).then(([workspaceAbsolutePath , config, rubric]) => {
    const folders = glob.sync(config.defaultPath.replace(/\\/g, '/') + '/*');

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

    const studentDetails: StudentInfo[] = createInfo.studentRow;
    const settings: AssignmentSettingsInfo = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
    settings.sourceId = uuidv4();
    settings.assignmentName = assignmentName;
    settings.rubric = rubric;
    settings.sourceFormat = SourceFormat.MANUAL;

    const submissionPromises: Promise<any>[] = studentDetails.map((studentInfo, index) => {
      const file: any = createInfo.files[index];
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
        .then(() => readFile(file))
        .then((content) => PDFDocument.load(content))
        .then((pdfDocument) => pdfDocument.save())
        .then((pdfBytes) => writeFile(workspaceAbsolutePath + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes));
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
  const buffer = new Uint8Array(Buffer.from(JSON.stringify(assignmentSettings)));

  return writeFile(assignmentAbsolutePath + sep + SETTING_FILE, buffer).then(() => {
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

export function readGradesCsv(sourceFile: string): Promise<GradesCSV> {
  return stat(sourceFile).then(() => {
    return csvtojson({noheader: true, trim: false}).fromFile(sourceFile).then((data) => {
      const grades: GradesCSV = {
        studentGrades: [],
        header: {
          gradeType: data[0].field2,
          assignmentName: data[0].field1
        }
      };

      for (let index = 3; index < data.length; index++) {
        grades.studentGrades.push({
          displayId: data[index].field1,
          id: data[index].field2,
          lastName: data[index].field3,
          firstName: data[index].field4,
          grade: data[index].field5 === '' ? null : +data[index].field5,
          submissionDate: data[index].field6,
          lateSubmission: data[index].field7,
        });
      }

      return grades;
    });
  }, () => {
    return null;
  });
}

function writeGradesCsv(outputFile: string, grades: GradesCSV): Promise<any> {
  const gradesJSON = [];
  gradesJSON.push({
    field1: grades.header.assignmentName,
    field2: grades.header.gradeType,
  });
  gradesJSON.push({
    field1: ''
  });
  gradesJSON.push({
    field1: 'Display ID',
    field2: 'ID',
    field3: 'Last Name',
    field4: 'First Name',
    field5: 'grade',
    field6: 'Submission date',
    field7: 'Late submission'
  });
  forEach(grades.studentGrades, (studentGrade) => {
    gradesJSON.push({
      field1: studentGrade.displayId,
      field2: studentGrade.id,
      field3: studentGrade.lastName,
      field4: studentGrade.firstName,
      field5: studentGrade.grade,
      field6: studentGrade.submissionDate,
      field7: studentGrade.lastName,
    });
  });

  return json2csvAsync(gradesJSON, {
    emptyFieldValue: '',
    prependHeader: false
  })
    .then(csv => {
      return writeFile(outputFile, csv);
    }, (error) => {
      console.error(error);
      return Promise.reject( 'Failed to export marks.csv');
    });
}

function writeGrades(outputDirectory: string, submissions: Submission[], assignmentName: string): Promise<any> {
  return stat(outputDirectory + sep + GRADES_FILE)
    .then(_ => true, _ => false)
    .then((exists) => {
      let promise: Promise<GradesCSV>;
      if (exists) {
        promise = readGradesCsv(outputDirectory + sep + GRADES_FILE);
      } else {
        promise = Promise.resolve({
          studentGrades: [],
          header: {
            gradeType: 'SCORE_GRADE_TYPE',
            assignmentName: assignmentName
          }
        });
      }
      return promise.then((grades) => {

        forEach(submissions, (submission) => {
          // Find existing student grade
          let studentGrade: StudentGrade = find(grades.studentGrades, {id: submission.studentId});
          if (isNil(studentGrade)) {
            studentGrade = {
              displayId : submission.studentId,
              id : submission.studentId,
              firstName : submission.studentName,
              lastName : submission.studentSurname,
              grade: null,
              lateSubmission: null,
              submissionDate: null
            };
            grades.studentGrades.push(studentGrade);
          }
          studentGrade.grade = submission.mark;
        });
        return writeGradesCsv(outputDirectory + sep + GRADES_FILE, grades);
      });
    });
}


function finalizeSubmissions(workspaceFolder, assignmentName): Promise<any> {
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
      });
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
        .then(() => writeGrades(exportTempDirectory, assignmentSettings.submissions, assignmentName))
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
          const exportSettings = cloneDeep(assignmentSettings);
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
  return getConfig().then((config) => {
    if (relativePath.startsWith(DEFAULT_WORKSPACE + '/')) {
      relativePath = relativePath.replace(DEFAULT_WORKSPACE + '/', '');
    }
    relativePath = relativePath.replace(/\//g, sep);
    return config.defaultPath + sep + relativePath;
  });
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

      return Promise.all(promises)
        .then(() => {
          // pool.close();
          // pool = null;
        });
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
    return readdir(settingsInfo.defaultPath).then((foundDirectories) => {
      const allAssignmentDirectories: string[] = [];

      // First we calculate all the assignment directories to scan through to find allocations
      const directoryPromises: Promise<any>[] = map(foundDirectories, (directory) => {
        const fullPath = settingsInfo.defaultPath + sep + directory;
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
