import {getConfig} from '../ipc/config.handler';
import {isNil, map} from 'lodash';
import {readdir} from 'fs-extra';
import {sep} from 'path';
import {getAssignmentSettingsAt, loadMarksAt, saveSubmissionInfo} from '../ipc/assignment.handler';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {
  MarkingSubmissionInfo,
  RubricSubmissionInfo,
  SubmissionInfo,
  SubmissionInfoVersion
} from '@shared/info-objects/submission.info';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {stat} from 'fs/promises';
import {STUDENT_DIRECTORY_NO_NAME_REGEX, STUDENT_DIRECTORY_REGEX} from '../constants';
import {MARK_FILE} from '@shared/constants/constants';

const logger = require('electron-log');
const LOG = logger.scope('MarksMigration');


export function migrateMarks(): Promise<any> {
  LOG.info('Running migration');
  return getConfig().then((settingsInfo) => {
    if (isNil(settingsInfo.defaultPath)) {
      LOG.info('Default path not set in application settings');
      return Promise.resolve();
    } else {
      const workspaceFolders = settingsInfo.folders || [];
      return readdir(settingsInfo.defaultPath).then((foundDirectories) => {
        const promises: Promise<any>[] = map(foundDirectories, (directory) => {
          const fullPath = settingsInfo.defaultPath + sep + directory;
          // Check if the directory is a working directory
          if (workspaceFolders.includes(directory)) {
            return readdir(fullPath).then((assignmentDirectories) => {
              const workspacePromises: Promise<any>[] = map(assignmentDirectories, (assignmentDirectory) => {
                return migrateAssignmentMarks(fullPath + sep + assignmentDirectory);
              });
              return Promise.all(workspacePromises);
            });
          } else {
            return migrateAssignmentMarks(fullPath);
          }
        });
        return Promise.all(promises).then(() => {
          LOG.info('Migration done');
        }, (error) => {
          LOG.error('Error while migrating marks');
          LOG.error(error);
          return Promise.reject(error);
        });
      });
    }
  });
}

function migrateAssignmentMarks(assignmentFolder: string): Promise<any> {
  return getAssignmentSettingsAt(assignmentFolder).then((assignmentSettings) => {

    return readdir(assignmentFolder).then((files) => {
      const filePromises: Promise<any>[] = files.map((file) => {
        return stat(assignmentFolder + sep + file).then((fileStat) => {
          if (fileStat.isDirectory()) {
            if (STUDENT_DIRECTORY_REGEX.exec(file) || STUDENT_DIRECTORY_NO_NAME_REGEX.exec(file)) {
              return upgradeMarks(assignmentSettings, assignmentFolder + sep + file);
            }
          }
        });
      });
      return Promise.all(filePromises);
    });
  });
}

function upgradeMarks(assignmentSettings: AssignmentSettingsInfo, studentFolderFullPath: string): Promise<SubmissionInfo> {

  return stat(studentFolderFullPath + sep + MARK_FILE).then(() => {

    return loadMarksAt(studentFolderFullPath).then((marks) => {
      if (isNil(marks)) {
        return Promise<SubmissionInfo>.resolve(null);
      }
      let submissionInfo: SubmissionInfo;
      if (marks.version !== SubmissionInfoVersion) {


        let promise: Promise<SubmissionInfo> = Promise.resolve(marks);
        if (!marks.hasOwnProperty('version')) {
          // This is the original .marks.json convert it to version 1
          if (assignmentSettings.rubric) {
            const rubricSubmissionInfo = new RubricSubmissionInfo(1);
            rubricSubmissionInfo.marks = marks as any as number[] ;
            submissionInfo = rubricSubmissionInfo;
          } else {
            const markingSubmissionInfo = new MarkingSubmissionInfo(1);
            markingSubmissionInfo.marks = marks as any as MarkInfo[][];
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
      }

    });
  }, () => {
    LOG.debug(`${MARK_FILE} does not exist for ${studentFolderFullPath}`);
  })

}
