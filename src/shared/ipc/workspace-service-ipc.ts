import {IpcResponse} from './ipc-response';
import {deleteWorkspaceCheck} from "../../../src-electron/ipc/workspace/workspace.handler";

export interface WorkspaceServiceIpc {
  createWorkingFolder(name: string): Promise<IpcResponse<string>>;
  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Promise<IpcResponse<string>>;
  moveWorkspaceAssignments(currentWorkspaceName: string, workspaceName: string, assignments: any[]): Promise<IpcResponse<any>>;
  getWorkspaces(): Promise<IpcResponse<string[]>>;
  deleteWorkspace(deleteFolder: string): Promise<IpcResponse<string[]>>;
  deleteWorkspaceCheck(deleteFolder: string): Promise<IpcResponse<boolean>>;
}
