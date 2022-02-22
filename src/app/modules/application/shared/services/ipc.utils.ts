import {from, Observable} from 'rxjs';
import {IpcResponse} from '../../../../../shared/ipc/ipc-response';

/**
 * This is the client side (the opposite of toIpcResponse) to work around a bug in electron where rejected promises
 * loose the original reason. This way, the main process always returns a resolved promise, but the result IpcResponse
 * will contain information if there was an error or not, and then reject the promise in the renderer side
 * https://github.com/electron/electron/issues/24427
 * @param ipcResponse
 */
export function fromIpcResponse<T>(ipcResponse: Promise<IpcResponse<T>>): Observable<T> {
  const promise: Promise<T> =  ipcResponse.then((response) => {
    if (response.hasOwnProperty('error')) {
      // If the response has an "error" property reject the promise with that value
      return Promise.reject(response.error);

    } else {
      // Return a resolved promise with the data (if any)
      return response.data;
    }
  });
  return from(promise);
}
