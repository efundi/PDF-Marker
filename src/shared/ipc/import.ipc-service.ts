import {IpcResponse} from './ipc-response';
import {ImportInfo} from '../info-objects/import.info';
import {TreeNode} from '@shared/info-objects/workspace';

export interface ImportIpcService {

  importZip(importInfo: ImportInfo): Promise<IpcResponse<string>>;
  isValidSakaiZip(filePath: string): Promise<IpcResponse<boolean>>;
  getZipEntries(filePath: string): Promise<IpcResponse<TreeNode[]>>;
}
