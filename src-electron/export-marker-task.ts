/**
 * ##################################################
 *
 *  BE REALLY CAREFUL WHAT YOU IMPORT HERE
 *  THIS FILE IS BUILD AS A WEB WORKER
 *
 * ##################################################
 */
import {parentPort} from 'node:worker_threads';
import {existsSync, mkdtempSync, rmSync} from 'fs';
import {join, sep} from 'path';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {AssignmentSettingsInfo, Submission} from '../src/shared/info-objects/assignment-settings.info';
import {cloneDeep, filter, isNil} from 'lodash';
import {copy} from 'fs-extra';
import {tmpdir} from 'os';
import {DEFAULT_WORKSPACE, SETTING_FILE} from '../src/shared/constants/constants';
import {SettingInfo} from '../src/shared/info-objects/setting.info';
import {CONFIG_DIR, CONFIG_FILE} from './constants';
import {isJson, writeToFile} from './utils';
const zipDir = require('zip-dir');

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

parentPort.on('message', (exportAssignmentsRequest: any) => {

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
              recursive: true
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
            return zipDir(tempDirectory);
          })
          .then((buffer) => {
            cleanupTemp(tempDirectory);
            return buffer;
          }, (error) => {
            cleanupTemp(tempDirectory);
            return Promise.reject(error.message);
          });
      })
      .then((buffer) => {
        return writeFile(exportAssignmentsRequest.exportPath + sep + exportAssignmentsRequest.markerEmail + '.zip', buffer);
      })
      .then(() => {
        parentPort.postMessage('Created zip: ' + exportAssignmentsRequest.exportPath + sep + exportAssignmentsRequest.markerEmail + '.zip');
      });





});
