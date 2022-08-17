import {IpcResponse} from './ipc-response';
import {ImportInfo} from '../info-objects/import.info';
import {TreeNode} from '@shared/info-objects/workspace';
import {AssignmentValidateResultInfo} from '@shared/info-objects/assignment-validate-result.info';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';

export interface ImportIpcService {

  lectureImport(importInfo: LectureImportInfo): Promise<IpcResponse<any>>;
  validateLectureImport(importInfo: LectureImportInfo): Promise<IpcResponse<any>>;
  importZip(importInfo: ImportInfo): Promise<IpcResponse<string>>;
  validateZipFile(filePath: string, format: string): Promise<IpcResponse<AssignmentValidateResultInfo>>;
  getZipEntries(filePath: string): Promise<IpcResponse<TreeNode[]>>;
}
