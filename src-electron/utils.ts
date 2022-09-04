
import {constants, existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync} from 'fs';
import {access, readdir, stat, writeFile} from 'fs/promises';
import {sep} from 'path';
import {noop} from 'rxjs';
import {IpcResponse} from '@shared/ipc/ipc-response';
import {IpcMainInvokeEvent} from 'electron';
import {Stream} from 'stream';

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

export function stream2buffer(stream: Stream): Promise<Buffer> {
  return new Promise < Buffer > ((resolve, reject) => {
    const _buf = new Array<any>();
    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(`error converting stream - ${err}`));
  });
}
