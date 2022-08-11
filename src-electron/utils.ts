import * as unzipper from 'unzipper';
import * as etl from 'etl';
import {constants, createReadStream, existsSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync} from 'fs';
import {access, mkdir, readdir, stat, writeFile} from 'fs/promises';
import {dirname, extname, join, sep} from 'path';
import {PDFDocument} from 'pdf-lib';
import {noop} from 'rxjs';
import {IpcResponse} from '@shared/ipc/ipc-response';
import {IpcMainInvokeEvent} from 'electron';
import {
  ASSIGNMENT_BACKUP_DIR,
  FEEDBACK_FOLDER,
  FEEDBACK_ZIP_ENTRY_REGEX, GRADES_FILE,
  SUBMISSION_FOLDER, SUBMISSION_ZIP_ENTRY_REGEX
} from '@shared/constants/constants';
import {Submission, SubmissionState} from '@shared/info-objects/assignment-settings.info';
import {STUDENT_DIRECTORY_NO_NAME_REGEX, STUDENT_DIRECTORY_REGEX} from './constants';
import {readGradesCsv} from './ipc/assignment.handler';
import {find, forEach} from 'lodash';

declare type IpcHandler<T> = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T>;

/**
 * This is a middleware response used for IPC to work around a bug in electron where rejected promises
 * loose the original reason. This way, the main process always returns a resolved promise, but the result IpcResponse
 * will contain information if there was an error or not, and then reject the promise in the renderer side
 * https://github.com/electron/electron/issues/24427
 * @param listener
 */
export function toIpcResponse<T>(listener: IpcHandler<T>): IpcHandler<IpcResponse<T>> {
  // Return a function that can be used as an IPC handler
  return (event, ...args) => {
    return listener(event, ...args).then(
      (data) => {
        return {
          data
        } as IpcResponse<T>;
      }, (error) => {
        return {
          error
        } as IpcResponse<T>;
      });
  };
}

export const isFunction = (functionToCheck) => {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

export const isNullOrUndefined = (object: any): boolean => {
  return (object === null || object === undefined);
};

export const isNullOrUndefinedOrEmpty = (object: string): boolean => {
  return (object === null || object === undefined || object === '');
};


export function writeToFile(filePath: string,
                            data: Uint8Array | string,
                            customSuccessMsg: string = null,
                            customFailureMsg: string = null): Promise<string> {
  return writeFile(filePath, data).then(() => {
    return (customSuccessMsg) ? customSuccessMsg : 'Successfully saved to file!';
  }, (err) => {
    return Promise.reject((customFailureMsg) ? customFailureMsg : err.message);
  });
}


/*HELPER FUNCTIONS*/
export function checkAccess(filePath: string): Promise<any> {
  return access(filePath, constants.F_OK).then(noop, (err) => {
    return Promise.reject(err.message);
  });
}

/*END HELPER FUNCTIONS*/



export const isJson = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};



export const deleteFolderRecursive = (path) => {
  if (existsSync(path)) {
    readdirSync(path).forEach(function(file, index) {
      const curPath = path + '/' + file;
      if (isFolder(curPath)) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(path);
  }
};

export function isFolder(curPath: string) {
  return lstatSync(curPath).isDirectory();
}

export function extractAssignmentZipFile(
  file: string,
  destination: string,
  newFolder: string,
  oldFolder: string,
  assignmentName: string,
  assignmentType: string): Promise<Submission[]> {
  const submissions: Submission[] = [];

  const backupDirPath = destination + newFolder + ASSIGNMENT_BACKUP_DIR;

  return mkdir(backupDirPath, {recursive: true}).then(() => {
    if (assignmentType === 'Generic') {
      return createReadStream(file)
        .pipe(unzipper.Parse())
        .pipe(etl.map(entry => {

          if (entry.type === 'File') {

            const zipFilePath = entry.path.replace(oldFolder, newFolder);
            const directory = dirname(destination + zipFilePath.replace('/', sep));

            if (!existsSync(directory)) {
              mkdirSync(directory, {recursive: true});
            }
            const fileName = entry.path;
            const tempDetails = fileName.substring((fileName.indexOf('/') + 1));
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

            return Promise.all([
              mkdir(directory + sep + studentDirectory, {recursive: true}),
              mkdir(directory + sep + studentDirectory + sep + FEEDBACK_FOLDER, {recursive: true}),
              mkdir(directory + sep + studentDirectory + sep + SUBMISSION_FOLDER, {recursive: true})
            ]).then(() => {
              return entry.buffer()
                .then((content) => PDFDocument.load(content))
                .then((pdfDoc) => pdfDoc.save())
                .then((pdfBytes) => {
                  return writeFile(directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER + '/' + tempDetails, pdfBytes);
                });
            });
          } else {
            const zipFilePath = entry.path.replace(oldFolder, newFolder);
            const directory = destination + zipFilePath.replace('/', sep);
            if (!existsSync(directory)) {
              mkdirSync(directory, {recursive: true});
            }
          }
        })).promise();

    } else {
      return createReadStream(file)
        .pipe(unzipper.Parse())
        .pipe(etl.map((entry) => {
          if (entry.type === 'File') {

            const zipFilePath = entry.path.replace(oldFolder, newFolder);
            const directory = dirname(destination + entry.path.replace('/', sep));
            // Check if its a submission file
            const match = entry.path.match(FEEDBACK_ZIP_ENTRY_REGEX) || entry.path.match(SUBMISSION_ZIP_ENTRY_REGEX);
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


              // TODO only stream if submission
              return entry.buffer()
                .then((content) => PDFDocument.load(content))
                .then((pdfDoc) => pdfDoc.save())
                .then((pdfBytes) => writeFile(destination + zipFilePath.replace('/', sep), pdfBytes));
            } else {
              console.log('Unknown file, saving to backup... ' + entry.path);
              return entry.buffer()
                .then(content => {
                  const p = backupDirPath + entry.path.replace(oldFolder, sep);
                  const d = dirname(p);
                  if (!existsSync(d)) {
                    mkdirSync(d, {recursive: true});
                  }
                  return writeFile(p, content);
                });
            }
          } else {
            const zipFilePath = entry.path.replace(oldFolder, newFolder);
            const directory = destination + zipFilePath.replace('/', sep);
            if (!existsSync(directory)) {
              mkdirSync(directory, {recursive: true});
            }
            entry.autodrain(); // TODO what does this do?
          }
        })).promise()
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
        });
    }
  })
    .then(() => submissions);
}


export function isEmpty(str: string) {
  return str === null || str === undefined || str.length === 0;
}

export function isBlank(data: string = '') {

  if (data === null || data === undefined) {
    return true;
  }

  data += '';
  return data === '' || data.trim() === '';
}



export function joinError(currentMessage: string = '', newMessage: string = ''): string {
  currentMessage += (!isEmpty(currentMessage)) ? `, ${newMessage}` : newMessage;
  return currentMessage;
}


export function getAllFiles(dirPath: string, arrayOfFiles?: string[]): Promise<string[]> {
  return readdir(dirPath).then((files) => {
    arrayOfFiles = arrayOfFiles || [];

    const promises: Promise<any>[] = files.map((file) => {
      return stat(dirPath + sep + file).then((statInfo) => {
        if (statInfo.isDirectory()) {
          return getAllFiles(dirPath + sep + file, arrayOfFiles).then((dirFiles) => {
            arrayOfFiles = dirFiles;
          });
        } else {
          arrayOfFiles.push(dirPath + sep + file);
        }
      });
    });

    return Promise.all(promises).then(() => arrayOfFiles);
  });
}
