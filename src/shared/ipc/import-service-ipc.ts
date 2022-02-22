import {IpcResponse} from './ipc-response';
import {ImportInfo} from '../info-objects/import.info';
import {ZipInfo} from '../info-objects/zip.info';

export interface ImportServiceIpc {

  importZip(importInfo: ImportInfo): Promise<IpcResponse<string>>;
  isValidSakaiZip(filePath: string): Promise<IpcResponse<boolean>>;
  getZipEntries(filePath: string): Promise<IpcResponse<ZipInfo[]>>;
}
