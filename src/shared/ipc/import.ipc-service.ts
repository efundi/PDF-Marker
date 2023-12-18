import {IpcResponse} from './ipc-response';
import {ImportInfo} from '../info-objects/import.info';
import {TreeNode} from '@shared/info-objects/workspaceTreeNode';
import {AssignmentImportValidateResultInfo} from '@shared/info-objects/assignment-import-validate-result.info';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';

export interface ImportIpcService {

  lectureImport(importInfo: LectureImportInfo): Promise<IpcResponse<AssignmentSettingsInfo>>;
  validateLectureImport(importInfo: LectureImportInfo): Promise<IpcResponse<any>>;
  importZip(importInfo: ImportInfo): Promise<IpcResponse<string>>;
  validateZipFile(filePath: string): Promise<IpcResponse<AssignmentImportValidateResultInfo>>;
  getZipEntries(filePath: string): Promise<IpcResponse<TreeNode[]>>;
}
