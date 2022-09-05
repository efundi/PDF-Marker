import {IpcMainInvokeEvent} from 'electron';
import {mkdir, mkdtemp, rm} from 'fs/promises';
import {basename, join} from 'path';
import {tmpdir} from 'os';
import {cloneDeep, filter, forEach, map, times} from 'lodash';
import {copy} from 'fs-extra';
import {saveFileImpl} from './application.handler';
import {getConfig} from './config.handler';
import {MarkingSubmissionInfo, RubricSubmissionInfo} from '@shared/info-objects/submission.info';
import {getAssignmentSettingsFor, saveSubmissionInfo, writeAssignmentSettingsAt} from './assignment.handler';
import {
  AssignmentState,
  DEFAULT_ASSIGNMENT_SETTINGS,
  Submission,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {getAssignmentDirectoryAbsolutePath} from './workspace.handler';
import {uuidv4} from '@shared/constants/constants';
import {findRubric} from './rubric.handler';
import {zipDir} from '../zip';

export function generateGenericZip(
  event: IpcMainInvokeEvent,
  studentCount: number,
  assignmentName: string,
  sourceFilePath: string): Promise<string> {

  return mkdtemp(join(tmpdir(), 'pdfm-')).then((tempDir) => {

    const assignmentPath = join(tempDir, assignmentName);
    return mkdir(join(tempDir, assignmentName))
      .then(() => {
        const promises: Promise<any>[] = times(studentCount, (count: number) => {
          const submissionPath = join(assignmentPath, `Student${count}_Surname${count}_s${count}_submission.pdf`);
          return copy(sourceFilePath, submissionPath);
        });

        return Promise.all(promises);
      }).then(() => {
        return saveFileImpl({
          filename: assignmentName + '_' + studentCount + '.zip',
          name: 'Zip File',
          extension: ['zip']
        });
      })
      .then((selectedPath) => {
        if (selectedPath.selectedPath) {
          return zipDir(tempDir, selectedPath.selectedPath);
        } else {
          return Promise.reject('No file selected');
        }
      })
      .then((result) => {
        rm(tempDir, {recursive: true});
        return 'Generic zip created at : ' + result;
      }, (error) => {
        rm(tempDir, {recursive: true});
        return Promise.reject(error);
      });
  });
}

export function generateAssignment(
  event: IpcMainInvokeEvent,
  studentCount: number,
  assignmentName: string,
  sourceFilePath: string,
  rubricName?: string): Promise<string> {
  return getConfig().then((config) => {
    const assignmentPath = join(config.defaultPath, assignmentName);
    const assignmentSettings = cloneDeep(DEFAULT_ASSIGNMENT_SETTINGS);
    assignmentSettings.assignmentName = assignmentName;
    assignmentSettings.sourceId = uuidv4();

    let promise = Promise.resolve();
    if (rubricName) {
      promise = findRubric(rubricName)
        .then((rubric) => {
          assignmentSettings.rubric = rubric;
        });
    }
    return promise
      .then(() =>  mkdir(assignmentPath))
      .then(() => {
        const promises: Promise<any>[] = times(studentCount, (count: number) => {
          const studentPath = join(assignmentPath, `Name${count}, Surname${count}(s${count})`);
          const submissionAttachmentsPath = join(studentPath, `Submission attachment(s)`);
          const feedbackAttachmentsPath = join(studentPath, `Feedback Attachment(s)`);
          const submissionPath = join(submissionAttachmentsPath, `Student${count}_Surname${count}_s${count}_submission.pdf`);
          return mkdir(studentPath)
            .then(() => mkdir(submissionAttachmentsPath))
            .then(() => mkdir(feedbackAttachmentsPath))
            .then(() => copy(sourceFilePath, submissionPath))
            .then(() => {
              assignmentSettings.submissions.push({
                studentId: `s${count}`,
                studentSurname: `Surname${count}`,
                state: SubmissionState.NEW,
                directoryName: basename(studentPath),
                studentName: `Student${count}`,
                mark: null,
                allocation: null,
                lmsStatusText: null
              });
            });
        });

        return Promise.all(promises);
      })
      .then(() => {
        return writeAssignmentSettingsAt(assignmentSettings, assignmentPath);
      }).then(() => {
        return 'Assignment created at: ' + assignmentPath;
      });
  });

}

export function markSome(event: IpcMainInvokeEvent, assignmentName: string, workspaceName?: string): Promise<string> {
  return marksSubmissions(assignmentName, workspaceName, false);
}


export function markAll(event: IpcMainInvokeEvent, assignmentName: string, workspaceName?: string): Promise<string> {
  return marksSubmissions(assignmentName, workspaceName, true);
}
export function marksSubmissions(assignmentName: string, workspaceName: string, all: boolean): Promise<string> {

  return Promise.all([
    getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName),
    getAssignmentSettingsFor(workspaceName, assignmentName)
  ]).then(([assignmentPath, assignmentSettings]) => {

    const submissions: Submission[] = filter(assignmentSettings.submissions, (submission) => {
      if (!(submission.state === SubmissionState.NEW || submission.state === SubmissionState.NOT_MARKED)) {
        return false;
      }
      if (all) {
        return true;
      } else {
        return Math.random() * 10 > 5;
      }
    });

    const promises: Promise<any>[] = map(submissions, (submission) => {

      let marks;
      if (assignmentSettings.rubric) {
        marks = new RubricSubmissionInfo();
        marks.marks = [];
        let totalMark = 0;
        forEach(assignmentSettings.rubric.criterias, (criteria) => {
          const levelIndex = Math.floor(Math.random() * criteria.levels.length);
          const levelMark = criteria.levels[levelIndex].score;
          marks.marks.push(levelIndex);
          totalMark += levelMark;
        });
        submission.mark = totalMark;
      } else {

        marks = new MarkingSubmissionInfo();
        marks.marks = [[]];
        const numMarks = Math.floor(Math.random() * 20);
        times(numMarks, () => {
          marks.marks[0].push({
            coordinates: {
              x: Math.floor(Math.random() * 500),
              y: Math.floor(Math.random() * 500)
            },
            iconName: 'check',
            iconType: 'FULL_MARK',
            colour: '#00FF00',
            totalMark: 1
          });
        });
        submission.mark = numMarks;
      }
      submission.state = SubmissionState.MARKED;

      return saveSubmissionInfo(join(assignmentPath, submission.directoryName), marks);
    });

    if (promises.length > 0) {
      assignmentSettings.state = AssignmentState.IN_PROGRESS;
      assignmentSettings.stateDate = new Date().toISOString();
    }

    return Promise.all(promises)
      .then(() => writeAssignmentSettingsAt(assignmentSettings, assignmentPath))
      .then(() => 'Done marking submissions.');
  });
}
