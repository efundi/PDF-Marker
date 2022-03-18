import * as unzipper from 'unzipper';
import * as etl from 'etl';
import {
  constants,
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import {access, writeFile} from 'fs/promises';
import {dirname, extname, sep} from 'path';
import {PDFDocument} from 'pdf-lib';
import {noop} from 'rxjs';
import {IpcResponse} from '@shared/ipc/ipc-response';
import {IpcMainInvokeEvent} from 'electron';
import {FEEDBACK_FOLDER, GRADES_FILE, SUBMISSION_FOLDER} from '@shared/constants/constants';

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



export const extractAssignmentZipFile = async (
  file: string,
  destination: string,
  newFolder: string,
  oldFolder: string,
  assignmentName: string,
  assignmentType: string) => {
  // TODO Should we validate the zip structure based on assignment type?
  if (assignmentType === 'Generic') {
    let skippedFirst = 1;
    return await createReadStream(file)
      .pipe(unzipper.Parse())
      .pipe(etl.map(async entry => {
        const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
        let csvString = '';
        const asnTitle = assignmentName;
        let dir = '';
        const isSet = true;
        if (entry.type === 'File') {
          const content = await entry.buffer();
          entry.path = entry.path.replace(oldFolder, newFolder);

          const directory = dirname(destination + entry.path.replace('/', sep));

          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          try {
            const pdfDoc = await PDFDocument.load(content);
            const fileName = entry.path;
            const tempDetails = fileName.substring((fileName.indexOf('/') + 1));
            const splitArray = tempDetails.split('_');

            const studentName = splitArray[1];
            const studentSurname = splitArray[0];
            const studentID = splitArray[2];
            const studentDirectory = studentSurname + ', ' + studentName + ' (' + studentID + ')';
            const csvData = `${studentID.toUpperCase()},${studentID.toUpperCase()},${studentSurname.toUpperCase()},${studentName.toUpperCase()},,,\n`;
            csvString = csvString + csvData;
            dir = directory;
            mkdirSync(directory + sep + studentDirectory, {recursive: true});
            mkdirSync(directory + sep + studentDirectory + sep + FEEDBACK_FOLDER, {recursive: true});
            mkdirSync(directory + sep + studentDirectory + sep + SUBMISSION_FOLDER, {recursive: true});
            if (!existsSync(directory + GRADES_FILE) && skippedFirst === 1) {
              const headers = `'${asnTitle}','SCORE_GRADE_TYPE'\n`;
              const csvFullString = headers + `''\n` + subheaders;
              skippedFirst++;
              await writeFileSync(directory + sep + GRADES_FILE, csvFullString, {flag: 'a'});
              await writeFileSync(directory + sep + GRADES_FILE, csvString, {flag: 'a'});
            } else {
              skippedFirst++;
              await writeFileSync(directory + sep + GRADES_FILE, csvString, {flag: 'a'});
            }
            // if (skippedFirst === 1) {
            //   await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
            //   skippedFirst++;
            // }
            const pdfBytes = await pdfDoc.save();
            writeFileSync(directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER + '/' + tempDetails, pdfBytes);
          } catch (exception) {
            console.error(exception);
          }
        } else {
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = destination + entry.path.replace('/', sep);
          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          if (!(existsSync(directory + GRADES_FILE))) {
            const headers = `'${asnTitle}','SCORE_GRADE_TYPE'\n`;
            const csvFullString = headers + `''\n` + subheaders;
            skippedFirst++;
            await writeFileSync(directory + GRADES_FILE, csvFullString, {flag: 'a'});
            await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
          } else {
            skippedFirst++;
            await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
          }
        }
      })).promise();

  } else {
    return await createReadStream(file)
      .pipe(unzipper.Parse())
      .pipe(etl.map(async entry => {
        if (entry.type === 'File') {
          //
          const content = await entry.buffer();
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = dirname(destination + entry.path.replace('/', sep));
          const extension = extname(destination + entry.path.replace('/', sep)).substring(1);

          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          try {
            if (entry.path.indexOf(SUBMISSION_FOLDER) !== -1 && extension === 'pdf') {
              // await writeFileSync(destination + entry.path.replace('/', sep),  content);
              const pdfDoc = await PDFDocument.load(content);
              const pdfBytes = await pdfDoc.save();
              await writeFileSync(destination + entry.path.replace('/', sep), pdfBytes);
            } else {
              await writeFileSync(destination + entry.path.replace('/', sep), content);
            }
          } catch (exception) {
            console.error(exception);
          }
        } else {
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = destination + entry.path.replace('/', sep);
          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          entry.autodrain();
        }
      })).promise();
  }
};

export const validateRequest = (requiredKeys = [], receivedKeys = []): boolean => {
  let invalidKeyFound = false;
  for (const key of receivedKeys) {
    if (requiredKeys.indexOf(key) === -1) {
      invalidKeyFound = true;
      break;
    }
  }
  return invalidKeyFound;
};

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
