import {IpcResponse} from '@shared/ipc/ipc-response';

export interface ConvertIpcService {

  convertToPdf(workspaceName: string, assignmentName: string, filePath: string): Promise<IpcResponse<string>>;
  libreOfficeFind(): Promise<IpcResponse<string>>;
  libreOfficeVersion(path: string): Promise<IpcResponse<string>>;
}
