import {IpcResponse} from './ipc-response';
import {Workspace} from '@shared/info-objects/workspace';

export interface WorkspaceIpcService {
  getAssignments(): Promise<IpcResponse<Workspace[]>>;
  createWorkingFolder(name: string): Promise<IpcResponse<string>>;
  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Promise<IpcResponse<string>>;
  moveWorkspaceAssignments(currentWorkspaceName: string, workspaceName: string, assignments: any[]): Promise<IpcResponse<any>>;
  getWorkspaces(): Promise<IpcResponse<string[]>>;
  deleteWorkspace(deleteFolder: string): Promise<IpcResponse<string[]>>;
  deleteWorkspaceCheck(deleteFolder: string): Promise<IpcResponse<boolean>>;
}
