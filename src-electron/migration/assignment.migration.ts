import {getConfig} from '../ipc/config.handler';
import {cloneDeep, find, isNil, map} from 'lodash';
import {move, readdir} from 'fs-extra';
import {basename, relative, sep} from 'path';
import {
  AssignmentSettingsInfo,
  AssignmentSettingsVersion,
  AssignmentState,
  DistributionFormat,
  SourceFormat,
  Submission,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {getAssignmentSettingsAt, readGradesCsv, writeAssignmentSettingsAt} from '../ipc/assignment.handler';
import {mkdir, stat} from 'fs/promises';
import {
  ASSIGNMENT_BACKUP_DIR,
  FEEDBACK_REL_PATH_REGEX,
  GRADES_FILE,
  MARK_FILE,
  SETTING_FILE,
  SUBMISSION_REL_PATH_REGEX, uuidv4
} from '@shared/constants/constants';
import {getAllFiles, isNullOrUndefinedOrEmpty} from '../utils';
import {STUDENT_DIRECTORY_NO_NAME_REGEX, STUDENT_DIRECTORY_REGEX} from '../constants';

const logger = require('electron-log');
const LOG = logger.scope('AssignmentMigration');

export function migrateAssignmentSettings(): Promise<any> {
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
          if (workspaceFolders.includes(fullPath)) {
            return readdir(fullPath).then((assignmentDirectories) => {
              const workspacePromises: Promise<any>[] = map(assignmentDirectories, (assignmentDirectory) => {
                return migrateAssignment(fullPath + sep + assignmentDirectory);
              });
              return Promise.all(workspacePromises);
            });
          } else {
            return migrateAssignment(fullPath);
          }
        });
        return Promise.all(promises).then(() => {
          LOG.info('Migration done');
        }, (error) => {
          LOG.error('Error while migrating assignments');
          LOG.error(error);
          return Promise.reject(error);
        });
      });
    }
  });
}

function migrateAssignment(assignmentFolder: string): Promise<any> {
  LOG.debug('Checking for migration at ' + assignmentFolder);
  return getAssignmentSettingsAt(assignmentFolder)
    .then((settings) => {
      return upgradeAssignmentSettings(assignmentFolder, settings)
        .then(() => upgradeAssignmentDirectory(assignmentFolder, settings.version));
    });
}

function upgradeAssignmentDirectory(assignmentFolder: string, version: number): Promise<any> {
  if (version === AssignmentSettingsVersion) {
    LOG.debug('Assignment directory already up-to-date');
    return Promise.resolve();
  }

  let promise: Promise<any>;
  let currentVersion = version;
  if (isNil(currentVersion)) {
    const backupDir = assignmentFolder +  sep + ASSIGNMENT_BACKUP_DIR;
    promise = mkdir(backupDir)
      .then(() => {
        // Move all unrelated files to the backup directory
        return getAllFiles(assignmentFolder).then((files) => {
          const promises: Promise<any>[] = files.map((file) => {
            /*
              Only keep:
               - Submission/Feedback files
               - .settings.json
               - .marks.json
             */
            const relativeFilePath = relative(assignmentFolder, file);
            const match = relativeFilePath.match(FEEDBACK_REL_PATH_REGEX)
              || relativeFilePath.match(SUBMISSION_REL_PATH_REGEX)
              || basename(file) === SETTING_FILE
              || basename(file) === MARK_FILE;
            if (!match) {
              const source = assignmentFolder + sep + relativeFilePath;
              const dest = backupDir + sep + relativeFilePath;
              LOG.debug(`Moving ${source} to ${dest}`);
              return move(source,  dest);
            } else {
              LOG.debug(`Keeping ${file}`);
              return Promise.resolve();
            }
          });

          return Promise.all(promises);
        });
      });

    currentVersion = 1;
  }

  return promise.then(() => {
    LOG.info('Done upgrading assignment directory');
  });
}




function upgradeAssignmentSettings(assignmentFolder: string, assignmentSettings: AssignmentSettingsInfo): Promise<AssignmentSettingsInfo> {
  let promise: Promise<AssignmentSettingsInfo> = Promise.resolve(assignmentSettings);
  const migrationSettings = cloneDeep(assignmentSettings);
  if (assignmentSettings.version !== AssignmentSettingsVersion) {

    if (!assignmentSettings.hasOwnProperty('version')) {
      const isCreated: boolean = (migrationSettings as any).isCreated;
      delete (migrationSettings as any).isCreated;
      // This is the first upgrade, set all the new fields
      migrationSettings.version = 1;
      migrationSettings.sourceId = uuidv4();
      migrationSettings.distributionFormat = DistributionFormat.STANDALONE;
      migrationSettings.state = AssignmentState.NOT_STARTED;
      migrationSettings.stateDate = new Date().toISOString();
      migrationSettings.submissions = [];
      migrationSettings.owner = null;

      // For each student directory we need to create a submission
      promise = readdir(assignmentFolder).then((files) => {

        const filePromises: Promise<any>[] = files.map((file) => {
          return stat(assignmentFolder + sep + file).then((fileStat) => {
            if (fileStat.isDirectory()) {
              let studentId;
              let studentName;
              let studentSurname;

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
              if (matches !== null) {
                LOG.info(`Migration student submission: ${file}`);
                migrationSettings.submissions.push({
                  directoryName: basename(file),
                  studentSurname,
                  studentName,
                  studentId,
                  state: SubmissionState.NEW,
                  allocation: null,
                  mark: null, // We'll get this from grades.csv shortly
                  lmsStatusText: null // We'll get this from grades.csv shortly
                });
              }
            }
          });
        });
        return Promise.all(filePromises);
      }).then(() => {
        return readGradesCsv(assignmentFolder + sep + GRADES_FILE).then((grades) => {
          let hasMarks = false;
          let isSakai = false;
          grades.studentGrades.forEach((studentGrade) => {
            const submission: Submission = find(migrationSettings.submissions, (submissionItem) => {
              return submissionItem.studentId.toUpperCase() === studentGrade.id.toUpperCase();
            });
            submission.mark = studentGrade.grade;
            submission.lmsStatusText = studentGrade.lateSubmission;
            // LateSubmission and submission date isn't filled in for generic imports
            isSakai = isSakai || !isNullOrUndefinedOrEmpty(studentGrade.lateSubmission) || !isNullOrUndefinedOrEmpty(studentGrade.submissionDate);
            hasMarks = hasMarks || !isNil(submission.mark);
          });

          if (isCreated) {
            migrationSettings.sourceFormat = SourceFormat.MANUAL;
          } else if (isSakai) {
            migrationSettings.sourceFormat = SourceFormat.SAKAI;
          } else {
            migrationSettings.sourceFormat = SourceFormat.GENERIC;
          }

          if (hasMarks) {
            migrationSettings.state = AssignmentState.IN_PROGRESS;
          }
          if (assignmentSettings.hasOwnProperty('dateFinalized')) {
            if (!isNil((migrationSettings as any).dateFinalized)) {
              migrationSettings.state = AssignmentState.FINALIZED;
            }
            delete (migrationSettings as any).dateFinalized;
          }
        });
      }).then(() => writeAssignmentSettingsAt(migrationSettings, assignmentFolder));



    }

    /*
       if (assignmentSettings.version === 1) {
         // Convert to from v 1 to version 2
         migrationSettings = assignmentSettingsV2;
         promise = promise.then(() => writeAssignmentSettingsAt(migrationSettings, assignmentFolder));
       }

       if (assignmentSettings.version === 2) {
         // Convert to from v 2 to version 3
         migrationSettings = assignmentSettingsV3;
         promise = promise.then(() => writeAssignmentSettingsAt(migrationSettings, assignmentFolder));
       }
     */
  } else {
    LOG.debug('Assignment settings already in correct version');
  }
  return promise;
}
