/**
 * ##################################################
 *
 *  BE REALLY CAREFUL WHAT YOU IMPORT HERE
 *  THIS FILE IS BUILD AS A WEB WORKER
 *
 * ##################################################
 */
import {parentPort} from 'node:worker_threads';
import {existsSync, mkdtempSync, rmSync, unlinkSync, writeFileSync} from 'fs';
import {basename, dirname, extname, join, sep} from 'path';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {AssignmentSettingsInfo, AssignmentState, Submission} from '../../src/shared/info-objects/assignment-settings.info';
import {cloneDeep, filter, isNil} from 'lodash';
import {copy} from 'fs-extra';
import {tmpdir} from 'os';
import {DEFAULT_WORKSPACE, FEEDBACK_FOLDER, MARK_FILE, SETTING_FILE} from '../../src/shared/constants/constants';
import {SettingInfo} from '../../src/shared/info-objects/setting.info';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson, writeToFile} from '../utils';
import {
  MarkingSubmissionInfo,
  RubricSubmissionInfo,
  SubmissionInfo,
  SubmissionType
} from '../../src/shared/info-objects/submission.info';
import {annotatePdfFile} from '../pdf/marking-annotations';
import {annotatePdfRubric} from '../pdf/rubric-annotations';
import {zipDir} from '../zip';
import {
  AnnotateSubmissionTaskDetails,
  FinalizeSubmissionTaskDetails,
  MarkerExportTaskDetails,
  TaskDetails
} from './task-detail';
/**
 * ##################################################
 *
 *  BE REALLY CAREFUL WHAT YOU IMPORT HERE
 *  THIS FILE IS BUILD AS A WEB WORKER
 *
 * ##################################################
 */
function getConfig(): Promise<SettingInfo> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(`Corrupt configuration files at "${CONFIG_DIR}${CONFIG_FILE}"`);
    }

    return JSON.parse(data.toString());
  });
}
function loadMarksAt(studentFolderFull: string): Promise<SubmissionInfo> {
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

function getWorkingDirectoryAbsolutePath(workspaceName: string): Promise<string> {
  return getConfig().then((config) => {
    if (workspaceName === DEFAULT_WORKSPACE || isNil(workspaceName)) {
      return config.defaultPath;
    } else {
      return config.defaultPath + sep + workspaceName;
    }
  });
}
function getAssignmentDirectoryAbsolutePath(workspaceName: string, assignmentName: string): Promise<string> {
  return getWorkingDirectoryAbsolutePath(workspaceName).then((workingDirectory) => {
    return workingDirectory + sep + assignmentName;
  });
}

function getAssignmentSettingsFor(workspaceName: string, assignmentName: string): Promise<AssignmentSettingsInfo> {
  return getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
    .then((directory) => getAssignmentSettingsAt(directory));
}


function getAssignmentSettingsAt(assignmentFolder: string): Promise<AssignmentSettingsInfo> {
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

function writeAssignmentSettingsAt(
  assignmentSettings: AssignmentSettingsInfo,
  assignmentAbsolutePath: string): Promise<AssignmentSettingsInfo> {
  const buffer = new Uint8Array(Buffer.from(JSON.stringify(assignmentSettings)));

  return writeToFile(assignmentAbsolutePath + sep + SETTING_FILE, buffer, null, 'Failed to save assignment settings!').then(() => {
    return assignmentSettings;
  });
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




parentPort.on('message', (taskDetails: TaskDetails) => {

  if (taskDetails.type === 'MarkerExport') {
    markerExportTask(taskDetails as MarkerExportTaskDetails);
  } else if (taskDetails.type === 'FinalizeSubmission') {
    finalizeSubmissionTask(taskDetails as FinalizeSubmissionTaskDetails);
  } else if (taskDetails.type === 'AnnotateSubmission') {
    annotationSubmissionTask(taskDetails as AnnotateSubmissionTaskDetails);
  } else {
    parentPort.postMessage('Unknown task');
  }
});



function annotatePdf(sourceSubmissionFile: string, assignmentSettings: AssignmentSettingsInfo): Promise<Uint8Array> {
  const studentFolder = dirname(dirname(sourceSubmissionFile));
  return loadMarksAt(studentFolder).then((submissionInfo: SubmissionInfo) => {
    if (submissionInfo.marks.length > 0) {
      if (submissionInfo.type === SubmissionType.MARK) {
        return annotatePdfFile(sourceSubmissionFile, submissionInfo as MarkingSubmissionInfo);
      } else {
        return annotatePdfRubric(sourceSubmissionFile, submissionInfo as RubricSubmissionInfo, assignmentSettings.rubric);
      }
    }

    // Nothing to save
    return Promise.resolve(null);
  });
}

function annotationSubmissionTask(taskDetails: AnnotateSubmissionTaskDetails){
  annotatePdf(taskDetails.sourcePath, taskDetails.assignmentSettings)
    .then((buffer) => {
      return writeFile(taskDetails.outputPath, buffer);
    })
    .then(() => {
      parentPort.postMessage('Done');
    }, (error) => {
      throw new Error(error);
    });
}

function finalizeSubmissionTask(finalizeSubmissionTaskDetails: FinalizeSubmissionTaskDetails): void {
    const studentFolder = dirname(dirname(finalizeSubmissionTaskDetails.pdfPath));
    const ext = extname(finalizeSubmissionTaskDetails.pdfPath);
    let fileName = basename(finalizeSubmissionTaskDetails.pdfPath, ext);
    annotatePdf(finalizeSubmissionTaskDetails.pdfPath, finalizeSubmissionTaskDetails.assignmentSettings)
      .then((data) => {
        fileName += '_MARK';
        writeFileSync(studentFolder + sep + FEEDBACK_FOLDER + sep + fileName + '.pdf', data);
        unlinkSync(finalizeSubmissionTaskDetails.pdfPath);
        parentPort.postMessage('Done');
      }, (error) => {
        throw new Error('Error annotating marks to PDF ' + fileName + ' [' + error.message + ']');
      });
}

function markerExportTask(exportAssignmentsRequest: MarkerExportTaskDetails): void {

    const tempDirectory = mkdtempSync(join(tmpdir(), 'pdfm-'));
    const exportTempDirectory = tempDirectory + sep + exportAssignmentsRequest.assignmentName;

    Promise.all([
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
              recursive: true
            }
          );
        });
        return Promise.all(promises)
          .then(() => {
            // We need to create a settings file
            const exportSettings = cloneDeep(assignmentSettings);
            exportSettings.state = AssignmentState.NOT_STARTED;
            if (!isNil(exportAssignmentsRequest.studentIds)) {
              // Filter out submissions if required
              exportSettings.submissions = exportSettings.submissions.filter((submission) => {
                return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
              });
            }
            return writeAssignmentSettingsAt(exportSettings, exportTempDirectory);
          })
          .then(() => {
            return zipDir(tempDirectory, exportAssignmentsRequest.exportPath + sep + exportAssignmentsRequest.assignmentName + '-' + exportAssignmentsRequest.markerEmail + '.zip');
          })
          .then(() => {
            cleanupTemp(tempDirectory);
          }, (error) => {
            cleanupTemp(tempDirectory);
            return Promise.reject(error.message);
          });
      })
      .then(() => {
        parentPort.postMessage('Created zip: ' + exportAssignmentsRequest.exportPath + sep + exportAssignmentsRequest.markerEmail + '.zip');
      });
}
